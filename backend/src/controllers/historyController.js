import dbAdapter from '../db/index.js';

/**
 * Get distinct test names seen across the user's saved reports
 */
export const getDistinctTests = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await dbAdapter.query(
      `SELECT 
         test_name,
         test_name_clean,
         unit,
         COUNT(*) as count,
         MIN(date) as earliest_date,
         MAX(date) as latest_date
       FROM test_results
       WHERE user_id = ?
       GROUP BY test_name_clean
       ORDER BY test_name ASC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      tests: rows.map(r => ({
        test_name: r.test_name,
        test_name_clean: r.test_name_clean,
        unit: r.unit,
        count: r.count,
        earliest_date: r.earliest_date,
        latest_date: r.latest_date
      }))
    });
  } catch (error) {
    console.error('[History Controller Error] Failed to get distinct tests:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve test history' });
  }
};

/**
 * Get time-series historical data points for a specific test name
 */
export const getTestTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const { testName } = req.params;

    if (!testName || !testName.trim()) {
      return res.status(400).json({ success: false, error: 'Test name is required' });
    }

    const cleanName = decodeURIComponent(testName).trim().toLowerCase();

    const rows = await dbAdapter.query(
      `SELECT 
         id,
         report_id,
         test_name,
         numeric_value,
         raw_value,
         unit,
         reference_range,
         status,
         date,
         explanation,
         created_at
       FROM test_results
       WHERE user_id = ? AND test_name_clean = ?
       ORDER BY date ASC, created_at ASC`,
      [userId, cleanName]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        test_name: testName,
        points: []
      });
    }

    // Try to extract reference range bounds from the most recent or common reference_range
    let refMin = null;
    let refMax = null;
    const sampleRef = rows.find(r => r.reference_range)?.reference_range || '';
    const rangeMatch = sampleRef.match(/([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)/);
    if (rangeMatch) {
      refMin = parseFloat(rangeMatch[1]);
      refMax = parseFloat(rangeMatch[2]);
    }

    return res.status(200).json({
      success: true,
      test_name: rows[0].test_name,
      unit: rows[0].unit,
      reference_range: sampleRef,
      ref_min: refMin,
      ref_max: refMax,
      points: rows
    });
  } catch (error) {
    console.error('[History Controller Error] Failed to get test trends:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve test trend data' });
  }
};
