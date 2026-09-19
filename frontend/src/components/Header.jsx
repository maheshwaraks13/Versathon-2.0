import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, User, LogOut, LogIn, TrendingUp, FileText, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Header({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const { language, setLanguage, t, SUPPORTED_LANGUAGES } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="border-b border-[#E8EEF0] bg-[#F7FAFB] sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab && setActiveTab('analyze')}>
            <div className="w-9 h-9 rounded-lg bg-[#6FA9A3] flex items-center justify-center text-white">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#2C3E42]">{t('appName')}</h1>
              <p className="text-xs text-[#6C8287] font-sans">{t('appTagline')}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {setActiveTab && (
          <div className="flex items-center justify-center bg-[#F0F4F6] p-1 rounded-lg border border-[#E8EEF0]">
            <button
              type="button"
              onClick={() => setActiveTab('analyze')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'analyze'
                  ? 'bg-[#6FA9A3] text-white'
                  : 'text-[#6C8287] hover:text-[#2C3E42]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('nav.analyzeReport')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#6FA9A3] text-white'
                  : 'text-[#6C8287] hover:text-[#2C3E42]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('nav.healthHistory')}</span>
            </button>
          </div>
        )}

        {/* Right side: Language Selector + User Account Actions */}
        <div className="flex items-center space-x-2 justify-end">

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              id="lang-selector-btn"
              onClick={() => setLangMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#6C8287] hover:text-[#2C3E42] border border-[#E8EEF0] text-xs font-medium transition-colors cursor-pointer"
              title="Change language"
              aria-haspopup="listbox"
              aria-expanded={langMenuOpen}
            >
              <Globe className="w-3.5 h-3.5 text-[#6FA9A3]" />
              <span>{currentLang.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {langMenuOpen && (
              <div
                id="lang-dropdown"
                role="listbox"
                className="absolute right-0 mt-1.5 w-40 bg-white border border-[#E8EEF0] rounded-lg shadow-lg overflow-hidden z-50 animate-in"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={language === lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      language === lang.code
                        ? 'bg-[#EDF5F4] text-[#6FA9A3] font-semibold'
                        : 'text-[#2C3E42] hover:bg-[#F0F4F6]'
                    }`}
                  >
                    <span>{lang.label}</span>
                    {language === lang.code && (
                      <span className="text-[#6FA9A3] text-[10px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Account Actions */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#EDF5F4] border border-[#6FA9A3]/30 text-[#2C3E42] text-xs font-sans">
                <User className="w-3.5 h-3.5 text-[#6FA9A3]" />
                <span>@{user?.username}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-md bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#6C8287] hover:text-[#2C3E42] border border-[#E8EEF0] transition-colors cursor-pointer"
                title={t('auth.signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => demoLogin && demoLogin()}
                className="px-3 py-1.5 rounded-md bg-[#EDF5F4] hover:bg-[#E3EFF0] text-[#2C3E42] border border-[#6FA9A3]/30 text-xs font-medium transition-colors cursor-pointer"
                title="One-click demo account"
              >
                {t('auth.tryDemo')}
              </button>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 rounded-md bg-[#6FA9A3] hover:bg-[#5C9892] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('auth.signIn')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
