import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel } from '../utils/status';

function PrintMetrics() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const date = params.get('date') || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [data, setData] = useState(null);
  const [clinicName, setClinicName] = useState('ASC Metrics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClinic = async () => {
    try {
      const res = await api.get('/clinic/config/');
      setClinicName(res.data?.name || 'ASC Metrics');
    } catch (e) {
      // non-blocking
    }
  };

  const fetchMetrics = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get(`/metrics/dashboard/?date=${encodeURIComponent(date)}`);
      setData(res.data || {});
    } catch (e) {
      console.error(e);
      setError('Failed to load metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinic();
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="min-h-screen bg-white">
      {/* Print header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/metrics')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 font-semibold"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{clinicName}</h1>
          <p className="text-gray-700">
            Daily Metrics — <span className="font-semibold">{date}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Generated: {new Date().toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : !data ? (
          <div className="text-gray-600">No metrics available.</div>
        ) : (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">Live Patients (now)</div>
                <div className="text-3xl font-bold text-gray-900">{data.live_total || 0}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">Appointments (this day)</div>
                <div className="text-3xl font-bold text-gray-900">{data.today_total_appointments || 0}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">Generated For</div>
                <div className="text-lg font-bold text-gray-900">{date}</div>
              </div>
            </div>

            {/* Outcomes by status */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">
                Appointment Outcomes (by Status)
              </div>
              <table className="min-w-full">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.today_outcomes_by_status || []).map((r, idx) => (
                    <tr key={`${r.status}-${idx}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">{statusLabel(r.status)}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">{r.count}</td>
                    </tr>
                  ))}
                  {(data.today_outcomes_by_status || []).length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-600" colSpan={2}>
                        No appointments for this day.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Live counts by provider */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">
                Live Patients by Provider (Right Now)
              </div>
              <table className="min-w-full">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.live_counts_by_provider_name || []).map((r, idx) => (
                    <tr key={`${r.provider_name || 'Unassigned'}-${idx}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.provider_name || 'Unassigned'}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">{r.count}</td>
                    </tr>
                  ))}
                  {(data.live_counts_by_provider_name || []).length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-600" colSpan={2}>
                        No live patients at this moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Internal ASC operations report. Contains PHI. Handle according to HIPAA policies.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PrintMetrics;
