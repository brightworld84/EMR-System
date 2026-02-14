import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { statusLabel, statusPillClass } from '../utils/status';

function TodaysSchedule() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSchedule = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get('/appointments/today/');
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to load today schedule', err);
      setError('Failed to load today’s schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(() => {
        fetchSchedule();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
  }, []);

  const checkInPatient = async (appointment) => {
    try {
      await api.post(`/appointments/${appointment.id}/checkin/`);

      // refresh schedule after check-in
      fetchSchedule();
      alert('Patient checked in.');
    } catch (err) {
      console.error('Check-in failed', err);
      alert('Failed to check in patient.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today’s Schedule</h1>
            <p className="text-sm text-gray-600">{items.length} appointment(s)</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Dashboard
            </button>

            <button
              onClick={() => navigate('/schedule/new')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              + Add Appointment
            </button>
            
            <button
              onClick={() => navigate('/print/schedule')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold"
            >
              Print / PDF
            </button>
            
            <button
              onClick={fetchSchedule}
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
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-2">No appointments scheduled for today.</p>
            <button
              onClick={() => navigate('/schedule/new')}
              className="mt-3 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Make appointment
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {a.scheduled_start ? new Date(a.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td
                      className="px-6 py-4 text-sm font-semibold text-blue-700 cursor-pointer"
                      onClick={() => a.patient && navigate(`/patients/${a.patient}`)}
                    >
                      {a.patient_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{a.mrn || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{a.reason_for_visit || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <span className={statusPillClass(a.status)}>
                          {statusLabel(a.status)}
                        </span>

                        {a.status === 'scheduled' && (
                          <button
                            onClick={() => checkInPatient(a)}
                            className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default TodaysSchedule;
