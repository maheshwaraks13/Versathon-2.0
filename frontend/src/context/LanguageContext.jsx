import React, { createContext, useContext, useState, useCallback } from 'react';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

const LOCALES = { en, hi, ta, te, es, fr };

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' }
];

const LanguageContext = createContext(null);

/**
 * Resolve a dot-notation key from the locale dictionary, with optional {placeholder} interpolation.
 * e.g. t('results.testsFound', { count: 5 }) → "5 tests found"
 */
function resolve(dict, key, vars = {}) {
  const parts = key.split('.');
  let value = dict;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return key;
    value = value[part];
  }
  if (typeof value !== 'string') return key;
  // Interpolate {placeholder} patterns
  return value.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('medclear_language');
      if (stored && LOCALES[stored]) return stored;
    } catch (_) {}
    return 'en';
  });

  const setLanguage = useCallback((code) => {
    if (!LOCALES[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem('medclear_language', code);
    } catch (_) {}
  }, []);

  const t = useCallback(
    (key, vars = {}) => resolve(LOCALES[language] || en, key, vars),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
