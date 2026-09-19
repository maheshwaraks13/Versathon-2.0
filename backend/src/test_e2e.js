import dbAdapter from './db/index.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import historyRoutes from './routes/historyRoutes.js';

async function runE2ETests() {
  console.log('=== STARTING MEDCLEAR PERSISTENCE & HISTORY E2E VERIFICATION ===\n');

  // 1. Initialize DB and Test Server on test port 5055
  await dbAdapter.connect();
  await dbAdapter.initSchema();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/history', historyRoutes);

  const server = app.listen(5055);
  const BASE_URL = 'http://localhost:5055';

  try {
    // Test 1: Demo Login & Seeded History
    console.log('TEST 1: Demo Account Login & Preloaded History');
    const demoRes = await fetch(`${BASE_URL}/api/auth/demo`, { method: 'POST' });
    const demoJson = await demoRes.json();
    if (!demoJson.success || !demoJson.token) throw new Error('Demo login failed');
    console.log('  ✓ Demo account authenticated as:', demoJson.user.username);

    // Test 2: Fetch Distinct Tests for Demo User
    console.log('\nTEST 2: Fetch Distinct Test Biomarkers');
    const testsRes = await fetch(`${BASE_URL}/api/history/tests`, {
      headers: { Authorization: `Bearer ${demoJson.token}` }
    });
    const testsJson = await testsRes.json();
    if (!testsJson.success || !testsJson.tests || testsJson.tests.length === 0) {
      throw new Error('Failed to retrieve distinct tests for demo user');
    }
    console.log(`  ✓ Retrieved ${testsJson.tests.length} distinct biomarkers:`);
    testsJson.tests.forEach(t => {
      console.log(`    - ${t.test_name} (${t.count} readings, ${t.earliest_date} to ${t.latest_date})`);
    });

    // Test 3: Fetch Chronological Trend Series for Hemoglobin
    console.log('\nTEST 3: Time-Series Trends for "Hemoglobin"');
    const trendRes = await fetch(`${BASE_URL}/api/history/trends/Hemoglobin`, {
      headers: { Authorization: `Bearer ${demoJson.token}` }
    });
    const trendJson = await trendRes.json();
    if (!trendJson.success || trendJson.points.length !== 3) {
      throw new Error(`Expected 3 data points for Hemoglobin, got ${trendJson.points?.length}`);
    }
    console.log(`  ✓ Chronological readings for ${trendJson.test_name} (Unit: ${trendJson.unit}, Ref: ${trendJson.reference_range}):`);
    trendJson.points.forEach(p => {
      console.log(`    - Date: ${p.date} | Value: ${p.raw_value} (${p.numeric_value}) | Status: ${p.status}`);
    });

    // Verify chronological order
    const dates = trendJson.points.map(p => p.date);
    const sortedDates = [...dates].sort();
    if (JSON.stringify(dates) !== JSON.stringify(sortedDates)) {
      throw new Error('Trend data points are not sorted chronologically!');
    }
    console.log('  ✓ Verified strictly chronological ordering.');

    // Test 4: Register Separate User & Verify Multi-User Privacy Isolation
    console.log('\nTEST 4: Privacy & Multi-User Isolation');
    const userA_Name = 'patient_alice_' + Date.now();
    const userB_Name = 'patient_bob_' + Date.now();

    const regA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userA_Name, password: 'password123' })
    });
    const userA = await regA.json();

    const regB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userB_Name, password: 'password123' })
    });
    const userB = await regB.json();

    console.log(`  ✓ Registered User A: @${userA.user.username}`);
    console.log(`  ✓ Registered User B: @${userB.user.username}`);

    // User A saves a Thyroid Panel
    const saveA = await fetch(`${BASE_URL}/api/reports/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        report_date: '2024-08-12',
        raw_text: 'TSH: 2.4 uIU/mL (Normal, Ref 0.4-4.0)\nFree T4: 1.2 ng/dL (Normal, Ref 0.8-1.8)',
        results: [
          { test_name: 'TSH', value: '2.4', unit: 'uIU/mL', reference_range: '0.4-4.0', status: 'normal', date: '2024-08-12', explanation: 'Thyroid stimulating hormone regulates metabolism.' },
          { test_name: 'Free T4', value: '1.2', unit: 'ng/dL', reference_range: '0.8-1.8', status: 'normal', date: '2024-08-12', explanation: 'Free thyroxine is the active circulating thyroid hormone.' }
        ]
      })
    });
    const saveA_Json = await saveA.json();
    console.log(`  ✓ User A saved Thyroid report (Report ID: ${saveA_Json.reportId})`);

    // Verify User B cannot see User A's TSH
    const userB_TestsRes = await fetch(`${BASE_URL}/api/history/tests`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const userB_Tests = await userB_TestsRes.json();
    if (userB_Tests.tests.length !== 0) {
      throw new Error(`Data leak! User B saw ${userB_Tests.tests.length} tests belonging to User A`);
    }
    console.log(`  ✓ Verified User B has 0 tests in history (Privacy Isolation Confirmed!)`);

    // Verify User A has exactly TSH and Free T4
    const userA_TestsRes = await fetch(`${BASE_URL}/api/history/tests`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const userA_Tests = await userA_TestsRes.json();
    if (userA_Tests.tests.length !== 2) {
      throw new Error(`Expected 2 tests for User A, got ${userA_Tests.tests.length}`);
    }
    console.log(`  ✓ User A sees exactly their 2 tests: ${userA_Tests.tests.map(t => t.test_name).join(', ')}`);

    // Test 5: Report Deletion and Cascading Cleanup
    console.log('\nTEST 5: Saved Report Management & Deletion');
    const delRes = await fetch(`${BASE_URL}/api/reports/saved/${saveA_Json.reportId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const delJson = await delRes.json();
    if (!delJson.success) throw new Error('Failed to delete report');
    console.log('  ✓ Successfully deleted User A report.');

    const userA_AfterDel = await fetch(`${BASE_URL}/api/history/tests`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const userA_AfterDelJson = await userA_AfterDel.json();
    if (userA_AfterDelJson.tests.length !== 0) {
      throw new Error('Tests were not cleaned up after report deletion');
    }
    console.log('  ✓ Verified cascading test records removed.');

    console.log('\n🎉 ALL 5 COMPREHENSIVE E2E PERSISTENCE & HISTORY TESTS PASSED!');
  } finally {
    server.close();
  }
}

runE2ETests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
