import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel } from '../utils/status';

function PrintMetrics() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const date = params.get('date') || new Date().toISOString().slice(0, 10);
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const isRange = !!(startDate && endDate);

  const [data, setData] = useState(null);
  const [clinicName, setClinicName] = useState('ASC Metrics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClinic = async () => {
    try {
      const res = await api.get('/clinic/config/');
      setClinicName(res.data?.name || 'ASC Metrics');
    } catch (e) { /* non-blocking */ }
  };

  const fetchMetrics = async () => {
    try {
      setError('');
      setLoading(true);
      const url = isRange
        ? `/metrics/dashboard/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
        : `/metrics/dashboard/?date=${encodeURIComponent(date)}`;
      const res = await api.get(url);
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
  }, []);

  const exportCSV = () => {
    if (!data) return;
    const rows = [];
    const label = isRange ? `${startDate} to ${endDate}` : date;

    rows.push(['ASC Metrics Report']);
    rows.push([clinicName]);
    rows.push([`Period: ${label}`]);
    rows.push([`Generated: ${new Date().toLocaleString()}`]);
    rows.push([]);

    if (isRange) {
      rows.push(['SUMMARY']);
      rows.push(['Total Appointments', data.total_appointments ?? '']);
      rows.push(['Total Discharged', data.total_discharged ?? '']);
      rows.push(['Avg Visit Duration (min)', data.avg_total_visit_minutes ?? '']);
      rows.push([]);

      rows.push(['OUTCOMES BY STATUS']);
      rows.push(['Status', 'Count']);
      (data.outcomes_by_status || []).forEach(r => rows.push([r.status, r.count]));
      rows.push([]);

      rows.push(['OUTCOMES BY PROVIDER']);
      rows.push(['Provider', 'Status', 'Count']);
      (data.outcomes_by_provider || []).forEach(r =>
        rows.push([r.provider_name || 'Unassigned', r.status, r.count])
      );
    } else {
      rows.push(['SUMMARY']);
      rows.push(['Total Appointments', data.today_total_appointments ?? '']);
      rows.push(['Avg Visit Duration (min)', data.avg_total_visit_minutes_today ?? '']);
      rows.push(['Live Patients', (data.live_counts_by_status || []).reduce((s, r) => s + r.count, 0)]);
      rows.push([]);

      rows.push(['LIVE COUNTS BY STATUS']);
      rows.push(['Status', 'Count']);
      (data.live_counts_by_status || []).forEach(r => rows.push([statusLabel(r.status), r.count]));
      rows.push([]);

      rows.push(['APPOINTMENT OUTCOMES']);
      rows.push(['Status', 'Count']);
      (data.today_outcomes_by_status || []).forEach(r => rows.push([r.status, r.count]));
      rows.push([]);

      rows.push(['OUTCOMES BY PROVIDER']);
      rows.push(['Provider', 'Status', 'Count']);
      (data.today_outcomes_by_provider || []).forEach(r =>
        rows.push([r.provider_name || 'Unassigned', r.status, r.count])
      );
      rows.push([]);

      rows.push(['LONGEST WAITERS']);
      rows.push(['Patient', 'MRN', 'Status', 'Minutes', 'Alert']);
      (data.longest_waiters || []).forEach(w =>
        rows.push([w.patient_name, w.mrn, w.status, w.minutes_in_status, w.alert ? `Alert ≥${w.threshold_minutes}m` : ''])
      );
    }

    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${isRange ? `${startDate}-to-${endDate}` : date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = isRange ? `${startDate} to ${endDate}` : date;

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
        <button onClick={() => navigate('/metrics')} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-semibold">← Back</button>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">Export CSV</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold">Print / Save PDF</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{clinicName}</h1>
          <p className="text-gray-700">Metrics — <span className="font-semibold">{periodLabel}</span></p>
          <p className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">{error}</div>}

        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : !data ? (
          <div className="text-gray-600">No metrics available.</div>
        ) : isRange ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                ['Total Appointments', data.total_appointments ?? '—'],
                ['Total Discharged', data.total_discharged ?? '—'],
                ['Avg Visit (min)', data.avg_total_visit_minutes ?? '—'],
              ].map(([label, val]) => (
                <div key={label} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase">{label}</div>
                  <div className="text-3xl font-bold text-gray-900">{val}</div>
                </div>
              ))}
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Outcomes by Status</div>
              <table className="min-w-full">
                <thead><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Count</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.outcomes_by_status || []).map((r, i) => (
                    <tr key={i}><td className="px-4 py-2 text-sm text-gray-900">{(r.status || '').replace(/_/g, ' ')}</td><td className="px-4 py-2 text-sm font-semibold">{r.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Outcomes by Provider</div>
              <table className="min-w-full">
                <thead><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Count</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.outcomes_by_provider || []).map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.provider_name || 'Unassigned'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{(r.status || '').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                ['Appointments', data.today_total_appointments ?? '—'],
                ['Live Patients', (data.live_counts_by_status || []).reduce((s, r) => s + r.count, 0)],
                ['Avg Visit (min)', data.avg_total_visit_minutes_today ?? '—'],
              ].map(([label, val]) => (
                <div key={label} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase">{label}</div>
                  <div className="text-3xl font-bold text-gray-900">{val}</div>
                </div>
              ))}
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Appointment Outcomes</div>
              <table className="min-w-full">
                <thead><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Count</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.today_outcomes_by_status || []).map((r, i) => (
                    <tr key={i}><td className="px-4 py-2 text-sm text-gray-900">{statusLabel(r.status)}</td><td className="px-4 py-2 text-sm font-semibold">{r.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Outcomes by Provider</div>
              <table className="min-w-full">
                <thead><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Count</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.today_outcomes_by_provider || []).map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.provider_name || 'Unassigned'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{(r.status || '').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Longest Waiters</div>
              <table className="min-w-full">
                <thead><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">MRN</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Minutes</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Alert</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {(data.longest_waiters || []).map((w) => (
                    <tr key={w.checkin_id}>
                      <td className="px-4 py-2 text-sm font-semibold text-blue-700">{w.patient_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{w.mrn}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{statusLabel(w.status)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{w.minutes_in_status}</td>
                      <td className="px-4 py-2 text-sm">{w.alert ? `Alert ≥${w.threshold_minutes}m` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 text-xs text-gray-500">
          Internal ASC operations report. Contains PHI. Handle according to HIPAA policies.
        </div>
      </div>
    </div>
  );
}

export default PrintMetrics;
