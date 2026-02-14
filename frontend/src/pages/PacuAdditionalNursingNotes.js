import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function emptyPatientAssessmentRow() {
  return {
    time: '',
    bp: '',
    pulse: '',
    resp: '',
    o2_sat: '',
    temp: '',
    iv_site_infusing: '',
    n_v: '',
    pain_level: '',
    site_quality_intensity_character: '',
    comments: '',
    initials: '',
  };
}

function emptyWoundExtremityRow() {
  return {
    time: '',
    location_site: '',
    dressing: '',
    cr_lt_3_sec: '',
    pulses_palpable: '',
    drains: '',
    action_taken: '',
    comments: '',
  };
}

function emptyMedicationRow() {
  return {
    time: '',
    medication_and_dose: '',
    route: '',
    site: '',
    other: '',
    initials: '',
  };
}

function PacuAdditionalNursingNotes() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const sigRef = useRef(null);

  const [formId, setFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),
    patient_assessment_rows: [],
    wound_extremity_rows: [],
    medication_rows: [],
    notes: '',
    is_locked: false,
    signatures: [],
    locked_by: null,
    locked_at: null,
  });

  const isLocked = !!data.is_locked;

  const headerSubtitle = useMemo(() => {
    if (data.locked_at) return `Locked at ${new Date(data.locked_at).toLocaleString()}`;
    return 'Draft';
  }, [data.locked_at]);

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/pacu-additional-nursing-notes/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const f = list[0];
        setFormId(f.id);
        setData((prev) => ({
          ...prev,
          ...f,
          checkin: Number(checkinId),
          patient_assessment_rows: Array.isArray(f.patient_assessment_rows) ? f.patient_assessment_rows : [],
          wound_extremity_rows: Array.isArray(f.wound_extremity_rows) ? f.wound_extremity_rows : [],
          medication_rows: Array.isArray(f.medication_rows) ? f.medication_rows : [],
          signatures: Array.isArray(f.signatures) ? f.signatures : [],
        }));
        return;
      }

      const created = await api.post('/pacu-additional-nursing-notes/', { checkin: Number(checkinId) });
      setFormId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...created.data,
        checkin: Number(checkinId),
        patient_assessment_rows: Array.isArray(created.data.patient_assessment_rows) ? created.data.patient_assessment_rows : [],
        wound_extremity_rows: Array.isArray(created.data.wound_extremity_rows) ? created.data.wound_extremity_rows : [],
        medication_rows: Array.isArray(created.data.medication_rows) ? created.data.medication_rows : [],
        signatures: Array.isArray(created.data.signatures) ? created.data.signatures : [],
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Additional Nursing Notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!formId) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        patient_assessment_rows: Array.isArray(data.patient_assessment_rows) ? data.patient_assessment_rows : [],
        wound_extremity_rows: Array.isArray(data.wound_extremity_rows) ? data.wound_extremity_rows : [],
        medication_rows: Array.isArray(data.medication_rows) ? data.medication_rows : [],
        notes: data.notes || '',
      };

      const res = await api.patch(`/pacu-additional-nursing-notes/${formId}/`, payload);
      setData((prev) => ({
        ...prev,
        ...res.data,
        patient_assessment_rows: Array.isArray(res.data.patient_assessment_rows) ? res.data.patient_assessment_rows : [],
        wound_extremity_rows: Array.isArray(res.data.wound_extremity_rows) ? res.data.wound_extremity_rows : [],
        medication_rows: Array.isArray(res.data.medication_rows) ? res.data.medication_rows : [],
        signatures: Array.isArray(res.data.signatures) ? res.data.signatures : [],
      }));
      alert('Saved.');
    } catch (e) {
      console.error(e);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearSignature = () => {
    if (sigRef.current) sigRef.current.clear();
  };

  const addSignature = async () => {
    if (!formId) return;
    if (isLocked) return;

    setError('');
    setSigning(true);
    try {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        setError('Signature is required.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');

      const res = await api.post(`/pacu-additional-nursing-notes/${formId}/sign/`, {
        signature_data_url: sigDataUrl,
      });

      setData((prev) => ({
        ...prev,
        ...res.data,
        signatures: Array.isArray(res.data.signatures) ? res.data.signatures : prev.signatures,
      }));

      sigRef.current.clear();
      alert('Signature added.');
    } catch (e) {
      console.error(e);
      setError('Failed to sign. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const lockForm = async () => {
    if (!formId) return;
    if (isLocked) return;

    setError('');
    setSigning(true);
    try {
      // Optional: require at least 1 signature before locking
      if (!Array.isArray(data.signatures) || data.signatures.length === 0) {
        const ok = window.confirm('No signatures captured yet. Lock anyway?');
        if (!ok) {
          setSigning(false);
          return;
        }
      }

      await saveDraft();

      const res = await api.post(`/pacu-additional-nursing-notes/${formId}/lock/`, {});
      setData((prev) => ({ ...prev, ...res.data }));
      alert('Locked.');
    } catch (e) {
      console.error(e);
      setError('Failed to lock. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const setPA = (idx, key, value) => {
    if (isLocked) return;
    setData((prev) => {
      const arr = Array.isArray(prev.patient_assessment_rows) ? [...prev.patient_assessment_rows] : [];
      const row = { ...(arr[idx] || emptyPatientAssessmentRow()) };
      row[key] = value;
      arr[idx] = row;
      return { ...prev, patient_assessment_rows: arr };
    });
  };

  const setWE = (idx, key, value) => {
    if (isLocked) return;
    setData((prev) => {
      const arr = Array.isArray(prev.wound_extremity_rows) ? [...prev.wound_extremity_rows] : [];
      const row = { ...(arr[idx] || emptyWoundExtremityRow()) };
      row[key] = value;
      arr[idx] = row;
      return { ...prev, wound_extremity_rows: arr };
    });
  };

  const setMed = (idx, key, value) => {
    if (isLocked) return;
    setData((prev) => {
      const arr = Array.isArray(prev.medication_rows) ? [...prev.medication_rows] : [];
      const row = { ...(arr[idx] || emptyMedicationRow()) };
      row[key] = value;
      arr[idx] = row;
      return { ...prev, medication_rows: arr };
    });
  };

  const addRow = (section) => {
    if (isLocked) return;
    setData((prev) => {
      if (section === 'pa') {
        const arr = Array.isArray(prev.patient_assessment_rows) ? [...prev.patient_assessment_rows] : [];
        return { ...prev, patient_assessment_rows: [...arr, emptyPatientAssessmentRow()] };
      }
      if (section === 'we') {
        const arr = Array.isArray(prev.wound_extremity_rows) ? [...prev.wound_extremity_rows] : [];
        return { ...prev, wound_extremity_rows: [...arr, emptyWoundExtremityRow()] };
      }
      const arr = Array.isArray(prev.medication_rows) ? [...prev.medication_rows] : [];
      return { ...prev, medication_rows: [...arr, emptyMedicationRow()] };
    });
  };

  const removeRow = (section, idx) => {
    if (isLocked) return;
    setData((prev) => {
      const clone = { ...prev };
      if (section === 'pa') {
        const arr = Array.isArray(prev.patient_assessment_rows) ? [...prev.patient_assessment_rows] : [];
        arr.splice(idx, 1);
        clone.patient_assessment_rows = arr;
        return clone;
      }
      if (section === 'we') {
        const arr = Array.isArray(prev.wound_extremity_rows) ? [...prev.wound_extremity_rows] : [];
        arr.splice(idx, 1);
        clone.wound_extremity_rows = arr;
        return clone;
      }
      const arr = Array.isArray(prev.medication_rows) ? [...prev.medication_rows] : [];
      arr.splice(idx, 1);
      clone.medication_rows = arr;
      return clone;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-wrap { box-shadow: none !important; }
          table { page-break-inside: avoid; }
          tr, td, th { page-break-inside: avoid; }
          .print-section { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <header className="bg-white shadow no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PACU Additional Nursing Notes</h1>
            <p className="text-sm text-gray-600">
              Check-in #{checkinId} • {headerSubtitle}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold"
            >
              Print / PDF
            </button>

            <button
              onClick={saveDraft}
              disabled={loading || saving || isLocked}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-300"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <button
              onClick={lockForm}
              disabled={loading || signing || isLocked}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:bg-orange-200 disabled:text-orange-800"
              title="Locks the form after finalization"
            >
              {isLocked ? 'Locked' : signing ? 'Locking…' : 'Lock'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg no-print">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600 print-wrap">
            Loading…
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-6 print-wrap">
            <div className="text-sm text-gray-600 no-print">
              Matches the paper sections: Patient Assessment, Wound/Extremity, Medications, Notes. Add rows as needed.
              Locking prevents edits. Signatures are captured on a tablet and audit-logged.
            </div>

            {/* Patient Assessment */}
            <section className="print-section">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">Patient Assessment</h2>
                <div className="flex gap-2 no-print">
                  <button
                    onClick={() => addRow('pa')}
                    disabled={isLocked}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200 disabled:text-blue-800"
                  >
                    + Add Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg mt-3">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time','BP','Pulse','Resp','O2 Sat','Temp','IV site/Infusing','N/V','Pain Level','Site/Quality/Intensity/Character','Comments','Initials','Row'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(data.patient_assessment_rows || []).length === 0 ? (
                      <tr><td colSpan={13} className="px-4 py-4 text-sm text-gray-600 text-center">No rows yet.</td></tr>
                    ) : (
                      (data.patient_assessment_rows || []).map((r, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-24 px-2 py-1 border rounded" value={r.time || ''} onChange={(e) => setPA(idx,'time',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-24 px-2 py-1 border rounded" value={r.bp || ''} onChange={(e) => setPA(idx,'bp',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.pulse || ''} onChange={(e) => setPA(idx,'pulse',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.resp || ''} onChange={(e) => setPA(idx,'resp',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.o2_sat || ''} onChange={(e) => setPA(idx,'o2_sat',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.temp || ''} onChange={(e) => setPA(idx,'temp',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-40 px-2 py-1 border rounded" value={r.iv_site_infusing || ''} onChange={(e) => setPA(idx,'iv_site_infusing',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.n_v || ''} onChange={(e) => setPA(idx,'n_v',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-24 px-2 py-1 border rounded" value={r.pain_level || ''} onChange={(e) => setPA(idx,'pain_level',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-64 px-2 py-1 border rounded" value={r.site_quality_intensity_character || ''} onChange={(e) => setPA(idx,'site_quality_intensity_character',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-64 px-2 py-1 border rounded" value={r.comments || ''} onChange={(e) => setPA(idx,'comments',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.initials || ''} onChange={(e) => setPA(idx,'initials',e.target.value)} /></td>
                          <td className="px-3 py-2 no-print">
                            <button disabled={isLocked} onClick={() => removeRow('pa', idx)} className="px-3 py-2 border rounded font-semibold hover:bg-gray-100 disabled:text-gray-400">Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Wound/Extremity */}
            <section className="print-section">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">Wound / Extremity Assessment</h2>
                <div className="flex gap-2 no-print">
                  <button
                    onClick={() => addRow('we')}
                    disabled={isLocked}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200 disabled:text-blue-800"
                  >
                    + Add Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg mt-3">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time','Location/Site','Dressing','CR < 3 sec','Pulses Palpable','Drains','Action Taken','Comments','Row'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(data.wound_extremity_rows || []).length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-4 text-sm text-gray-600 text-center">No rows yet.</td></tr>
                    ) : (
                      (data.wound_extremity_rows || []).map((r, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-24 px-2 py-1 border rounded" value={r.time || ''} onChange={(e) => setWE(idx,'time',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-56 px-2 py-1 border rounded" value={r.location_site || ''} onChange={(e) => setWE(idx,'location_site',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-40 px-2 py-1 border rounded" value={r.dressing || ''} onChange={(e) => setWE(idx,'dressing',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-24 px-2 py-1 border rounded" value={r.cr_lt_3_sec || ''} onChange={(e) => setWE(idx,'cr_lt_3_sec',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-32 px-2 py-1 border rounded" value={r.pulses_palpable || ''} onChange={(e) => setWE(idx,'pulses_palpable',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-28 px-2 py-1 border rounded" value={r.drains || ''} onChange={(e) => setWE(idx,'drains',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-56 px-2 py-1 border rounded" value={r.action_taken || ''} onChange={(e) => setWE(idx,'action_taken',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-56 px-2 py-1 border rounded" value={r.comments || ''} onChange={(e) => setWE(idx,'comments',e.target.value)} /></td>
                          <td className="px-3 py-2 no-print">
                            <button disabled={isLocked} onClick={() => removeRow('we', idx)} className="px-3 py-2 border rounded font-semibold hover:bg-gray-100 disabled:text-gray-400">Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Medications */}
            <section className="print-section">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">Medications</h2>
                <div className="flex gap-2 no-print">
                  <button
                    onClick={() => addRow('med')}
                    disabled={isLocked}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200 disabled:text-blue-800"
                  >
                    + Add Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg mt-3">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time','Medication and Dose','Route','Site','Other','Initials','Row'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(data.medication_rows || []).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-4 text-sm text-gray-600 text-center">No rows yet.</td></tr>
                    ) : (
                      (data.medication_rows || []).map((r, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-24 px-2 py-1 border rounded" value={r.time || ''} onChange={(e) => setMed(idx,'time',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-72 px-2 py-1 border rounded" value={r.medication_and_dose || ''} onChange={(e) => setMed(idx,'medication_and_dose',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-28 px-2 py-1 border rounded" value={r.route || ''} onChange={(e) => setMed(idx,'route',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-28 px-2 py-1 border rounded" value={r.site || ''} onChange={(e) => setMed(idx,'site',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-28 px-2 py-1 border rounded" value={r.other || ''} onChange={(e) => setMed(idx,'other',e.target.value)} /></td>
                          <td className="px-3 py-2"><input disabled={isLocked} className="w-20 px-2 py-1 border rounded" value={r.initials || ''} onChange={(e) => setMed(idx,'initials',e.target.value)} /></td>
                          <td className="px-3 py-2 no-print">
                            <button disabled={isLocked} onClick={() => removeRow('med', idx)} className="px-3 py-2 border rounded font-semibold hover:bg-gray-100 disabled:text-gray-400">Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Notes */}
            <section className="print-section">
              <h2 className="text-lg font-bold text-gray-900">Notes</h2>
              <textarea
                value={data.notes || ''}
                onChange={(e) => !isLocked && setData((p) => ({ ...p, notes: e.target.value }))}
                disabled={isLocked}
                rows={5}
                className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Additional notes…"
              />
            </section>

            {/* Signatures */}
            <section className="print-section border-t border-gray-200 pt-6">
              <h2 className="text-lg font-bold text-gray-900">Signatures</h2>

              {Array.isArray(data.signatures) && data.signatures.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.signatures.slice(0, 3).map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-3">
                      <div className="text-xs text-gray-500">Signer #{idx + 1}</div>
                      <img src={s.signature_data_url} alt={`Signature ${idx + 1}`} className="mt-2 border rounded w-full" />
                      <div className="mt-2 text-xs text-gray-600">
                        {s.signed_at ? `Signed: ${new Date(s.signed_at).toLocaleString()}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-600">No signatures yet.</div>
              )}

              {!isLocked && (
                <>
                  <div className="mt-4 flex items-center justify-between no-print">
                    <div className="text-sm text-gray-600">Add up to 3 signatures, then lock.</div>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-2 rounded-lg border border-gray-300 bg-gray-50 p-2 no-print">
                    <SignatureCanvas
                      ref={sigRef}
                      penColor="black"
                      canvasProps={{
                        width: 900,
                        height: 180,
                        className: 'bg-white rounded',
                      }}
                    />
                  </div>

                  <div className="mt-3 flex gap-3 no-print">
                    <button
                      type="button"
                      onClick={addSignature}
                      disabled={signing || isLocked}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200 disabled:text-blue-800"
                    >
                      {signing ? 'Signing…' : 'Add Signature'}
                    </button>
                    <div className="text-xs text-gray-500 self-center">
                      Signatures are audit-logged and hashed server-side.
                    </div>
                  </div>
                </>
              )}

              {isLocked && (
                <div className="mt-3 text-sm text-gray-700">✅ Locked. This form is read-only.</div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default PacuAdditionalNursingNotes;
