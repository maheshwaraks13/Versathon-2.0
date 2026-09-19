import React, { useState } from 'react';
import Header from './components/Header';
import DisclaimerBanner from './components/DisclaimerBanner';
import ReportInput from './components/ReportInput';
import ResultsDisplay from './components/ResultsDisplay';

export default function App() {
  const [reportText, setReportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedResults, setExtractedResults] = useState(null);
  const [reportDate, setReportDate] = useState(null);
  const [error, setError] = useState(null);
  const [rawJsonData, setRawJsonData] = useState(null);

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
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. Persistent, Unmissable Disclaimer Banner (Shown BEFORE input or results) */}
        <DisclaimerBanner />

        {/* 2. Text Input Area with Working Analyze Button */}
        <ReportInput
          reportText={reportText}
          setReportText={setReportText}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />

        {/* 3. Extracted Results Display Card Grid */}
        <ResultsDisplay
          results={extractedResults}
          reportDate={reportDate}
          isLoading={isAnalyzing}
          error={error}
          rawJson={rawJsonData}
        />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>MedClear — AI-Powered Medical Lab Report Simplifier. Educational tool only.</p>
      </footer>
    </div>
  );
}
