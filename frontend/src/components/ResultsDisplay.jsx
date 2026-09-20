import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Download, 
  FileCode, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  BookmarkPlus,
  Check,
  TrendingUp,
  Clock
} from 'lucide-react';
import { generateReportPDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ResultsDisplay({ 
  results, 
  reportDate, 
  rawText, 
  isLoading, 
  error, 
  rawJson,
  onViewHistory,
  onRequireAuth 
}) {
  const { token, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [showRawJson, setShowRawJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      generateReportPDF(results, reportDate, t);
    } catch (err) {
      console.error('[PDF Export Error]:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth('login', t('results.requireAuth'));
      }
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('http://localhost:5000/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          report_date: reportDate || new Date().toISOString().split('T')[0],
          raw_text: rawText || '',
          results: results
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save report to database.');
      }

      setIsSaved(true);
    } catch (err) {
      console.error('[Save Error]:', err);
      setSaveError(err.message || t('results.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl border border-[#E8EEF0] p-8 text-center font-sans">
        <div className="max-w-md mx-auto flex flex-col items-center space-y-3 py-6">
          <RefreshCw className="w-7 h-7 animate-spin text-[#6FA9A3]" />
          <h3 className="text-base font-serif font-semibold text-[#2C3E42]">{t('results.loading.heading')}</h3>
          <p className="text-xs text-[#6C8287]">
            {t('results.loading.subheading')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-[#FBF3F0] border border-[#F4DCD5] border-l-4 border-l-[#D98E73] rounded-xl p-5 text-left font-sans">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-[#D98E73] shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="text-base font-serif font-semibold text-[#D98E73]">{t('results.error.heading')}</h3>
            <p className="text-xs text-[#2C3E42] leading-relaxed font-mono bg-white p-3 rounded-md border border-[#F4DCD5]">
              {error}
            </p>
            <p className="text-xs text-[#6C8287]">
              {t('results.error.hint')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-[#E8EEF0] p-8 text-center font-sans">
        <p className="text-sm text-[#6C8287]">
          {t('results.empty')}
        </p>
      </div>
    );
  }

  // Count flagged (high/low)
  const flaggedCount = results.filter(r => r.status === 'high' || r.status === 'low').length;

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Overview Banner & Actions */}
      <div className="bg-white rounded-xl border border-[#E8EEF0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-[#2C3E42]">
            {t('results.heading')}
          </h3>
          <p className="text-xs text-[#6C8287] mt-0.5">
            {t('results.testsFound', { count: results.length })}
            {reportDate ? ` \u2022 ${t('results.reportDate', { date: reportDate })}` : ''}
            {flaggedCount > 0
              ? ` \u2022 ${flaggedCount > 1
                  ? t('results.flaggedValuesPlural', { count: flaggedCount })
                  : t('results.flaggedValues', { count: flaggedCount })}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Save Report to History Button */}
          {isSaved ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 rounded-md bg-[#EDF5F4] text-[#2C3E42] border border-[#6FA9A3]/30 text-xs font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#6FA9A3]" />
                <span>{t('results.savedToHistory')}</span>
              </span>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="px-3 py-2 rounded-md bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#2C3E42] border border-[#E8EEF0] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#6FA9A3]" />
                  <span>{t('results.viewTrends')}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-[#6FA9A3] hover:bg-[#5C9892] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Save this report to your private medical history"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('results.savingReport')}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{t('results.saveReport')}</span>
                </>
              )}
            </button>
          )}

          {/* Export PDF Download Summary Button */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-md bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#2C3E42] border border-[#E8EEF0] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download printable PDF summary"
          >
            <Download className="w-3.5 h-3.5 text-[#6C8287]" />
            <span>{isExporting ? t('results.generating') : t('results.downloadSummary')}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-md bg-[#FBF3F0] border border-[#F4DCD5] text-[#D98E73] text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Repeated Reassuring Medical Disclaimer directly above results list */}
      <div className="w-full bg-[#F0E8DC] border border-[#E4D8C8] rounded-xl p-4 text-xs text-[#2C3E42] flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-[#6FA9A3] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-serif font-semibold">{t('results.disclaimer.heading')}</strong>{' '}
          {t('results.disclaimer.body')}
        </p>
      </div>

      {/* Results Cards List: Soft left border-accent (#6FA9A3 for normal, #D98E73 for high/low) */}
      <div className="space-y-4">
        {results.map((item, index) => {
          const status = (item.status || 'unknown').toLowerCase();
          const isFlagged = status === 'high' || status === 'low';

          // Soft left border-accent: Dusty Teal (#6FA9A3) if normal, Soft Coral (#D98E73) if high/low
          const leftBorderColor = isFlagged ? 'border-l-[#D98E73]' : 'border-l-[#6FA9A3]';
          const statusTextColor = isFlagged ? 'text-[#D98E73] font-semibold' : 'text-[#6FA9A3] font-medium';

          const statusKey = status === 'high' ? 'high'
            : status === 'low' ? 'low'
            : status === 'normal' ? 'normal'
            : 'unknown';
          const statusLabel = t(`results.status.${statusKey}`);

          return (
            <div 
              key={index}
              className={`bg-white rounded-xl border border-[#E8EEF0] border-l-4 ${leftBorderColor} p-5 space-y-3 transition-colors hover:border-[#D4E0E3]`}
            >
              {/* Top Row: Test Name & Status */}
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#2C3E42]">
                    {item.test_name || 'Unnamed Test'}
                  </h4>
                  {item.date && (
                    <span className="text-[11px] text-[#6C8287] flex items-center gap-1 mt-0.5 font-mono">
                      <Clock className="w-3 h-3 text-[#6C8287]" /> {item.date}
                    </span>
                  )}
                </div>
                <span className={`text-xs ${statusTextColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Data Row: Sentence case labels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-3 bg-[#F0F4F6] rounded-md border border-[#E8EEF0] text-xs">
                <div>
                  <span className="text-[#6C8287] block">{t('results.resultValue')}</span>
                  <span className="text-sm font-semibold text-[#2C3E42] font-mono mt-0.5 block">
                    {item.value !== null && item.value !== undefined ? item.value : '—'} {item.unit || ''}
                  </span>
                </div>

                <div>
                  <span className="text-[#6C8287] block">{t('results.referenceRange')}</span>
                  <span className="text-sm text-[#2C3E42] font-mono mt-0.5 block">
                    {item.reference_range || t('results.notSpecified')}
                  </span>
                </div>
              </div>

              {/* Explanation Section */}
              {item.explanation && (
                <div className="pt-1 text-xs text-[#2C3E42] leading-relaxed">
                  <span className="font-semibold text-[#2C3E42] block mb-0.5">{t('results.explanation')}</span>
                  <p>{item.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw JSON Debug Viewer */}
      <div className="bg-white rounded-xl border border-[#E8EEF0] overflow-hidden">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full p-3.5 flex items-center justify-between text-xs text-[#6C8287] hover:text-[#2C3E42] hover:bg-[#F0F4F6] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#6FA9A3]" />
            <span>{t('results.rawJson', { count: results.length })}</span>
          </span>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawJson && (
          <div className="p-4 bg-[#2C3E42] text-[#E8EEF0] border-t border-[#E8EEF0]">
            <pre className="text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(rawJson || { report_date: reportDate, results }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
