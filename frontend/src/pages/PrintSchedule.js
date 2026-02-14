import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel } from '../utils/status';

function PrintSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const date = params.get('date'); // YYYY-MM-DD (optional)
  const [items, setItems] = useState([]);
  const [clinicName, setClinicName] = useState('ASC Schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClinic = async () => {
    try {
      const res = await api.get('/clinic/config/');
      setClinicName(res.data?.name || 'ASC Schedule');
    } catch (e) {
      // non-blocking
    }
  };

  const fetchSchedule = async () => {
    try {
      setError('');
      setLoading(true);

      // If you later add /appointments/by-date/?date=..., use that.
      // For now: use today endpoint when no date filter is supplied.
      if (!date) {
        const res = await api.get('/appointments/today/');
        setItems(res.data || []);
      } else {
        // Use calendar range endpoint if you have it; fallback: filter locally after range
        // Minimal: request a wide range around the date
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59`);
        const qs = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
        const res = await api.get(`/appointments/range/?${qs.toString()}`);
        setItems(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinic();
    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const titleDate = date || new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-white">
      {/* Print header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/schedule/today')}
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
            Schedule — <span className="font-semibold">{titleDate}</span>
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
        ) : items.length === 0 ? (
          <div className="text-gray-600">No appointments found for this date.</div>
        ) : (
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">MRN</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {a.scheduled_start
                        ? new Date(a.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{a.patient_name || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{a.mrn || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {a.provider_display_name || a.provider_name || '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{a.reason_for_visit || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{statusLabel(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          Internal ASC operations document. Contains PHI. Handle according to HIPAA policies.
        </div>
      </div>
    </div>
  );
}

export default PrintSchedule;
