import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function makeEmptyMedicationRow() {
  return { time: '', medication_and_dose: '', route: '', site: '', other: '', initials: '' };
}

function makeEmptyPatientAssessmentRow() {
  return {
    time: '',
    bp: '',
    pulse: '',
    resp: '',
    o2_sat: '',
    temp: '',
    iv_site_infusing: '',
    nv: '',
    pain_level: '',
    site_quality_intensity_character: '',
    comments: '',
    initials: '',
  };
}

function makeEmptyWoundRow() {
  return {
    time: '',
    location_site: '',
    dressing: '',
    cr_lt3sec: '',
    pulses_palpable: '',
    drains: '',
    action_taken: '',
    comments: '',
  };
}

function makeEmptyAldreteRow() {
  return { col: 'OA', activity: '', respiration: '', circulation: '', loc: '', color: '', total: '' };
}

function Checkbox({ checked, onChange, disabled, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function PacuRecord() {
  const navigate = useNavigate();
  const { checkinId } = useParams();
  const sigRef = useRef(null);

  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),

    // Header
    surgeon: '',
    anesthesiologist: '',
    procedure: '',
    date: '',
    arrival_time: '',

    airway: '',
    airway_dc_time: '',

    nkda: false,
    allergies_text: '',

    o2_device: '',
    o2_lpm: '',
    o2_dc_time: '',

    anesthesia_type: '',
    asa_level: '',

    // Tables
    aldrete_rows: [],
    medication_rows: [],
    patient_assessment_rows: [],
    wound_extremity_rows: [],

    // Intake/Output/Notes blocks
    intake_notes: '',
    output_notes: '',
    general_notes: '',

    // Bottom section
    cardiac: '',
    lungs: '',
    neuro_orientation: '',
    neuro_other: '',
    upper_extremities_motor: '',
    upper_extremities_sensory: '',
    lower_extremities_motor: '',
    lower_extremities_sensory: '',
    iv_dc_time: '',
    iv_site: '',
    iv_without_redness_swelling: false,
    vital_signs_stable: false,
    respirations_even_unlabored: false,
    breath_sounds: '',
    tolerating_po_fluids: false,

    // Discharge
    discharge_via: '',
    discharged_to: '',
    discharge_other: '',
    discharge_pain_level: '',
    discharge_comments: '',
    discharge_time: '',

    // Signature
    is_signed: false,
    signed_by: null,
    signed_at: null,
    signature_data_url: '',
  });

  const isSigned = !!data.is_signed;

  const headerSubtitle = useMemo(() => {
    if (!data.signed_at) return 'Draft';
    return `Signed at ${new Date(data.signed_at).toLocaleString()}`;
  }, [data.signed_at]);

  const setField = (name, value) => setData((prev) => ({ ...prev, [name]: value }));

  const updateRow = (key, idx, field, value, fallbackFactory) => {
    if (isSigned) return;
    setData((prev) => {
      const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
      const row = { ...(arr[idx] || fallbackFactory()) };
      row[field] = value;
      arr[idx] = row;
      return { ...prev, [key]: arr };
    });
  };

  const addRow = (key, factory) => {
    if (isSigned) return;
    setData((prev) => ({
      ...prev,
      [key]: [...(Array.isArray(prev[key]) ? prev[key] : []), factory()],
    }));
  };

  const removeRow = (key, idx) => {
    if (isSigned) return;
    setData((prev) => {
      const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
  };

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await api.get(`/pacu-records/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const r = list[0];
        setRecordId(r.id);
        setData((prev) => ({
          ...prev,
          ...r,
          checkin: Number(checkinId),
          aldrete_rows: Array.isArray(r.aldrete_rows) ? r.aldrete_rows : [],
          medication_rows: Array.isArray(r.medication_rows) ? r.medication_rows : [],
          patient_assessment_rows: Array.isArray(r.patient_assessment_rows) ? r.patient_assessment_rows : [],
          wound_extremity_rows: Array.isArray(r.wound_extremity_rows) ? r.wound_extremity_rows : [],
        }));
        return;
      }

      const created = await api.post('/pacu-records/', { checkin: Number(checkinId) });
      setRecordId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...created.data,
        checkin: Number(checkinId),
        aldrete_rows: Array.isArray(created.data.aldrete_rows) ? created.data.aldrete_rows : [],
        medication_rows: Array.isArray(created.data.medication_rows) ? created.data.medication_rows : [],
        patient_assessment_rows: Array.isArray(created.data.patient_assessment_rows) ? created.data.patient_assessment_rows : [],
        wound_extremity_rows: Array.isArray(created.data.wound_extremity_rows) ? created.data.wound_extremity_rows : [],
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create PACU Record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!recordId) return;
    setError('');
    setSaving(true);

    try {
      const payload = {
        surgeon: data.surgeon || '',
        anesthesiologist: data.anesthesiologist || '',
        procedure: data.procedure || '',
        date: data.date || null,
        arrival_time: data.arrival_time || null,

        airway: data.airway || '',
        airway_dc_time: data.airway_dc_time || null,

        nkda: !!data.nkda,
        allergies_text: data.allergies_text || '',

        o2_device: data.o2_device || '',
        o2_lpm: data.o2_lpm || '',
        o2_dc_time: data.o2_dc_time || null,

        anesthesia_type: data.anesthesia_type || '',
        asa_level: data.asa_level || '',

        aldrete_rows: Array.isArray(data.aldrete_rows) ? data.aldrete_rows : [],
        medication_rows: Array.isArray(data.medication_rows) ? data.medication_rows : [],
        patient_assessment_rows: Array.isArray(data.patient_assessment_rows) ? data.patient_assessment_rows : [],
        wound_extremity_rows: Array.isArray(data.wound_extremity_rows) ? data.wound_extremity_rows : [],

        intake_notes: data.intake_notes || '',
        output_notes: data.output_notes || '',
        general_notes: data.general_notes || '',

        cardiac: data.cardiac || '',
        lungs: data.lungs || '',
        neuro_orientation: data.neuro_orientation || '',
        neuro_other: data.neuro_other || '',
        upper_extremities_motor: data.upper_extremities_motor || '',
        upper_extremities_sensory: data.upper_extremities_sensory || '',
        lower_extremities_motor: data.lower_extremities_motor || '',
        lower_extremities_sensory: data.lower_extremities_sensory || '',
        iv_dc_time: data.iv_dc_time || null,
        iv_site: data.iv_site || '',
        iv_without_redness_swelling: !!data.iv_without_redness_swelling,
        vital_signs_stable: !!data.vital_signs_stable,
        respirations_even_unlabored: !!data.respirations_even_unlabored,
        breath_sounds: data.breath_sounds || '',
        tolerating_po_fluids: !!data.tolerating_po_fluids,

        discharge_via: data.discharge_via || '',
        discharged_to: data.discharged_to || '',
        discharge_other: data.discharge_other || '',
        discharge_pain_level: data.discharge_pain_level || '',
        discharge_comments: data.discharge_comments || '',
        discharge_time: data.discharge_time || null,
      };

      const res = await api.patch(`/pacu-records/${recordId}/`, payload);
      setData((prev) => ({ ...prev, ...res.data }));
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

  const signAndLock = async () => {
    if (!recordId || isSigned) return;

    setError('');
    setSigning(true);

    try {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        setError('RN signature is required to sign this PACU Record.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await api.post(`/pacu-records/${recordId}/sign/`, {
        signature_data_url: sigDataUrl,
      });

      setData((prev) => ({ ...prev, ...res.data }));
      alert('Signed & locked.');
    } catch (e) {
      console.error(e);
      setError('Failed to sign. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  return (

    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PACU Record</h1>
            <p className="text-sm text-gray-600">
              Check-in #{checkinId} • {headerSubtitle}
            </p>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PACU Record</h1>
            <p className="text-sm text-gray-600">
              Check-in #{checkinId} • {headerSubtitle}
            </p>

            {data.pacu_autofilled && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Auto-filled from surgery schedule
                {data.pacu_autofilled_at ? (
                  <span className="font-normal text-blue-600">
                    ({new Date(data.pacu_autofilled_at).toLocaleString()})
                  </span>
                ) : null}
              </div>
            )}
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
              disabled={loading || saving || isSigned}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-300"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <button
              onClick={signAndLock}
              disabled={loading || signing || isSigned}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:bg-orange-200 disabled:text-orange-800"
              title="Locks the form after RN signs"
            >
              {isSigned ? 'Signed' : signing ? 'Signing…' : 'Sign & Lock'}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">
            Loading…
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-8">
            {/* ===== Header Fields (paper top section) ===== */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Header</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Surgeon</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.surgeon || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('surgeon', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Anesthesiologist</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.anesthesiologist || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('anesthesiologist', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Procedure</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.procedure || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('procedure', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.date || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Arrival Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.arrival_time || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('arrival_time', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ASA Level</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.asa_level || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('asa_level', e.target.value)}
                    placeholder="1 / 2 / 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Anesthesia Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.anesthesia_type || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('anesthesia_type', e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="Local">Local</option>
                    <option value="MAC">MAC</option>
                    <option value="General">General</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">O2 Device</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.o2_device || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('o2_device', e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="N/A">N/A</option>
                    <option value="NC">NC</option>
                    <option value="Mask">Mask</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">O2 L/min</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.o2_lpm || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('o2_lpm', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">O2 D/C Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={data.o2_dc_time || ''}
                    disabled={isSigned}
                    onChange={(e) => setField('o2_dc_time', e.target.value)}
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <Checkbox
                      label="NKDA"
                      checked={data.nkda}
                      disabled={isSigned}
                      onChange={(v) => setField('nkda', v)}
                    />

                    <div className="flex-1 min-w-[240px]">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Allergies</label>
                      <input
                        className="w-full px-3 py-2 border rounded-lg"
                        value={data.allergies_text || ''}
                        disabled={isSigned}
                        onChange={(e) => setField('allergies_text', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Airway</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <select
                      className="px-3 py-2 border rounded-lg"
                      value={data.airway || ''}
                      disabled={isSigned}
                      onChange={(e) => setField('airway', e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="N/A">N/A</option>
                      <option value="Nasal">Nasal</option>
                      <option value="Oral">Oral</option>
                      <option value="LMA">LMA</option>
                      <option value="D/C’d @">D/C’d @</option>
                    </select>

                    <div className="min-w-[180px]">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Airway D/C Time</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2 border rounded-lg"
                        value={data.airway_dc_time || ''}
                        disabled={isSigned}
                        onChange={(e) => setField('airway_dc_time', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== Aldrete ===== */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Aldrete</h2>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => addRow('aldrete_rows', makeEmptyAldreteRow)}
                    disabled={isSigned}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200"
                  >
                    + Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Col','Activity','Resp','Circ','LOC','Color','Total'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Row</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(Array.isArray(data.aldrete_rows) ? data.aldrete_rows : []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 text-sm text-gray-600 text-center">No Aldrete rows yet.</td>
                      </tr>
                    ) : (
                      data.aldrete_rows.map((row, idx) => (
                        <tr key={idx}>
                          {['col','activity','respiration','circulation','loc','color','total'].map((field) => (
                            <td key={field} className="px-3 py-2">
                              <input
                                value={row?.[field] || ''}
                                onChange={(e) => updateRow('aldrete_rows', idx, field, e.target.value, makeEmptyAldreteRow)}
                                disabled={isSigned}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 print:hidden">
                            <button
                              type="button"
                              onClick={() => removeRow('aldrete_rows', idx)}
                              disabled={isSigned}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Medications ===== */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Medications</h2>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => addRow('medication_rows', makeEmptyMedicationRow)}
                    disabled={isSigned}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200"
                  >
                    + Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time','Medication and Dose','Route','Site','Other','Initials'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Row</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(Array.isArray(data.medication_rows) ? data.medication_rows : []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-sm text-gray-600 text-center">No medication rows yet.</td>
                      </tr>
                    ) : (
                      data.medication_rows.map((row, idx) => (
                        <tr key={idx} className="align-top">
                          {['time','medication_and_dose','route','site','other','initials'].map((field) => (
                            <td key={field} className="px-3 py-2">
                              <input
                                value={row?.[field] || ''}
                                onChange={(e) => updateRow('medication_rows', idx, field, e.target.value, makeEmptyMedicationRow)}
                                disabled={isSigned}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 print:hidden">
                            <button
                              type="button"
                              onClick={() => removeRow('medication_rows', idx)}
                              disabled={isSigned}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Patient Assessment ===== */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Patient Assessment</h2>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => addRow('patient_assessment_rows', makeEmptyPatientAssessmentRow)}
                    disabled={isSigned}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200"
                  >
                    + Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time','BP','Pulse','Resp','O2 Sat','Temp','IV site/Infusing','N/V','Pain Level','Site/Quality/Intensity/Character','Comments','Initials'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Row</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(Array.isArray(data.patient_assessment_rows) ? data.patient_assessment_rows : []).length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-4 py-4 text-sm text-gray-600 text-center">No assessment rows yet.</td>
                      </tr>
                    ) : (
                      data.patient_assessment_rows.map((row, idx) => (
                        <tr key={idx} className="align-top">
                          {[
                            'time','bp','pulse','resp','o2_sat','temp','iv_site_infusing','nv','pain_level',
                            'site_quality_intensity_character','comments','initials'
                          ].map((field) => (
                            <td key={field} className="px-3 py-2">
                              <input
                                value={row?.[field] || ''}
                                onChange={(e) => updateRow('patient_assessment_rows', idx, field, e.target.value, makeEmptyPatientAssessmentRow)}
                                disabled={isSigned}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 print:hidden">
                            <button
                              type="button"
                              onClick={() => removeRow('patient_assessment_rows', idx)}
                              disabled={isSigned}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500 mt-2">Key: ✓ = Yes, X = No, ⓞ = N/A</div>
            </section>

            {/* ===== Wound / Extremity ===== */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Wound / Extremity Assessment</h2>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => addRow('wound_extremity_rows', makeEmptyWoundRow)}
                    disabled={isSigned}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200"
                  >
                    + Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Time','Location/Site','Dressing','CR < 3 sec','Pulses Palpable','Drains','Action Taken','Comments'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Row</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(Array.isArray(data.wound_extremity_rows) ? data.wound_extremity_rows : []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 text-sm text-gray-600 text-center">No wound/extremity rows yet.</td>
                      </tr>
                    ) : (
                      data.wound_extremity_rows.map((row, idx) => (
                        <tr key={idx} className="align-top">
                          {['time','location_site','dressing','cr_lt3sec','pulses_palpable','drains','action_taken','comments'].map((field) => (
                            <td key={field} className="px-3 py-2">
                              <input
                                value={row?.[field] || ''}
                                onChange={(e) => updateRow('wound_extremity_rows', idx, field, e.target.value, makeEmptyWoundRow)}
                                disabled={isSigned}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 print:hidden">
                            <button
                              type="button"
                              onClick={() => removeRow('wound_extremity_rows', idx)}
                              disabled={isSigned}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500 mt-2">Key: ✓ = Yes, X = No, ⓞ = N/A</div>
            </section>

            {/* ===== Intake / Output / Notes ===== */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Intake</label>
                <textarea
                  value={data.intake_notes}
                  onChange={(e) => setField('intake_notes', e.target.value)}
                  disabled={isSigned}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Output</label>
                <textarea
                  value={data.output_notes}
                  onChange={(e) => setField('output_notes', e.target.value)}
                  disabled={isSigned}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">General Notes</label>
                <textarea
                  value={data.general_notes}
                  onChange={(e) => setField('general_notes', e.target.value)}
                  disabled={isSigned}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </section>

            {/* ===== Bottom clinical summary + discharge ===== */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Cardiac / Neuro / Lungs / Discharge</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cardiac</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.cardiac || ''} disabled={isSigned} onChange={(e) => setField('cardiac', e.target.value)} placeholder="RRR / Other…" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lungs</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.lungs || ''} disabled={isSigned} onChange={(e) => setField('lungs', e.target.value)} placeholder="CTA / Other…" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Breath Sounds</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.breath_sounds || ''} disabled={isSigned} onChange={(e) => setField('breath_sounds', e.target.value)} />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Neuro</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="px-3 py-2 border rounded-lg" value={data.neuro_orientation || ''} disabled={isSigned} onChange={(e) => setField('neuro_orientation', e.target.value)} placeholder="Oriented x3 (date/time/place)…" />
                    <input className="px-3 py-2 border rounded-lg" value={data.neuro_other || ''} disabled={isSigned} onChange={(e) => setField('neuro_other', e.target.value)} placeholder="Other…" />
                    <input className="px-3 py-2 border rounded-lg" value={data.iv_site || ''} disabled={isSigned} onChange={(e) => setField('iv_site', e.target.value)} placeholder="IV Site…" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">IV D/C Time</label>
                  <input type="time" className="w-full px-3 py-2 border rounded-lg" value={data.iv_dc_time || ''} disabled={isSigned} onChange={(e) => setField('iv_dc_time', e.target.value)} />
                </div>

                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center gap-4 mt-7">
                    <Checkbox label="IV without redness/swelling" checked={data.iv_without_redness_swelling} disabled={isSigned} onChange={(v) => setField('iv_without_redness_swelling', v)} />
                    <Checkbox label="Vital signs stable" checked={data.vital_signs_stable} disabled={isSigned} onChange={(v) => setField('vital_signs_stable', v)} />
                    <Checkbox label="Respirations even and unlabored" checked={data.respirations_even_unlabored} disabled={isSigned} onChange={(v) => setField('respirations_even_unlabored', v)} />
                    <Checkbox label="Tolerating PO fluids" checked={data.tolerating_po_fluids} disabled={isSigned} onChange={(v) => setField('tolerating_po_fluids', v)} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Upper Extremities Motor</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.upper_extremities_motor || ''} disabled={isSigned} onChange={(e) => setField('upper_extremities_motor', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Upper Extremities Sensory</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.upper_extremities_sensory || ''} disabled={isSigned} onChange={(e) => setField('upper_extremities_sensory', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lower Extremities Motor</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.lower_extremities_motor || ''} disabled={isSigned} onChange={(e) => setField('lower_extremities_motor', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lower Extremities Sensory</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={data.lower_extremities_sensory || ''} disabled={isSigned} onChange={(e) => setField('lower_extremities_sensory', e.target.value)} />
                </div>

                <div className="md:col-span-3">
                  <h3 className="text-md font-bold text-gray-900 mt-4 mb-2">Discharge</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="px-3 py-2 border rounded-lg" value={data.discharge_via || ''} disabled={isSigned} onChange={(e) => setField('discharge_via', e.target.value)} placeholder="Discharge via (wheelchair/other)..." />
                    <input className="px-3 py-2 border rounded-lg" value={data.discharged_to || ''} disabled={isSigned} onChange={(e) => setField('discharged_to', e.target.value)} placeholder="Discharged to (home/other)..." />
                    <input className="px-3 py-2 border rounded-lg" value={data.discharge_other || ''} disabled={isSigned} onChange={(e) => setField('discharge_other', e.target.value)} placeholder="Other…" />
                    <input className="px-3 py-2 border rounded-lg" value={data.discharge_pain_level || ''} disabled={isSigned} onChange={(e) => setField('discharge_pain_level', e.target.value)} placeholder="Pain level" />
                    <input type="time" className="px-3 py-2 border rounded-lg" value={data.discharge_time || ''} disabled={isSigned} onChange={(e) => setField('discharge_time', e.target.value)} />
                    <input className="px-3 py-2 border rounded-lg" value={data.discharge_comments || ''} disabled={isSigned} onChange={(e) => setField('discharge_comments', e.target.value)} placeholder="Comments…" />
                  </div>
                </div>
              </div>
            </section>

            {/* ===== Signature ===== */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">RN Signature</h2>
                <button
                  type="button"
                  onClick={clearSignature}
                  disabled={isSigned}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400 print:hidden"
                >
                  Clear
                </button>
              </div>

              {isSigned ? (
                <div className="text-sm text-gray-700">✅ Signed. This form is locked.</div>
              ) : (
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-2 print:hidden">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="black"
                    canvasProps={{
                      width: 900,
                      height: 200,
                      className: 'bg-white rounded',
                    }}
                  />
                </div>
              )}

              {data.signature_data_url ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Captured Signature</div>
                  <img
                    src={data.signature_data_url}
                    alt="RN Signature"
                    className="border border-gray-200 rounded-lg max-w-full"
                  />
                </div>
              ) : null}

              <div className="mt-3 text-xs text-gray-500">
                Signing is audit-logged and stores a signature hash + content hash server-side.
              </div>
            </section>

            {/* Print CSS */}
            <style>{`
              @media print {
                body { background: white !important; }
                .print\\:hidden { display: none !important; }
                table { page-break-inside: avoid; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                section { page-break-inside: avoid; }
              }
            `}</style>
          </div>
        )}
      </main>
    </div>
  );
}

export default PacuRecord;
