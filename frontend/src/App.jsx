import React, { useState } from 'react';
import Header from './components/Header';
import DisclaimerBanner from './components/DisclaimerBanner';
import ReportInput from './components/ReportInput';
import ResultsDisplay from './components/ResultsDisplay';
import HealthHistory from './components/HealthHistory';
import AuthModal from './components/AuthModal';
import { AuthProvider } from './context/AuthContext';

function MedClearApp() {
  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' | 'history'
  const [reportText, setReportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedResults, setExtractedResults] = useState(null);
  const [reportDate, setReportDate] = useState(null);
  const [error, setError] = useState(null);
  const [rawJsonData, setRawJsonData] = useState(null);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authModalMessage, setAuthModalMessage] = useState('');

  const handleOpenAuth = (mode = 'login', message = '') => {
    setAuthModalMode(mode);
    setAuthModalMessage(message);
    setAuthModalOpen(true);
  };

  const handleAnalyze = async (textToAnalyze) => {
    setIsAnalyzing(true);
    setError(null);

    console.log('====================================');
    console.log('[MedClear] Sending report for LLM extraction...');
    console.log('====================================');

    try {
      const response = await fetch('http://localhost:5000/api/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server failed to analyze report text.');
      }

      console.log('[MedClear] Received Extracted JSON:', data);
      setExtractedResults(data.results || []);
      setReportDate(data.report_date || null);
      setRawJsonData(data);
    } catch (err) {
      console.error('[MedClear] Analysis error:', err.message);
      setError(err.message || 'An unexpected error occurred during report extraction.');
      setExtractedResults([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'analyze' ? (
          <>
            {/* 1. Persistent Disclaimer Banner */}
            <DisclaimerBanner />

            {/* 2. Text Input Area with Analyze Button */}
            <ReportInput
              reportText={reportText}
              setReportText={setReportText}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />

            {/* 3. Extracted Results Display Card Grid with Save to History & PDF Export */}
            <ResultsDisplay
              results={extractedResults}
              reportDate={reportDate}
              rawText={reportText}
              isLoading={isAnalyzing}
              error={error}
              rawJson={rawJsonData}
              onViewHistory={() => setActiveTab('history')}
              onRequireAuth={handleOpenAuth}
            />
          </>
        ) : (
          /* 4. Health History & Longitudinal Trend Charts */
          <HealthHistory
            onNavigateToAnalyze={() => setActiveTab('analyze')}
          />
        )}
      </main>

      {/* Global Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        message={authModalMessage}
      />

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>MedClear — AI-Powered Medical Lab Report Simplifier & Health History Tracker. Educational tool only.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MedClearApp />
    </AuthProvider>
  );
}
