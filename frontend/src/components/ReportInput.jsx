import React, { useState } from 'react';
import { FileText, Send, Sparkles, Trash2, ClipboardCheck, ArrowRight } from 'lucide-react';

const SAMPLE_REPORTS = [
  {
    title: "Complete Blood Count (CBC)",
    text: "COMPLETE BLOOD COUNT:\nWBC: 14.2 x10^3/uL (High, Ref 4.5-11.0)\nRBC: 4.80 x10^6/uL (Normal, Ref 4.30-5.90)\nHemoglobin: 11.2 g/dL (Low, Ref 13.5-17.5)\nHematocrit: 34.1 % (Low, Ref 41.0-53.0)\nPlatelets: 245 x10^3/uL (Normal, Ref 150-450)"
  },
  {
    title: "Comprehensive Metabolic Panel (CMP)",
    text: "METABOLIC PANEL:\nGlucose, Fasting: 115 mg/dL (High, Ref 70-99)\nBUN: 18 mg/dL (Normal, Ref 7-20)\nCreatinine: 0.9 mg/dL (Normal, Ref 0.6-1.2)\neGFR: 92 mL/min/1.73m2 (Normal, Ref >60)\nALT (SGPT): 58 U/L (High, Ref 7-56)\nAST (SGOT): 28 U/L (Normal, Ref 10-40)"
  }
];

export default function ReportInput({ onAnalyze, reportText, setReportText, isAnalyzing }) {
  const [copiedSample, setCopiedSample] = useState(false);

  const handleClear = () => {
    setReportText('');
  };

  const handleLoadSample = (sampleText) => {
    setReportText(sampleText);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze(reportText);
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 shadow-2xl border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Input Medical Report</h3>
            <p className="text-xs text-slate-400">Paste raw lab results, physician notes, or diagnostic panels below</p>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Try sample:</span>
          {SAMPLE_REPORTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadSample(sample.text)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={8}
            placeholder="e.g., Hemoglobin 11.2 g/dL (Low, Ref 13.5-17.5), WBC 14.5 x10^3/uL..."
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

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            {reportText.length > 0 ? (
              <span className="text-slate-300">{reportText.length} characters entered</span>
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
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-teal-500/25 glow-teal active:scale-[0.98]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAnalyzing ? 'Processing...' : 'Analyze Report'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
