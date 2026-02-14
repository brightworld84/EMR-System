import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPatients = async () => {
    try {
      setError('');
      setLoading(true);

      const res = await api.get('/patients/');

      // DRF pagination: { count, next, previous, results }
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPatients(data);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return patients;

    return patients.filter((p) => {
      const first = (p.first_name || '').toLowerCase();
      const last = (p.last_name || '').toLowerCase();
      const mrn = (p.medical_record_number || '').toLowerCase();
      const phone = (p.phone_primary || '').toLowerCase();
      return (
        first.includes(s) ||
        last.includes(s) ||
        mrn.includes(s) ||
        phone.includes(s)
      );
    });
  }, [patients, searchTerm]);

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatDate = (dob) => {
    if (!dob) return '-';
    return new Date(dob).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-sm text-gray-600">
              {filteredPatients.length} patient{filteredPatients.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Dashboard
            </button>

            <button
              onClick={() => navigate('/patients/new')}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              + New Patient
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, MRN, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search patients"
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading patients…</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No patients match your search.' : 'No patients yet.'}
            </p>
            <button
              onClick={() => navigate('/patients/new')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Add Your First Patient
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB / Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sex</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {p.medical_record_number}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                        onClick={() => navigate(`/patients/${p.id}`)}
                      >
                        {p.last_name}, {p.first_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(p.date_of_birth)} ({calculateAge(p.date_of_birth)}y)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender === 'O' ? 'Other' : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {p.phone_primary || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => navigate(`/patients/${p.id}`)}
                          className="text-blue-700 hover:text-blue-900 font-semibold"
                        >
                          View Chart →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          HIPAA: access controlled via login; clinic-scoped data; API requests authenticated.
        </div>
      </main>
    </div>
  );
}

export default PatientList;
