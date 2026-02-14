import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function RecentPatients() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecent = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get('/recent-patients/');
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to load recent patients', err);
      setError('Failed to load recently viewed patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recently Viewed</h1>
            <p className="text-sm text-gray-600">{items.length} patient(s)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Dashboard
            </button>
            <button
              onClick={fetchRecent}
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
            <p className="text-gray-600 mb-2">No recently viewed patients yet.</p>
            <p className="text-sm text-gray-500">
              Open a patient chart and it will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sex</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {p.medical_record_number}
                    </td>
                    <td
                      className="px-6 py-4 text-sm font-semibold text-blue-700 cursor-pointer"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      {p.last_name}, {p.first_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender === 'O' ? 'Other' : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          HIPAA: recent list is per-user and clinic-scoped; access derived from audit logs.
        </div>
      </main>
    </div>
  );
}

export default RecentPatients;
