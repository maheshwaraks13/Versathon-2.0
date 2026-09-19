import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="w-full rounded-2xl glass-banner p-4 sm:p-5 mb-8 text-amber-200 border-l-4 border-l-amber-500 shadow-xl shadow-amber-950/20">
      <div className="flex items-start space-x-3 sm:space-x-4">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-amber-400 tracking-wide uppercase flex items-center gap-2">
              <span>Important Medical Disclaimer</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-normal">PERSISTENT NOTICE</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
            MedClear translates complex lab values and medical reports into plain language for educational understanding.
            <strong className="text-amber-300 font-semibold"> This tool DOES NOT provide medical diagnoses and DOES NOT recommend treatment.</strong>
          </p>
          <div className="pt-1 flex items-center gap-4 text-xs text-amber-400/80 font-medium">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Educational Use Only
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Consult Your Healthcare Provider
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
