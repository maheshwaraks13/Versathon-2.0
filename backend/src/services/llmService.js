import dotenv from 'dotenv';
dotenv.config();
console.log('Claude key loaded:', !!process.env.ANTHROPIC_API_KEY);
/**
 * System prompt enforcing strict medical extraction boundaries, plain-language explanations, and JSON output
 */
/**
 * Build the system prompt, optionally injecting a language instruction.
 * The explanation field is always generated in the target language by the LLM itself.
 */
function buildSystemPrompt(language = 'en') {
  const LANGUAGE_NAMES = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    es: 'Spanish',
    fr: 'French'
  };
  const langName = LANGUAGE_NAMES[language] || 'English';
  const langInstruction = langName !== 'English'
    ? `\n9. IMPORTANT: Write ALL "explanation" field values in ${langName}. Keep test names, values, units, and reference ranges in their original form — only translate the plain-language explanation sentences.`
    : '';

  return `You are a specialized medical lab report parsing assistant.
Your task is to extract test results from the provided medical report text and provide a short, plain-language explanation for each test in a clean structured JSON format.

HARD CONSTRAINTS & RULES:
1. NEVER diagnose medical conditions or diseases.
2. NEVER recommend treatment, medications, or clinical actions.
3. NEVER speculate about underlying causes or prognosis.
4. Extract every test result found as an object with:
   - "test_name": string | null
   - "value": string | null
   - "unit": string | null
   - "reference_range": string | null
   - "date": string | null
   - "status": "low" | "high" | "normal" | "unknown"
   - "explanation": string | null
5. The "explanation" field MUST be a short 1-2 sentence, plain-language description of what the test measures and what its status (low/normal/high) means in everyday terms. NEVER use diagnostic or treatment language in explanations.
6. Determine "status" strictly based on reference ranges or explicit indicators (e.g. "High", "H", "Low", "L", "Abnormal") in the text. If reference range or status is unclear, set status to "unknown".
7. Use null for any field you cannot confidently read from the text rather than guessing or fabricating data.
8. Return ONLY raw valid JSON matching this exact top-level schema:
{
  "report_date": string | null,
  "results": [
    {
      "test_name": string | null,
      "value": string | null,
      "unit": string | null,
      "reference_range": string | null,
      "date": string | null,
      "status": "low" | "high" | "normal" | "unknown",
      "explanation": string | null
    }
  ]
}${langInstruction}

DO NOT include markdown code blocks, backticks, preambles, notes, or explanations outside the raw JSON object.`;
}

/**
 * Helper to call Claude API (Anthropic)
 */
async function callClaudeAPI(reportText, extraPrompt = '', language = 'en') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const systemPrompt = buildSystemPrompt(language);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${extraPrompt ? extraPrompt + '\n\n' : ''}Extract test results and explanations from this medical report:\n\n${reportText}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

/**
 * Helper to call OpenAI API (GPT-4o / GPT-4o-mini)
 */
async function callOpenAIAPI(reportText, extraPrompt = '', language = 'en') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const systemPrompt = buildSystemPrompt(language);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${extraPrompt ? extraPrompt + '\n\n' : ''}Extract test results and explanations from this medical report:\n\n${reportText}`
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Helper to call Gemini API
 */
async function callGeminiAPI(reportText, extraPrompt = '', language = 'en') {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const systemPrompt = buildSystemPrompt(language);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${extraPrompt ? extraPrompt + '\n\n' : ''}Report to extract:\n${reportText}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Plain-language explanations dictionary for common lab tests in fallback offline mode
 */
function getPlainExplanation(testName, status) {
  const nameLower = (testName || '').toLowerCase();

  if (nameLower.includes('wbc') || nameLower.includes('white blood cell')) {
    if (status === 'high') return 'White blood cells help your body fight infection. A high level indicates your immune system is actively responding to something in your body.';
    if (status === 'low') return 'White blood cells support immune defense. A lower reading means immune cell counts are currently below standard reference levels.';
    return 'White blood cells support your immune system. This normal level indicates balanced immune cell counts.';
  }

  if (nameLower.includes('hemoglobin') || nameLower.includes('hgb')) {
    if (status === 'low') return 'Hemoglobin is the oxygen-carrying protein in red blood cells. A lower reading indicates less oxygen capacity circulating in your bloodstream.';
    if (status === 'high') return 'Hemoglobin carries oxygen in red blood cells. A higher level reflects a greater concentration of red cell proteins in circulation.';
    return 'Hemoglobin is the protein that carries oxygen throughout your body. Your level is within the standard healthy range.';
  }

  if (nameLower.includes('platelet') || nameLower.includes('plt')) {
    if (status === 'high') return 'Platelets are tiny blood cells that help stop bleeding by forming clots. A higher count shows elevated circulating platelet levels.';
    if (status === 'low') return 'Platelets help your blood form clots. A lower count indicates fewer clotting cells available in circulation.';
    return 'Platelets assist in normal blood clotting. Your count is within the standard reference range.';
  }

  if (nameLower.includes('glucose')) {
    if (status === 'high') return 'Glucose measures sugar levels in your blood. A higher value indicates elevated blood sugar relative to standard fasting reference limits.';
    if (status === 'low') return 'Glucose measures blood sugar concentration. A low value means circulating sugar levels are below standard reference thresholds.';
    return 'Glucose measures the amount of sugar in your blood. This result shows sugar levels within the expected normal range.';
  }

  if (nameLower.includes('creatinine')) {
    if (status === 'high') return 'Creatinine is a natural waste product produced by muscles and filtered by the kidneys. A higher level reflects increased waste buildup.';
    return 'Creatinine is a muscle waste product filtered by your kidneys. This result falls within standard reference limits.';
  }

  if (nameLower.includes('alt') || nameLower.includes('ast')) {
    if (status === 'high') return `${testName} is an enzyme primarily found in liver cells. An elevated value indicates increased enzyme activity in circulation.`;
    return `${testName} is a cellular enzyme involved in metabolic processing. Your level is within standard healthy bounds.`;
  }

  // Generic fallback explanation
  if (status === 'high') return `${testName} measures a specific biomarker in your blood. This reading is above the standard reference range provided by the laboratory.`;
  if (status === 'low') return `${testName} measures a specific biomarker in your blood. This reading is below the standard reference range provided by the laboratory.`;
  if (status === 'normal') return `${testName} measures a specific biomarker in your blood. Your result falls within the standard expected reference range.`;
  return `${testName} is a standard laboratory measurement.`;
}

/**
 * Fallback parser for offline demo mode when no API keys are configured yet
 */
function fallbackRuleParser(reportText) {
  console.log('[LLM Service] No API keys configured in .env. Using fallback rule-based extractor with explanations.');
  const lines = reportText.split('\n').filter(l => l.trim().length > 0);
  const results = [];
  let report_date = null;

  for (const line of lines) {
    const dateMatch = line.match(/(?:date|collected|sampled):\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i);
    if (dateMatch && !report_date) {
      report_date = dateMatch[1];
    }

    const match = line.match(/^([A-Za-z0-9\s,\-\(\)\/\.]+?):\s*([0-9\.]+)\s*([A-Za-z0-9\^\/\%]+)?\s*(?:\(([^)]+)\))?/);
    if (match) {
      const test_name = match[1].trim();
      const value = match[2].trim();
      const unit = match[3] ? match[3].trim() : null;
      const details = match[4] || '';

      let status = 'unknown';
      let reference_range = null;

      if (details.toLowerCase().includes('high') || details.toLowerCase().includes(' (h)')) {
        status = 'high';
      } else if (details.toLowerCase().includes('low') || details.toLowerCase().includes(' (l)')) {
        status = 'low';
      } else if (details.toLowerCase().includes('normal')) {
        status = 'normal';
      }

      const refMatch = details.match(/(?:Ref|Reference|Range|Norm):\s*([0-9\.\-\>\<\s]+)/i) || details.match(/([0-9\.]+\s*-\s*[0-9\.]+)/);
      if (refMatch) {
        reference_range = refMatch[1].trim();
      }

      const explanation = getPlainExplanation(test_name, status);

      results.push({
        test_name,
        value,
        unit,
        reference_range,
        date: report_date,
        status,
        explanation
      });
    }
  }

  if (results.length === 0) {
    results.push({
      test_name: "Extracted Sample Value",
      value: "14.2",
      unit: "x10^3/uL",
      reference_range: "4.5-11.0",
      date: report_date,
      status: "high",
      explanation: "This test measures white blood cell concentration in blood circulation. Elevated levels indicate active immune response activity."
    });
  }

  return JSON.stringify({ report_date, results });
}

/**
 * Clean LLM response string
 */
function cleanJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Validate parsed object structure
 */
function validateExtractedReport(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a JSON object');
  }
  if (!Array.isArray(data.results)) {
    throw new Error('JSON response is missing "results" array');
  }
  for (const item of data.results) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid test result item in results array');
    }
    const validStatuses = ['low', 'high', 'normal', 'unknown'];
    if (item.status && !validStatuses.includes(item.status)) {
      item.status = 'unknown';
    }
    if (typeof item.explanation !== 'string') {
      item.explanation = item.explanation ? String(item.explanation) : null;
    }
  }
  return data;
}

/**
 * Main service method: call LLM API with single retry on JSON parse failure
 */
export async function extractReportWithLLM(reportText, language = 'en') {
  const provider = (process.env.LLM_PROVIDER || '').toLowerCase();
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

  console.log(`[LLM Service] Language requested: ${language}`);

  async function invokeModel(extraPrompt = '') {
    if (provider === 'claude' || (hasClaude && !provider)) {
      return await callClaudeAPI(reportText, extraPrompt, language);
    } else if (provider === 'openai' || (hasOpenAI && !provider)) {
      return await callOpenAIAPI(reportText, extraPrompt, language);
    } else if (provider === 'gemini' || (hasGemini && !provider)) {
      return await callGeminiAPI(reportText, extraPrompt, language);
    } else if (hasClaude) {
      return await callClaudeAPI(reportText, extraPrompt, language);
    } else if (hasOpenAI) {
      return await callOpenAIAPI(reportText, extraPrompt, language);
    } else {
      return fallbackRuleParser(reportText);
    }
  }

  // First Attempt
  try {
    const rawResponse = await invokeModel();
    const cleaned = cleanJsonResponse(rawResponse);
    const parsed = JSON.parse(cleaned);
    return validateExtractedReport(parsed);
  } catch (firstError) {
    console.warn('[LLM Service] First attempt failed or produced invalid JSON:', firstError.message);
    console.log('[LLM Service] Retrying extraction once...');

    // Single Retry Attempt
    try {
      const retryPrompt = `IMPORTANT: Your previous output failed JSON validation. Please return strictly valid raw JSON with an "explanation" string for each result item. JSON format: {"report_date": string|null, "results": [...]}`;
      const rawResponse = await invokeModel(retryPrompt);
      const cleanedRetry = cleanJsonResponse(rawResponse);
      const parsedRetry = JSON.parse(cleanedRetry);
      return validateExtractedReport(parsedRetry);
    } catch (secondError) {
      console.error('[LLM Service] Retry attempt also failed:', secondError.message);
      throw new Error(`Failed to extract structured data from medical report after retry. Details: ${secondError.message}`);
    }
  }
}
