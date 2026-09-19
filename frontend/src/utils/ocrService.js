import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg or bundled worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

/**
 * Evaluates whether extracted OCR text meets minimal readability standards
 * or whether it is too blurry, short, or garbled to process.
 */
export function evaluateOcrQuality(text, confidence = null) {
  if (!text || typeof text !== 'string') {
    return {
      isLowQuality: true,
      reason: 'No readable text was detected in the uploaded file.',
      score: 0,
      text: ''
    };
  }

  const cleanText = text.trim();
  
  // 1. Very little text check
  if (cleanText.length < 25) {
    return {
      isLowQuality: true,
      reason: 'Extracted text is too short (under 25 characters). The document may be blank, cropped, or unreadable.',
      score: 10,
      text: cleanText
    };
  }

  // 2. Word count check
  const words = cleanText.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 4) {
    return {
      isLowQuality: true,
      reason: 'Fewer than 4 legible words were found in the scanned document.',
      score: 15,
      text: cleanText
    };
  }

  // 3. Garbled noise detection (ratio of alphanumeric to strange symbols)
  const alphanumericCount = (cleanText.match(/[a-zA-Z0-9]/g) || []).length;
  const totalChars = cleanText.length;
  const alphanumericRatio = alphanumericCount / totalChars;

  if (alphanumericRatio < 0.45) {
    return {
      isLowQuality: true,
      reason: 'The scan produced a high proportion of garbled symbols or visual noise.',
      score: 20,
      text: cleanText
    };
  }

  // 4. Check for at least one number/digit (medical lab reports almost always contain lab values)
  const hasDigits = /[0-9]/.test(cleanText);
  if (!hasDigits && words.length < 10) {
    return {
      isLowQuality: true,
      reason: 'No numerical test values or lab measurements were identified in the image.',
      score: 25,
      text: cleanText
    };
  }

  // 5. OCR Confidence check (if provided by Tesseract)
  if (confidence !== null && confidence !== undefined && confidence > 0) {
    if (confidence < 38) {
      return {
        isLowQuality: true,
        reason: `OCR recognition confidence is extremely low (${Math.round(confidence)}%). The image appears too blurry, dark, or low-resolution.`,
        score: Math.round(confidence),
        text: cleanText
      };
    }
  }

  // Quality check passed
  const calculatedScore = confidence ? Math.round(confidence) : 85;
  return {
    isLowQuality: false,
    reason: 'Text quality is sufficient for medical extraction.',
    score: calculatedScore,
    text: cleanText
  };
}

/**
 * Main OCR & Document parsing function for Image (PNG, JPG, WEBP) and PDF files
 */
export async function processMedicalDocument(file, onProgress = () => {}) {
  if (!file) throw new Error('No file provided for OCR processing');

  const fileType = file.type || '';
  const fileName = file.name.toLowerCase();

  // ----------------------------------------------------
  // Path A: PDF Document Processing
  // ----------------------------------------------------
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    onProgress({ status: 'loading_pdf', progress: 10, message: 'Reading PDF pages...' });

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const numPages = Math.min(pdf.numPages, 5); // Process up to 5 pages
    let fullNativeText = '';
    const pageCanvases = [];

    // Step 1: Check for native digital text layer first
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress({
        status: 'reading_page',
        progress: Math.round(10 + (pageNum / numPages) * 30),
        message: `Analyzing PDF page ${pageNum} of ${numPages}...`
      });

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullNativeText += (pageText ? `\n[Page ${pageNum}]\n` + pageText : '');

      // Also render to canvas in case native text is insufficient
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for sharp OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      pageCanvases.push(canvas);
    }

    // If PDF already contains substantial native digital text, use it directly!
    if (fullNativeText.trim().length >= 80) {
      onProgress({ status: 'completed', progress: 100, message: 'Extracted digital text from PDF.' });
      return {
        text: fullNativeText.trim(),
        confidence: 98,
        source: 'pdf_digital',
        quality: evaluateOcrQuality(fullNativeText.trim(), 98)
      };
    }

    // Otherwise, PDF is a scanned image -> run OCR on page canvases
    onProgress({ status: 'ocr_scanning', progress: 45, message: 'Running OCR on scanned PDF pages...' });
    let combinedOcrText = '';
    let totalConfidence = 0;

    for (let i = 0; i < pageCanvases.length; i++) {
      const pageCanvas = pageCanvases[i];
      const result = await Tesseract.recognize(pageCanvas, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pageProgress = 45 + Math.round((i / pageCanvases.length) * 50 + (m.progress * (50 / pageCanvases.length)));
            onProgress({
              status: 'recognizing',
              progress: pageProgress,
              message: `Scanning page ${i + 1} of ${pageCanvases.length} (${Math.round(m.progress * 100)}%)...`
            });
          }
        }
      });

      combinedOcrText += (combinedOcrText ? '\n\n' : '') + `[Page ${i + 1}]\n` + (result.data.text || '');
      totalConfidence += (result.data.confidence || 0);
    }

    const avgConfidence = pageCanvases.length > 0 ? totalConfidence / pageCanvases.length : 0;
    const quality = evaluateOcrQuality(combinedOcrText, avgConfidence);

    onProgress({ status: 'completed', progress: 100, message: 'OCR processing complete.' });
    return {
      text: combinedOcrText,
      confidence: avgConfidence,
      source: 'pdf_ocr',
      quality
    };
  }

  // ----------------------------------------------------
  // Path B: Image Document Processing (PNG, JPG, WEBP, etc.)
  // ----------------------------------------------------
  onProgress({ status: 'initializing', progress: 15, message: 'Initializing OCR scanner...' });

  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'loading tesseract core') {
        onProgress({ status: 'loading_core', progress: 25, message: 'Loading OCR engine...' });
      } else if (m.status === 'loading language traineddata') {
        onProgress({ status: 'loading_model', progress: 40, message: 'Loading medical language models...' });
      } else if (m.status === 'recognizing text') {
        const p = 50 + Math.round(m.progress * 48);
        onProgress({ status: 'recognizing', progress: p, message: `Reading lab report text (${Math.round(m.progress * 100)}%)...` });
      }
    }
  });

  const extractedText = (result.data?.text || '').trim();
  const confidence = result.data?.confidence || 0;
  const quality = evaluateOcrQuality(extractedText, confidence);

  onProgress({ status: 'completed', progress: 100, message: 'OCR processing complete.' });

  return {
    text: extractedText,
    confidence,
    source: 'image_ocr',
    quality
  };
}
