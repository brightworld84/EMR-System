import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel, statusPillClass } from '../utils/status';

const STATUS_ORDER = ['checked_in', 'roomed', 'ready', 'in_progress', 'completed'];

// Disable invalid transitions
const NEXT_ALLOWED = {
  checked_in: new Set(['roomed']),
  roomed: new Set(['ready', 'in_progress', 'completed']), // some clinics skip "ready"
  ready: new Set(['in_progress', 'completed']),
  in_progress: new Set(['completed']),
  completed: new Set([]),
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
  const [labels, setLabels] = useState({
    checked_in: 'Checked In',
    roomed: 'Roomed',
    ready: 'Ready',
    in_progress: 'In Progress',
    completed: 'Complete',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // “time-in-status” ticker
  const [nowTick, setNowTick] = useState(Date.now());

  const fetchClinicConfig = async () => {
    try {
      const res = await api.get('/clinic/config/');
      if (res.data?.workflow_labels) setLabels(res.data.workflow_labels);
    } catch (err) {
      console.error('Failed to load clinic config', err);
    }
  };

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
    fetchClinicConfig();
    fetchLive();

    // updates waiting-time display
    const tick = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);

    // refresh live patients from backend
    const refresh = setInterval(() => {
      fetchLive();
    }, 30000);

    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
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

  const complete = async (checkinId) => {
    try {
      await api.post(`/checkins/${checkinId}/complete/`);
      await fetchLive();
    } catch (err) {
      console.error('Failed to complete check-in', err);
      alert('Failed to complete.');
    }
  };

  const statusLabel = (status) => labels[status] || status || '—';

  // 1️⃣ Status color pills
  const statusBadge = (status) => {
    const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold";
    if (status === 'checked_in') return `${base} bg-orange-100 text-orange-800`; // orange
    if (status === 'roomed') return `${base} bg-blue-100 text-blue-800`;         // blue
    if (status === 'ready') return `${base} bg-purple-100 text-purple-800`;
    if (status === 'in_progress') return `${base} bg-yellow-100 text-yellow-900`;
    if (status === 'completed') return `${base} bg-green-100 text-green-800`;    // green
    return `${base} bg-gray-100 text-gray-700`;
  };

  // 2️⃣ Disable invalid transitions
  const canGoTo = (currentStatus, targetStatus) => {
    if (!currentStatus) return false;
    return NEXT_ALLOWED[currentStatus]?.has(targetStatus) || false;
  };

  // 3️⃣ Time-in-status (uses status_changed_at if present)
  const timeInStatus = (row) => {
    const start = row.status_changed_at || row.check_in_time;
    if (!start) return '—';
    const ms = nowTick - new Date(start).getTime();
    return formatDuration(ms);
  };

  const sorted = useMemo(() => {
    const orderIndex = (s) => {
      const i = STATUS_ORDER.indexOf(s);
      return i === -1 ? 999 : i;
    };
    return [...items].sort((a, b) => {
      const ai = orderIndex(a.status);
      const bi = orderIndex(b.status);
      if (ai !== bi) return ai - bi;
      const at = new Date(a.check_in_time || 0).getTime();
      const bt = new Date(b.check_in_time || 0).getTime();
      return at - bt;
    });
  }, [items]);

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
            <p className="text-gray-600 mb-2">No patients are currently checked in.</p>
          </div>
        ) : (
	  <table className="min-w-full">
  	    <thead className="bg-gray-50">
    	      <tr>
      	        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time in Status</th>
              </tr>
            </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                {/* Check-in */}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {c.check_in_time
                      ? new Date(c.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>

                  {/* Patient */}
                  <td
                    className="px-6 py-4 text-sm font-semibold text-blue-700 cursor-pointer"
                    onClick={() => c.patient && navigate(`/patients/${c.patient}`)}
                  >
                    {c.patient_name || '—'}
                  </td>

                  {/* MRN */}
                  <td className="px-6 py-4 text-sm text-gray-900">{c.mrn || '—'}</td>

                  {/* Room / Staff / Provider */}
                  <td className="px-6 py-4 text-sm text-gray-900">{c.room || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.assigned_staff_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.provider_name || '—'}</td>

                  {/* ✅ Status (pill + buttons IN THIS SAME COLUMN) */}
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col gap-2">
                    <span
                      className={statusPillClass(c.status)}
                      title={
                        c.status_changed_at
                        ? `${statusLabel(c.status)} at ${new Date(c.status_changed_at).toLocaleTimeString()}`
                        : statusLabel(c.status)
                      }
                    >
                      {statusLabel(c.status, labels)}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setStatus(c.id, 'roomed')}
                        disabled={!canGoTo(c.status, 'roomed')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200 disabled:text-blue-700"
                      >
                        {labels.roomed}
                      </button>

                      <button
                        onClick={() => setStatus(c.id, 'ready')}
                        disabled={!canGoTo(c.status, 'ready')}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-purple-200 disabled:text-purple-700"
                      >
                        {labels.ready}
                      </button>

                      <button
                        onClick={() => setStatus(c.id, 'in_progress')}
                        disabled={!canGoTo(c.status, 'in_progress')}
                        className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold disabled:bg-yellow-200 disabled:text-yellow-800"
                      >
                        {labels.in_progress}
                      </button>

                      <button
                        onClick={() => complete(c.id)}
                        disabled={!canGoTo(c.status, 'completed')}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-green-200 disabled:text-green-700"
                      >
                        {labels.completed}
                      </button>
                    </div>
                  </div>
                </td>

                {/* Time in Status */}
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
