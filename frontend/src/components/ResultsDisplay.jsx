import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle, 
  Calendar, 
  FileCode, 
  Clock, 
  RefreshCw,
  Info,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Download,
  FileText,
  BookmarkPlus,
  Check,
  TrendingUp
} from 'lucide-react';
import { generateReportPDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';

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
  const [showRawJson, setShowRawJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      generateReportPDF(results, reportDate);
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
        onRequireAuth('login', 'Please sign in to save this analyzed report to your private history.');
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
      setSaveError(err.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full glass-panel rounded-2xl p-10 border border-slate-800 text-center relative overflow-hidden">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4 py-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">Extracting & Explaining Lab Values...</h3>
            <p className="text-xs text-slate-400">
              Generating plain-language explanations for each lab test without diagnostic language.
            </p>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full animate-pulse w-3/4 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-500/5 text-left">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-red-500/20 text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-base font-bold text-red-400">Extraction Error</h3>
            <p className="text-sm text-red-200/90 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-red-500/20">
              {error}
            </p>
            <p className="text-xs text-slate-400">
              Please check your medical report input or verify backend API key configuration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="w-full glass-panel rounded-2xl p-8 border border-slate-800 text-center">
        <div className="max-w-sm mx-auto flex flex-col items-center space-y-3 py-6">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-500">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-400">Results will appear here after clicking <strong>Analyze Report</strong>.</p>
        </div>
      </div>
    );
  }

  // Count statuses
  const highCount = results.filter(r => r.status === 'high').length;
  const lowCount = results.filter(r => r.status === 'low').length;
  const normalCount = results.filter(r => r.status === 'normal').length;

  return (
    <div className="w-full space-y-6">
      {/* Overview Banner with Save to History & Export PDF Buttons */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-bold text-white">Extracted Lab Panel</h3>
            {reportDate && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-teal-300 border border-slate-700 font-mono">
                <Calendar className="w-3.5 h-3.5" /> Date: {reportDate}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {results.length} total test values extracted with plain-language explanations
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Metrics */}
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> {highCount} High
              </span>
            )}
            {lowCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> {lowCount} Low
              </span>
            )}
            {normalCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {normalCount} Normal
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Save Report to History Button */}
            {isSaved ? (
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Saved to History</span>
                </span>
                {onViewHistory && (
                  <button
                    type="button"
                    onClick={onViewHistory}
                    className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>View Trends</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveToHistory}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                title="Save this report to your private medical history"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Save to History</span>
                  </>
                )}
              </button>
            )}

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download printable PDF summary"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Short Medical Disclaimer Directly Above Results List */}
      <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-amber-300 text-xs flex items-center gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="leading-snug">
          <strong className="font-semibold text-amber-200">Educational Disclaimer:</strong> Explanations below describe what tests measure in plain language. They do not constitute a medical diagnosis or treatment plan. Always consult your doctor regarding lab results.
        </p>
      </div>

      {/* Results Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {results.map((item, index) => {
          const status = (item.status || 'unknown').toLowerCase();
          
          let badgeStyle = "bg-slate-800/80 text-slate-300 border-slate-700";
          let StatusIcon = HelpCircle;
          let borderAccent = "border-slate-800";

          if (status === 'high') {
            badgeStyle = "bg-amber-500/15 text-amber-300 border-amber-500/30";
            StatusIcon = ArrowUpRight;
            borderAccent = "border-l-4 border-l-amber-500";
          } else if (status === 'low') {
            badgeStyle = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
            StatusIcon = ArrowDownRight;
            borderAccent = "border-l-4 border-l-cyan-500";
          } else if (status === 'normal') {
            badgeStyle = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
            StatusIcon = CheckCircle2;
            borderAccent = "border-l-4 border-l-emerald-500";
          }

          return (
            <div 
              key={index}
              className={`glass-panel rounded-2xl p-5 border ${borderAccent} transition-all hover:border-slate-700 flex flex-col justify-between space-y-4 shadow-xl`}
            >
              {/* Header: Test Name & Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-base text-white tracking-tight">{item.test_name || 'Unnamed Test'}</h4>
                  {item.date && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" /> {item.date}
                    </span>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border flex items-center gap-1.5 shrink-0 ${badgeStyle}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status}
                </span>
              </div>

              {/* Value & Reference Range */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 items-center">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Result Value</span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-white tracking-tight font-mono">
                      {item.value !== null && item.value !== undefined ? item.value : '—'}
                    </span>
                    {item.unit && (
                      <span className="text-xs font-medium text-slate-400 font-mono">{item.unit}</span>
                    )}
                  </div>
                </div>

                <div className="border-l border-slate-800 pl-3">
                  <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Reference Range</span>
                  <span className="text-xs font-mono text-slate-200 font-medium block mt-1">
                    {item.reference_range || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Plain Language Explanation */}
              {item.explanation && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-teal-500/20 text-xs text-slate-300 leading-relaxed font-sans space-y-1">
                  <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-[11px] uppercase tracking-wide">
                    <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                    <span>Plain Language Explanation</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {item.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw JSON Debug Viewer */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full p-4 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-teal-400" />
            <span>Raw JSON Payload ({results.length} results with explanations)</span>
          </span>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawJson && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <pre className="text-xs text-teal-300 font-mono max-h-64 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(rawJson || { report_date: reportDate, results }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
