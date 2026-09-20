import { jsPDF } from 'jspdf';

/**
 * Generate a localized PDF report.
 * @param {Array} results - Extracted lab test results
 * @param {string|null} reportDate - Report date string
 * @param {Function} t - Translation function from useLanguage()
 */
export function generateReportPDF(results, reportDate, t) {
  // Provide a safe fallback t() if not supplied (e.g. from old callers)
  const translate = (key, vars = {}) => {
    if (typeof t === 'function') return t(key, vars);
    // minimal en fallback
    const fallbacks = {
      'pdf.title': 'MedClear — Medical Lab Report Summary',
      'pdf.reportDate': `Report Date: ${vars.date || ''}`,
      'pdf.generated': `Generated: ${vars.date || ''}`,
      'pdf.disclaimerHeading': 'MEDICAL DISCLAIMER',
      'pdf.disclaimerBody': 'MedClear is an educational tool. This summary does not constitute a medical diagnosis or treatment plan.',
      'pdf.sectionTitle': 'Extracted Test Results & Explanations',
      'pdf.resultValue': 'Result value:',
      'pdf.referenceRange': 'Reference range:',
      'pdf.notSpecified': 'Not specified',
      'pdf.noExplanation': 'No explanation available.',
      'pdf.footer': 'MedClear Educational Summary — Not a Medical Diagnosis',
      'results.status.high': 'High',
      'results.status.low': 'Low',
      'results.status.normal': 'Normal',
      'results.status.unknown': 'Unspecified',
    };
    if (key === 'pdf.explanation') return `Explanation: ${vars.text || ''}`;
    return fallbacks[key] || key;
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm
  let y = margin;

  // Helper to add page header / footer
  function addHeaderFooter(pageNum, totalPages) {
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(108, 130, 135); // #6C8287
    doc.text(
      translate('pdf.footer'),
      margin,
      pageHeight - 8
    );
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // 1. Header Title Banner (#2C3E42 soft charcoal-teal)
  doc.setFillColor(44, 62, 66); // #2C3E42
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(translate('pdf.title'), margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(232, 238, 240); // #E8EEF0
  const today = new Date().toLocaleDateString();
  const dateStr = reportDate
    ? translate('pdf.reportDate', { date: reportDate })
    : translate('pdf.generated', { date: today });
  doc.text(dateStr, margin + 6, y + 16);

  y += 28;

  // 2. Medical Disclaimer Box (#F0E8DC soft sand)
  doc.setFillColor(240, 232, 220); // #F0E8DC
  doc.setDrawColor(228, 216, 200); // #E4D8C8
  doc.setLineWidth(0.5);

  const disclaimerHeading = translate('pdf.disclaimerHeading');
  const disclaimerText = translate('pdf.disclaimerBody');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 10);
  const disclaimerBoxHeight = 10 + splitDisclaimer.length * 4;

  doc.rect(margin, y, contentWidth, disclaimerBoxHeight, 'FD');

  // Left accent bar (#6FA9A3 dusty teal)
  doc.setFillColor(111, 169, 163);
  doc.rect(margin, y, 1.5, disclaimerBoxHeight, 'F');

  doc.setTextColor(44, 62, 66); // #2C3E42
  doc.text(disclaimerHeading, margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(44, 62, 66);
  doc.text(splitDisclaimer, margin + 5, y + 11);

  y += disclaimerBoxHeight + 10;

  // 3. Section Title
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(44, 62, 66);
  doc.text(translate('pdf.sectionTitle'), margin, y);
  y += 6;

  // Draw divider line
  doc.setDrawColor(232, 238, 240); // #E8EEF0
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 4. Test Results Loop
  results.forEach((item) => {
    const status = (item.status || 'unknown').toLowerCase();
    const isFlagged = status === 'high' || status === 'low';
    
    // Left border accent color: Soft Coral (#D98E73) for high/low, Dusty Teal (#6FA9A3) for normal
    const accentColor = isFlagged ? [217, 142, 115] : [111, 169, 163];

    const statusKey = status === 'high' ? 'high'
      : status === 'low' ? 'low'
      : status === 'normal' ? 'normal'
      : 'unknown';
    const statusLabel = translate(`results.status.${statusKey}`);

    // Prepare explanation text split
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const explanationText = item.explanation || translate('pdf.noExplanation');
    const splitExplanation = doc.splitTextToSize(
      translate('pdf.explanation', { text: explanationText }),
      contentWidth - 10
    );
    
    const cardHeight = 28 + splitExplanation.length * 4;

    // Check if card fits on current page
    if (y + cardHeight > pageHeight - 15) {
      doc.addPage();
      y = margin;
    }

    // Draw result card background border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(232, 238, 240); // #E8EEF0
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, cardHeight, 'FD');

    // Colored left border bar
    doc.setFillColor(...accentColor);
    doc.rect(margin, y, 1.5, cardHeight, 'F');

    // Test Name
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(44, 62, 66);
    doc.text(item.test_name || 'Unnamed Test', margin + 5, y + 7);

    // Status label (Sentence case)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...accentColor);
    doc.text(statusLabel, margin + contentWidth - 5, y + 7, { align: 'right' });

    // Value & Unit
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(108, 130, 135);
    doc.text(translate('pdf.resultValue'), margin + 5, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(44, 62, 66);
    const valueStr = `${item.value !== null && item.value !== undefined ? item.value : '—'} ${item.unit || ''}`;
    doc.text(valueStr.trim(), margin + 5, y + 16);

    // Reference Range
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(108, 130, 135);
    doc.text(translate('pdf.referenceRange'), margin + 85, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(44, 62, 66);
    doc.text(item.reference_range || translate('pdf.notSpecified'), margin + 85, y + 16);

    // Explanation Box inside card
    doc.setFillColor(240, 244, 246); // #F0F4F6
    doc.setDrawColor(232, 238, 240);
    const expBoxHeight = 4 + splitExplanation.length * 4;
    doc.rect(margin + 4, y + 19, contentWidth - 8, expBoxHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(44, 62, 66);
    doc.text(splitExplanation, margin + 7, y + 24);

    y += cardHeight + 4;
  });

  // Calculate total pages and add header/footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeaderFooter(i, totalPages);
  }

  // Trigger browser download
  const filename = `MedClear_Lab_Summary_${reportDate ? reportDate.replace(/[/\\?%*:|"<>]/g, '-') : 'Report'}.pdf`;
  doc.save(filename);
}
