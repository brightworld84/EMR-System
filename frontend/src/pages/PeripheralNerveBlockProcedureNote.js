import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

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

function TextField({ label, value, onChange, disabled, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        className="w-full px-3 py-2 border rounded-lg"
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        rows={rows}
        className="w-full px-3 py-2 border rounded-lg"
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PeripheralNerveBlockProcedureNote() {
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

    // Stored JSON pages (match your model fields)
    page1: {
      // Header-ish
      date: '',
      time: '',
      sedation_or_monitored_by: '',

      // Block types (top table)
      brachial_plexus: false,
      brachial_plexus_side: '', // R/L
      continuous_catheter_brachial_plexus: false,
      continuous_catheter_brachial_plexus_side: '',
      sciatic_nerve_block: false,
      sciatic_nerve_block_side: '',
      continuous_catheter_sciatic_nerve: false,
      continuous_catheter_sciatic_nerve_side: '',
      fascia_iliaca_block: false,
      fascia_iliaca_block_side: '',
      popliteal_other_peripheral_nerve: false,
      popliteal_other_peripheral_nerve_side: '',

      femoral_nerve_block: false,
      femoral_nerve_block_side: '',
      continuous_catheter_femoral_nerve: false,
      continuous_catheter_femoral_nerve_side: '',
      continuous_catheter_lumbar_plexus: false,
      continuous_catheter_lumbar_plexus_side: '',
      adductor_nerve_block: false,
      adductor_nerve_block_side: '',
      continuous_adductor_canal_catheter: false,
      continuous_adductor_canal_catheter_side: '',
      other_block: false,
      other_block_text: '',

      // Preparation / checkboxes
      preparation_pt_identified: false,
      preparation_monitor: false,
      preparation_rnb_explained: false,
      preparation_o2: false,
      preparation_site_confirmed: false,
      preparation_iv_access: false,
      preparation_time_out_performed: false,
      preparation_time_out_time: '',

      // Pt condition
      initial_bp: '',
      hr: '',
      awake: false,
      sedated_meaningful_contact: false,

      // Indication / diagnosis
      indication_analgesia: false,
      indication_surgical_anesthesia: false,
      diagnosis_pain_location: '',
      specific_request_by_dr: '',

      // Skin prep / position
      skin_prep_povidone_iodine: false,
      skin_prep_chlorhexidine: false,
      skin_prep_iodopher: false,
      skin_prep_isopropyl: false,
      skin_prep_alcohol: false,
      skin_prep_drape: false,

      position_supine: false,
      position_prone: false,
      position_lld: false,
      position_rld: false,
      position_sitting: false,

      // Needles / type / catheter / technique
      needle_arrow: false,
      needle_polymedic: false,
      needle_tuohy: false,
      needle_pencil_tipped: false,
      needle_stimuplex: false,

      type_single_injection: false,
      type_continuous_catheter: false,
      catheter_stimulating: false,
      catheter_non_stimulating: false,

      technique_injection_through_needle: false,
      technique_nerve_stimulator: false,
      technique_catheter_tunneled: false,
      technique_catheter_not_tunneled: false,
      technique_paresthesia_with_description: false,
      technique_ultrasound_guidance_saved: false,

      // Motor response table
      motor_response_ma: '',
      motor_response_ms: '',
      depth_cm: '',

      // Sedation given table
      sedation_midazolam_mg: '',
      sedation_fentanyl_mcg: '',

      // Inject table
      inject_bupivacaine: false,
      inject_ropivacaine: false,
      inject_mepivacaine: false,
      inject_lidocaine: false,
      concentration_percent: '',
      volume_ml: '',
      adjunct: '',
      epinephrine_1_100000: false,
      epinephrine_not_used: false,

      // Action taken
      narrative: '',
      blood_aspirated_no: false,
      blood_aspirated_yes: false,
      intravascular_test_negative: false,
      intravascular_test_positive: false,
      pain_on_injection_no: false,
      pain_on_injection_yes: false,
      resistance_normal: false,
      resistance_high: false,

      // Dressing / Events / Success / Condition
      dressing_none: false,
      dressing_sterile_occlusive: false,
      dressing_pressure_bandage: false,

      events_none: false,
      events_easy_well_tolerated: false,
      events_difficult: false,

      success_complete: false,
      success_partial: false,
      success_failed: false,
      success_aborted: false,
      success_full_eval_pending: false,

      patient_condition_stable: false,
      patient_condition_non_stable: false,
      patient_condition_non_stable_text: '',
    },

    page2: {
      // Sonogram pictures: simplest as free text placeholder or URLs
      sonogram_notes: '',

      // Checkbox narrative on page 2
      ultrasound_guidance_statement_checked: false,

      // Comments lines
      comments: '',

      // Signature + datetime lines (physician)
      physician_signature_name: '',
      date_time: '',
    },

    // Signature lock
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

  const setRootField = (name, value) => setData((prev) => ({ ...prev, [name]: value }));

  const setPageField = (pageKey, name, value) => {
    if (isSigned) return;
    setData((prev) => ({
      ...prev,
      [pageKey]: {
        ...(prev?.[pageKey] || {}),
        [name]: value,
      },
    }));
  };

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/peripheral-nerve-block-procedure-note/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];

      if (list.length > 0) {
        const r = list[0];
        setRecordId(r.id);
        setData((prev) => ({
          ...prev,
          ...r,
          checkin: Number(checkinId),
          page1: r.page1 || prev.page1,
          page2: r.page2 || prev.page2,
        }));
        return;
      }

      const created = await api.post('/peripheral-nerve-block-procedure-note/', { checkin: Number(checkinId) });
      setRecordId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...created.data,
        checkin: Number(checkinId),
        page1: created.data.page1 || prev.page1,
        page2: created.data.page2 || prev.page2,
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Peripheral Nerve Block Procedure Note.');
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
        page1: data.page1 || {},
        page2: data.page2 || {},
      };

      const res = await api.patch(`/peripheral-nerve-block-procedure-note/${recordId}/`, payload);
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
        setError('Physician signature is required to sign this form.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await api.post(`/peripheral-nerve-block-procedure-note/${recordId}/sign/`, {
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
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Peripheral Nerve Block(s) Procedure Note</h1>
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
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-8">
            {/* ===================== PAGE 1 ===================== */}
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Page 1</h2>
                <div className="text-xs text-gray-500">Block types, prep, technique, meds, action taken</div>
              </div>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Date" value={data.page1.date} disabled={isSigned} onChange={(v) => setPageField('page1', 'date', v)} placeholder="MM/DD/YYYY" />
                <TextField label="Time" value={data.page1.time} disabled={isSigned} onChange={(v) => setPageField('page1', 'time', v)} placeholder="HH:MM" />
                <TextField
                  label="Sedation / Monitored By"
                  value={data.page1.sedation_or_monitored_by}
                  disabled={isSigned}
                  onChange={(v) => setPageField('page1', 'sedation_or_monitored_by', v)}
                />
              </section>

              {/* Block selection (two columns like the paper) */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Left column blocks</div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.brachial_plexus} onChange={(v) => setPageField('page1','brachial_plexus',v)} label="Brachial Plexus" />
                      <TextField label="R/L" value={data.page1.brachial_plexus_side} disabled={isSigned} onChange={(v)=>setPageField('page1','brachial_plexus_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.continuous_catheter_brachial_plexus} onChange={(v)=>setPageField('page1','continuous_catheter_brachial_plexus',v)} label="Continuous Catheter Brachial Plexus" />
                      <TextField label="R/L" value={data.page1.continuous_catheter_brachial_plexus_side} disabled={isSigned} onChange={(v)=>setPageField('page1','continuous_catheter_brachial_plexus_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.sciatic_nerve_block} onChange={(v)=>setPageField('page1','sciatic_nerve_block',v)} label="Sciatic Nerve Block" />
                      <TextField label="R/L" value={data.page1.sciatic_nerve_block_side} disabled={isSigned} onChange={(v)=>setPageField('page1','sciatic_nerve_block_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.continuous_catheter_sciatic_nerve} onChange={(v)=>setPageField('page1','continuous_catheter_sciatic_nerve',v)} label="Continuous Catheter Sciatic Nerve" />
                      <TextField label="R/L" value={data.page1.continuous_catheter_sciatic_nerve_side} disabled={isSigned} onChange={(v)=>setPageField('page1','continuous_catheter_sciatic_nerve_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.fascia_iliaca_block} onChange={(v)=>setPageField('page1','fascia_iliaca_block',v)} label="Fascia Iliaca Block" />
                      <TextField label="R/L" value={data.page1.fascia_iliaca_block_side} disabled={isSigned} onChange={(v)=>setPageField('page1','fascia_iliaca_block_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.popliteal_other_peripheral_nerve} onChange={(v)=>setPageField('page1','popliteal_other_peripheral_nerve',v)} label="Popliteal / Other Peripheral Nerve" />
                      <TextField label="R/L" value={data.page1.popliteal_other_peripheral_nerve_side} disabled={isSigned} onChange={(v)=>setPageField('page1','popliteal_other_peripheral_nerve_side',v)} placeholder="R or L" />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Right column blocks</div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.femoral_nerve_block} onChange={(v)=>setPageField('page1','femoral_nerve_block',v)} label="Femoral Nerve Block" />
                      <TextField label="R/L" value={data.page1.femoral_nerve_block_side} disabled={isSigned} onChange={(v)=>setPageField('page1','femoral_nerve_block_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.continuous_catheter_femoral_nerve} onChange={(v)=>setPageField('page1','continuous_catheter_femoral_nerve',v)} label="Continuous Catheter Femoral Nerve" />
                      <TextField label="R/L" value={data.page1.continuous_catheter_femoral_nerve_side} disabled={isSigned} onChange={(v)=>setPageField('page1','continuous_catheter_femoral_nerve_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.continuous_catheter_lumbar_plexus} onChange={(v)=>setPageField('page1','continuous_catheter_lumbar_plexus',v)} label="Continuous Catheter Lumbar Plexus" />
                      <TextField label="R/L" value={data.page1.continuous_catheter_lumbar_plexus_side} disabled={isSigned} onChange={(v)=>setPageField('page1','continuous_catheter_lumbar_plexus_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.adductor_nerve_block} onChange={(v)=>setPageField('page1','adductor_nerve_block',v)} label="Adductor Nerve Block" />
                      <TextField label="R/L" value={data.page1.adductor_nerve_block_side} disabled={isSigned} onChange={(v)=>setPageField('page1','adductor_nerve_block_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.continuous_adductor_canal_catheter} onChange={(v)=>setPageField('page1','continuous_adductor_canal_catheter',v)} label="Continuous Adductor Canal Catheter" />
                      <TextField label="R/L" value={data.page1.continuous_adductor_canal_catheter_side} disabled={isSigned} onChange={(v)=>setPageField('page1','continuous_adductor_canal_catheter_side',v)} placeholder="R or L" />
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox disabled={isSigned} checked={data.page1.other_block} onChange={(v)=>setPageField('page1','other_block',v)} label="Other" />
                      <TextField label="Specify" value={data.page1.other_block_text} disabled={isSigned} onChange={(v)=>setPageField('page1','other_block_text',v)} placeholder="Other block name" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Key clinical bits */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Initial BP" value={data.page1.initial_bp} disabled={isSigned} onChange={(v)=>setPageField('page1','initial_bp',v)} />
                <TextField label="HR" value={data.page1.hr} disabled={isSigned} onChange={(v)=>setPageField('page1','hr',v)} />
                <div className="flex flex-wrap gap-4 items-end">
                  <Checkbox disabled={isSigned} checked={data.page1.awake} onChange={(v)=>setPageField('page1','awake',v)} label="Awake" />
                  <Checkbox disabled={isSigned} checked={data.page1.sedated_meaningful_contact} onChange={(v)=>setPageField('page1','sedated_meaningful_contact',v)} label="Sedated w/ meaningful contact" />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-700">Indication</div>
                  <Checkbox disabled={isSigned} checked={data.page1.indication_analgesia} onChange={(v)=>setPageField('page1','indication_analgesia',v)} label="Analgesia" />
                  <Checkbox disabled={isSigned} checked={data.page1.indication_surgical_anesthesia} onChange={(v)=>setPageField('page1','indication_surgical_anesthesia',v)} label="Surgical Anesthesia" />
                  <TextField label="Diagnosis / Pain Location" value={data.page1.diagnosis_pain_location} disabled={isSigned} onChange={(v)=>setPageField('page1','diagnosis_pain_location',v)} />
                  <TextField label="Specifically requested by Dr." value={data.page1.specific_request_by_dr} disabled={isSigned} onChange={(v)=>setPageField('page1','specific_request_by_dr',v)} />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-700">Technique (key items)</div>
                  <Checkbox disabled={isSigned} checked={data.page1.technique_ultrasound_guidance_saved} onChange={(v)=>setPageField('page1','technique_ultrasound_guidance_saved',v)} label="Ultrasound Guidance w/Image Saved" />
                  <Checkbox disabled={isSigned} checked={data.page1.technique_nerve_stimulator} onChange={(v)=>setPageField('page1','technique_nerve_stimulator',v)} label="Nerve Stimulator" />
                  <Checkbox disabled={isSigned} checked={data.page1.technique_injection_through_needle} onChange={(v)=>setPageField('page1','technique_injection_through_needle',v)} label="Injection Through Needle" />
                  <Checkbox disabled={isSigned} checked={data.page1.technique_paresthesia_with_description} onChange={(v)=>setPageField('page1','technique_paresthesia_with_description',v)} label="Paresthesia with Description" />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextArea label="Narrative" value={data.page1.narrative} disabled={isSigned} onChange={(v)=>setPageField('page1','narrative',v)} rows={4} />
                <TextArea label="Comments (page 1)" value={data.page1.comments_page1} disabled={isSigned} onChange={(v)=>setPageField('page1','comments_page1',v)} rows={4} placeholder="(Optional notes)" />
              </section>
            </div>

            {/* ===================== PAGE 2 ===================== */}
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Page 2</h2>
                <div className="text-xs text-gray-500">Sonogram Pictures + comments + signature block</div>
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-300 rounded-lg p-4 min-h-[360px]">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Sonogram Picture(s)</div>
                  <div className="text-xs text-gray-500 mb-3">
                    Placeholder area (scan/photo upload later). For now you can type notes below.
                  </div>
                  <TextArea
                    label="Sonogram notes"
                    value={data.page2.sonogram_notes}
                    disabled={isSigned}
                    onChange={(v) => setPageField('page2', 'sonogram_notes', v)}
                    rows={10}
                    placeholder="e.g., file name, ultrasound landmarks, etc."
                  />
                </div>

                <div className="border border-gray-300 rounded-lg p-4 min-h-[360px] space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Ultrasound Guidance Statement</div>
                  <Checkbox
                    label="Ultrasound Guidance was used to identify the nerve listed above..."
                    checked={data.page2.ultrasound_guidance_statement_checked}
                    disabled={isSigned}
                    onChange={(v) => setPageField('page2', 'ultrasound_guidance_statement_checked', v)}
                  />

                  <div className="text-xs text-gray-500">
                    (Matches the right-side paragraph on the paper page 2.)
                  </div>
                </div>
              </section>

              <section>
                <TextArea
                  label="Comments"
                  value={data.page2.comments}
                  disabled={isSigned}
                  onChange={(v) => setPageField('page2', 'comments', v)}
                  rows={6}
                />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Physician Signature (name)"
                  value={data.page2.physician_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setPageField('page2', 'physician_signature_name', v)}
                />
                <TextField
                  label="Date/Time"
                  value={data.page2.date_time}
                  disabled={isSigned}
                  onChange={(v) => setPageField('page2', 'date_time', v)}
                  placeholder="MM/DD/YYYY HH:MM"
                />
              </section>

              {/* Signature capture */}
              <section className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Physician Signature Capture</h3>
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
                    <img
                      src={data.signature_data_url}
                      alt="Signature"
                      className="border border-gray-200 rounded-lg max-w-full"
                    />
                  </div>
                ) : null}
              </section>
            </div>

            {/* Print CSS */}
            <style>{`
              @media print {
                body { background: white !important; }
                .print\\:hidden { display: none !important; }
                section { page-break-inside: avoid; }
              }
            `}</style>
          </div>
        )}
      </main>
    </div>
  );
}

export default PeripheralNerveBlockProcedureNote;
