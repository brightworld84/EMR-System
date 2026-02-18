import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { displayValue, displayLanguage, RACE_LABELS, ETHNICITY_LABELS, displayGenderIdentity, displaySexualOrientation } from '../utils/labels';

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-gray-900 break-words">
        {value || value === 0 ? value : <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}

function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check-ins (all, not just active)
  const [checkins, setCheckins] = useState([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [checkinsError, setCheckinsError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptError, setApptError] = useState('');

  // Documents
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadForm, setUploadForm] = useState({
    doc_type: 'other',
    title: '',
    notes: '',
    file: null,
  });

  const isSameLocalDay = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const todaysAppt = useMemo(() => {
    if (!Array.isArray(appointments)) return null;
    return (
      appointments.find(
        (a) =>
          a?.scheduled_start &&
          a.status === 'scheduled' &&
          isSameLocalDay(a.scheduled_start)
      ) || null
    );
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    const now = new Date();
    return [...appointments]
      .filter((a) => a?.scheduled_start && new Date(a.scheduled_start) >= now)
      .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    const now = new Date();
    return [...appointments]
      .filter((a) => a?.scheduled_start && new Date(a.scheduled_start) < now)
      .sort((a, b) => new Date(b.scheduled_start) - new Date(a.scheduled_start));
  }, [appointments]);

  const nextAppointment = useMemo(() => {
    return upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  }, [upcomingAppointments]);

  const fetchAppointments = async () => {
    try {
      setApptError('');
      setApptLoading(true);
      const res = await api.get(`/appointments/?patient=${id}&ordering=-scheduled_start`);
      setAppointments(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to load appointments', err);
      setApptError('Failed to load appointments.');
    } finally {
      setApptLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocsError('');
      setDocsLoading(true);
      const res = await api.get(`/documents/?patient=${id}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setDocs(data);
    } catch (err) {
      console.error('Failed to load documents', err);
      setDocsError('Failed to load documents.');
    } finally {
      setDocsLoading(false);
    }
  };

  // Fetch ALL check-ins for this patient (not just active)
  const fetchCheckins = async () => {
    try {
      setCheckinsError('');
      setCheckinsLoading(true);
      const res = await api.get(`/checkins/?patient=${id}&ordering=-check_in_time`);
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setCheckins(data);
    } catch (err) {
      console.error('Failed to load check-ins', err);
      setCheckinsError('Failed to load check-in history.');
    } finally {
      setCheckinsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchAppointments();
    fetchDocuments();
    fetchCheckins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUploadChange = (e) => {
    const { name, value } = e.target;
    setUploadForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setUploadForm((prev) => ({ ...prev, file: f }));
  };

  const uploadDocument = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!uploadForm.file) {
      setUploadError('Please choose a file.');
      return;
    }

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('patient', String(id));
      fd.append('doc_type', uploadForm.doc_type);
      fd.append('title', uploadForm.title || '');
      fd.append('notes', uploadForm.notes || '');
      fd.append('file', uploadForm.file);

      await api.post('/documents/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadForm({ doc_type: 'other', title: '', notes: '', file: null });
      fetchDocuments();
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const checkInNow = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/checkin/`);
      await fetchAppointments();
      await fetchCheckins(); // Refresh check-ins
      alert('Patient checked in.');
    } catch (err) {
      console.error('Check-in failed', err);
      alert('Failed to check in patient.');
    }
  };

  const fetchPatient = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get(`/patients/${id}/`);
      setPatient(res.data);
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('Failed to load patient chart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fullName = useMemo(() => {
    if (!patient) return '';
    const first = patient.first_name || '';
    const middle = patient.middle_name || '';
    const last = patient.last_name || '';
    return [first, middle, last].filter(Boolean).join(' ');
  }, [patient]);

  const age = useMemo(() => {
    if (!patient?.date_of_birth) return '';
    const birthDate = new Date(patient.date_of_birth);
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a;
  }, [patient]);

  // Render form buttons for a check-in
  const renderFormButtons = (checkin) => {
    const formButtons = [
      { label: 'Pre-Op Phone Call', path: `/checkins/${checkin.id}/pre-op-phone-call`, color: 'emerald' },
      { label: 'Fall Risk (Pre-Op Testing)', path: `/checkins/${checkin.id}/fall-risk-assessment-preop-testing`, color: 'emerald' },
      { label: 'Fall Risk (Pre-Operative)', path: `/checkins/${checkin.id}/fall-risk-assessment-preop`, color: 'emerald' },
      { label: 'Pre-Op Nurse Notes', path: `/checkins/${checkin.id}/preoperative-nurses-notes`, color: 'emerald' },
      { label: 'History & Physical', path: `/checkins/${checkin.id}/history-and-physical`, color: 'emerald' },
      { label: 'Consent for Anesthesia', path: `/checkins/${checkin.id}/consent-for-anesthesia-services`, color: 'emerald' },
      { label: 'Anesthesia Orders', path: `/checkins/${checkin.id}/anesthesia-orders`, color: 'emerald' },
      { label: 'Peripheral Nerve Block', path: `/checkins/${checkin.id}/peripheral-nerve-block-procedure-note`, color: 'emerald' },
      { label: 'Medication Reconciliation', path: `/checkins/${checkin.id}/medication-reconciliation`, color: 'emerald' },
      { label: 'Operating Room Record', path: `/checkins/${checkin.id}/operating-room-record`, color: 'emerald' },
      { label: 'Anesthesia Record', path: `/checkins/${checkin.id}/anesthesia-record`, color: 'emerald' },
      { label: 'Immediate Post-Op Note', path: `/checkins/${checkin.id}/immediate-postop-progress-note`, color: 'indigo' },
      { label: 'PACU Record', path: `/checkins/${checkin.id}/pacu-record`, color: 'emerald' },
      { label: 'PACU Mobility Assessment', path: `/checkins/${checkin.id}/pacu-mobility`, color: 'blue' },
      { label: 'PACU Additional Notes', path: `/checkins/${checkin.id}/pacu-additional-nursing-notes`, color: 'indigo' },
      { label: 'Exparel Billing', path: `/checkins/${checkin.id}/exparel-billing-worksheet`, color: 'emerald' },
      { label: 'Implant / Billable Info', path: `/checkins/${checkin.id}/implant-billable-information`, color: 'emerald' },
      { label: 'Post-Op Phone Call', path: `/checkins/${checkin.id}/post-operative-phone-call`, color: 'indigo' },
      { label: 'Infection Education', path: `/checkins/${checkin.id}/post-op-infection-education`, color: 'indigo' },
      { label: 'DVT/PE Education', path: `/checkins/${checkin.id}/dvt-pe-education`, color: 'indigo' },
      { label: 'Patient Instructions', path: `/checkins/${checkin.id}/patient-instructions`, color: 'gray' },
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {formButtons.map((btn, idx) => {
          const colorClass = 
            btn.color === 'emerald' ? 'bg-emerald-700 hover:bg-emerald-800' :
            btn.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
            btn.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
            'bg-gray-900 hover:bg-black';

          return (
            <button
              key={idx}
              onClick={() => navigate(btn.path)}
              className={`px-3 py-2 ${colorClass} text-white rounded-lg text-sm font-semibold`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading chart…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Patient Chart</h1>
            <p className="text-gray-700 mb-4">{error || 'Patient not found.'}</p>
            <button
              onClick={() => navigate('/patients')}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              ← Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName || 'Patient'}</h1>
            <p className="text-sm text-gray-600">
              MRN: <span className="font-semibold">{patient.medical_record_number}</span>
              {' • '}
              DOB: <span className="font-semibold">{patient.date_of_birth || '—'}</span>
              {' • '}
              Age: <span className="font-semibold">{age || '—'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/patients')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Patients
            </button>

            <button
              onClick={() => navigate(`/schedule/new?patientId=${id}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Schedule Appointment
            </button>

            {todaysAppt && (
              <button
                onClick={() => checkInNow(todaysAppt.id)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                Check In Now
              </button>
            )}

            <button
              onClick={() => navigate(`/patients/${id}/edit`)}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
            >
              Edit
            </button>

            <button
              onClick={() => navigate(`/print/patient/${id}`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
            >
              Print / PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Demographics */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Demographics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Sex (Administrative)"
              value={
                patient.gender === 'M' ? 'Male' :
                patient.gender === 'F' ? 'Female' :
                patient.gender === 'O' ? 'Other' : '—'
              }
            />
            <Field label="Race" value={displayValue(patient.race, RACE_LABELS)} />
            <Field label="Ethnicity" value={displayValue(patient.ethnicity, ETHNICITY_LABELS)} />
            <Field label="Preferred Language" value={displayLanguage(patient.preferred_language)} />
            <Field label="Sexual Orientation" value={displaySexualOrientation(patient.sexual_orientation)} />
            <Field label="Gender Identity" value={displayGenderIdentity(patient.gender_identity)} />
          </div>
        </section>

        {/* Check-in History - NEW SECTION */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Check-in History & Forms</h2>

          {checkinsError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {checkinsError}
            </div>
          )}

          {checkinsLoading ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">
              Loading check-in history…
            </div>
          ) : checkins.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">
              No check-ins recorded for this patient yet.
            </div>
          ) : (
            <div className="space-y-4">
              {checkins.map((checkin) => (
                <div key={checkin.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-md font-bold text-gray-900">
                        Check-in #{checkin.id}
                        {checkin.is_active && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Checked in: {checkin.check_in_time ? new Date(checkin.check_in_time).toLocaleString() : '—'}
                        {' • '}
                        Status: <span className="font-semibold">{checkin.status || '—'}</span>
                        {checkin.check_out_time && (
                          <>
                            {' • '}
                            Checked out: {new Date(checkin.check_out_time).toLocaleString()}
                          </>
                        )}
                      </p>
                      {checkin.room && (
                        <p className="text-sm text-gray-600">
                          Room: <span className="font-semibold">{checkin.room}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Surgery Forms</h4>
                    {renderFormButtons(checkin)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Appointments */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Appointments</h2>

          {apptError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {apptError}
            </div>
          )}

          {apptLoading ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">
              Loading appointments…
            </div>
          ) : (
            <>
              {nextAppointment && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-900">
                    <strong>Next Appointment:</strong>{' '}
                    {new Date(nextAppointment.scheduled_start).toLocaleString()}
                    {nextAppointment.reason_for_visit ? ` — ${nextAppointment.reason_for_visit}` : ''}
                  </div>
                </div>
              )}

              <h3 className="text-md font-semibold text-gray-900 mb-2">Upcoming</h3>
              {upcomingAppointments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-gray-600 mb-6">
                  No upcoming appointments.
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {upcomingAppointments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {a.scheduled_start ? new Date(a.scheduled_start).toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{a.reason_for_visit || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{a.provider_name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{a.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="text-md font-semibold text-gray-900 mb-2">Past</h3>
              {pastAppointments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-gray-600">
                  No past appointments.
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pastAppointments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {a.scheduled_start ? new Date(a.scheduled_start).toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{a.reason_for_visit || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{a.provider_name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{a.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Documents</h2>

          <div className="bg-white rounded-lg shadow p-6 mb-4">
            {uploadError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {uploadError}
              </div>
            )}

            <form onSubmit={uploadDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select
                  name="doc_type"
                  value={uploadForm.doc_type}
                  onChange={handleUploadChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="consent">Consent</option>
                  <option value="h_p">H&amp;P</option>
                  <option value="op_note">Operative Note</option>
                  <option value="anesthesia">Anesthesia Record</option>
                  <option value="implant">Implant / Sticker</option>
                  <option value="referral">Referral</option>
                  <option value="insurance">Insurance Card</option>
                  <option value="image">Image</option>
                  <option value="form">Form</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title (optional)</label>
                <input
                  type="text"
                  name="title"
                  value={uploadForm.title}
                  onChange={handleUploadChange}
                  placeholder="e.g., Cataract Consent"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
                <input
                  type="text"
                  name="notes"
                  value={uploadForm.notes}
                  onChange={handleUploadChange}
                  placeholder="e.g., Signed pre-op"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full"
                  accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.doc,.docx"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload PDFs, images, scanned forms. All uploads are audit-logged.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300"
                >
                  {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>

          {docsError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {docsError}
            </div>
          )}

          {docsLoading ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">Loading documents…</div>
          ) : docs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">No documents uploaded yet.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {docs.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{(d.doc_type || '').replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{d.title || d.original_filename || '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        {d.file_url ? (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 font-semibold hover:underline"
                          >
                            Open / Download
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Primary Phone" value={patient.phone_primary} />
            <Field label="Secondary Phone" value={patient.phone_secondary} />
            <Field label="Email" value={patient.email} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Field label="Address Line 1" value={patient.address_line1} />
            <Field label="Address Line 2" value={patient.address_line2} />
            <Field label="City / State / ZIP" value={[patient.city, patient.state, patient.zip_code].filter(Boolean).join(', ')} />
          </div>
        </section>

        {/* Emergency Contact */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Name" value={patient.emergency_contact_name} />
            <Field label="Relationship" value={patient.emergency_contact_relationship} />
            <Field label="Phone" value={patient.emergency_contact_phone} />
          </div>
        </section>

        {/* Insurance */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Insurance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Primary Company" value={patient.insurance_primary_company} />
            <Field label="Primary Policy #" value={patient.insurance_primary_policy_number} />
            <Field label="Primary Group #" value={patient.insurance_primary_group_number} />
            <Field label="Subscriber Name" value={patient.insurance_primary_subscriber_name} />
            <Field label="Subscriber DOB" value={patient.insurance_primary_subscriber_dob} />
            <Field label="Secondary Company" value={patient.insurance_secondary_company} />
            <Field label="Secondary Policy #" value={patient.insurance_secondary_policy_number} />
            <Field label="Secondary Group #" value={patient.insurance_secondary_group_number} />
          </div>
        </section>

        <div className="text-xs text-gray-500 text-center">
          HIPAA: clinic-scoped access enforced server-side; audit logging on all access
        </div>
      </main>
    </div>
  );
}

export default PatientDetail;
