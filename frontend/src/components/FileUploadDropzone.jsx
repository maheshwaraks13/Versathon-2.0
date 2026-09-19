import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  Eye,
  Sliders,
  Camera,
  FileCheck
} from 'lucide-react';
import { processMedicalDocument, evaluateOcrQuality } from '../utils/ocrService';

export default function FileUploadDropzone({ onAnalyze, isAnalyzing }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // OCR state
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusMessage, setOcrStatusMessage] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [editableText, setEditableText] = useState('');
  const [qualityWarning, setQualityWarning] = useState(null);
  const [showRawOcrAccordion, setShowRawOcrAccordion] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    // Validate file type
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/pdf'
    ];
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isPdf && !isImg) {
      alert('Please upload an image (PNG, JPG, WEBP) or a PDF medical report.');
      return;
    }

    setSelectedFile(file);
    setOcrResult(null);
    setEditableText('');
    setQualityWarning(null);

    // Create preview for images
    if (isImg) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Automatically trigger OCR processing
    runOcr(file);
  };

  const runOcr = async (file) => {
    setIsProcessingOcr(true);
    setOcrProgress(5);
    setOcrStatusMessage('Loading file...');
    setQualityWarning(null);

    try {
      const result = await processMedicalDocument(file, ({ progress, message }) => {
        setOcrProgress(progress || 0);
        setOcrStatusMessage(message || 'Processing...');
      });

      setOcrResult(result);
      setEditableText(result.text || '');

      // Check for low quality or garbled scan
      if (result.quality && result.quality.isLowQuality) {
        setQualityWarning(result.quality);
      } else {
        setQualityWarning(null);
      }
    } catch (err) {
      console.error('[OCR Error]:', err);
      setQualityWarning({
        isLowQuality: true,
        reason: 'Failed to read document: ' + (err.message || 'Unknown processing error.'),
        score: 0,
        text: ''
      });
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setEditableText('');
    setQualityWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProceedToAnalysis = () => {
    if (!editableText.trim()) return;
    onAnalyze(editableText);
  };

  return (
    <div className="w-full space-y-4">
      {/* File Drop Area (Shown when no file is currently selected) */}
      {!selectedFile && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
            dragActive
              ? 'border-teal-400 bg-teal-500/10 scale-[1.01]'
              : 'border-slate-700/80 bg-slate-900/60 hover:bg-slate-900 hover:border-teal-500/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
            onChange={handleChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-lg shadow-teal-500/10">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h4 className="text-base font-bold text-white tracking-tight">
              Upload Medical Report (Image or PDF)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag & drop your lab report scan, doctor note photo, or PDF here, or <span className="text-teal-400 font-semibold underline">browse files</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PNG</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">JPG</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">WEBP</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PDF</span>
          </div>
        </div>
      )}

      {/* Selected File Card & OCR Status */}
      {selectedFile && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl">
          {/* Header row with file info */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shrink-0">
                {selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf') ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Remove file and upload another"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image Thumbnail Preview (if applicable) */}
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden max-h-48 border border-slate-800 bg-slate-950 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-h-48 object-contain rounded-lg"
              />
            </div>
          )}

          {/* OCR In-Progress State */}
          {isProcessingOcr && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-teal-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  <span>{ocrStatusMessage || 'Scanning document...'}</span>
                </span>
                <span className="font-mono font-bold text-teal-400">{ocrProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Low Quality / Garbled Scan Warning */}
          {!isProcessingOcr && qualityWarning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 text-left">
                  <h5 className="text-sm font-bold text-amber-300">
                    Scan Quality Too Low for Reliable Analysis
                  </h5>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {qualityWarning.reason}
                  </p>
                  <p className="text-[11px] text-amber-300/80 pt-1">
                    👉 <strong>Recommendation:</strong> Please upload a clearer, higher-resolution photo or flat scan of your medical report with good lighting, or switch to the <em>"Paste Report Text"</em> tab.
                  </p>
                </div>
              </div>

              {/* Accordion to inspect raw OCR text */}
              {qualityWarning.text && (
                <div className="pt-2 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => setShowRawOcrAccordion(!showRawOcrAccordion)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5"
                  >
                    <span>{showRawOcrAccordion ? 'Hide unreadable OCR text' : 'Inspect unreadable OCR text'}</span>
                  </button>

                  {showRawOcrAccordion && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-amber-500/20 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {qualityWarning.text}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons on low quality */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  Upload Clearer Scan
                </button>
              </div>
            </div>
          )}

          {/* OCR Success & Editable Extracted Text Preview */}
          {!isProcessingOcr && ocrResult && !qualityWarning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OCR Scan Succeeded ({ocrResult.quality?.score}% confidence)</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {editableText.length} characters extracted
                </span>
              </div>

              {/* Editable Textarea so user can adjust before analyzing */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 text-left">
                  Review & edit extracted lab text if needed:
                </label>
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl bg-slate-950/90 border border-slate-700 p-3.5 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                  placeholder="Extracted medical report text..."
                />
              </div>

              {/* Analyze Extracted Text Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Upload different file
                </button>

                <button
                  type="button"
                  onClick={handleProceedToAnalysis}
                  disabled={!editableText.trim() || isAnalyzing}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                    !editableText.trim() || isAnalyzing
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-teal-500/25 active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? 'Extracting Lab Values...' : 'Analyze Extracted Report'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
