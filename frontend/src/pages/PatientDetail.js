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

// --- Form status helpers (used for button indicators) ---
function getFormMeta(form) {
  const isSigned = !!(form && (form.is_signed || form.signed_at || form.signed_by));
  const isLocked = !!(form && (form.is_locked || form.pacu_autofill_locked));
  const isComplete = isSigned || isLocked;
  return { isSigned, isLocked, isComplete };
}

function getStatusDot(form) {
  const { isSigned, isLocked } = getFormMeta(form);
  if (isSigned || isLocked) return '🔒';   // locked/signed
  return '📝';                              // draft
}

function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeCheckin, setActiveCheckin] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptError, setApptError] = useState('');

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

  const [formStatus, setFormStatus] = useState({
    immediatePostOp: null,
    exparel: null,
    implant: null,
    pacuMobility: null,
    pacuProgressNotes: null,
    pacuAdditionalNursingNotes: null,
    pacuRecord: null,
  });

  const fetchActiveCheckin = async () => {
    try {
      setCheckinError('');
      setCheckinLoading(true);
          
      const res = await api.get('/checkins/live/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      
      // find the active check-in for this patient
      const found = list.find((c) => String(c.patient) === String(id)) || null;
      setActiveCheckin(found);
    } catch (e) {
      console.error('Failed to load active check-in', e);
      setCheckinError('Failed to load active PACU check-in.');
    } finally {
      setCheckinLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchAppointments();
    fetchDocuments();
    fetchActiveCheckin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  useEffect(() => {
    if (activeCheckin?.id) {
      fetchFormStatus(activeCheckin.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCheckin?.id]);

  const fetchFormStatus = async (checkinId) => {
    if (!checkinId) return;

    const getFirst = (res) => {
      const d = res.data;
      const list = Array.isArray(d) ? d : (d?.results || []);
      return list.length ? list[0] : null;
    };

    try {
      const results = await Promise.allSettled([
        api.get(`/immediate-postop-progress-note/?checkin=${encodeURIComponent(checkinId)}`),
        api.get(`/exparel-billing-worksheet/?checkin=${encodeURIComponent(checkinId)}`),
        api.get(`/implant-billable-information/?checkin=${encodeURIComponent(checkinId)}`),
        api.get(`/pacu-mobility/?checkin=${encodeURIComponent(checkinId)}`),
        api.get(`/pacu-progress-notes/?checkin=${encodeURIComponent(checkinId)}`),
        api.get(`/pacu-additional-nursing-notes/?checkin=${encodeURIComponent(checkinId)}`),
        api.get(`/pacu-records/?checkin=${encodeURIComponent(checkinId)}`),
      ]);

      const safe = (i) => (results[i].status === 'fulfilled' ? getFirst(results[i].value) : null);

      setFormStatus({
        immediatePostOp: safe(0),
        exparel: safe(1),
        implant: safe(2),
        pacuMobility: safe(3),
        pacuProgressNotes: safe(4),
        pacuAdditionalNursingNotes: safe(5),
        pacuRecord: safe(6),
      });
    } catch (e) {
      // don’t block the page if this fails
      console.warn('Failed to load form statuses', e);
    }
  };

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

      // reset
      setUploadForm({ doc_type: 'other', title: '', notes: '', file: null });

      // refresh list
      fetchDocuments();
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

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

  const checkInNow = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/checkin/`);
      await fetchAppointments(); // refresh appointment list
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
  const renderButtonStatus = (obj) => {
    if (!obj) return null;

    const isSigned = !!obj.is_signed || !!obj.is_locked;
    return (
      <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
        isSigned
          ? 'bg-gray-100 text-gray-800 border-gray-200'
          : 'bg-blue-50 text-blue-800 border-blue-200'
      }`}>
        {isSigned ? '🔒 Signed' : '✅ Started'}
      </span>
    );
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */} 
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
    
        {/* Patient Info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {fullName || 'Patient'}
          </h1>
          <p className="text-sm text-gray-600">
            MRN: <span className="font-semibold">{patient.medical_record_number}</span>
            {' • '}
            DOB: <span className="font-semibold">{patient.date_of_birth || '—'}</span>
            {' • '}
            Age: <span className="font-semibold">{age || '—'}</span>
          </p>
        </div>

        {/* Actions */}
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
            title="Check in patient for today’s appointment"
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

        <button
          onClick={() => alert('Next: Encounter creation')}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + New Encounter
        </button>
      </div>

    </div>
  </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Demographics */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Demographics</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Sex (Administrative)"
              value={
                patient.gender === 'M'
                ? 'Male'
                : patient.gender === 'F'
                ? 'Female'
                : patient.gender === 'O'
                ? 'Other'
                : '—'
              }
            />

            <Field
              label="Race"
              value={displayValue(patient.race, RACE_LABELS)}
            />

            <Field
              label="Ethnicity"
              value={displayValue(patient.ethnicity, ETHNICITY_LABELS)}
            />

            <Field 
              label="Preferred Language" 
              value={displayLanguage(patient.preferred_language)} 
            />

            <Field
              label="Sexual Orientation"
              value={displaySexualOrientation(patient.sexual_orientation)}
            />

            <Field
              label="Gender Identity"
              value={displayGenderIdentity(patient.gender_identity)}
            />
          </div>
        </section>

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
            {/* Next Appointment */}
            {nextAppointment && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-900">
                  <strong>Next Appointment:</strong>{' '}
                  {new Date(nextAppointment.scheduled_start).toLocaleString()}
                  {nextAppointment.reason_for_visit ? ` — ${nextAppointment.reason_for_visit}` : ''}
                </div>
              </div>
            )}

            {/* Upcoming */}
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

             {/* Past */}
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
        
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Documents</h2>

          {/* Upload form */}
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
                  Upload PDFs, images, scanned forms. All uploads are audit-logged and clinic-scoped.
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

          {/* Document list */}
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

        {/* PACU Forms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">PACU Forms</h2>
            <span className="text-xs text-gray-500">Patient Chart only</span>
          </div>

          {checkinError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {checkinError}
            </div>
          )}

          {checkinLoading ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">
              Loading active check-in…
            </div>
          ) : !activeCheckin ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-600">
              No active PACU check-in for this patient right now.
              <div className="text-xs text-gray-500 mt-2">
                (PACU Mobility Assessment becomes available after check-in.)
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-600">
                    Active Check-in ID: <span className="font-semibold">{activeCheckin.id}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: <span className="font-semibold">{activeCheckin.status || '—'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Checked in:{" "}
                    <span className="font-semibold">
                      {activeCheckin.check_in_time
                        ? new Date(activeCheckin.check_in_time).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/pre-op-phone-call`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Pre-Op Phone Call
                  </button>
                  
                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/fall-risk-assessment-preop-testing`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Fall Risk (Pre-Op Testing)
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/fall-risk-assessment-preop`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Fall Risk (Pre-Operative)
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/preoperative-nurses-notes`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Pre-Op Nurse Notes (Pg 1)
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/post-operative-phone-call`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    Post-Op Phone Call
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/post-op-infection-education`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    Infection Education
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/dvt-pe-education`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    DVT/PE Education
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/patient-instructions`)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
                  >
                    Patient Instructions
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/history-and-physical`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    History & Physical
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/consent-for-anesthesia-services`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Consent for Anesthesia Services
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/anesthesia-orders`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Anesthesia Orders
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/peripheral-nerve-block-procedure-note`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Peripheral Nerve Block Procedure Note
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/operating-room-record`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Operating Room Record
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/anesthesia-record`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Anesthesia Record
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/exparel-billing-worksheet`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Exparel Billing Worksheet
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/implant-billable-information`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Implant / Billable Info
                  </button>
                  
                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/pacu-mobility`)}
                    className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    PACU Mobility Assessment
                  </button>
                
                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/immediate-postop-progress-note`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    Immediate Post-Op Progress Note
                  </button>                  
                  
                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/pacu-additional-nursing-notes`)}
                    className="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-semibold"
                  >
                    PACU Additional Nursing Notes
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/pacu-record`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    {getStatusDot(getFormMeta('pacu_record').status)}
                    PACU Record
                    {getFormMeta('pacu_record').signed && <span title="Signed">🔒</span>}
                  </button>

                  <button
                    onClick={() => navigate(`/checkins/${activeCheckin.id}/medication-reconciliation`)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold"
                  >
                    Medication Reconciliation
                  </button>

                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Forms are saved to the chart and can be signed/locked with tablet signature.
              </div>
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
          HIPAA: clinic-scoped access enforced server-side; audit logging occurs on API access; data transmitted over authenticated requests.
        </div>
      </main>
    </div>
  );
}

export default PatientDetail;
