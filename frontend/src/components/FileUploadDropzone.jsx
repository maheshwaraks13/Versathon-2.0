import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { processMedicalDocument } from '../utils/ocrService';
import { useLanguage } from '../context/LanguageContext';

export default function FileUploadDropzone({ onAnalyze, isAnalyzing }) {
  const { t } = useLanguage();
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

    if (isImg) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

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
        setOcrStatusMessage(message || 'Processing document...');
      });

      setOcrResult(result);
      setEditableText(result.text || '');

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
    <div className="w-full space-y-4 font-sans text-[#2C3E42]">
      {/* File Drop Area (Shown when no file is selected) */}
      {!selectedFile && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            dragActive
              ? 'border-[#6FA9A3] bg-[#EDF5F4]'
              : 'border-[#E8EEF0] bg-[#F7FAFB] hover:bg-[#F0F4F6] hover:border-[#6FA9A3]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
            onChange={handleChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-[#EDF5F4] border border-[#6FA9A3]/30 flex items-center justify-center text-[#6FA9A3]">
            <Upload className="w-6 h-6" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h4 className="text-base font-serif font-semibold text-[#2C3E42]">
              {t('upload.dragDrop')}
            </h4>
            <p className="text-xs text-[#6C8287] leading-relaxed">
              {t('upload.orBrowse')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#6C8287]">
            <span className="px-2 py-0.5 rounded bg-[#F0F4F6] border border-[#E8EEF0]">PNG</span>
            <span className="px-2 py-0.5 rounded bg-[#F0F4F6] border border-[#E8EEF0]">JPG</span>
            <span className="px-2 py-0.5 rounded bg-[#F0F4F6] border border-[#E8EEF0]">WEBP</span>
            <span className="px-2 py-0.5 rounded bg-[#F0F4F6] border border-[#E8EEF0]">PDF</span>
          </div>
        </div>
      )}

      {/* Selected File Card & Processing View */}
      {selectedFile && (
        <div className="rounded-xl border border-[#E8EEF0] bg-white p-5 space-y-4 shadow-xs">
          {/* Header row with file info */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-[#F0F4F6] border border-[#E8EEF0] flex items-center justify-center text-[#6FA9A3] shrink-0">
                {selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf') ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-serif font-semibold text-[#2C3E42] truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </h4>
                <p className="text-[11px] text-[#6C8287]">
                  {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || 'Document'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-md text-[#6C8287] hover:text-[#D98E73] hover:bg-[#FBF3F0] transition-colors cursor-pointer"
              title="Remove file and upload another"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="rounded-lg overflow-hidden max-h-48 border border-[#E8EEF0] bg-[#F7FAFB] flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-h-44 object-contain rounded"
              />
            </div>
          )}

          {/* OCR In-Progress State */}
          {isProcessingOcr && (
            <div className="p-4 rounded-lg bg-[#EDF5F4] border border-[#6FA9A3]/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#2C3E42] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6FA9A3]" />
                  <span>{ocrStatusMessage || 'Scanning document...'}</span>
                </span>
                <span className="font-mono text-[#6FA9A3] font-semibold">{ocrProgress}%</span>
              </div>
              <div className="w-full bg-[#E8EEF0] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#6FA9A3] h-full rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Low Quality Warning */}
          {!isProcessingOcr && qualityWarning && (
            <div className="p-4 rounded-lg bg-[#FBF3F0] border border-[#F4DCD5] border-l-4 border-l-[#D98E73] text-[#2C3E42] space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#D98E73] shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 text-left">
                  <h5 className="text-xs font-semibold text-[#D98E73]">
                    Scan quality notice
                  </h5>
                  <p className="text-xs text-[#2C3E42] leading-relaxed">
                    {qualityWarning.reason}
                  </p>
                  <p className="text-[11px] text-[#6C8287] pt-1">
                    Recommendation: Please upload a clearer, higher-resolution photo or flat scan of your medical report, or switch to the <em>"Paste Text"</em> tab.
                  </p>
                </div>
              </div>

              {qualityWarning.text && (
                <div className="pt-2 border-t border-[#F4DCD5]">
                  <button
                    type="button"
                    onClick={() => setShowRawOcrAccordion(!showRawOcrAccordion)}
                    className="text-[11px] text-[#6C8287] hover:text-[#2C3E42] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showRawOcrAccordion ? 'Hide extracted text' : 'Inspect extracted text'}</span>
                    {showRawOcrAccordion ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showRawOcrAccordion && (
                    <div className="mt-2 p-3 rounded bg-white border border-[#E8EEF0] text-xs font-mono text-[#2C3E42] max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {qualityWarning.text}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-1.5 rounded-md bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#2C3E42] text-xs font-medium transition-colors cursor-pointer"
                >
                  {t('upload.changeFile')}
                </button>
              </div>
            </div>
          )}

          {/* OCR Success & Extracted Text Review */}
          {!isProcessingOcr && ocrResult && !qualityWarning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6FA9A3] font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Document scan complete ({ocrResult.quality?.score}% confidence)</span>
                </span>
                <span className="text-[#6C8287] font-mono text-[11px]">
                  {editableText.length} characters extracted
                </span>
              </div>

              <div>
                <label className="block text-xs text-[#6C8287] mb-1 text-left font-medium">
                  Review and edit extracted lab text if needed:
                </label>
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  rows={5}
                  className="w-full rounded-md bg-[#F7FAFB] border border-[#E8EEF0] p-3 text-xs text-[#2C3E42] font-mono leading-relaxed focus:outline-none focus:border-[#6FA9A3] transition-colors"
                  placeholder="Extracted medical report text..."
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-[#6C8287] hover:text-[#2C3E42] transition-colors cursor-pointer"
                >
                  {t('upload.changeFile')}
                </button>

                <button
                  type="button"
                  onClick={handleProceedToAnalysis}
                  disabled={!editableText.trim() || isAnalyzing}
                  className={`px-6 py-2.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    !editableText.trim() || isAnalyzing
                      ? 'bg-[#E8EEF0] text-[#6C8287] cursor-not-allowed'
                      : 'bg-[#6FA9A3] hover:bg-[#5C9892] text-white'
                  }`}
                >
                  {isAnalyzing ? t('upload.analyzingButton') : t('upload.analyzeButton')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
