import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function Checkbox({ checked, onChange, disabled, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-800">
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

function TextLine({ label, value, onChange, disabled, placeholder }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || ''}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled, rows = 4, placeholder }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || ''}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
      />
    </div>
  );
}

function makeEmptyTourniquetRow() {
  return {
    site: '',
    padded_with_webril: false,
    r: false,
    l: false,
    pressure_mmhg: '',
    time_up: '',
    time_down: '',
    applied_by: '',
  };
}

function makeEmptyCountRow() {
  return {
    item: '',
    first_y: false,
    first_n: false,
    second_y: false,
    second_n: false,
    relief_y: false,
    relief_n: false,
    final_y: false,
    final_n: false,
  };
}

function OperatingRoomRecord() {
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

    room_number: '',
    in_time: '',
    start_time: '',
    end_time: '',
    out_time: '',

    // two JSON buckets to match the paper pages
    page1: {},
    page2: {},

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

  const setP1 = (path, value) => {
    if (isSigned) return;
    setData((prev) => ({
      ...prev,
      page1: { ...(prev.page1 || {}), [path]: value },
    }));
  };

  const setP2 = (path, value) => {
    if (isSigned) return;
    setData((prev) => ({
      ...prev,
      page2: { ...(prev.page2 || {}), [path]: value },
    }));
  };

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/operating-room-record/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      if (list.length > 0) {
        const r = list[0];
        setRecordId(r.id);
        setData((prev) => ({
          ...prev,
          ...r,
          checkin: Number(checkinId),
          page1: r.page1 || {},
          page2: r.page2 || {},
        }));
        return;
      }

      const created = await api.post('/operating-room-record/', { checkin: Number(checkinId) });
      setRecordId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...created.data,
        checkin: Number(checkinId),
        page1: created.data.page1 || {},
        page2: created.data.page2 || {},
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Operating Room Record.');
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
        room_number: data.room_number || '',
        in_time: data.in_time || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        out_time: data.out_time || null,
        page1: data.page1 || {},
        page2: data.page2 || {},
      };
      const res = await api.patch(`/operating-room-record/${recordId}/`, payload);
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
        setError('OR Nurse signature is required to sign this form.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await api.post(`/operating-room-record/${recordId}/sign/`, {
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

  // --- Page 1 defaults ---
  const p1 = data.page1 || {};
  const p2 = data.page2 || {};

  const tourniquets = Array.isArray(p2.tourniquet_rows) ? p2.tourniquet_rows : [];
  const counts = Array.isArray(p2.count_rows) ? p2.count_rows : [];

  const ensureTourniquetRow = (idx) => {
    const arr = [...tourniquets];
    while (arr.length <= idx) arr.push(makeEmptyTourniquetRow());
    setP2('tourniquet_rows', arr);
  };

  const updateTourniquet = (idx, key, value) => {
    const arr = [...tourniquets];
    if (!arr[idx]) arr[idx] = makeEmptyTourniquetRow();
    arr[idx] = { ...arr[idx], [key]: value };
    setP2('tourniquet_rows', arr);
  };

  const addTourniquetRow = () => setP2('tourniquet_rows', [...tourniquets, makeEmptyTourniquetRow()]);
  const removeTourniquetRow = (idx) => {
    const arr = [...tourniquets];
    arr.splice(idx, 1);
    setP2('tourniquet_rows', arr);
  };

  const ensureCountRow = (idx) => {
    const arr = [...counts];
    while (arr.length <= idx) arr.push(makeEmptyCountRow());
    setP2('count_rows', arr);
  };

  const updateCount = (idx, key, value) => {
    const arr = [...counts];
    if (!arr[idx]) arr[idx] = makeEmptyCountRow();
    arr[idx] = { ...arr[idx], [key]: value };
    setP2('count_rows', arr);
  };

  const addCountRow = () => setP2('count_rows', [...counts, makeEmptyCountRow()]);
  const removeCountRow = (idx) => {
    const arr = [...counts];
    arr.splice(idx, 1);
    setP2('count_rows', arr);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operating Room Record</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId} • {headerSubtitle}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
              ← Back
            </button>

            <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold">
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
              title="Locks the form after signing"
            >
              {isSigned ? 'Signed' : signing ? 'Signing…' : 'Sign & Lock'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-8">

            {/* ======= TOP BAR (Room/In/Start/End/Out + ASA/Allergies/NKDA area) ======= */}
            <section className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TextLine label="Room #" value={data.room_number} onChange={(v) => setField('room_number', v)} disabled={isSigned} />
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">In time</div>
                  <input type="time" value={data.in_time || ''} onChange={(e) => setField('in_time', e.target.value)} disabled={isSigned} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Start time</div>
                  <input type="time" value={data.start_time || ''} onChange={(e) => setField('start_time', e.target.value)} disabled={isSigned} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">End time</div>
                  <input type="time" value={data.end_time || ''} onChange={(e) => setField('end_time', e.target.value)} disabled={isSigned} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Out time</div>
                  <input type="time" value={data.out_time || ''} onChange={(e) => setField('out_time', e.target.value)} disabled={isSigned} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>

                <TextLine label="ASA" value={p1.asa || ''} onChange={(v) => setP1('asa', v)} disabled={isSigned} placeholder="e.g., I / II / III / IV / V" />

                <div className="flex flex-col gap-2 md:col-span-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <Checkbox label="NKDA" checked={!!p1.nkda} disabled={isSigned} onChange={(v) => setP1('nkda', v)} />
                    <div className="flex-1 min-w-[240px]">
                      <TextLine label="Allergies" value={p1.allergies || ''} onChange={(v) => setP1('allergies', v)} disabled={isSigned} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===================== PAGE 1 ===================== */}
            <section className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">OR Record — Page 1</h2>

              {/* Pre-op Assessment (big block) */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">Pre-op Assessment</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextLine label="Patient ID (Verbal / Arm band / Parent/Guardian/Family / DOB / Other)" value={p1.patient_id || ''} onChange={(v) => setP1('patient_id', v)} disabled={isSigned} />
                  <TextLine label="Mental Status (Alert / Oriented / Calm / Anxious / Other)" value={p1.mental_status || ''} onChange={(v) => setP1('mental_status', v)} disabled={isSigned} />
                  <TextLine label="Overall skin condition (Warm / Dry / Intact / Breakdown / Other)" value={p1.skin_condition || ''} onChange={(v) => setP1('skin_condition', v)} disabled={isSigned} />
                  <TextLine label="Surgical site/side verified by (Surgeon / Parent/Guardian/Family / Consent / H&P)" value={p1.site_verified_by || ''} onChange={(v) => setP1('site_verified_by', v)} disabled={isSigned} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextLine label="Operative Consent Complete (Yes/No)" value={p1.op_consent_complete || ''} onChange={(v) => setP1('op_consent_complete', v)} disabled={isSigned} />
                  <TextLine label="Anesthesia Consent Complete (Yes/No)" value={p1.anesthesia_consent_complete || ''} onChange={(v) => setP1('anesthesia_consent_complete', v)} disabled={isSigned} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextLine label="Metal implants (None / Location)" value={p1.metal_implants || ''} onChange={(v) => setP1('metal_implants', v)} disabled={isSigned} />
                  <TextLine label="PreOp Handoff Completed with" value={p1.preop_handoff_with || ''} onChange={(v) => setP1('preop_handoff_with', v)} disabled={isSigned} />
                </div>

                <TextLine label="NPO status" value={p1.npo_status || ''} onChange={(v) => setP1('npo_status', v)} disabled={isSigned} />
              </section>

              {/* Staff table */}
              <section className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-bold text-gray-900">Staff</div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextLine label="Surgeon" value={p1.surgeon || ''} onChange={(v) => setP1('surgeon', v)} disabled={isSigned} />
                    <div className="space-y-2">
                      <TextLine label="Anesthesiologist" value={p1.anesthesiologist || ''} onChange={(v) => setP1('anesthesiologist', v)} disabled={isSigned} />
                      <Checkbox label="N/A" checked={!!p1.anesthesiologist_na} disabled={isSigned} onChange={(v) => setP1('anesthesiologist_na', v)} />
                    </div>
                    <div className="space-y-2">
                      <TextLine label="Assistant" value={p1.assistant || ''} onChange={(v) => setP1('assistant', v)} disabled={isSigned} />
                      <Checkbox label="N/A" checked={!!p1.assistant_na} disabled={isSigned} onChange={(v) => setP1('assistant_na', v)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextLine label="Circulator Name" value={p1.circulator_name || ''} onChange={(v) => setP1('circulator_name', v)} disabled={isSigned} />
                    <TextLine label="Scrub Name" value={p1.scrub_name || ''} onChange={(v) => setP1('scrub_name', v)} disabled={isSigned} />
                  </div>

                  <TextLine label="Other personnel" value={p1.other_personnel || ''} onChange={(v) => setP1('other_personnel', v)} disabled={isSigned} />
                </div>
              </section>

              {/* TIME OUT */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">TIME OUT</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <TextLine label="Before Anesthesia (time)" value={p1.timeout_before_anesthesia || ''} onChange={(v) => setP1('timeout_before_anesthesia', v)} disabled={isSigned} placeholder="HH:MM" />
                  <TextLine label="Before Incision (time)" value={p1.timeout_before_incision || ''} onChange={(v) => setP1('timeout_before_incision', v)} disabled={isSigned} placeholder="HH:MM" />
                  <TextLine label="Before End of Procedure (time)" value={p1.timeout_before_end || ''} onChange={(v) => setP1('timeout_before_end', v)} disabled={isSigned} placeholder="HH:MM" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Anes. Type</div>
                    <div className="flex flex-wrap gap-3">
                      {['MAC','General','Block','Local','Spinal'].map((x) => (
                        <Checkbox
                          key={x}
                          label={x}
                          checked={!!(p1.anes_type?.[x] )}
                          disabled={isSigned}
                          onChange={(v) => setP1('anes_type', { ...(p1.anes_type || {}), [x]: v })}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Wound Class</div>
                    <div className="flex flex-col gap-2">
                      {['I - Clean','II - Clean contaminated','III - Contaminated','IV - Dirty or infected'].map((x) => (
                        <Checkbox
                          key={x}
                          label={x}
                          checked={!!(p1.wound_class?.[x])}
                          disabled={isSigned}
                          onChange={(v) => setP1('wound_class', { ...(p1.wound_class || {}), [x]: v })}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Fire Risk</div>
                    <div className="flex flex-wrap gap-3">
                      {['I','II','III','IV','V'].map((x) => (
                        <Checkbox
                          key={x}
                          label={x}
                          checked={!!(p1.fire_risk?.[x])}
                          disabled={isSigned}
                          onChange={(v) => setP1('fire_risk', { ...(p1.fire_risk || {}), [x]: v })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Pre-op Diagnosis / Procedure / Post-op diag */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-4">
                <TextArea label="Pre-op Diagnosis" value={p1.preop_diagnosis || ''} onChange={(v) => setP1('preop_diagnosis', v)} disabled={isSigned} rows={3} />
                <TextArea label="Procedure" value={p1.procedure || ''} onChange={(v) => setP1('procedure', v)} disabled={isSigned} rows={3} />
                <div className="flex items-center gap-3">
                  <Checkbox label="Post-op Diag: See MD Notes" checked={!!p1.postop_diag_see_md_notes} disabled={isSigned} onChange={(v) => setP1('postop_diag_see_md_notes', v)} />
                </div>
                <TextArea label="Post-op Diagnosis" value={p1.postop_diagnosis || ''} onChange={(v) => setP1('postop_diagnosis', v)} disabled={isSigned} rows={2} />
              </section>

              {/* Implants */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">Implants</div>
                <div className="flex flex-wrap gap-4">
                  <Checkbox label="None" checked={!!p1.implants_none} disabled={isSigned} onChange={(v) => setP1('implants_none', v)} />
                  <Checkbox label="Yes (see Implant Sheet for Description)" checked={!!p1.implants_yes} disabled={isSigned} onChange={(v) => setP1('implants_yes', v)} />
                </div>
              </section>

              {/* Medications / Irrigation box + Specimens */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-bold text-gray-900">Medications / Irrigation / Route / Dose</div>

                  {/* This is intentionally “paper-like”: checkbox + line */}
                  {[
                    { k: 'nacl_1l', label: 'NaCl 1L bag irrigation x ____ at ____' },
                    { k: 'nacl_3l', label: 'NaCl 3L bag irrigation x ____ at ____' },
                    { k: 'nacl_500', label: 'NaCl 500mL bottle irrigation x ____ at ____' },
                    { k: 'nacl_1l_bottle', label: 'NaCl 1L bottle irrigation x ____ at ____' },
                    { k: 'marcaine', label: 'Marcaine inj ____ %  ____ mL at ____  (□ with Epi)' },
                    { k: 'lidocaine', label: 'Lidocaine inj ____ %  ____ mL at ____  (□ with Epi)' },
                    { k: 'naropin', label: 'Naropin/Ropivacaine inj ____ %  ____ mL at ____' },
                    { k: 'epinephrine', label: 'Epinephrine inj ____ mL □ with NaCl ____ mL at ____' },
                    { k: 'toradol', label: 'Toradol inj ____ mg □ with NaCl ____ mL at ____' },
                    { k: 'betadine', label: 'Betadine Paint topical ____ mL at ____' },
                    { k: 'vanco_powder', label: 'Vancomycin Powder topical ____ g  □ Joint  □ Cement at ____' },
                    { k: 'gentamicin_irrig', label: 'Gentamycin ____ mg in irrigation at ____' },
                    { k: 'thrombin', label: 'Thrombin topical ____ units at ____' },
                    { k: 'duramorph', label: 'Duramorph ____ mg □ with Naropin ____ % ____ mL at ____' },
                    { k: 'depomedrol', label: 'Depomedrol ____ mg □ Dexamethasone ____ mg at ____' },
                    { k: 'exparel', label: 'Exparel ____ mL at ____  □ Alert band placed on patient' },
                    { k: 'other', label: 'Other: ______________________________________________' },
                  ].map((row) => (
                    <div key={row.k} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!(p1.meds_checks?.[row.k])}
                        onChange={(e) => setP1('meds_checks', { ...(p1.meds_checks || {}), [row.k]: e.target.checked })}
                        disabled={isSigned}
                        className="mt-1 h-4 w-4"
                      />
                      <input
                        value={(p1.meds_lines?.[row.k]) || ''}
                        onChange={(e) => setP1('meds_lines', { ...(p1.meds_lines || {}), [row.k]: e.target.value })}
                        disabled={isSigned}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder={row.label}
                      />
                    </div>
                  ))}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="text-sm font-bold text-gray-900">Specimens</div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Pathology</div>
                    <TextLine label="1" value={p1.pathology_1 || ''} onChange={(v) => setP1('pathology_1', v)} disabled={isSigned} />
                    <TextLine label="2" value={p1.pathology_2 || ''} onChange={(v) => setP1('pathology_2', v)} disabled={isSigned} />
                    <TextLine label="3" value={p1.pathology_3 || ''} onChange={(v) => setP1('pathology_3', v)} disabled={isSigned} />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Cultures</div>
                    <TextLine label="Source" value={p1.culture_source || ''} onChange={(v) => setP1('culture_source', v)} disabled={isSigned} />
                    <div className="flex flex-wrap gap-3">
                      {['Routine C&S','Anaerobic','Aerobic/Anaerobic','Fungal','Other'].map((x) => (
                        <Checkbox
                          key={x}
                          label={x}
                          checked={!!(p1.cultures?.[x])}
                          disabled={isSigned}
                          onChange={(v) => setP1('cultures', { ...(p1.cultures || {}), [x]: v })}
                        />
                      ))}
                    </div>
                    <TextLine label="Other (if checked)" value={p1.cultures_other || ''} onChange={(v) => setP1('cultures_other', v)} disabled={isSigned} />
                    <TextLine label="Source (second)" value={p1.culture_source_2 || ''} onChange={(v) => setP1('culture_source_2', v)} disabled={isSigned} />
                  </div>
                </div>
              </section>
            </section>

            {/* ===================== PAGE 2 ===================== */}
            <section className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">OR Record — Page 2</h2>

              {/* Surgical position */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">Surgical Position</div>
                <div className="flex flex-wrap gap-4">
                  {['Supine','Beach Chair','Prone','Lateral R/L','Sitting','Other'].map((x) => (
                    <Checkbox
                      key={x}
                      label={x}
                      checked={!!(p2.position?.[x])}
                      disabled={isSigned}
                      onChange={(v) => setP2('position', { ...(p2.position || {}), [x]: v })}
                    />
                  ))}
                </div>
                <TextLine label="Other (if checked)" value={p2.position_other || ''} onChange={(v) => setP2('position_other', v)} disabled={isSigned} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextLine label="LEFT ARM (On padded armboard / Secured / At Side / Tucked / Across chest / Hand table / Operative)" value={p2.left_arm || ''} onChange={(v) => setP2('left_arm', v)} disabled={isSigned} />
                  <TextLine label="RIGHT ARM (On padded armboard / Secured / At Side / Tucked / Across chest / Hand table / Operative)" value={p2.right_arm || ''} onChange={(v) => setP2('right_arm', v)} disabled={isSigned} />
                </div>

                <TextLine label="Safety Strap placed (Chest / Torso / Mid-thigh / Lower leg / Other)" value={p2.safety_strap || ''} onChange={(v) => setP2('safety_strap', v)} disabled={isSigned} />
                <TextLine label="Positioned by (Surgeon / Nurse / Surgeon Assistant / Anesthesiologist / Scrub tech / Other)" value={p2.positioned_by || ''} onChange={(v) => setP2('positioned_by', v)} disabled={isSigned} />
              </section>

              {/* Positioning aids */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">Positioning Aids</div>

                <div className="flex flex-wrap gap-4">
                  {['Blankets','Gel','Foam','Pillow'].map((x) => (
                    <Checkbox
                      key={x}
                      label={x}
                      checked={!!(p2.headrest?.[x])}
                      disabled={isSigned}
                      onChange={(v) => setP2('headrest', { ...(p2.headrest || {}), [x]: v })}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  {['Pillows','Foam padding','Sheets','Elbows','Heels','Popliteal','Hip Bump','Axillary Roll','Shoulder Roll'].map((x) => (
                    <Checkbox
                      key={x}
                      label={x}
                      checked={!!(p2.pressure_points?.[x])}
                      disabled={isSigned}
                      onChange={(v) => setP2('pressure_points', { ...(p2.pressure_points || {}), [x]: v })}
                    />
                  ))}
                </div>

                <TextLine label="Positioning Devices (free text)" value={p2.positioning_devices || ''} onChange={(v) => setP2('positioning_devices', v)} disabled={isSigned} placeholder="Include L/R notes if needed" />

                <div className="flex flex-wrap gap-4">
                  {[
                    'Hand Table','Arm Sling','Alvarado Boot','Foot stop/rests','Lateral Post','Blue Leg Holder',
                    'Crescent Post','Bone Foam','Well Leg Holder','Beach Chair','Kidney Post','Bean Bag',
                    'Hip Scope Attachment','Hana Table','Wilson Frame','Jackson Table'
                  ].map((x) => (
                    <Checkbox
                      key={x}
                      label={x}
                      checked={!!(p2.positioning_devices_checks?.[x])}
                      disabled={isSigned}
                      onChange={(v) => setP2('positioning_devices_checks', { ...(p2.positioning_devices_checks || {}), [x]: v })}
                    />
                  ))}
                </div>
              </section>

              {/* DVT / Normothermia */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">DVT Prevention</div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Bair Hugger</div>
                    <div className="flex flex-wrap gap-3">
                      <Checkbox label="N/A" checked={!!(p2.bair_hugger?.na)} disabled={isSigned} onChange={(v) => setP2('bair_hugger', { ...(p2.bair_hugger || {}), na: v })} />
                      <TextLine label="Unit #" value={p2.bair_hugger?.unit || ''} onChange={(v) => setP2('bair_hugger', { ...(p2.bair_hugger || {}), unit: v })} disabled={isSigned} />
                      <Checkbox label="Upper Body" checked={!!(p2.bair_hugger?.upper)} disabled={isSigned} onChange={(v) => setP2('bair_hugger', { ...(p2.bair_hugger || {}), upper: v })} />
                      <Checkbox label="Lower Body" checked={!!(p2.bair_hugger?.lower)} disabled={isSigned} onChange={(v) => setP2('bair_hugger', { ...(p2.bair_hugger || {}), lower: v })} />
                    </div>

                    <div className="text-xs font-semibold text-gray-700">SCDs</div>
                    <div className="flex flex-wrap gap-3">
                      <Checkbox label="N/A" checked={!!(p2.scds?.na)} disabled={isSigned} onChange={(v) => setP2('scds', { ...(p2.scds || {}), na: v })} />
                      <TextLine label="Unit #" value={p2.scds?.unit || ''} onChange={(v) => setP2('scds', { ...(p2.scds || {}), unit: v })} disabled={isSigned} />
                      <Checkbox label="Bilateral" checked={!!(p2.scds?.bilateral)} disabled={isSigned} onChange={(v) => setP2('scds', { ...(p2.scds || {}), bilateral: v })} />
                      <Checkbox label="Right" checked={!!(p2.scds?.right)} disabled={isSigned} onChange={(v) => setP2('scds', { ...(p2.scds || {}), right: v })} />
                      <Checkbox label="Left" checked={!!(p2.scds?.left)} disabled={isSigned} onChange={(v) => setP2('scds', { ...(p2.scds || {}), left: v })} />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Checkbox label="Used according to IFU" checked={!!p2.used_according_ifu} disabled={isSigned} onChange={(v) => setP2('used_according_ifu', v)} />
                      <Checkbox label="No redness noted on skin postop" checked={!!p2.no_redness_postop} disabled={isSigned} onChange={(v) => setP2('no_redness_postop', v)} />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">Skin Prep</div>
                  <TextLine label="Area prepped" value={p2.area_prepped || ''} onChange={(v) => setP2('area_prepped', v)} disabled={isSigned} />
                  <div className="flex flex-wrap gap-3">
                    {['N/A','Betadine Scrub / Paint','CHG 4%','Alcohol','Chloraprep','Duraprep','Other'].map((x) => (
                      <Checkbox
                        key={x}
                        label={x}
                        checked={!!(p2.prep_solution?.[x])}
                        disabled={isSigned}
                        onChange={(v) => setP2('prep_solution', { ...(p2.prep_solution || {}), [x]: v })}
                      />
                    ))}
                  </div>
                  <TextLine label="Prepped by" value={p2.prepped_by || ''} onChange={(v) => setP2('prepped_by', v)} disabled={isSigned} />
                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="Hair clipped: N/A" checked={!!(p2.hair_clipped?.na)} disabled={isSigned} onChange={(v) => setP2('hair_clipped', { ...(p2.hair_clipped || {}), na: v })} />
                    <Checkbox label="Hair clipped: Yes" checked={!!(p2.hair_clipped?.yes)} disabled={isSigned} onChange={(v) => setP2('hair_clipped', { ...(p2.hair_clipped || {}), yes: v })} />
                    <TextLine label="By" value={p2.hair_clipped?.by || ''} onChange={(v) => setP2('hair_clipped', { ...(p2.hair_clipped || {}), by: v })} disabled={isSigned} />
                  </div>
                  <Checkbox label="Prep allowed to dry according to IFU" checked={!!p2.prep_allowed_to_dry} disabled={isSigned} onChange={(v) => setP2('prep_allowed_to_dry', v)} />
                </div>
              </section>

              {/* ESU / RF / XRay */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">ESU</div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="N/A" checked={!!p2.esu_na} disabled={isSigned} onChange={(v) => setP2('esu_na', v)} />
                    <TextLine label="Unit #" value={p2.esu_unit || ''} onChange={(v) => setP2('esu_unit', v)} disabled={isSigned} />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <TextLine label="Settings: Cut" value={p2.esu_cut || ''} onChange={(v) => setP2('esu_cut', v)} disabled={isSigned} />
                    <TextLine label="Coag" value={p2.esu_coag || ''} onChange={(v) => setP2('esu_coag', v)} disabled={isSigned} />
                    <TextLine label="Bipolar" value={p2.esu_bipolar || ''} onChange={(v) => setP2('esu_bipolar', v)} disabled={isSigned} />
                  </div>

                  <TextLine label="Grounding Pad: Lot #" value={p2.ground_lot || ''} onChange={(v) => setP2('ground_lot', v)} disabled={isSigned} />
                  <TextLine label="Exp" value={p2.ground_exp || ''} onChange={(v) => setP2('ground_exp', v)} disabled={isSigned} />
                  <TextLine label="Site" value={p2.ground_site || ''} onChange={(v) => setP2('ground_site', v)} disabled={isSigned} />
                  <TextLine label="Applied by" value={p2.ground_applied_by || ''} onChange={(v) => setP2('ground_applied_by', v)} disabled={isSigned} />

                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="Post-op Pad Site: Warm/Dry/Intact" checked={!!(p2.postop_pad_site?.wdi)} disabled={isSigned} onChange={(v) => setP2('postop_pad_site', { ...(p2.postop_pad_site || {}), wdi: v })} />
                    <Checkbox label="Without redness" checked={!!(p2.postop_pad_site?.no_redness)} disabled={isSigned} onChange={(v) => setP2('postop_pad_site', { ...(p2.postop_pad_site || {}), no_redness: v })} />
                    <Checkbox label="Other" checked={!!(p2.postop_pad_site?.other)} disabled={isSigned} onChange={(v) => setP2('postop_pad_site', { ...(p2.postop_pad_site || {}), other: v })} />
                  </div>
                  <TextLine label="Other (desc)" value={p2.postop_pad_site_other_desc || ''} onChange={(v) => setP2('postop_pad_site_other_desc', v)} disabled={isSigned} />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">RF Generator</div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="N/A" checked={!!p2.rf_na} disabled={isSigned} onChange={(v) => setP2('rf_na', v)} />
                    <TextLine label="Unit #" value={p2.rf_unit || ''} onChange={(v) => setP2('rf_unit', v)} disabled={isSigned} />
                  </div>
                  <Checkbox label="Safety checklist followed" checked={!!p2.rf_safety_checklist} disabled={isSigned} onChange={(v) => setP2('rf_safety_checklist', v)} />
                  <TextLine label="Settings" value={p2.rf_settings || ''} onChange={(v) => setP2('rf_settings', v)} disabled={isSigned} />
                  <TextLine label="Operator" value={p2.rf_operator || ''} onChange={(v) => setP2('rf_operator', v)} disabled={isSigned} />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">X-Ray</div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="N/A" checked={!!p2.xray_na} disabled={isSigned} onChange={(v) => setP2('xray_na', v)} />
                    <TextLine label="C-arm SN" value={p2.carm_sn || ''} onChange={(v) => setP2('carm_sn', v)} disabled={isSigned} />
                    <TextLine label="Mini C-arm SN" value={p2.mini_carm_sn || ''} onChange={(v) => setP2('mini_carm_sn', v)} disabled={isSigned} />
                  </div>
                  <TextLine label="Tech" value={p2.xray_tech || ''} onChange={(v) => setP2('xray_tech', v)} disabled={isSigned} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextLine label="Dose (mGy)" value={p2.xray_dose_mgy || ''} onChange={(v) => setP2('xray_dose_mgy', v)} disabled={isSigned} />
                    <TextLine label="Time (seconds)" value={p2.xray_time_seconds || ''} onChange={(v) => setP2('xray_time_seconds', v)} disabled={isSigned} />
                  </div>
                </div>
              </section>

              {/* Tourniquet table */}
              <section className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">Tourniquet</div>
                  <div className="flex gap-2 print:hidden">
                    <button onClick={addTourniquetRow} disabled={isSigned} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200">
                      + Row
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Site','Padded w/ webril','R','L','Pressure (mmHg)','Time up','Time down','Applied by',''].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(tourniquets.length ? tourniquets : [makeEmptyTourniquetRow(), makeEmptyTourniquetRow()]).map((row, idx) => {
                        if (!tourniquets.length) ensureTourniquetRow(idx);
                        const r = tourniquets[idx] || row;
                        return (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2"><input value={r.site || ''} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'site', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                            <td className="px-3 py-2"><input type="checkbox" checked={!!r.padded_with_webril} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'padded_with_webril', e.target.checked)} /></td>
                            <td className="px-3 py-2"><input type="checkbox" checked={!!r.r} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'r', e.target.checked)} /></td>
                            <td className="px-3 py-2"><input type="checkbox" checked={!!r.l} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'l', e.target.checked)} /></td>
                            <td className="px-3 py-2"><input value={r.pressure_mmhg || ''} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'pressure_mmhg', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                            <td className="px-3 py-2"><input value={r.time_up || ''} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'time_up', e.target.value)} className="w-full px-2 py-1 border rounded" placeholder="HH:MM" /></td>
                            <td className="px-3 py-2"><input value={r.time_down || ''} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'time_down', e.target.value)} className="w-full px-2 py-1 border rounded" placeholder="HH:MM" /></td>
                            <td className="px-3 py-2"><input value={r.applied_by || ''} disabled={isSigned} onChange={(e) => updateTourniquet(idx, 'applied_by', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                            <td className="px-3 py-2 print:hidden">
                              <button onClick={() => removeTourniquetRow(idx)} disabled={isSigned} className="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400">
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Dressings & Drains + Notes column */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">Dressings & Drains</div>
                  {[
                    'ABD pad','Coban','Webril / Cast Padding','Ace Wrap 2" 3" 4" 6"','Casting / Splint OrthoGlass / Plaster',
                    'Adaptic','Xeroform','Steri Strips','Benzoin','Mastisol','Tegaderm','Island Bandage','Band-aid','Dermabond',
                  ].map((x) => (
                    <Checkbox
                      key={x}
                      label={x}
                      checked={!!(p2.dressings?.[x])}
                      disabled={isSigned}
                      onChange={(v) => setP2('dressings', { ...(p2.dressings || {}), [x]: v })}
                    />
                  ))}

                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Sponge</div>
                    <div className="flex flex-wrap gap-3">
                      {['2x2','4x4'].map((x) => (
                        <Checkbox key={x} label={x} checked={!!(p2.sponge?.[x])} disabled={isSigned} onChange={(v) => setP2('sponge', { ...(p2.sponge || {}), [x]: v })} />
                      ))}
                    </div>

                    <div className="text-xs font-semibold text-gray-700">Tape</div>
                    <div className="flex flex-wrap gap-3">
                      {['Medipore tape','Paper tape','Silk tape','Foam tape'].map((x) => (
                        <Checkbox key={x} label={x} checked={!!(p2.tape?.[x])} disabled={isSigned} onChange={(v) => setP2('tape', { ...(p2.tape || {}), [x]: v })} />
                      ))}
                    </div>

                    <div className="text-xs font-semibold text-gray-700">Packing</div>
                    <div className="flex flex-wrap gap-3">
                      {['Iodoform','Plain'].map((x) => (
                        <Checkbox key={x} label={x} checked={!!(p2.packing?.[x])} disabled={isSigned} onChange={(v) => setP2('packing', { ...(p2.packing || {}), [x]: v })} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">Post-Op DME</div>
                  {[
                    'Arm Sling','Shoulder Immobilizer','Wrist Brace','Hinged Knee Brace','Knee Immobilizer','Walking Boot',
                    'Clothes: Walker','Abdominal Binder','Herd / Soft Collar','SCD / Ted Hose','Cold Therapy'
                  ].map((x) => (
                    <Checkbox key={x} label={x} checked={!!(p2.postop_dme?.[x])} disabled={isSigned} onChange={(v) => setP2('postop_dme', { ...(p2.postop_dme || {}), [x]: v })} />
                  ))}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold text-gray-900">Catheter / Urine / Drains</div>
                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="N/A Catheter" checked={!!p2.catheter_na} disabled={isSigned} onChange={(v) => setP2('catheter_na', v)} />
                    <Checkbox label="Foley placed in OR" checked={!!p2.foley_in_or} disabled={isSigned} onChange={(v) => setP2('foley_in_or', v)} />
                  </div>
                  <TextLine label="OR insertion by/time" value={p2.or_insertion_by_time || ''} onChange={(v) => setP2('or_insertion_by_time', v)} disabled={isSigned} />
                  <TextLine label="Removal by/time" value={p2.removal_by_time || ''} onChange={(v) => setP2('removal_by_time', v)} disabled={isSigned} />
                  <TextLine label="Urine output (mL)" value={p2.urine_output_ml || ''} onChange={(v) => setP2('urine_output_ml', v)} disabled={isSigned} />

                  <div className="flex flex-wrap gap-3">
                    <Checkbox label="N/A Drains" checked={!!p2.drains_na} disabled={isSigned} onChange={(v) => setP2('drains_na', v)} />
                  </div>
                  <TextLine label="Drain location" value={p2.drain_location || ''} onChange={(v) => setP2('drain_location', v)} disabled={isSigned} />
                  <TextLine label="JP/Blake ___ Fr" value={p2.jp_blake_fr || ''} onChange={(v) => setP2('jp_blake_fr', v)} disabled={isSigned} />
                  <TextLine label="Hemovac ___ Fr" value={p2.hemovac_fr || ''} onChange={(v) => setP2('hemovac_fr', v)} disabled={isSigned} />
                  <TextLine label="Penrose ___ inch" value={p2.penrose_inch || ''} onChange={(v) => setP2('penrose_inch', v)} disabled={isSigned} />
                </div>
              </section>

              {/* Counts */}
              <section className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">Counts</div>
                  <div className="flex gap-2 print:hidden">
                    <button onClick={addCountRow} disabled={isSigned} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200">
                      + Row
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Item','First Y','First N','Second Y','Second N','Relief Y','Relief N','Final Y','Final N',''].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(counts.length ? counts : [{...makeEmptyCountRow(), item: 'Sharps' }, {...makeEmptyCountRow(), item: 'Sponges' }, {...makeEmptyCountRow(), item: 'Instruments' }]).map((row, idx) => {
                        if (!counts.length) ensureCountRow(idx);
                        const r = counts[idx] || row;
                        return (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2"><input value={r.item || ''} disabled={isSigned} onChange={(e) => updateCount(idx, 'item', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                            {['first_y','first_n','second_y','second_n','relief_y','relief_n','final_y','final_n'].map((k) => (
                              <td key={k} className="px-3 py-2">
                                <input type="checkbox" checked={!!r[k]} disabled={isSigned} onChange={(e) => updateCount(idx, k, e.target.checked)} />
                              </td>
                            ))}
                            <td className="px-3 py-2 print:hidden">
                              <button onClick={() => removeCountRow(idx)} disabled={isSigned} className="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400">
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <TextLine label="Counted by (initials)" value={p2.counted_by || ''} onChange={(v) => setP2('counted_by', v)} disabled={isSigned} />
                    <TextLine label="If incorrect, explain" value={p2.count_incorrect_explain || ''} onChange={(v) => setP2('count_incorrect_explain', v)} disabled={isSigned} />
                  </div>
                </div>
              </section>

              {/* Transfer + OR Nurse signature line (we still capture signature below) */}
              <section className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">Transfer</div>
                <div className="flex flex-wrap gap-3">
                  <Checkbox label="Surgeon notified" checked={!!p2.surgeon_notified} disabled={isSigned} onChange={(v) => setP2('surgeon_notified', v)} />
                  <Checkbox label="X-Ray taken" checked={!!p2.xray_taken} disabled={isSigned} onChange={(v) => setP2('xray_taken', v)} />
                  <Checkbox label="Item recovered" checked={!!p2.item_recovered} disabled={isSigned} onChange={(v) => setP2('item_recovered', v)} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Checkbox label="Patient transferred to PACU" checked={!!p2.transferred_to_pacu} disabled={isSigned} onChange={(v) => setP2('transferred_to_pacu', v)} />
                  <TextLine label="Via" value={p2.transfer_via || ''} onChange={(v) => setP2('transfer_via', v)} disabled={isSigned} placeholder="Stretcher / etc." />
                  <Checkbox label="Siderails up" checked={!!p2.siderails_up} disabled={isSigned} onChange={(v) => setP2('siderails_up', v)} />
                  <Checkbox label="With Anesthesiologist" checked={!!p2.with_anesthesiologist} disabled={isSigned} onChange={(v) => setP2('with_anesthesiologist', v)} />
                </div>

                <TextLine label="Hand off report given to" value={p2.handoff_to || ''} onChange={(v) => setP2('handoff_to', v)} disabled={isSigned} />
              </section>

              {/* Nurse's Notes */}
              <section className="border border-gray-200 rounded-lg p-4">
                <TextArea label="Nurse’s Notes" value={p2.nurse_notes || ''} onChange={(v) => setP2('nurse_notes', v)} disabled={isSigned} rows={6} />
              </section>
            </section>

            {/* Signature */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">OR Nurse Signature</h2>
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
                    canvasProps={{ width: 900, height: 200, className: 'bg-white rounded' }}
                  />
                </div>
              )}

              {data.signature_data_url ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Captured Signature</div>
                  <img src={data.signature_data_url} alt="OR Nurse Signature" className="border border-gray-200 rounded-lg max-w-full" />
                </div>
              ) : null}

              <div className="mt-3 text-xs text-gray-500">
                Signing locks the record.
              </div>
            </section>

            {/* Print CSS */}
            <style>{`
              @media print {
                body { background: white !important; }
                .print\\:hidden { display: none !important; }
                section { page-break-inside: avoid; }
                table { page-break-inside: avoid; }
                tr { page-break-inside: avoid; }
              }
            `}</style>
          </div>
        )}
      </main>
    </div>
  );
}

export default OperatingRoomRecord;
