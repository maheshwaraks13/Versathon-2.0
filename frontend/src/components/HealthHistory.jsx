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
  CheckCircle2, 
  Trash2, 
  FileText, 
  RefreshCw,
  Info
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
      <div className="w-full bg-white rounded-xl border border-[#E8EEF0] p-8 text-center font-sans space-y-5">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#EDF5F4] border border-[#6FA9A3]/30 flex items-center justify-center text-[#6FA9A3] mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#2C3E42]">Private health history & trends</h3>
          <p className="text-xs text-[#6C8287] leading-relaxed">
            Sign in or activate an instant demo profile to store analyzed medical reports and monitor lab biomarkers over time.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => demoLogin && demoLogin()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#6FA9A3] hover:bg-[#5C9892] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Explore demo history
            </button>
            <button
              onClick={onNavigateToAnalyze}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#2C3E42] border border-[#E8EEF0] font-medium text-xs transition-colors cursor-pointer"
            >
              Analyze a report first
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If loading test names
  if (isLoadingTests) {
    return (
      <div className="w-full bg-white rounded-xl border border-[#E8EEF0] p-10 text-center font-sans">
        <RefreshCw className="w-7 h-7 animate-spin text-[#6FA9A3] mx-auto mb-2" />
        <p className="text-xs text-[#6C8287]">Loading your health history records...</p>
      </div>
    );
  }

  // If user has no saved tests yet
  if (testsList.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-[#E8EEF0] p-8 text-center font-sans space-y-4">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#F0F4F6] border border-[#E8EEF0] flex items-center justify-center text-[#6C8287] mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#2C3E42]">No saved lab history yet</h3>
          <p className="text-xs text-[#6C8287] leading-relaxed">
            You haven't saved any analyzed reports under account <strong className="text-[#2C3E42]">@{user?.username}</strong>. 
            Analyze a lab report and click <strong>"Save this report"</strong> to start plotting biomarkers.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onNavigateToAnalyze}
              className="px-5 py-2.5 rounded-md bg-[#6FA9A3] hover:bg-[#5C9892] text-white font-medium text-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Analyze medical report</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare Chart.js data
  const points = trendData?.points || [];
  const validNumericPoints = points.filter(p => p.numeric_value !== null && !isNaN(p.numeric_value));

  // Determine point colors according to status: Soft Coral (#D98E73) for high/low, Dusty Teal (#6FA9A3) for normal
  const pointBgColors = points.map(p => {
    if (p.status === 'high' || p.status === 'low') return '#D98E73';
    return '#6FA9A3';
  });

  const chartData = {
    labels: points.map(p => p.date),
    datasets: [
      {
        label: trendData?.test_name || selectedTest,
        data: points.map(p => p.numeric_value),
        borderColor: '#6FA9A3',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(111, 169, 163, 0.25)');
          gradient.addColorStop(1, 'rgba(111, 169, 163, 0.0)');
          return gradient;
        },
        borderWidth: 2,
        pointBackgroundColor: pointBgColors,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.2,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2C3E42',
        titleColor: '#F7FAFB',
        bodyColor: '#E8EEF0',
        borderColor: '#E8EEF0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context) => {
            const pt = points[context.dataIndex];
            const unitStr = pt?.unit ? ` ${pt.unit}` : '';
            const statusStr = pt?.status ? ` (${pt.status})` : '';
            return `Result: ${pt?.raw_value || context.parsed.y}${unitStr}${statusStr}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(232, 238, 240, 0.6)', drawBorder: false },
        ticks: { color: '#6C8287', font: { family: 'monospace', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(232, 238, 240, 0.6)', drawBorder: false },
        ticks: { color: '#6C8287', font: { family: 'monospace', size: 10 } }
      }
    }
  };

  const latestPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Top Header & View Toggle */}
      <div className="bg-white rounded-xl border border-[#E8EEF0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-[#2C3E42]">Biomarker trends & history</h3>
          <p className="text-xs text-[#6C8287] mt-0.5">
            Historical lab test readings for <strong className="text-[#2C3E42]">@{user?.username}</strong> ({testsList.length} biomarkers tracked)
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-md bg-[#F0F4F6] p-1 border border-[#E8EEF0] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'trends'
                ? 'bg-[#6FA9A3] text-white'
                : 'text-[#6C8287] hover:text-[#2C3E42]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Biomarker charts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-[#6FA9A3] text-white'
                : 'text-[#6C8287] hover:text-[#2C3E42]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Saved reports ({savedReports.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'trends' ? (
        <div className="space-y-6">
          {/* Test Selector Dropdown */}
          <div className="bg-white rounded-xl border border-[#E8EEF0] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="test-select" className="text-xs font-medium text-[#2C3E42] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#6FA9A3]" />
                <span>Select biomarker to view trend:</span>
              </label>

              <div className="relative w-full sm:w-72">
                <select
                  id="test-select"
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full appearance-none rounded-md bg-[#F7FAFB] border border-[#E8EEF0] px-3.5 py-2 text-xs text-[#2C3E42] font-medium focus:outline-none focus:border-[#6FA9A3] transition-colors cursor-pointer pr-8"
                >
                  {testsList.map((test, idx) => (
                    <option key={idx} value={test.test_name}>
                      {test.test_name} ({test.count} {test.count === 1 ? 'reading' : 'readings'})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6C8287]">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Quick Test Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#E8EEF0]">
              <span className="text-[11px] text-[#6C8287]">Quick switch:</span>
              {testsList.slice(0, 6).map((test, idx) => {
                const isSelected = test.test_name === selectedTest;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTest(test.test_name)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EDF5F4] text-[#2C3E42] border-[#6FA9A3]/50 font-medium'
                        : 'bg-[#F0F4F6] hover:bg-[#E8EEF0] text-[#6C8287] border-[#E8EEF0]'
                    }`}
                  >
                    {test.test_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Biomarker Stats Cards */}
          {trendData && points.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-[#E8EEF0] space-y-1">
                <span className="text-xs text-[#6C8287] block font-medium">Latest reading</span>
                <div className="text-xl font-bold text-[#2C3E42] font-mono">
                  {latestPoint?.raw_value || '—'} {trendData.unit || ''}
                </div>
                <span className="text-[11px] text-[#6C8287] block font-mono">{latestPoint?.date}</span>
              </div>

              <div className="bg-white rounded-xl p-4 border border-[#E8EEF0] space-y-1">
                <span className="text-xs text-[#6C8287] block font-medium">Current status</span>
                <div className="text-sm font-semibold mt-1">
                  <span className={latestPoint?.status === 'high' || latestPoint?.status === 'low' ? 'text-[#D98E73]' : 'text-[#6FA9A3]'}>
                    {latestPoint?.status === 'high' ? 'High' : latestPoint?.status === 'low' ? 'Low' : latestPoint?.status === 'normal' ? 'Normal' : 'Unspecified'}
                  </span>
                </div>
                <span className="text-[11px] text-[#6C8287] block">Based on lab reference range</span>
              </div>

              <div className="bg-white rounded-xl p-4 border border-[#E8EEF0] space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs text-[#6C8287] block font-medium">Reference range</span>
                <div className="text-sm text-[#2C3E42] font-mono mt-1">
                  {trendData.reference_range || 'Not specified'}
                </div>
                <span className="text-[11px] text-[#6C8287] block">{points.length} recorded dates</span>
              </div>
            </div>
          )}

          {/* Line Chart Section */}
          <div className="bg-white rounded-xl p-5 border border-[#E8EEF0] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-serif font-semibold text-[#2C3E42]">
                {selectedTest} value over time
              </h4>

              <div className="flex items-center gap-3 text-xs text-[#6C8287]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6FA9A3]"></span> Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D98E73]"></span> Flagged
                </span>
              </div>
            </div>

            {isLoadingTrends ? (
              <div className="h-60 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-[#6FA9A3]" />
              </div>
            ) : validNumericPoints.length > 0 ? (
              <div className="h-64 w-full">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-[#6C8287] text-xs">
                <Info className="w-5 h-5 mb-1.5 text-[#6C8287]" />
                <p>Non-numeric values recorded for this test. View details in table below.</p>
              </div>
            )}
          </div>

          {/* Historical Data Table */}
          <div className="bg-white rounded-xl border border-[#E8EEF0] overflow-hidden">
            <div className="p-4 bg-[#F0F4F6] border-b border-[#E8EEF0] flex items-center justify-between">
              <h4 className="text-xs font-serif font-semibold text-[#2C3E42]">
                Historical table: {selectedTest}
              </h4>
              <span className="text-xs text-[#6C8287]">
                {points.length} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8EEF0] bg-[#FAFAF7] text-[#6C8287] font-medium">
                    <th className="py-2.5 px-4 font-mono">Date</th>
                    <th className="py-2.5 px-4 font-mono">Result value</th>
                    <th className="py-2.5 px-4 font-mono">Reference range</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF0]">
                  {points.map((pt, idx) => {
                    const isFlagged = pt.status === 'high' || pt.status === 'low';
                    const statusText = isFlagged ? 'text-[#D98E73] font-semibold' : 'text-[#6FA9A3] font-medium';
                    const statusLabel = pt.status === 'high' ? 'High' : pt.status === 'low' ? 'Low' : pt.status === 'normal' ? 'Normal' : 'Unspecified';

                    return (
                      <tr key={idx} className="hover:bg-[#F7FAFB] transition-colors">
                        <td className="py-3 px-4 font-mono text-[#2C3E42] whitespace-nowrap">
                          {pt.date}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#2C3E42] font-semibold whitespace-nowrap">
                          {pt.raw_value} {pt.unit || ''}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6C8287] whitespace-nowrap">
                          {pt.reference_range || '—'}
                        </td>
                        <td className={`py-3 px-4 whitespace-nowrap ${statusText}`}>
                          {statusLabel}
                        </td>
                        <td className="py-3 px-4 text-[#2C3E42] max-w-md leading-relaxed">
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
        /* Saved Reports Tab */
        <div className="space-y-4">
          {isLoadingReports ? (
            <div className="bg-white rounded-xl p-8 border border-[#E8EEF0] text-center text-xs text-[#6C8287]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#6FA9A3] mx-auto mb-2" />
              <p>Loading saved reports...</p>
            </div>
          ) : savedReports.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-[#E8EEF0] text-center text-xs text-[#6C8287]">
              <p>No saved reports found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-xl p-5 border border-[#E8EEF0] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#6FA9A3]" />
                        <h4 className="font-serif font-bold text-[#2C3E42] text-sm">
                          Report date: {report.report_date || 'Undated'}
                        </h4>
                      </div>
                      <span className="text-[11px] text-[#6C8287] block mt-0.5">
                        Saved: {new Date(report.created_at).toLocaleDateString()} &bull; {report.test_count} biomarkers
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-1.5 rounded text-[#6C8287] hover:text-[#D98E73] hover:bg-[#FBF3F0] transition-colors cursor-pointer"
                      title="Delete saved report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 rounded-md bg-[#F0F4F6] border border-[#E8EEF0] text-xs space-y-1">
                    <span className="text-[11px] font-medium text-[#2C3E42] block">Included tests:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.results?.map((res, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-white border border-[#E8EEF0] text-[11px] text-[#2C3E42] font-mono"
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
