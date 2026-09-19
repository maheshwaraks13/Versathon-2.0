import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Layers,
  ChevronDown,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Info,
  ShieldAlert
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HealthHistory({ onNavigateToAnalyze }) {
  const { token, user, isAuthenticated, demoLogin } = useAuth();

  const [testsList, setTestsList] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [trendData, setTrendData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);

  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [activeTab, setActiveTab] = useState('trends'); // 'trends' | 'reports'

  // Fetch tests list and saved reports when authenticated
  useEffect(() => {
    if (!token) {
      setTestsList([]);
      setSavedReports([]);
      setSelectedTest('');
      setTrendData(null);
      setIsLoadingTests(false);
      return;
    }

    fetchTestsList();
    fetchSavedReports();
  }, [token]);

  // Fetch trends whenever selectedTest changes
  useEffect(() => {
    if (!token || !selectedTest) {
      setTrendData(null);
      return;
    }
    fetchTrends(selectedTest);
  }, [token, selectedTest]);

  const fetchTestsList = async () => {
    setIsLoadingTests(true);
    try {
      const res = await fetch('http://localhost:5000/api/history/tests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestsList(data.tests || []);
        // Auto-select first test if available and none currently selected
        if (data.tests && data.tests.length > 0) {
          setSelectedTest(prev => {
            const exists = data.tests.some(t => t.test_name === prev);
            return exists ? prev : data.tests[0].test_name;
          });
        } else {
          setSelectedTest('');
          setTrendData(null);
        }
      }
    } catch (err) {
      console.error('[HealthHistory] Fetch tests error:', err);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const fetchSavedReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('http://localhost:5000/api/reports/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      console.error('[HealthHistory] Fetch saved reports error:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchTrends = async (testName) => {
    setIsLoadingTrends(true);
    try {
      const encoded = encodeURIComponent(testName);
      const res = await fetch(`http://localhost:5000/api/history/trends/${encoded}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrendData(data);
      }
    } catch (err) {
      console.error('[HealthHistory] Fetch trends error:', err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this saved report and its lab values?')) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/reports/saved/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSavedReports();
        await fetchTestsList();
      }
    } catch (err) {
      console.error('[HealthHistory] Delete report error:', err);
    }
  };

  // If user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="w-full glass-panel rounded-2xl p-10 border border-slate-800 text-center space-y-6">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Private Health History & Trends</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Sign in or activate an instant demo profile to store analyzed medical reports and monitor lab biomarkers over time.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => demoLogin()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Instant Demo History</span>
            </button>
            <button
              onClick={onNavigateToAnalyze}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Analyze a Report First
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If loading test names
  if (isLoadingTests) {
    return (
      <div className="w-full glass-panel rounded-2xl p-12 border border-slate-800 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-400 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading your health history records...</p>
      </div>
    );
  }

  // If user has no saved tests yet
  if (testsList.length === 0) {
    return (
      <div className="w-full glass-panel rounded-2xl p-10 border border-slate-800 text-center space-y-6">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Saved Lab History Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You haven't saved any analyzed reports under account <strong className="text-teal-300">@{user?.username}</strong>. 
            Analyze a lab report and click <strong>"Save to History"</strong> to start plotting biomarkers.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onNavigateToAnalyze}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Go to Report Analyzer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare Chart.js data
  const points = trendData?.points || [];
  const validNumericPoints = points.filter(p => p.numeric_value !== null && !isNaN(p.numeric_value));

  // Determine point colors according to status
  const pointBgColors = points.map(p => {
    if (p.status === 'high') return '#f59e0b'; // Amber
    if (p.status === 'low') return '#06b6d4';  // Cyan
    if (p.status === 'normal') return '#10b981'; // Emerald
    return '#14b8a6'; // Teal
  });

  const chartData = {
    labels: points.map(p => p.date),
    datasets: [
      {
        label: trendData?.test_name || selectedTest,
        data: points.map(p => p.numeric_value),
        borderColor: '#14b8a6',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(20, 184, 166, 0.35)');
          gradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)');
          return gradient;
        },
        borderWidth: 3,
        pointBackgroundColor: pointBgColors,
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointHoverBorderWidth: 3,
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const pt = points[context.dataIndex];
            const unitStr = pt?.unit ? ` ${pt.unit}` : '';
            const statusStr = pt?.status ? ` [${pt.status.toUpperCase()}]` : '';
            const refStr = pt?.reference_range ? `\nRef: ${pt.reference_range}` : '';
            return `Value: ${pt?.raw_value || context.parsed.y}${unitStr}${statusStr}`;
          },
          afterLabel: (context) => {
            const pt = points[context.dataIndex];
            return pt?.reference_range ? `Reference: ${pt.reference_range}` : '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.35)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { family: 'monospace', size: 11 }
        }
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.35)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { family: 'monospace', size: 11 }
        }
      }
    }
  };

  // Trend analysis calculations
  const latestPoint = points.length > 0 ? points[points.length - 1] : null;
  const firstPoint = points.length > 0 ? points[0] : null;
  let trendDirection = 'stable';
  if (firstPoint && latestPoint && firstPoint.numeric_value !== null && latestPoint.numeric_value !== null) {
    if (latestPoint.numeric_value > firstPoint.numeric_value) trendDirection = 'up';
    else if (latestPoint.numeric_value < firstPoint.numeric_value) trendDirection = 'down';
  }

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Top Header & View Toggle */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-bold text-white tracking-tight">Biomarker Trends & History</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
              {testsList.length} Biomarkers Tracked
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing historical lab test readings for <strong className="text-slate-300">@{user?.username}</strong>
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'trends'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Biomarker Charts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Saved Reports ({savedReports.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'trends' ? (
        <div className="space-y-6">
          {/* Test Selector Dropdown & Quick Chips */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="test-select" className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <span>Select Biomarker / Test:</span>
              </label>

              {/* Styled Dropdown */}
              <div className="relative w-full sm:w-72">
                <select
                  id="test-select"
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-slate-900 border border-teal-500/30 px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all cursor-pointer pr-10"
                >
                  {testsList.map((test, idx) => (
                    <option key={idx} value={test.test_name} className="bg-slate-900 text-white">
                      {test.test_name} ({test.count} {test.count === 1 ? 'reading' : 'readings'})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-teal-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Quick Test Chips for 1-Click Access */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500 font-medium">Quick switch:</span>
              {testsList.slice(0, 6).map((test, idx) => {
                const isSelected = test.test_name === selectedTest;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTest(test.test_name)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    {test.test_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Biomarker Stats Summary Cards */}
          {trendData && points.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Latest Value */}
              <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Latest Reading</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white font-mono">
                    {latestPoint?.raw_value || '—'}
                  </span>
                  {trendData.unit && (
                    <span className="text-xs text-slate-400 font-mono">{trendData.unit}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] text-slate-400 font-mono">{latestPoint?.date}</span>
                </div>
              </div>

              {/* Status */}
              <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Current Status</span>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                    latestPoint?.status === 'high'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : latestPoint?.status === 'low'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : latestPoint?.status === 'normal'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {latestPoint?.status === 'high' && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {latestPoint?.status === 'low' && <ArrowDownRight className="w-3.5 h-3.5" />}
                    {latestPoint?.status === 'normal' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {latestPoint?.status || 'Unknown'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">Based on lab limits</span>
              </div>

              {/* Reference Range */}
              <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Reference Range</span>
                <div className="mt-2 font-mono text-sm font-bold text-slate-200">
                  {trendData.reference_range || 'Not specified'}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">Standard normal interval</span>
              </div>

              {/* Trend Direction */}
              <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Historical Trend</span>
                <div className="mt-2 flex items-center gap-1.5 font-bold text-sm">
                  {trendDirection === 'up' && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Rising (+{points.length} pts)
                    </span>
                  )}
                  {trendDirection === 'down' && (
                    <span className="text-cyan-400 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" /> Decreasing ({points.length} pts)
                    </span>
                  )}
                  {trendDirection === 'stable' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Minus className="w-4 h-4" /> Stable ({points.length} pts)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">{points.length} total recorded dates</span>
              </div>
            </div>
          )}

          {/* Line Chart Section */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {selectedTest} Value Over Time
                </h4>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> High
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Low
                </span>
              </div>
            </div>

            {isLoadingTrends ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
              </div>
            ) : validNumericPoints.length > 0 ? (
              <div className="h-72 w-full pt-2">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
                <Info className="w-6 h-6 mb-2 text-slate-600" />
                <p>Non-numeric data points recorded for this test. View values in table below.</p>
              </div>
            )}
          </div>

          {/* Plain Data Table of date / value / status / explanation */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>Historical Table: {selectedTest}</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                {points.length} chronological {points.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 font-mono">Date</th>
                    <th className="py-3 px-4 font-mono">Measured Value</th>
                    <th className="py-3 px-4 font-mono">Reference Range</th>
                    <th className="py-3 px-4 font-mono">Status</th>
                    <th className="py-3 px-4 font-sans">Plain Language Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {points.map((pt, idx) => {
                    let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                    let StatusIcon = HelpCircle;
                    if (pt.status === 'high') {
                      badgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                      StatusIcon = ArrowUpRight;
                    } else if (pt.status === 'low') {
                      badgeClass = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
                      StatusIcon = ArrowDownRight;
                    } else if (pt.status === 'normal') {
                      badgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                      StatusIcon = CheckCircle2;
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200 whitespace-nowrap flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-400" />
                          <span>{pt.date}</span>
                        </td>

                        {/* Value */}
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                          <span className="font-extrabold text-sm text-white">{pt.raw_value}</span>
                          {pt.unit && (
                            <span className="text-slate-400 text-xs ml-1 font-mono">{pt.unit}</span>
                          )}
                        </td>

                        {/* Reference Range */}
                        <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {pt.reference_range || '—'}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold capitalize border ${badgeClass}`}>
                            <StatusIcon className="w-3 h-3" />
                            {pt.status || 'unknown'}
                          </span>
                        </td>

                        {/* Explanation */}
                        <td className="py-3.5 px-4 text-slate-300 max-w-md leading-relaxed text-[11px]">
                          {pt.explanation || 'Standard lab measurement.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Saved Reports List Tab */
        <div className="space-y-4">
          {isLoadingReports ? (
            <div className="glass-panel rounded-2xl p-10 border border-slate-800 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading saved reports...</p>
            </div>
          ) : savedReports.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">No saved reports found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-400" />
                        <h4 className="font-bold text-white text-sm">
                          Report Date: {report.report_date || 'Undated'}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                        Saved: {new Date(report.created_at).toLocaleDateString()} • {report.test_count} extracted biomarkers
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete saved report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preview snippet of tests */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                      Included Tests:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.results?.map((res, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-[10px] text-slate-300 font-mono"
                        >
                          {res.test_name}: {res.value} {res.unit || ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
