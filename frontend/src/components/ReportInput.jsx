import React, { useState } from 'react';
import { FileText, Send, Sparkles, Trash2, ClipboardCheck, ArrowRight, Upload, Sliders } from 'lucide-react';
import FileUploadDropzone from './FileUploadDropzone';

const SAMPLE_REPORTS = [
  {
    title: "Complete Blood Count (CBC)",
    text: "COMPLETE BLOOD COUNT (Date: 2024-05-14):\nWBC: 14.2 x10^3/uL (High, Ref 4.5-11.0)\nRBC: 4.80 x10^6/uL (Normal, Ref 4.30-5.90)\nHemoglobin: 11.2 g/dL (Low, Ref 13.5-17.5)\nHematocrit: 34.1 % (Low, Ref 41.0-53.0)\nPlatelets: 245 x10^3/uL (Normal, Ref 150-450)"
  },
  {
    title: "Comprehensive Metabolic Panel (CMP)",
    text: "METABOLIC PANEL (Date: 2024-05-14):\nGlucose, Fasting: 115 mg/dL (High, Ref 70-99)\nBUN: 18 mg/dL (Normal, Ref 7-20)\nCreatinine: 0.9 mg/dL (Normal, Ref 0.6-1.2)\neGFR: 92 mL/min/1.73m2 (Normal, Ref >60)\nALT (SGPT): 58 U/L (High, Ref 7-56)\nAST (SGOT): 28 U/L (Normal, Ref 10-40)"
  }
];

export default function ReportInput({ onAnalyze, reportText, setReportText, isAnalyzing }) {
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'upload'
  const [copiedSample, setCopiedSample] = useState(false);

  const handleClear = () => {
    setReportText('');
  };

  const handleLoadSample = (sampleText) => {
    setReportText(sampleText);
    setInputMode('paste');
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze(reportText);
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-5">
      {/* Header with Dual Input Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            {inputMode === 'paste' ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Input Medical Report</h3>
            <p className="text-xs text-slate-400">
              {inputMode === 'paste' 
                ? 'Paste raw lab results, physician notes, or diagnostic panels'
                : 'Upload a clear photo, image, or PDF document for OCR processing'}
            </p>
          </div>
        </div>

        {/* Input Switcher Tab/Toggle */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'paste'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image or PDF</span>
          </button>
        </div>
      </div>

      {/* Input Mode 1: Paste Text */}
      {inputMode === 'paste' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Sample Presets */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Quick sample:</span>
              {SAMPLE_REPORTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadSample(sample.text)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer text-[11px]"
                >
                  {sample.title}
                </button>
              ))}
            </div>

            {copiedSample && (
              <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                <ClipboardCheck className="w-3.5 h-3.5" /> Sample loaded!
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={8}
              placeholder="e.g., Hemoglobin 11.2 g/dL (Low, Ref 13.5-17.5), WBC 14.5 x10^3/uL, Date: 2024-05-14..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-mono leading-relaxed"
            />
            {reportText && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                title="Clear text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-400">
              {reportText.length > 0 ? (
                <span className="text-slate-300 font-mono">{reportText.length} characters entered</span>
              ) : (
                <span>Ready for input</span>
              )}
            </div>

            <button
              type="submit"
              disabled={!reportText.trim() || isAnalyzing}
              className={`px-6 py-3 rounded-xl font-semibold text-sm flex items-center space-x-2 transition-all shadow-lg ${
                !reportText.trim() || isAnalyzing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-teal-500/25 glow-teal active:scale-[0.98] cursor-pointer'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? 'Processing...' : 'Analyze Report'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        /* Input Mode 2: Upload Image or PDF */
        <FileUploadDropzone
          onAnalyze={onAnalyze}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
}
