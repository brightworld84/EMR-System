import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { displayValue, displayLanguage, RACE_LABELS, ETHNICITY_LABELS } from '../utils/labels';
import { statusLabel } from '../utils/status';

function PrintPatientChart() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [clinicName, setClinicName] = useState('Patient Chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClinic = async () => {
    try {
      const res = await api.get('/clinic/config/');
      setClinicName(res.data?.name || 'Patient Chart');
    } catch (e) {
      // non-blocking
    }
  };

  const fetchAll = async () => {
    try {
      setError('');
      setLoading(true);

      const pRes = await api.get(`/patients/${id}/`);
      setPatient(pRes.data);

      const aRes = await api.get(`/appointments/?patient=${id}&ordering=-scheduled_start`);
      setAppointments(aRes.data?.results ?? aRes.data ?? []);

      const dRes = await api.get(`/documents/?patient=${id}`);
      setDocs(Array.isArray(dRes.data) ? dRes.data : (dRes.data.results || []));
    } catch (e) {
      console.error(e);
      setError('Failed to load printable patient chart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinic();
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fullName = useMemo(() => {
    if (!patient) return '';
    const first = patient.first_name || '';
    const middle = patient.middle_name || '';
    const last = patient.last_name || '';
    return [first, middle, last].filter(Boolean).join(' ');
  }, [patient]);

  const genderText = useMemo(() => {
    if (!patient?.gender) return '—';
    if (patient.gender === 'M') return 'Male';
    if (patient.gender === 'F') return 'Female';
    if (patient.gender === 'O') return 'Other';
    return '—';
  }, [patient]);

  return (
    <div className="min-h-screen bg-white">
      {/* Print header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 font-semibold"
        >
          ← Back
        </button>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{clinicName}</h1>
          <p className="text-gray-700 font-semibold">Printable Patient Chart</p>
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
        ) : !patient ? (
          <div className="text-gray-600">Patient not found.</div>
        ) : (
          <>
            {/* Patient header */}
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <div className="text-xl font-bold text-gray-900">{fullName || 'Patient'}</div>
              <div className="text-sm text-gray-700 mt-1">
                MRN: <span className="font-semibold">{patient.medical_record_number || '—'}</span>{' '}
                • DOB: <span className="font-semibold">{patient.date_of_birth || '—'}</span>
              </div>
            </div>

            {/* Demographics */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Demographics</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Sex (Administrative)</div>
                  <div className="text-gray-900">{genderText}</div>
                </div>

                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Preferred Language</div>
                  <div className="text-gray-900">{displayLanguage(patient.preferred_language)}</div>
                </div>

                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Race</div>
                  <div className="text-gray-900">{displayValue(patient.race, RACE_LABELS)}</div>
                </div>

                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Ethnicity</div>
                  <div className="text-gray-900">{displayValue(patient.ethnicity, ETHNICITY_LABELS)}</div>
                </div>

                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Sexual Orientation</div>
                  <div className="text-gray-900">{displayValue(patient.sexual_orientation)}</div>
                </div>

                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Gender Identity</div>
                  <div className="text-gray-900">{displayValue(patient.gender_identity)}</div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Contact</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Primary Phone</div>
                  <div className="text-gray-900">{patient.phone_primary || '—'}</div>
                </div>
                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Email</div>
                  <div className="text-gray-900">{patient.email || '—'}</div>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 md:col-span-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Address</div>
                  <div className="text-gray-900">
                    {(patient.address_line1 || '')}
                    {patient.address_line2 ? `, ${patient.address_line2}` : ''}
                    {patient.city ? `, ${patient.city}` : ''}
                    {patient.state ? `, ${patient.state}` : ''}
                    {patient.zip_code ? ` ${patient.zip_code}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Appointments */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Appointments</div>
              {appointments.length === 0 ? (
                <div className="px-4 py-3 text-gray-600">No appointments found.</div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date/Time</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {appointments.slice(0, 25).map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {a.scheduled_start ? new Date(a.scheduled_start).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {a.provider_display_name || a.provider_name || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{a.reason_for_visit || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{statusLabel(a.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {appointments.length > 25 && (
                <div className="px-4 py-2 text-xs text-gray-500">Showing first 25 appointments.</div>
              )}
            </div>

            {/* Documents */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-50 px-4 py-3 font-bold text-gray-900">Documents</div>
              {docs.length === 0 ? (
                <div className="px-4 py-3 text-gray-600">No documents uploaded.</div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Uploaded</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {docs.slice(0, 25).map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{(d.doc_type || '').replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.title || d.original_filename || '—'}</td>
                        <td className="px-4 py-2 text-sm">
                          {d.file_url ? (
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 font-semibold hover:underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {docs.length > 25 && (
                <div className="px-4 py-2 text-xs text-gray-500">Showing first 25 documents.</div>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Internal ASC chart export. Contains PHI. Handle according to HIPAA policies.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PrintPatientChart;
