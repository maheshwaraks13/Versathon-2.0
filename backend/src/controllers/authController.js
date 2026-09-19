import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbAdapter from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'medclear-dev-secret-key-2024';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim() || !password || !password.trim()) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
    }

    const existingUsers = await dbAdapter.query('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await dbAdapter.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [cleanUsername, passwordHash]
    );

    const user = { id: result.lastID, username: cleanUsername };
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim() || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const rows = await dbAdapter.query('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
};

export const demoLogin = async (req, res) => {
  try {
    const demoUsername = 'demo_patient';
    let rows = await dbAdapter.query('SELECT * FROM users WHERE LOWER(username) = ?', [demoUsername]);
    let user;

    if (!rows || rows.length === 0) {
      const passwordHash = await bcrypt.hash('demo1234', 10);
      const insertResult = await dbAdapter.execute(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [demoUsername, passwordHash]
      );
      user = { id: insertResult.lastID, username: demoUsername };

      // Seed sample historical reports for demo user
      await seedDemoHistory(user.id);
    } else {
      user = rows[0];
      // Check if user has tests seeded; if not, seed them
      const userTests = await dbAdapter.query('SELECT COUNT(*) as count FROM test_results WHERE user_id = ?', [user.id]);
      if (userTests && userTests[0] && userTests[0].count === 0) {
        await seedDemoHistory(user.id);
      }
    }

    const token = generateToken(user);
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, username: user.username },
      isDemo: true
    });
  } catch (err) {
    console.error('[Demo Login Error]:', err);
    return res.status(500).json({ success: false, error: 'Demo login failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    const rows = await dbAdapter.query('SELECT id, username, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: rows[0]
    });
  } catch (err) {
    console.error('[GetMe Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

/**
 * Seed 3 historical lab reports for demo account across different dates
 */
async function seedDemoHistory(userId) {
  const demoReports = [
    {
      date: '2024-01-15',
      rawText: 'COMPLETE BLOOD COUNT & METABOLIC PANEL (Jan 15, 2024):\nHemoglobin: 11.2 g/dL (Low, Ref 13.5-17.5)\nWBC: 14.2 x10^3/uL (High, Ref 4.5-11.0)\nPlatelets: 245 x10^3/uL (Normal, Ref 150-450)\nGlucose, Fasting: 115 mg/dL (High, Ref 70-99)\nCreatinine: 0.9 mg/dL (Normal, Ref 0.6-1.2)\nALT (SGPT): 58 U/L (High, Ref 7-56)',
      results: [
        { test_name: 'Hemoglobin', value: '11.2', unit: 'g/dL', reference_range: '13.5-17.5', status: 'low', date: '2024-01-15', explanation: 'Hemoglobin carries oxygen in red blood cells. A lower reading indicates less oxygen capacity in circulation.' },
        { test_name: 'WBC', value: '14.2', unit: 'x10^3/uL', reference_range: '4.5-11.0', status: 'high', date: '2024-01-15', explanation: 'White blood cells fight infection. An elevated count suggests active immune response activity.' },
        { test_name: 'Platelets', value: '245', unit: 'x10^3/uL', reference_range: '150-450', status: 'normal', date: '2024-01-15', explanation: 'Platelets help blood clot. Your count is within standard healthy reference limits.' },
        { test_name: 'Glucose, Fasting', value: '115', unit: 'mg/dL', reference_range: '70-99', status: 'high', date: '2024-01-15', explanation: 'Glucose measures blood sugar. This value is slightly above the standard fasting range.' },
        { test_name: 'Creatinine', value: '0.9', unit: 'mg/dL', reference_range: '0.6-1.2', status: 'normal', date: '2024-01-15', explanation: 'Creatinine is a muscle waste product filtered by the kidneys. This falls within normal bounds.' },
        { test_name: 'ALT (SGPT)', value: '58', unit: 'U/L', reference_range: '7-56', status: 'high', date: '2024-01-15', explanation: 'ALT is a liver enzyme. A slightly elevated reading indicates mild liver cell stress.' }
      ]
    },
    {
      date: '2024-03-20',
      rawText: 'FOLLOW-UP LAB PANEL (Mar 20, 2024):\nHemoglobin: 12.1 g/dL (Low, Ref 13.5-17.5)\nWBC: 10.8 x10^3/uL (Normal, Ref 4.5-11.0)\nPlatelets: 260 x10^3/uL (Normal, Ref 150-450)\nGlucose, Fasting: 106 mg/dL (High, Ref 70-99)\nCreatinine: 0.95 mg/dL (Normal, Ref 0.6-1.2)\nALT (SGPT): 46 U/L (Normal, Ref 7-56)',
      results: [
        { test_name: 'Hemoglobin', value: '12.1', unit: 'g/dL', reference_range: '13.5-17.5', status: 'low', date: '2024-03-20', explanation: 'Hemoglobin levels improved compared to previous panel but remain slightly below the reference cutoff.' },
        { test_name: 'WBC', value: '10.8', unit: 'x10^3/uL', reference_range: '4.5-11.0', status: 'normal', date: '2024-03-20', explanation: 'White blood cells returned to normal levels, showing resolved immune response.' },
        { test_name: 'Platelets', value: '260', unit: 'x10^3/uL', reference_range: '150-450', status: 'normal', date: '2024-03-20', explanation: 'Platelet levels remain balanced and stable in the normal range.' },
        { test_name: 'Glucose, Fasting', value: '106', unit: 'mg/dL', reference_range: '70-99', status: 'high', date: '2024-03-20', explanation: 'Fasting blood sugar shows a decreasing trend compared to January.' },
        { test_name: 'Creatinine', value: '0.95', unit: 'mg/dL', reference_range: '0.6-1.2', status: 'normal', date: '2024-03-20', explanation: 'Kidney filtration marker remains steady within healthy limits.' },
        { test_name: 'ALT (SGPT)', value: '46', unit: 'U/L', reference_range: '7-56', status: 'normal', date: '2024-03-20', explanation: 'Liver enzyme levels normalized into expected standard ranges.' }
      ]
    },
    {
      date: '2024-06-10',
      rawText: 'ROUTINE CHECKUP LABS (Jun 10, 2024):\nHemoglobin: 13.8 g/dL (Normal, Ref 13.5-17.5)\nWBC: 7.4 x10^3/uL (Normal, Ref 4.5-11.0)\nPlatelets: 230 x10^3/uL (Normal, Ref 150-450)\nGlucose, Fasting: 94 mg/dL (Normal, Ref 70-99)\nCreatinine: 0.88 mg/dL (Normal, Ref 0.6-1.2)\nALT (SGPT): 32 U/L (Normal, Ref 7-56)',
      results: [
        { test_name: 'Hemoglobin', value: '13.8', unit: 'g/dL', reference_range: '13.5-17.5', status: 'normal', date: '2024-06-10', explanation: 'Hemoglobin is now fully within standard healthy reference limits.' },
        { test_name: 'WBC', value: '7.4', unit: 'x10^3/uL', reference_range: '4.5-11.0', status: 'normal', date: '2024-06-10', explanation: 'White blood cell count is well-balanced within the normal range.' },
        { test_name: 'Platelets', value: '230', unit: 'x10^3/uL', reference_range: '150-450', status: 'normal', date: '2024-06-10', explanation: 'Clotting cell counts remain healthy and stable.' },
        { test_name: 'Glucose, Fasting', value: '94', unit: 'mg/dL', reference_range: '70-99', status: 'normal', date: '2024-06-10', explanation: 'Fasting blood glucose is now within normal target reference limits.' },
        { test_name: 'Creatinine', value: '0.88', unit: 'mg/dL', reference_range: '0.6-1.2', status: 'normal', date: '2024-06-10', explanation: 'Kidney function indicators remain consistently healthy.' },
        { test_name: 'ALT (SGPT)', value: '32', unit: 'U/L', reference_range: '7-56', status: 'normal', date: '2024-06-10', explanation: 'Liver enzyme levels are optimal and normal.' }
      ]
    }
  ];

  for (const report of demoReports) {
    const reportRes = await dbAdapter.execute(
      'INSERT INTO reports (user_id, report_date, raw_text, extracted_json) VALUES (?, ?, ?, ?)',
      [userId, report.date, report.rawText, JSON.stringify({ report_date: report.date, results: report.results })]
    );
    const reportId = reportRes.lastID;

    for (const item of report.results) {
      const numVal = parseFloat(item.value);
      const cleanName = (item.test_name || '').trim();
      await dbAdapter.execute(
        `INSERT INTO test_results 
         (report_id, user_id, test_name, test_name_clean, numeric_value, raw_value, unit, reference_range, status, date, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          userId,
          item.test_name,
          cleanName.toLowerCase(),
          isNaN(numVal) ? null : numVal,
          String(item.value),
          item.unit || null,
          item.reference_range || null,
          item.status || 'unknown',
          report.date,
          item.explanation || null
        ]
      );
    }
  }
}
