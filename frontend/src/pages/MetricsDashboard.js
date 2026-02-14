import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel, statusPillClass } from '../utils/status';

function MetricsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get(`/metrics/dashboard/?date=${encodeURIComponent(selectedDate)}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError('Failed to load metrics dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  useEffect(() => {
    fetchMetrics();
    const isToday =
      selectedDate === new Date().toISOString().slice(0, 10);

    if (!isToday) return;

    const t = setInterval(fetchMetrics, 30000); // auto-refresh every 30s
    return () => clearInterval(t);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Metrics Dashboard</h1>
            <p className="text-sm text-gray-600">Ops-only wait times & bottlenecks (auto-refresh)</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Dashboard
            </button>

            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading metrics…</p>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
            No metrics available.
          </div>
        ) : (
          <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="text-sm text-gray-600">
              Viewing metrics for: <span className="font-semibold">{selectedDate}</span>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => navigate(`/print/metrics?date=${encodeURIComponent(selectedDate)}`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
            >
              Print / PDF
            </button>

          </div>
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Avg Total Visit (Today)</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">
                  {data.avg_total_visit_minutes_today ?? '—'}
                </div>
                <div className="text-sm text-gray-500 mt-1">minutes</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Live Patients (All Statuses)</div>
                <div className="mt-2 text-4xl font-bold text-gray-900">
                  {(data.live_counts_by_status || []).reduce((sum, r) => sum + (r.count || 0), 0)}
                </div>
                <div className="text-sm text-gray-500 mt-1">active check-ins</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-semibold text-gray-600">Generated</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}
                </div>
                <div className="text-sm text-gray-500 mt-1">auto-refresh every 30s</div>
              </div>
            </div>

            {/* Counts by status */}
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
            
            {/* Live Counts by Provider */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Live Counts by Provider</h2>

              {(data.live_counts_by_provider_name || []).length === 0 ? (
                <div className="text-gray-600">No provider assignments on live patients yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.live_counts_by_provider_name.map((r) => (
                    <div
                      key={r.provider_name || 'Unassigned'}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                    >
                      <div className="font-semibold text-gray-900">
                        {r.provider_name || 'Unassigned'}
                      </div>
                      <div className="text-xl font-bold text-gray-900">{r.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today Appointment Outcomes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Today’s Appointment Outcomes</h2>
              <p className="text-sm text-gray-600 mb-4">
                {data.today_total_appointments || 0} total appointment(s) scheduled today (clinic-local).
              </p>

              {(data.today_outcomes_by_status || []).length === 0 ? (
                <div className="text-gray-600">No appointments scheduled for today.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.today_outcomes_by_status.map((row) => (
                    <div
                      key={row.status || 'unknown'}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                    >
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {row.status ? row.status.replace(/_/g, ' ') : 'Unknown'}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{row.count}</div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Operational outcomes only (not clinical decision support).
              </p>
            </div>

            {/* Today Outcomes by Provider */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Today Outcomes by Provider</h2>

              {(data.today_outcomes_by_provider || []).length === 0 ? (
                <div className="text-gray-600">No provider outcomes yet for this day.</div>
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
                      {data.today_outcomes_by_provider.map((r, idx) => (
                        <tr key={`${r.provider_name || 'Unassigned'}-${r.status}-${idx}`} className="hover:bg-gray-50">
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

            {/* Longest waiters */}
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
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                            {w.patient_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{w.mrn}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={statusPillClass(w.status)}>{statusLabel(w.status)}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{w.minutes_in_status}</td>
                          <td className="px-4 py-3 text-sm">
                            {w.alert ? (
                              <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-200">
                                Alert ≥ {w.threshold_minutes}m
                              </span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 text-center">
              Ops-only metrics. No clinical decision-making. All access remains authenticated + clinic-scoped.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default MetricsDashboard;
