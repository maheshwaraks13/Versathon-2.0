import { jsPDF } from 'jspdf';

export function generateReportPDF(results, reportDate) {
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
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'MedClear Educational Summary — Not a Medical Diagnosis',
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

  // 1. Title Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('MedClear — Medical Lab Report Summary', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const dateStr = reportDate ? `Report Date: ${reportDate}` : `Generated: ${new Date().toLocaleDateString()}`;
  doc.text(dateStr, margin + 6, y + 16);

  y += 28;

  // 2. Full Medical Disclaimer Box
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.5);

  const disclaimerHeading = 'IMPORTANT MEDICAL DISCLAIMER';
  const disclaimerText = 
    'MedClear is an AI-powered educational tool designed to translate lab values into plain language. ' +
    'This summary DOES NOT constitute a medical diagnosis, clinical opinion, or treatment plan. ' +
    'Always consult a qualified healthcare provider regarding any health condition or lab results.';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 10);
  const disclaimerBoxHeight = 10 + splitDisclaimer.length * 4;

  doc.rect(margin, y, contentWidth, disclaimerBoxHeight, 'FD');

  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(disclaimerHeading, margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 53, 15); // amber-900
  doc.text(splitDisclaimer, margin + 5, y + 11);

  y += disclaimerBoxHeight + 10;

  // 3. Section Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Extracted Test Results & Explanations', margin, y);
  y += 6;

  // Draw divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 4. Test Results Loop
  results.forEach((item, index) => {
    const status = (item.status || 'unknown').toLowerCase();
    
    // Status colors
    let statusBg = [241, 245, 249]; // slate-100
    let statusText = [100, 116, 139]; // slate-500
    let statusLabel = 'UNKNOWN';

    if (status === 'high') {
      statusBg = [254, 243, 199];
      statusText = [180, 83, 9];
      statusLabel = 'HIGH';
    } else if (status === 'low') {
      statusBg = [224, 242, 254];
      statusText = [3, 105, 161];
      statusLabel = 'LOW';
    } else if (status === 'normal') {
      statusBg = [209, 250, 229];
      statusText = [4, 120, 87];
      statusLabel = 'NORMAL';
    }

    // Prepare explanation text split
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const explanationText = item.explanation || 'No explanation available.';
    const splitExplanation = doc.splitTextToSize(`Explanation: ${explanationText}`, contentWidth - 10);
    
    const cardHeight = 28 + splitExplanation.length * 4;

    // Check if card fits on current page
    if (y + cardHeight > pageHeight - 15) {
      doc.addPage();
      y = margin;
    }

    // Draw result card background border
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, cardHeight, 'FD');

    // Test Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(item.test_name || 'Unnamed Test', margin + 5, y + 7);

    // Status Pill
    doc.setFillColor(...statusBg);
    doc.rect(margin + contentWidth - 28, y + 3, 23, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...statusText);
    doc.text(statusLabel, margin + contentWidth - 16.5, y + 7, { align: 'center' });

    // Value & Unit
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const valueStr = `Result: ${item.value !== null && item.value !== undefined ? item.value : '—'} ${item.unit || ''}`;
    doc.text(valueStr.trim(), margin + 5, y + 14);

    // Reference Range
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Reference Range: ${item.reference_range || 'Not specified'}`, margin + 85, y + 14);

    // Explanation Box inside card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 245, 249);
    const expBoxHeight = 4 + splitExplanation.length * 4;
    doc.rect(margin + 4, y + 18, contentWidth - 8, expBoxHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(splitExplanation, margin + 7, y + 23);

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
