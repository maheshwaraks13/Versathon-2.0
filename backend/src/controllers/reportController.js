import dbAdapter from '../db/index.js';
import { extractReportWithLLM } from '../services/llmService.js';

export const analyzeReport = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Medical report text is required' });
    }

    console.log('[API] Analyzing medical report text length:', text.length);

    // Call LLM extraction service (with automatic retry on invalid JSON)
    const extractedData = await extractReportWithLLM(text);

    // Persist raw text and extracted JSON to database
    let reportId = null;
    try {
      const dbResult = await dbAdapter.execute(
        'INSERT INTO reports (raw_text, extracted_json) VALUES (?, ?)',
        [text, JSON.stringify(extractedData)]
      );
      reportId = dbResult.lastID;
    } catch (dbErr) {
      console.error('[DB Error] Failed to persist report record:', dbErr.message);
    }

    // Return validated JSON structure matching user request spec:
    // {"report_date": string|null, "results": [...]}
    return res.status(200).json({
      success: true,
      reportId,
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
