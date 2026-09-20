import dbAdapter from '../db/index.js';
import { extractReportWithLLM } from '../services/llmService.js';

/**
 * Extract / analyze report text with LLM
 */
export const analyzeReport = async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Medical report text is required' });
    }

    // Sanitize language code — only allow known codes, default to 'en'
    const VALID_LANGS = ['en', 'hi', 'ta', 'te', 'kn', 'ml'];
    const lang = VALID_LANGS.includes(language) ? language : 'en';

    console.log('[API] Analyzing medical report text length:', text.length, '| Language:', lang);

    // Call LLM extraction service with language
    const extractedData = await extractReportWithLLM(text, lang);

    return res.status(200).json({
      success: true,
      report_date: extractedData.report_date || null,
      results: extractedData.results || []
    });

  } catch (error) {
    console.error('[API Controller Error] Report analysis failed:', error.message);
    return res.status(422).json({
      success: false,
      error: error.message || 'Failed to extract valid report data. Please verify report format.'
    });
  }
};

/**
 * Save an analyzed report and its individual test items for the authenticated user
 */
export const saveReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { report_date, raw_text, results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, error: 'Cannot save an empty report.' });
    }

    const effectiveDate = report_date || new Date().toISOString().split('T')[0];
    const fullJson = JSON.stringify({
      report_date: effectiveDate,
      results
    });

    // 1. Insert into reports table
    const reportResult = await dbAdapter.execute(
      'INSERT INTO reports (user_id, report_date, raw_text, extracted_json) VALUES (?, ?, ?, ?)',
      [userId, effectiveDate, raw_text || '', fullJson]
    );
    const reportId = reportResult.lastID;

    // 2. Insert into normalized test_results table
    for (const item of results) {
      if (!item || !item.test_name) continue;

      const rawVal = item.value !== null && item.value !== undefined ? String(item.value).trim() : '';
      // Parse numeric value if possible (e.g. "14.2" or "115")
      const numMatch = rawVal.match(/^-?[0-9]+(?:\.[0-9]+)?/);
      const numericValue = numMatch ? parseFloat(numMatch[0]) : null;

      const itemDate = item.date || effectiveDate;
      const cleanName = item.test_name.trim();

      await dbAdapter.execute(
        `INSERT INTO test_results 
         (report_id, user_id, test_name, test_name_clean, numeric_value, raw_value, unit, reference_range, status, date, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          userId,
          item.test_name,
          cleanName.toLowerCase(),
          numericValue,
          rawVal,
          item.unit || null,
          item.reference_range || null,
          item.status || 'unknown',
          itemDate,
          item.explanation || null
        ]
      );
    }

    return res.status(201).json({
      success: true,
      reportId,
      message: 'Report and test values saved to your private history.'
    });

  } catch (error) {
    console.error('[API Controller Error] Failed to save report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save report to database.'
    });
  }
};

/**
 * Get all saved reports for the authenticated user
 */
export const getSavedReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await dbAdapter.query(
      'SELECT id, report_date, raw_text, extracted_json, created_at FROM reports WHERE user_id = ? ORDER BY report_date DESC, created_at DESC',
      [userId]
    );

    const reports = rows.map((r) => {
      let parsed = { results: [] };
      try {
        parsed = JSON.parse(r.extracted_json || '{}');
      } catch (e) {}

      return {
        id: r.id,
        report_date: r.report_date,
        created_at: r.created_at,
        raw_text: r.raw_text,
        test_count: parsed.results ? parsed.results.length : 0,
        results: parsed.results || []
      };
    });

    return res.status(200).json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('[API Controller Error] Failed to fetch saved reports:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch saved reports.' });
  }
};

/**
 * Delete a specific saved report
 */
export const deleteSavedReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Delete test_results first
    await dbAdapter.execute('DELETE FROM test_results WHERE report_id = ? AND user_id = ?', [id, userId]);
    // Delete report
    const result = await dbAdapter.execute('DELETE FROM reports WHERE id = ? AND user_id = ?', [id, userId]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Report not found or not authorized.' });
    }

    return res.status(200).json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('[API Controller Error] Failed to delete report:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete report.' });
  }
};
