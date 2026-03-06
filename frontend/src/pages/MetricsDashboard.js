import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel, statusPillClass } from '../utils/status';

function MetricsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState('single'); // 'single' | 'range'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const fetchMetrics = async () => {
    try {
      setError('');
      setLoading(true);
      let url;
      if (mode === 'range') {
        url = `/metrics/dashboard/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
      } else {
        url = `/metrics/dashboard/?date=${encodeURIComponent(selectedDate)}`;
      }
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError('Failed to load metrics dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const isToday = mode === 'single' && selectedDate === todayStr;
    if (!isToday) return;
    const t = setInterval(fetchMetrics, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, startDate, endDate, mode]);

  const printUrl = mode === 'range'
    ? `/print/metrics?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `/print/metrics?date=${encodeURIComponent(selectedDate)}`;

  const isRange = mode === 'range';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Metrics Dashboard</h1>
            <p className="text-sm text-gray-600">ASC operational metrics</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">← Dashboard</button>
            <button onClick={fetchMetrics} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold">Refresh</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {/* Date controls */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${mode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Single Day
            </button>
            <button
              onClick={() => setMode('range')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${mode === 'range' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Date Range
            </button>
          </div>

          {mode === 'single' ? (
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-semibold text-gray-700">From:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg" />
              <label className="text-sm font-semibold text-gray-700">To:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          )}

          <button
            onClick={() => navigate(printUrl)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold text-sm"
          >
            Print / Export
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading metrics…</p>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">No metrics available.</div>
        ) : isRange ? (
          /* ── RANGE MODE ── */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Total Appointments</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">{data.total_appointments ?? '—'}</div>
                <div className="text-sm text-gray-500 mt-1">{data.start_date} → {data.end_date}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Total Discharged</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">{data.total_discharged ?? '—'}</div>
                <div className="text-sm text-gray-500 mt-1">completed check-ins</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Avg Visit Duration</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">{data.avg_total_visit_minutes ?? '—'}</div>
                <div className="text-sm text-gray-500 mt-1">minutes</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Outcomes by Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(data.outcomes_by_status || []).map((r) => (
                  <div key={r.status} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase">{(r.status || '').replace(/_/g, ' ')}</div>
                    <div className="text-2xl font-bold text-gray-900">{r.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Outcomes by Provider</h2>
              {(data.outcomes_by_provider || []).length === 0 ? (
                <div className="text-gray-600">No provider data for this range.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {data.outcomes_by_provider.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{r.provider_name || 'Unassigned'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{(r.status || '').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-gray-900">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── SINGLE DAY MODE ── */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Avg Total Visit (Today)</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">{data.avg_total_visit_minutes_today ?? '—'}</div>
                <div className="text-sm text-gray-500 mt-1">minutes</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Live Patients</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">
                  {(data.live_counts_by_status || []).reduce((s, r) => s + (r.count || 0), 0)}
                </div>
                <div className="text-sm text-gray-500 mt-1">active check-ins</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Total Appointments</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">{data.today_total_appointments ?? '—'}</div>
                <div className="text-sm text-gray-500 mt-1">scheduled today</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Live Counts by Status</h2>
              <div className="flex flex-wrap gap-3">
                {(data.live_counts_by_status || []).length === 0 ? (
                  <span className="text-gray-600">No live patients.</span>
                ) : (
                  data.live_counts_by_status.map((r) => (
                    <div key={r.status} className="flex items-center gap-2">
                      <span className={statusPillClass(r.status)}>{statusLabel(r.status)}</span>
                      <span className="text-gray-900 font-semibold">{r.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Appointment Outcomes</h2>
              {(data.today_outcomes_by_status || []).length === 0 ? (
                <div className="text-gray-600">No appointments today.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {data.today_outcomes_by_status.map((r) => (
                    <div key={r.status} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase">{(r.status || '').replace(/_/g, ' ')}</div>
                      <div className="text-2xl font-bold text-gray-900">{r.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Today Outcomes by Provider</h2>
              {(data.today_outcomes_by_provider || []).length === 0 ? (
                <div className="text-gray-600">No provider outcomes yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {data.today_outcomes_by_provider.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{r.provider_name || 'Unassigned'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{(r.status || '').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-gray-900">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Longest Waiters</h2>
              {(data.longest_waiters || []).length === 0 ? (
                <div className="text-gray-600">No live waiters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Minutes</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.longest_waiters.map((w) => (
                        <tr key={w.checkin_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700">{w.patient_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{w.mrn}</td>
                          <td className="px-4 py-3 text-sm"><span className={statusPillClass(w.status)}>{statusLabel(w.status)}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-900">{w.minutes_in_status}</td>
                          <td className="px-4 py-3 text-sm">
                            {w.alert
                              ? <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-200">Alert ≥ {w.threshold_minutes}m</span>
                              : <span className="text-gray-500">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <div className="text-xs text-gray-500 text-center">
          Ops-only metrics. No clinical decision-making. All access authenticated + clinic-scoped.
        </div>
      </main>
    </div>
  );
}

export default MetricsDashboard;
