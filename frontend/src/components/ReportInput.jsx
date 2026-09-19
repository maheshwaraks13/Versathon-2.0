import React, { useState } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
import FileUploadDropzone from './FileUploadDropzone';
import { useLanguage } from '../context/LanguageContext';

const SAMPLE_REPORTS = [
  {
    title: "CBC",
    text: "COMPLETE BLOOD COUNT:\nWBC: 14.2 x10^3/uL (High, Ref 4.5-11.0)\nRBC: 4.80 x10^6/uL (Normal, Ref 4.30-5.90)\nHemoglobin: 11.2 g/dL (Low, Ref 13.5-17.5)\nHematocrit: 34.1 % (Low, Ref 41.0-53.0)\nPlatelets: 245 x10^3/uL (Normal, Ref 150-450)"
  },
  {
    title: "CMP",
    text: "METABOLIC PANEL:\nGlucose, Fasting: 115 mg/dL (High, Ref 70-99)\nBUN: 18 mg/dL (Normal, Ref 7-20)\nCreatinine: 0.9 mg/dL (Normal, Ref 0.6-1.2)\neGFR: 92 mL/min/1.73m2 (Normal, Ref >60)\nALT (SGPT): 58 U/L (High, Ref 7-56)\nAST (SGOT): 28 U/L (Normal, Ref 10-40)"
  }
];

export default function ReportInput({ onAnalyze, reportText, setReportText, isAnalyzing }) {
  const { t } = useLanguage();
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'upload'

  const handleClear = () => {
    setReportText('');
  };

  const handleLoadSample = (sampleText) => {
    setReportText(sampleText);
    setInputMode('text');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze(reportText);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-[#E8EEF0] p-6 shadow-xs font-sans">
      {/* Input Mode Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-[#E8EEF0] pb-4">
        <div>
          <h3 className="text-lg font-serif font-semibold text-[#2C3E42]">{t('input.heading')}</h3>
          <p className="text-xs text-[#6C8287] mt-0.5">
            {t('input.subheading')}
          </p>
        </div>

        {/* Tab Switcher: Paste Text vs Upload Image/PDF */}
        <div className="flex rounded-md bg-[#F0F4F6] p-1 border border-[#E8EEF0]">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              inputMode === 'text'
                ? 'bg-[#6FA9A3] text-white'
                : 'text-[#6C8287] hover:text-[#2C3E42]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('input.tabPasteText')}</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-[#6FA9A3] text-white'
                : 'text-[#6C8287] hover:text-[#2C3E42]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('input.tabUpload')}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Paste Text View */}
      {inputMode === 'text' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#6C8287]">{t('input.pasteHint')}</span>
            {/* Quick Sample Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#6C8287]">{t('input.samplesLabel')}</span>
              {SAMPLE_REPORTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadSample(sample.text)}
                  className="text-[11px] px-2 py-0.5 rounded bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#2C3E42] border border-[#E8EEF0] transition-colors cursor-pointer"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={7}
              placeholder={t('input.placeholder')}
              className="w-full rounded-md bg-[#F7FAFB] border border-[#E8EEF0] p-4 text-xs text-[#2C3E42] placeholder:text-[#6C8287] focus:outline-none focus:border-[#6FA9A3] transition-colors font-mono leading-relaxed"
            />
            {reportText && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-3 right-3 p-1.5 rounded-md text-[#6C8287] hover:text-[#D98E73] hover:bg-[#FBF3F0] transition-colors cursor-pointer"
                title="Clear text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-[#6C8287]">
              {reportText.length > 0 ? (
                <span>{t('input.charactersEntered', { count: reportText.length })}</span>
              ) : (
                <span>{t('input.readyForInput')}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={!reportText.trim() || isAnalyzing}
              className={`px-6 py-2.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                !reportText.trim() || isAnalyzing
                  ? 'bg-[#E8EEF0] text-[#6C8287] cursor-not-allowed'
                  : 'bg-[#6FA9A3] hover:bg-[#5C9892] text-white'
              }`}
            >
              {isAnalyzing ? t('input.analyzingButton') : t('input.analyzeButton')}
            </button>
          </div>
        </form>
      ) : (
        /* Tab 2: Upload Image/PDF View */
        <FileUploadDropzone
          onAnalyze={onAnalyze}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
}
