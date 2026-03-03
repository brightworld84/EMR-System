import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel as importedStatusLabel, statusPillClass } from '../utils/status';

const STATUS_ORDER = ['checked_in', 'pre_op', 'operating_room', 'pacu', 'discharged'];

const NEXT_ALLOWED = {
  checked_in:     new Set(['pre_op']),
  pre_op:         new Set(['operating_room']),
  operating_room: new Set(['pacu']),
  pacu:           new Set(['discharged']),
  discharged:     new Set([]),
};

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return '<1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${hrs}h ${min}m`;
}

function LivePatients() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [labels] = useState({
    checked_in:     'Checked In',
    pre_op:         'Pre-Op',
    operating_room: 'Operating Room',
    pacu:           'PACU',
    discharged:     'Discharged',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  const fetchLive = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get('/checkins/live/');
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to load live patients', err);
      setError('Failed to load live patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const tick = setInterval(() => setNowTick(Date.now()), 15000);
    const refresh = setInterval(() => fetchLive(), 30000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, []);

  const setStatus = async (checkinId, status) => {
    try {
      await api.post(`/checkins/${checkinId}/set-status/`, { status });
      await fetchLive();
    } catch (err) {
      console.error('Failed to set status', err);
      alert('Failed to update status.');
    }
  };

  const statusBadge = (status) => {
    const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold";
    if (status === 'checked_in')     return `${base} bg-orange-100 text-orange-800`;
    if (status === 'pre_op')         return `${base} bg-blue-100 text-blue-800`;
    if (status === 'operating_room') return `${base} bg-red-100 text-red-800`;
    if (status === 'pacu')           return `${base} bg-yellow-100 text-yellow-900`;
    if (status === 'discharged')     return `${base} bg-green-100 text-green-800`;
    return `${base} bg-gray-100 text-gray-700`;
  };

  const canGoTo = (currentStatus, targetStatus) => {
    if (!currentStatus) return false;
    return NEXT_ALLOWED[currentStatus]?.has(targetStatus) || false;
  };

  const timeInStatus = (row) => {
    const start = row.status_changed_at || row.check_in_time;
    if (!start) return '—';
    return formatDuration(nowTick - new Date(start).getTime());
  };

  const sorted = useMemo(() => {
    const orderIndex = (s) => {
      const i = STATUS_ORDER.indexOf(s);
      return i === -1 ? 999 : i;
    };
    return [...items].sort((a, b) => {
      const diff = orderIndex(a.status) - orderIndex(b.status);
      if (diff !== 0) return diff;
      return new Date(a.check_in_time || 0) - new Date(b.check_in_time || 0);
    });
  }, [items]);

  const BUTTONS = [
    { status: 'pre_op',         label: 'Pre-Op',          color: 'blue' },
    { status: 'operating_room', label: 'Operating Room',  color: 'red' },
    { status: 'pacu',           label: 'PACU',            color: 'yellow' },
    { status: 'discharged',     label: 'Discharged',      color: 'green' },
  ];

  const btnClass = (color, disabled) => {
    const map = {
      blue:   disabled ? 'bg-blue-200 text-blue-700'     : 'bg-blue-600 text-white hover:bg-blue-700',
      red:    disabled ? 'bg-red-200 text-red-700'       : 'bg-red-600 text-white hover:bg-red-700',
      yellow: disabled ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-500 text-white hover:bg-yellow-600',
      green:  disabled ? 'bg-green-200 text-green-700'   : 'bg-green-600 text-white hover:bg-green-700',
    };
    return `px-3 py-2 rounded-lg font-semibold text-sm ${map[color]}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Patients</h1>
            <p className="text-sm text-gray-600">{sorted.length} active</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Dashboard
            </button>
            <button
              onClick={fetchLive}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No patients are currently checked in.</p>
          </div>
        ) : (
          <table className="min-w-full bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {['Check-in', 'Patient', 'MRN', 'Room', 'Staff', 'Provider', 'Status', 'Time in Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sorted.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {c.check_in_time
                      ? new Date(c.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td
                    className="px-6 py-4 text-sm font-semibold text-blue-700 cursor-pointer"
                    onClick={() => c.patient && navigate(`/patients/${c.patient}`)}
                  >
                    {c.patient_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.mrn || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.room || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.assigned_staff_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.provider_name || '—'}</td>

                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col gap-2">
                      <span className={statusBadge(c.status)}>
                        {labels[c.status] || c.status || '—'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {BUTTONS.map(({ status, label, color }) => {
                          const disabled = !canGoTo(c.status, status);
                          return (
                            <button
                              key={status}
                              onClick={() => setStatus(c.id, status)}
                              disabled={disabled}
                              className={btnClass(color, disabled)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900">{timeInStatus(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

export default LivePatients;
