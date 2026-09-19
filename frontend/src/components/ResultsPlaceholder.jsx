import React from 'react';
import { Activity, Terminal, CheckCircle2, Clock } from 'lucide-react';

export default function ResultsPlaceholder({ lastLoggedText, logTime }) {
  return (
    <div className="w-full glass-panel rounded-2xl p-8 border border-slate-800 text-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-teal-400 shadow-inner">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white tracking-tight">Analysis Results Area</h3>
          <p className="text-sm text-slate-400">
            Results will appear here
          </p>
        </div>

        {lastLoggedText ? (
          <div className="w-full mt-4 text-left rounded-xl bg-slate-900/90 border border-teal-500/30 p-4 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-teal-400 font-sans font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" /> Logged to Console (Stage 1)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3" /> {logTime}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-1 font-sans">Pasted Content Logged:</p>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 max-h-32 overflow-y-auto whitespace-pre-wrap text-teal-200/90">
              {lastLoggedText}
            </div>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-slate-500 font-mono flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Click "Analyze Report" to log text to developer console</span>
          </div>
        )}
      </div>
    </div>
  );
}
