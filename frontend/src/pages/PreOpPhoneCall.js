import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from "../services/api";

function TextField({ label, value, onChange, disabled, placeholder }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || ''}
      />
    </div>
  );
}

function CheckboxRow({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
      <input type="checkbox" className="h-4 w-4" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="text-sm text-gray-900">{label}</span>
    </label>
  );
}

export default function PreOpPhoneCall() {
  const { checkinId } = useParams();
  const navigate = useNavigate();

  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  const [data, setData] = useState({
    dos: '',
    arrival_time: '',
    procedure: '',
    height: '',
    weight_lbs: '',
    contact_number: '',
    escort_name_relationship: '',

    prev_surgeries: '',
    
    // Medical history flags
    hx_mi: false,
    hx_cp: false,
    hx_htn: false,
    hx_sob: false,
    hx_arrhythmia: false,
    hx_cad: false,
    hx_hyperlipidemia: false,
    hx_cardiac_other: '',

    hx_copd: false,
    hx_asthma: false,
    hx_allergies: false,
    hx_respiratory_other: '',

    sleep_apnea: false,
    cpap_used: '',
    bipap_used: '',

    smoker: '',
    smoker_years: '',
    former_smoker: false,
    year_stopped: '',
    chronic_cough: false,

    etoh_drug_use: '',
    anesthesia_issues: '',
    n_v_after_anesthesia: false,
    family_history_anesthesia: false,
    anesthesia_other: '',

    diabetes_type: '',
    integumentary_psoriasis: false,
    integumentary_eczema: false,
    integumentary_cancer: false,
    integumentary_rashes: false,
    integumentary_other: '',

    thyroid_hypo: false,
    thyroid_hyper: false,
    thyroid_other: '',

    gi_gerd: false,
    gi_ulcers: false,
    gi_hiatial_hernia: false,
    gi_other: '',

    bleeding_anemia: false,
    bleeding_blood_clot: false,
    bleeding_sickle_trait: false,
    bleeding_other: '',

    neuro_cva_tia: false,
    neuro_seizures: false,
    neuro_migraines: false,
    neuro_parkinsons: false,
    neuro_other: '',

    infectious_mrsa: false,
    infectious_hepatitis: false,
    infectious_tb: false,
    infectious_hiv_aids: false,
    infectious_shingles: false,
    infectious_recent_travel: false,

    psych_anxiety: false,
    psych_depression: false,
    psych_bipolar: false,
    psych_ptsd: false,
    psych_other: '',

    learning_needs_yes: false,
    learning_needs_no: false,
    other_notes: '',

    // Patient instructions
    instr_npo: false,
    instr_no_bp_meds: false,
    instr_loose_clothing: false,
    instr_advanced_directive: false,
    instr_bring_insurance_id: false,
    instr_leave_valuables: false,
    instr_special_instructions: '',
    instr_glp1_special: false,
    instr_glp1_dm_clear_liquids_24h: false,
    instr_glp1_weightloss_off_1week: false,

    // Call attempts
    attempt1_date: '',
    attempt1_time: '',
    attempt1_no_answer: false,
    attempt1_lvm: false,
    attempt1_spoke_to: '',
    attempt1_initials: '',

    attempt2_date: '',
    attempt2_time: '',
    attempt2_no_answer: false,
    attempt2_lvm: false,
    attempt2_spoke_to: '',
    attempt2_initials: '',
  });

  // Pack data to match backend structure
  const packToApi = (ui) => {
    return {
      checkin: Number(checkinId),
      data: ui, // PreOpPhoneCall uses a single JSONField "data"
      call_attempts: [
        ...(ui.attempt1_date || ui.attempt1_time || ui.attempt1_spoke_to ? [{
          attempt: 1,
          date: ui.attempt1_date,
          time: ui.attempt1_time,
          no_answer: ui.attempt1_no_answer,
          left_message: ui.attempt1_lvm,
          spoke_to: ui.attempt1_spoke_to,
          by: ui.attempt1_initials,
        }] : []),
        ...(ui.attempt2_date || ui.attempt2_time || ui.attempt2_spoke_to ? [{
          attempt: 2,
          date: ui.attempt2_date,
          time: ui.attempt2_time,
          no_answer: ui.attempt2_no_answer,
          left_message: ui.attempt2_lvm,
          spoke_to: ui.attempt2_spoke_to,
          by: ui.attempt2_initials,
        }] : []),
      ],
    };
  };

  // Unpack data from backend
  const unpackFromApi = (rec) => {
    const backendData = rec.data || {};
    const attempts = rec.call_attempts || [];
    
    const attempt1 = attempts.find(a => a.attempt === 1) || {};
    const attempt2 = attempts.find(a => a.attempt === 2) || {};

    return {
      ...backendData,
      attempt1_date: attempt1.date || '',
      attempt1_time: attempt1.time || '',
      attempt1_no_answer: attempt1.no_answer || false,
      attempt1_lvm: attempt1.left_message || false,
      attempt1_spoke_to: attempt1.spoke_to || '',
      attempt1_initials: attempt1.by || '',

      attempt2_date: attempt2.date || '',
      attempt2_time: attempt2.time || '',
      attempt2_no_answer: attempt2.no_answer || false,
      attempt2_lvm: attempt2.left_message || false,
      attempt2_spoke_to: attempt2.spoke_to || '',
      attempt2_initials: attempt2.by || '',
    };
  };

  // Load or create record
  const loadOrCreate = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await api.get(`/pre-op-phone-call/?checkin=${checkinId}`);
      const list = res.data || [];
      
      if (list.length > 0) {
        const rec = list[0];
        setRecordId(rec.id);
        setIsSigned(rec.completed || false);
        setData((prev) => ({ ...prev, ...unpackFromApi(rec) }));
      } else {
        // Create minimal record
        const payload = {
          checkin: Number(checkinId),
          data: {},
          call_attempts: [],
        };
        const created = await api.post(`/pre-op-phone-call/`, payload);
        setRecordId(created.data.id);
        setIsSigned(false);
        setData((prev) => ({ ...prev, ...unpackFromApi(created.data) }));
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load Pre-Op Phone Call record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  // Save draft
  const saveDraft = async () => {
    if (!recordId) return;
    setSaving(true);
    setError('');

    try {
      const payload = packToApi(data);
      const res = await api.patch(`/pre-op-phone-call/${recordId}/`, payload);
      setData((prev) => ({ ...prev, ...unpackFromApi(res.data) }));
      setIsSigned(res.data.completed || false);
    } catch (e) {
      console.error(e);
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Sign/Lock
  const signRecord = async () => {
    if (!recordId) return;
    setSaving(true);
    setError('');

    try {
      // First save current data
      await saveDraft();
      
      // Then mark as completed
      const res = await api.patch(`/pre-op-phone-call/${recordId}/`, {
        completed: true,
      });
      
      setIsSigned(true);
      setData((prev) => ({ ...prev, ...unpackFromApi(res.data) }));
    } catch (e) {
      console.error(e);
      setError('Unable to sign this record.');
    } finally {
      setSaving(false);
    }
  };

  // Unlock
  const unlockRecord = async () => {
    if (!recordId) return;
    setSaving(true);
    setError('');

    try {
      const res = await api.patch(`/pre-op-phone-call/${recordId}/`, {
        completed: false,
      });
      
      setIsSigned(false);
      setData((prev) => ({ ...prev, ...unpackFromApi(res.data) }));
    } catch (e) {
      console.error(e);
      setError('Unable to unlock this record.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pre-Op Phone Call</h1>
            <p className="text-sm text-gray-600">
              Check-in: <span className="font-semibold">{checkinId}</span>
              {isSigned ? <span className="ml-2 text-xs font-semibold">🔒 Locked</span> : <span className="ml-2 text-xs font-semibold">📝 Draft</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
              ← Back
            </button>

            {!isSigned ? (
              <>
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={signRecord}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400"
                >
                  {saving ? 'Locking…' : 'Sign / Lock'}
                </button>
              </>
            ) : (
              <button
                onClick={unlockRecord}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold disabled:bg-amber-300"
              >
                {saving ? 'Unlocking…' : 'Unlock'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="DOS" value={data.dos} onChange={(v) => setField('dos', v)} disabled={isSigned} placeholder="YYYY-MM-DD" />
          <TextField label="Arrival Time" value={data.arrival_time} onChange={(v) => setField('arrival_time', v)} disabled={isSigned} placeholder="HH:MM" />
          <TextField label="Procedure" value={data.procedure} onChange={(v) => setField('procedure', v)} disabled={isSigned} />
          <TextField label="Height" value={data.height} onChange={(v) => setField('height', v)} disabled={isSigned} placeholder={`e.g., 5' 10"`} />
          <TextField label="Weight (lbs)" value={data.weight_lbs} onChange={(v) => setField('weight_lbs', v)} disabled={isSigned} placeholder="e.g., 180" />
          <TextField label="Contact #" value={data.contact_number} onChange={(v) => setField('contact_number', v)} disabled={isSigned} />
          <TextField label="Escort Name & Relationship" value={data.escort_name_relationship} onChange={(v) => setField('escort_name_relationship', v)} disabled={isSigned} />
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Previous Surgeries (with dates)</h2>
          <textarea
            className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg"
            value={data.prev_surgeries || ''}
            onChange={(e) => setField('prev_surgeries', e.target.value)}
            disabled={isSigned}
            placeholder="Example: ACL repair — 2019-06-12"
          />
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Key Medical History</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxRow label="HTN" checked={data.hx_htn} onChange={(v) => setField('hx_htn', v)} disabled={isSigned} />
            <CheckboxRow label="CAD" checked={data.hx_cad} onChange={(v) => setField('hx_cad', v)} disabled={isSigned} />
            <CheckboxRow label="Arrhythmia" checked={data.hx_arrhythmia} onChange={(v) => setField('hx_arrhythmia', v)} disabled={isSigned} />
            <CheckboxRow label="SOB" checked={data.hx_sob} onChange={(v) => setField('hx_sob', v)} disabled={isSigned} />
            <CheckboxRow label="COPD" checked={data.hx_copd} onChange={(v) => setField('hx_copd', v)} disabled={isSigned} />
            <CheckboxRow label="Asthma" checked={data.hx_asthma} onChange={(v) => setField('hx_asthma', v)} disabled={isSigned} />
            <CheckboxRow label="Sleep Apnea" checked={data.sleep_apnea} onChange={(v) => setField('sleep_apnea', v)} disabled={isSigned} />
            <CheckboxRow label="Chronic Cough" checked={data.chronic_cough} onChange={(v) => setField('chronic_cough', v)} disabled={isSigned} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="CPAP Used (Yes/No)" value={data.cpap_used} onChange={(v) => setField('cpap_used', v)} disabled={isSigned} />
            <TextField label="BiPAP Used (Yes/No)" value={data.bipap_used} onChange={(v) => setField('bipap_used', v)} disabled={isSigned} />
            <TextField label="Smoker (PPD)" value={data.smoker} onChange={(v) => setField('smoker', v)} disabled={isSigned} />
            <TextField label="Years" value={data.smoker_years} onChange={(v) => setField('smoker_years', v)} disabled={isSigned} />
            <TextField label="ETOH / Recreational Drug Use" value={data.etoh_drug_use} onChange={(v) => setField('etoh_drug_use', v)} disabled={isSigned} placeholder="Free text" />
            <TextField label="Anesthesia issues" value={data.anesthesia_issues} onChange={(v) => setField('anesthesia_issues', v)} disabled={isSigned} placeholder="N/V, MH, difficult airway, etc." />
          </div>
        </section>

        {/* Patient instructions */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Given Patient Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxRow label="NPO after midnight (or 8 hours prior)" checked={data.instr_npo} onChange={(v) => setField('instr_npo', v)} disabled={isSigned} />
            <CheckboxRow label='No BP meds ending in "-prils" or "-sartans" on DOS' checked={data.instr_no_bp_meds} onChange={(v) => setField('instr_no_bp_meds', v)} disabled={isSigned} />
            <CheckboxRow label="Wear loose clothing" checked={data.instr_loose_clothing} onChange={(v) => setField('instr_loose_clothing', v)} disabled={isSigned} />
            <CheckboxRow label="Advanced directive reviewed (DNR suspended while at center)" checked={data.instr_advanced_directive} onChange={(v) => setField('instr_advanced_directive', v)} disabled={isSigned} />
            <CheckboxRow label="Bring insurance card + photo ID" checked={data.instr_bring_insurance_id} onChange={(v) => setField('instr_bring_insurance_id', v)} disabled={isSigned} />
            <CheckboxRow label="Leave valuables/jewelry at home" checked={data.instr_leave_valuables} onChange={(v) => setField('instr_leave_valuables', v)} disabled={isSigned} />
            <CheckboxRow label="Special instructions regarding GLP-1's" checked={data.instr_glp1_special} onChange={(v) => setField('instr_glp1_special', v)} disabled={isSigned} />
            <CheckboxRow label="If GLP-1 for DM: ONLY clear liquids 24 hrs before surgery" checked={data.instr_glp1_dm_clear_liquids_24h} onChange={(v) => setField('instr_glp1_dm_clear_liquids_24h', v)} disabled={isSigned} />
            <CheckboxRow label="If GLP-1 for weight loss: OFF 1 WEEK prior to surgery" checked={data.instr_glp1_weightloss_off_1week} onChange={(v) => setField('instr_glp1_weightloss_off_1week', v)} disabled={isSigned} />
          </div>

          <div className="mt-4">
            <TextField
              label="Special Instructions (free text)"
              value={data.instr_special_instructions}
              onChange={(v) => setField('instr_special_instructions', v)}
              disabled={isSigned}
              placeholder="Type any additional instructions…"
            />
          </div>
        </section>

        {/* Call attempts */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Call Attempts</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Attempt #1 Date" value={data.attempt1_date} onChange={(v) => setField('attempt1_date', v)} disabled={isSigned} placeholder="YYYY-MM-DD" />
            <TextField label="Attempt #1 Time" value={data.attempt1_time} onChange={(v) => setField('attempt1_time', v)} disabled={isSigned} placeholder="HH:MM" />
            <CheckboxRow label="Attempt #1 — No Answer" checked={data.attempt1_no_answer} onChange={(v) => setField('attempt1_no_answer', v)} disabled={isSigned} />
            <CheckboxRow label="Attempt #1 — LVM" checked={data.attempt1_lvm} onChange={(v) => setField('attempt1_lvm', v)} disabled={isSigned} />
            <TextField label="Attempt #1 — Spoke to" value={data.attempt1_spoke_to} onChange={(v) => setField('attempt1_spoke_to', v)} disabled={isSigned} />
            <TextField label="Attempt #1 — Initials" value={data.attempt1_initials} onChange={(v) => setField('attempt1_initials', v)} disabled={isSigned} />

            <TextField label="Attempt #2 Date" value={data.attempt2_date} onChange={(v) => setField('attempt2_date', v)} disabled={isSigned} placeholder="YYYY-MM-DD" />
            <TextField label="Attempt #2 Time" value={data.attempt2_time} onChange={(v) => setField('attempt2_time', v)} disabled={isSigned} placeholder="HH:MM" />
            <CheckboxRow label="Attempt #2 — No Answer" checked={data.attempt2_no_answer} onChange={(v) => setField('attempt2_no_answer', v)} disabled={isSigned} />
            <CheckboxRow label="Attempt #2 — LVM" checked={data.attempt2_lvm} onChange={(v) => setField('attempt2_lvm', v)} disabled={isSigned} />
            <TextField label="Attempt #2 — Spoke to" value={data.attempt2_spoke_to} onChange={(v) => setField('attempt2_spoke_to', v)} disabled={isSigned} />
            <TextField label="Attempt #2 — Initials" value={data.attempt2_initials} onChange={(v) => setField('attempt2_initials', v)} disabled={isSigned} />
          </div>
        </section>

        <div className="text-xs text-gray-500 text-center">
          Medication/allergy details continue on Medication Reconciliation Form.
        </div>
      </main>
    </div>
  );
}
