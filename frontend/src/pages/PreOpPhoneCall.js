import React from 'react';
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

  const { values, setField, loading, saving, error, saveError, isLocked, save, sign, unlock } =
    useFormResource({
      resourcePath: 'pre-op-phone-call',
      checkinId,
      defaultValues: {
        checkin: checkinId,

        dos: '',
        arrival_time: '',
        procedure: '',
        height: '',
        weight_lbs: '',
        contact_number: '',
        escort_name_relationship: '',

        prev_surgeries: '', // multiline: "surgery - date"
        // Medical history flags (basic set, extend as needed)
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
        cpap_used: '', // yes/no
        bipap_used: '', // yes/no

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

        // Patient instructions (the separate sheet you uploaded)
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
      },
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pre-Op Phone Call</h1>
            <p className="text-sm text-gray-600">
              Check-in: <span className="font-semibold">{checkinId}</span>
              {isLocked ? <span className="ml-2 text-xs font-semibold">🔒 Locked</span> : <span className="ml-2 text-xs font-semibold">📝 Draft</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
              ← Back
            </button>

            {!isLocked ? (
              <>
                <button
                  onClick={() => save()}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => sign()}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400"
                >
                  {saving ? 'Locking…' : 'Sign / Lock'}
                </button>
              </>
            ) : (
              <button
                onClick={() => unlock()}
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
        {loading && <div className="bg-white rounded-lg shadow p-6 text-gray-600">Loading…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {saveError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{saveError}</div>}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="DOS" value={values.dos} onChange={(v) => setField('dos', v)} disabled={isLocked} placeholder="YYYY-MM-DD" />
          <TextField label="Arrival Time" value={values.arrival_time} onChange={(v) => setField('arrival_time', v)} disabled={isLocked} placeholder="HH:MM" />
          <TextField label="Procedure" value={values.procedure} onChange={(v) => setField('procedure', v)} disabled={isLocked} />
          <TextField label="Height" value={values.height} onChange={(v) => setField('height', v)} disabled={isLocked} placeholder={`e.g., 5' 10"`} />
          <TextField label="Weight (lbs)" value={values.weight_lbs} onChange={(v) => setField('weight_lbs', v)} disabled={isLocked} placeholder="e.g., 180" />
          <TextField label="Contact #" value={values.contact_number} onChange={(v) => setField('contact_number', v)} disabled={isLocked} />
          <TextField label="Escort Name & Relationship" value={values.escort_name_relationship} onChange={(v) => setField('escort_name_relationship', v)} disabled={isLocked} />
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Previous Surgeries (with dates)</h2>
          <textarea
            className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg"
            value={values.prev_surgeries || ''}
            onChange={(e) => setField('prev_surgeries', e.target.value)}
            disabled={isLocked}
            placeholder="Example: ACL repair — 2019-06-12"
          />
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Key Medical History</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxRow label="HTN" checked={values.hx_htn} onChange={(v) => setField('hx_htn', v)} disabled={isLocked} />
            <CheckboxRow label="CAD" checked={values.hx_cad} onChange={(v) => setField('hx_cad', v)} disabled={isLocked} />
            <CheckboxRow label="Arrhythmia" checked={values.hx_arrhythmia} onChange={(v) => setField('hx_arrhythmia', v)} disabled={isLocked} />
            <CheckboxRow label="SOB" checked={values.hx_sob} onChange={(v) => setField('hx_sob', v)} disabled={isLocked} />
            <CheckboxRow label="COPD" checked={values.hx_copd} onChange={(v) => setField('hx_copd', v)} disabled={isLocked} />
            <CheckboxRow label="Asthma" checked={values.hx_asthma} onChange={(v) => setField('hx_asthma', v)} disabled={isLocked} />
            <CheckboxRow label="Sleep Apnea" checked={values.sleep_apnea} onChange={(v) => setField('sleep_apnea', v)} disabled={isLocked} />
            <CheckboxRow label="Chronic Cough" checked={values.chronic_cough} onChange={(v) => setField('chronic_cough', v)} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="CPAP Used (Yes/No)" value={values.cpap_used} onChange={(v) => setField('cpap_used', v)} disabled={isLocked} />
            <TextField label="BiPAP Used (Yes/No)" value={values.bipap_used} onChange={(v) => setField('bipap_used', v)} disabled={isLocked} />
            <TextField label="Smoker (PPD)" value={values.smoker} onChange={(v) => setField('smoker', v)} disabled={isLocked} />
            <TextField label="Years" value={values.smoker_years} onChange={(v) => setField('smoker_years', v)} disabled={isLocked} />
            <TextField label="ETOH / Recreational Drug Use" value={values.etoh_drug_use} onChange={(v) => setField('etoh_drug_use', v)} disabled={isLocked} placeholder="Free text" />
            <TextField label="Anesthesia issues" value={values.anesthesia_issues} onChange={(v) => setField('anesthesia_issues', v)} disabled={isLocked} placeholder="N/V, MH, difficult airway, etc." />
          </div>
        </section>

        {/* Patient instructions */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Given Patient Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxRow label="NPO after midnight (or 8 hours prior)" checked={values.instr_npo} onChange={(v) => setField('instr_npo', v)} disabled={isLocked} />
            <CheckboxRow label='No BP meds ending in “-prils” or “-sartans” on DOS' checked={values.instr_no_bp_meds} onChange={(v) => setField('instr_no_bp_meds', v)} disabled={isLocked} />
            <CheckboxRow label="Wear loose clothing" checked={values.instr_loose_clothing} onChange={(v) => setField('instr_loose_clothing', v)} disabled={isLocked} />
            <CheckboxRow label="Advanced directive reviewed (DNR suspended while at center)" checked={values.instr_advanced_directive} onChange={(v) => setField('instr_advanced_directive', v)} disabled={isLocked} />
            <CheckboxRow label="Bring insurance card + photo ID" checked={values.instr_bring_insurance_id} onChange={(v) => setField('instr_bring_insurance_id', v)} disabled={isLocked} />
            <CheckboxRow label="Leave valuables/jewelry at home" checked={values.instr_leave_valuables} onChange={(v) => setField('instr_leave_valuables', v)} disabled={isLocked} />
            <CheckboxRow label="Special instructions regarding GLP-1’s" checked={values.instr_glp1_special} onChange={(v) => setField('instr_glp1_special', v)} disabled={isLocked} />
            <CheckboxRow label="If GLP-1 for DM: ONLY clear liquids 24 hrs before surgery" checked={values.instr_glp1_dm_clear_liquids_24h} onChange={(v) => setField('instr_glp1_dm_clear_liquids_24h', v)} disabled={isLocked} />
            <CheckboxRow label="If GLP-1 for weight loss: OFF 1 WEEK prior to surgery" checked={values.instr_glp1_weightloss_off_1week} onChange={(v) => setField('instr_glp1_weightloss_off_1week', v)} disabled={isLocked} />
          </div>

          <div className="mt-4">
            <TextField
              label="Special Instructions (free text)"
              value={values.instr_special_instructions}
              onChange={(v) => setField('instr_special_instructions', v)}
              disabled={isLocked}
              placeholder="Type any additional instructions…"
            />
          </div>
        </section>

        {/* Call attempts */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Call Attempts</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Attempt #1 Date" value={values.attempt1_date} onChange={(v) => setField('attempt1_date', v)} disabled={isLocked} placeholder="YYYY-MM-DD" />
            <TextField label="Attempt #1 Time" value={values.attempt1_time} onChange={(v) => setField('attempt1_time', v)} disabled={isLocked} placeholder="HH:MM" />
            <CheckboxRow label="Attempt #1 — No Answer" checked={values.attempt1_no_answer} onChange={(v) => setField('attempt1_no_answer', v)} disabled={isLocked} />
            <CheckboxRow label="Attempt #1 — LVM" checked={values.attempt1_lvm} onChange={(v) => setField('attempt1_lvm', v)} disabled={isLocked} />
            <TextField label="Attempt #1 — Spoke to" value={values.attempt1_spoke_to} onChange={(v) => setField('attempt1_spoke_to', v)} disabled={isLocked} />
            <TextField label="Attempt #1 — Initials" value={values.attempt1_initials} onChange={(v) => setField('attempt1_initials', v)} disabled={isLocked} />

            <TextField label="Attempt #2 Date" value={values.attempt2_date} onChange={(v) => setField('attempt2_date', v)} disabled={isLocked} placeholder="YYYY-MM-DD" />
            <TextField label="Attempt #2 Time" value={values.attempt2_time} onChange={(v) => setField('attempt2_time', v)} disabled={isLocked} placeholder="HH:MM" />
            <CheckboxRow label="Attempt #2 — No Answer" checked={values.attempt2_no_answer} onChange={(v) => setField('attempt2_no_answer', v)} disabled={isLocked} />
            <CheckboxRow label="Attempt #2 — LVM" checked={values.attempt2_lvm} onChange={(v) => setField('attempt2_lvm', v)} disabled={isLocked} />
            <TextField label="Attempt #2 — Spoke to" value={values.attempt2_spoke_to} onChange={(v) => setField('attempt2_spoke_to', v)} disabled={isLocked} />
            <TextField label="Attempt #2 — Initials" value={values.attempt2_initials} onChange={(v) => setField('attempt2_initials', v)} disabled={isLocked} />
          </div>
        </section>

        <div className="text-xs text-gray-500 text-center">
          Medication/allergy details continue on Medication Reconciliation Form.
        </div>
      </main>
    </div>
  );
}
