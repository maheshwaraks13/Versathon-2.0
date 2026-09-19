import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DisclaimerBanner() {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-[#F0E8DC] border border-[#E4D8C8] rounded-xl p-5 mb-6 text-[#2C3E42]">
      <div className="flex items-start space-x-3.5">
        <ShieldCheck className="w-5 h-5 text-[#6FA9A3] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-base font-serif font-semibold text-[#2C3E42]">
            {t('disclaimer.heading')}
          </h2>
          <p className="text-sm text-[#2C3E42] leading-relaxed font-sans">
            {t('disclaimer.body')}
          </p>
        </div>
      </div>
    </div>
  );
}
