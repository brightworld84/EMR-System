import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

function AddAppointment() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const patientIdFromUrl = params.get('patientId');

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [patientQuery, setPatientQuery] = useState('');

  const [form, setForm] = useState({
    patient: '',
    scheduled_start: '',
    reason_for_visit: '',
    status: 'scheduled',
    provider: '',
    provider_name: '',  
});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initial load (small list). Server-search will replace list as user types.
  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const res = await api.get('/patients/');
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setPatients(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load patients.');
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoadingProviders(true);
      const res = await api.get('/providers/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setProviders(data);
    } catch (e) {
      console.error(e);
      // non-blocking: scheduling still works without provider assignment
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    loadPatients();
    loadProviders();    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselect patient from URL once
  useEffect(() => {
    if (!patientIdFromUrl) return;

    setForm((prev) => {
      if (String(prev.patient) === String(patientIdFromUrl)) return prev;
      return { ...prev, patient: patientIdFromUrl };
    });
  }, [patientIdFromUrl]);

  // Server-side patient search (debounced)
  useEffect(() => {
    const q = patientQuery.trim();
    if (!q) return;

    const looksLikeDob = /^\d{4}-\d{2}-\d{2}$/.test(q);

    const run = async () => {
      try {
        const url = looksLikeDob
          ? `/patients/search/?dob=${encodeURIComponent(q)}`
          : `/patients/search/?q=${encodeURIComponent(q)}`;

        const res = await api.get(url);
        setPatients(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Patient search failed', e);
      }
    };

    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [patientQuery]);

  const filteredPatients = useMemo(() => {
    // If using server search, patients is already filtered; still keep local filter as a backup.
    if (!Array.isArray(patients)) return [];
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
      const mrn = String(p.medical_record_number || '').toLowerCase();
      const phone = String(p.phone_primary || '').toLowerCase();
      const dob = String(p.date_of_birth || '').toLowerCase();
      return fullName.includes(q) || mrn.includes(q) || phone.includes(q) || dob.includes(q);
    });
  }, [patients, patientQuery]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Non-blocking validation (duplicate + provider conflicts) — backend must have /appointments/validate/
      try {
        const qs = new URLSearchParams({
          patient: String(form.patient),
          scheduled_start: String(form.scheduled_start),

          // ✅ NEW: send provider FK id when selected
          provider: form.provider ? String(form.provider) : '',

          // ✅ keep legacy fallback (MagdaRecords + older data)
          provider_name: form.provider_name || '',

          duration_minutes: '30',
        });
        
        const v = await api.get(`/appointments/validate/?${qs.toString()}`);
        const hasDup = !!v.data?.has_duplicate;
        const hasProv = !!v.data?.has_provider_conflict;

        if (hasDup || hasProv) {
          let msg = 'Scheduling warning:\n\n';
          if (hasDup) msg += '- Patient already has an appointment on this date.\n';
          if (hasProv) msg += '- Provider may already be booked at this time.\n';
          msg += '\nContinue anyway?';

          const proceed = window.confirm(msg);
          if (!proceed) {
            setSaving(false);
            return;
          }
        }
      } catch (warnErr) {
        // If validation fails, do not block scheduling in MVP
        console.error('Validate check failed', warnErr);
      }

      const payload = {
        patient: Number(form.patient),
        scheduled_start: form.scheduled_start,
        provider: form.provider ? Number(form.provider) : null,
        provider_name: form.provider_name || '',
        reason_for_visit: form.reason_for_visit || '',
        status: form.status,
      };

      await api.post('/appointments/', payload);
      navigate('/schedule/today');
    } catch (err) {
      console.error(err);
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create appointment.');
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Appointment</h1>
            <p className="text-sm text-gray-600">Manual scheduling (MVP)</p>
          </div>
          <button
            onClick={() => navigate('/schedule/today')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Patient selector + search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Patient <span className="text-red-600">*</span>
            </label>

            {loadingPatients ? (
              <div className="text-gray-600">Loading patients...</div>
            ) : (
              <>
                <input
                  type="text"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Search by name, MRN, phone, or DOB (YYYY-MM-DD)"
                  className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />

                <select
                  name="patient"
                  value={form.patient}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a patient...</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name}
                      {p.medical_record_number ? ` — MRN ${p.medical_record_number}` : ''}
                      {p.date_of_birth ? ` — DOB ${p.date_of_birth}` : ''}
                      {p.phone_primary ? ` — ${p.phone_primary}` : ''}
                    </option>
                  ))}
                </select>

                <p className="text-xs text-gray-500 mt-1">
                  Showing {filteredPatients.length} of {patients.length} patients
                </p>
              </>
            )}
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Appointment Date/Time <span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              name="scheduled_start"
              value={form.scheduled_start}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              MVP note: stored as DateTime. We’ll later add full calendar scheduling.
            </p>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Provider (optional)
            </label>

            {loadingProviders ? (
              <div className="text-gray-600">Loading providers…</div>
            ) : (
              <select
                name="provider"
                value={form.provider}
                onChange={(e) => {
                  const val = e.target.value;
                  const selected = providers.find((p) => String(p.id) === String(val));

                  setForm((prev) => ({
                    ...prev,
                    provider: val,
                    // auto-fill provider_name for backwards compatibility
                    provider_name: selected ? selected.display_name : prev.provider_name,
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            )}

            <label className="block text-xs font-semibold text-gray-600 mt-3 mb-1">
              Provider name override (optional)
            </label>
            <input
              type="text"
              name="provider_name"
              value={form.provider_name}
              onChange={handleChange}
              placeholder="Type a provider name if not listed"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="text-xs text-gray-500 mt-1">
              Dropdown sets the Provider ID. The name override is optional and keeps compatibility.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Visit
            </label>
            <input
              type="text"
              name="reason_for_visit"
              value={form.reason_for_visit}
              onChange={handleChange}
              placeholder="e.g., Post-op check, cataract eval..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/schedule/today')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-green-300"
            >
              {saving ? 'Saving...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default AddAppointment;
