import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from "../services/api";

function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-lg border ${disabled ? 'bg-gray-50' : 'bg-white'} border-gray-200`}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="text-sm text-gray-900">{label}</span>
    </label>
  );
}

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

export default function SafeSurgeryCommunicationChecklist() {
  const { checkinId } = useParams();
  const navigate = useNavigate();

  const { values, setField, loading, saving, error, saveError, isLocked, save, sign, unlock } =
    useFormResource({
      resourcePath: 'safe-surgery-communication-checklist',
      checkinId,
      defaultValues: {
        checkin: checkinId,

        patient_name: '',
        physician: '',
        dos: '',
        procedure: '',
        chart_maker: '',

        // Pre-op
        preop_patient_identity: false,
        preop_allergies: false,
        preop_nkda: false,
        preop_site_and_side: false,
        preop_site_marked_by_patient: false,
        preop_site_marked_na: false,
        preop_hnp_within_30_days: false,
        preop_labs_reviewed: false,
        preop_labs_na: false,
        preop_orders_complete: false,
        preop_signature: '',
        preop_datetime: '',

        // Before induction
        induction_patient_identity: false,
        induction_allergies: false,
        induction_nkda: false,
        induction_site_and_side: false,
        induction_surgical_consent_signed: false,
        induction_anesthesia_consent_signed: false,
        induction_site_markings_visible: false,
        induction_site_markings_na: false,
        induction_hnp_within_30_days: false,
        induction_timeout_before_spinal: false,
        induction_timeout_location: '',
        induction_timeout_na: false,
        induction_antibiotic_within_60: false,
        induction_antibiotic_na: false,
        induction_dvt_prophylaxis: false,
        induction_dvt_na: false,
        induction_normothermia: false,
        induction_normothermia_na: false,
        induction_signature: '',
        induction_datetime: '',

        // Before incision
        incision_timeout_done: false,
        incision_confirm_identity: false,
        incision_confirm_surgeon_anesthesia: false,
        incision_confirm_dx: false,
        incision_confirm_proc_site_side: false,
        incision_site_markings_visible: false,
        incision_site_markings_na: false,
        incision_implants_available: false,
        incision_implants_na: false,
        incision_fire_risk: false,
        incision_confirm_allergies: false,
        incision_allergies_na: false,
        incision_confirm_antibiotic: false,
        incision_antibiotic_na: false,
        incision_initial_counts: false,
        incision_medications_labeled: false,
        incision_medications_na: false,
        incision_signature: '',
        incision_datetime: '',

        // Handoff notes
        handoff_notes: '',

        // Before end / leaving room
        end_confirm_procedure_complete: false,
        end_confirm_specimens: false,
        end_specimens_na: false,
        end_final_count: false,
        end_final_count_na: false,
        end_discuss_recovery: false,
        end_signature: '',
        end_datetime: '',
      },
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Safe Surgery Communication Checklist</h1>
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

        {/* Header fields */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Patient Name" value={values.patient_name} onChange={(v) => setField('patient_name', v)} disabled={isLocked} />
          <TextField label="Physician" value={values.physician} onChange={(v) => setField('physician', v)} disabled={isLocked} />
          <TextField label="DOS" value={values.dos} onChange={(v) => setField('dos', v)} disabled={isLocked} placeholder="YYYY-MM-DD" />
          <TextField label="Procedure" value={values.procedure} onChange={(v) => setField('procedure', v)} disabled={isLocked} />
          <TextField label="Chart Maker" value={values.chart_maker} onChange={(v) => setField('chart_maker', v)} disabled={isLocked} placeholder="Scan Chart / Estimate & Balance / Demos" />
        </section>

        {/* Pre-Operative */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Pre-Operative (RN Confirm)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Checkbox label="Patient Identity (Name/DOB)" checked={values.preop_patient_identity} onChange={(v) => setField('preop_patient_identity', v)} disabled={isLocked} />
            <Checkbox label="Patient allergies" checked={values.preop_allergies} onChange={(v) => setField('preop_allergies', v)} disabled={isLocked} />
            <Checkbox label="NKDA" checked={values.preop_nkda} onChange={(v) => setField('preop_nkda', v)} disabled={isLocked} />
            <Checkbox label="Procedure site and side" checked={values.preop_site_and_side} onChange={(v) => setField('preop_site_and_side', v)} disabled={isLocked} />
            <Checkbox label="Site marked by patient" checked={values.preop_site_marked_by_patient} onChange={(v) => setField('preop_site_marked_by_patient', v)} disabled={isLocked} />
            <Checkbox label="Site marking N/A" checked={values.preop_site_marked_na} onChange={(v) => setField('preop_site_marked_na', v)} disabled={isLocked} />
            <Checkbox label="H&P is within 30 days / matches consent" checked={values.preop_hnp_within_30_days} onChange={(v) => setField('preop_hnp_within_30_days', v)} disabled={isLocked} />
            <Checkbox label="Lab results reviewed if present" checked={values.preop_labs_reviewed} onChange={(v) => setField('preop_labs_reviewed', v)} disabled={isLocked} />
            <Checkbox label="Labs N/A" checked={values.preop_labs_na} onChange={(v) => setField('preop_labs_na', v)} disabled={isLocked} />
            <Checkbox label="Pre-op orders complete" checked={values.preop_orders_complete} onChange={(v) => setField('preop_orders_complete', v)} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="Signature" value={values.preop_signature} onChange={(v) => setField('preop_signature', v)} disabled={isLocked} />
            <TextField label="Date/Time" value={values.preop_datetime} onChange={(v) => setField('preop_datetime', v)} disabled={isLocked} placeholder="YYYY-MM-DD HH:MM" />
          </div>
        </section>

        {/* Before Induction */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Before Induction (OR RN & Anesthesia Confirm)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Checkbox label="Patient identity (Name, DOB)" checked={values.induction_patient_identity} onChange={(v) => setField('induction_patient_identity', v)} disabled={isLocked} />
            <Checkbox label="Patient allergies" checked={values.induction_allergies} onChange={(v) => setField('induction_allergies', v)} disabled={isLocked} />
            <Checkbox label="NKDA" checked={values.induction_nkda} onChange={(v) => setField('induction_nkda', v)} disabled={isLocked} />
            <Checkbox label="Procedure site and side" checked={values.induction_site_and_side} onChange={(v) => setField('induction_site_and_side', v)} disabled={isLocked} />
            <Checkbox label="Surgical Consent correct and signed" checked={values.induction_surgical_consent_signed} onChange={(v) => setField('induction_surgical_consent_signed', v)} disabled={isLocked} />
            <Checkbox label="Anesthesia Consent correct and signed" checked={values.induction_anesthesia_consent_signed} onChange={(v) => setField('induction_anesthesia_consent_signed', v)} disabled={isLocked} />
            <Checkbox label="Site markings visible" checked={values.induction_site_markings_visible} onChange={(v) => setField('induction_site_markings_visible', v)} disabled={isLocked} />
            <Checkbox label="Site markings N/A" checked={values.induction_site_markings_na} onChange={(v) => setField('induction_site_markings_na', v)} disabled={isLocked} />
            <Checkbox label="H&P within 30 days / matches consent" checked={values.induction_hnp_within_30_days} onChange={(v) => setField('induction_hnp_within_30_days', v)} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <Checkbox label="TIMEOUT (before spinal block)" checked={values.induction_timeout_before_spinal} onChange={(v) => setField('induction_timeout_before_spinal', v)} disabled={isLocked} />
            <TextField label="Timeout Location / Time" value={values.induction_timeout_location} onChange={(v) => setField('induction_timeout_location', v)} disabled={isLocked} placeholder="e.g., OR 2 at 08:12" />
            <Checkbox label="Timeout N/A" checked={values.induction_timeout_na} onChange={(v) => setField('induction_timeout_na', v)} disabled={isLocked} />
            <Checkbox label="Antibiotic prophylaxis within last 60 minutes" checked={values.induction_antibiotic_within_60} onChange={(v) => setField('induction_antibiotic_within_60', v)} disabled={isLocked} />
            <Checkbox label="Antibiotic N/A" checked={values.induction_antibiotic_na} onChange={(v) => setField('induction_antibiotic_na', v)} disabled={isLocked} />
            <Checkbox label="DVT prophylaxis implemented" checked={values.induction_dvt_prophylaxis} onChange={(v) => setField('induction_dvt_prophylaxis', v)} disabled={isLocked} />
            <Checkbox label="DVT prophylaxis N/A" checked={values.induction_dvt_na} onChange={(v) => setField('induction_dvt_na', v)} disabled={isLocked} />
            <Checkbox label="Normothermia measures implemented" checked={values.induction_normothermia} onChange={(v) => setField('induction_normothermia', v)} disabled={isLocked} />
            <Checkbox label="Normothermia N/A" checked={values.induction_normothermia_na} onChange={(v) => setField('induction_normothermia_na', v)} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="Signature" value={values.induction_signature} onChange={(v) => setField('induction_signature', v)} disabled={isLocked} />
            <TextField label="Date/Time" value={values.induction_datetime} onChange={(v) => setField('induction_datetime', v)} disabled={isLocked} placeholder="YYYY-MM-DD HH:MM" />
          </div>
        </section>

        {/* Before Incision */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Before Incision (RN, Surgeon, CST, Anesthesia Engaged)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Checkbox label="TIMEOUT performed immediately before incision" checked={values.incision_timeout_done} onChange={(v) => setField('incision_timeout_done', v)} disabled={isLocked} />
            <Checkbox label="Confirm patient identity" checked={values.incision_confirm_identity} onChange={(v) => setField('incision_confirm_identity', v)} disabled={isLocked} />
            <Checkbox label="Confirm surgeon and anesthesia consent correct/signed" checked={values.incision_confirm_surgeon_anesthesia} onChange={(v) => setField('incision_confirm_surgeon_anesthesia', v)} disabled={isLocked} />
            <Checkbox label="Confirm diagnosis (from consent if applicable)" checked={values.incision_confirm_dx} onChange={(v) => setField('incision_confirm_dx', v)} disabled={isLocked} />
            <Checkbox label="Confirm procedure, site, side (from consent)" checked={values.incision_confirm_proc_site_side} onChange={(v) => setField('incision_confirm_proc_site_side', v)} disabled={isLocked} />
            <Checkbox label="Site markings visible" checked={values.incision_site_markings_visible} onChange={(v) => setField('incision_site_markings_visible', v)} disabled={isLocked} />
            <Checkbox label="Site markings N/A" checked={values.incision_site_markings_na} onChange={(v) => setField('incision_site_markings_na', v)} disabled={isLocked} />
            <Checkbox label="Implants needed available" checked={values.incision_implants_available} onChange={(v) => setField('incision_implants_available', v)} disabled={isLocked} />
            <Checkbox label="Implants N/A" checked={values.incision_implants_na} onChange={(v) => setField('incision_implants_na', v)} disabled={isLocked} />
            <Checkbox label="Fire Risk Assessment performed" checked={values.incision_fire_risk} onChange={(v) => setField('incision_fire_risk', v)} disabled={isLocked} />
            <Checkbox label="Confirm patient allergies" checked={values.incision_confirm_allergies} onChange={(v) => setField('incision_confirm_allergies', v)} disabled={isLocked} />
            <Checkbox label="Allergies N/A" checked={values.incision_allergies_na} onChange={(v) => setField('incision_allergies_na', v)} disabled={isLocked} />
            <Checkbox label="Confirm antibiotic given" checked={values.incision_confirm_antibiotic} onChange={(v) => setField('incision_confirm_antibiotic', v)} disabled={isLocked} />
            <Checkbox label="Antibiotic N/A" checked={values.incision_antibiotic_na} onChange={(v) => setField('incision_antibiotic_na', v)} disabled={isLocked} />
            <Checkbox label="Initial counts completed" checked={values.incision_initial_counts} onChange={(v) => setField('incision_initial_counts', v)} disabled={isLocked} />
            <Checkbox label="Medications labeled on sterile field" checked={values.incision_medications_labeled} onChange={(v) => setField('incision_medications_labeled', v)} disabled={isLocked} />
            <Checkbox label="Medications labeled N/A" checked={values.incision_medications_na} onChange={(v) => setField('incision_medications_na', v)} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="Signature" value={values.incision_signature} onChange={(v) => setField('incision_signature', v)} disabled={isLocked} />
            <TextField label="Date/Time" value={values.incision_datetime} onChange={(v) => setField('incision_datetime', v)} disabled={isLocked} placeholder="YYYY-MM-DD HH:MM" />
          </div>
        </section>

        {/* Handoff Notes */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Handoff Notes</h2>
          <textarea
            className="w-full min-h-[140px] px-3 py-2 border border-gray-300 rounded-lg"
            value={values.handoff_notes || ''}
            onChange={(e) => setField('handoff_notes', e.target.value)}
            disabled={isLocked}
            placeholder="Write handoff notes…"
          />
        </section>

        {/* Before End */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Before End of Procedure / Leaving the Room</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Checkbox label="Confirm procedure completed" checked={values.end_confirm_procedure_complete} onChange={(v) => setField('end_confirm_procedure_complete', v)} disabled={isLocked} />
            <Checkbox label="Confirm specimens collected/labeled correctly" checked={values.end_confirm_specimens} onChange={(v) => setField('end_confirm_specimens', v)} disabled={isLocked} />
            <Checkbox label="Specimens N/A" checked={values.end_specimens_na} onChange={(v) => setField('end_specimens_na', v)} disabled={isLocked} />
            <Checkbox label="Surgeon aware of final correct count" checked={values.end_final_count} onChange={(v) => setField('end_final_count', v)} disabled={isLocked} />
            <Checkbox label="Final count N/A" checked={values.end_final_count_na} onChange={(v) => setField('end_final_count_na', v)} disabled={isLocked} />
            <Checkbox label="Discuss recovery concerns" checked={values.end_discuss_recovery} onChange={(v) => setField('end_discuss_recovery', v)} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="Signature" value={values.end_signature} onChange={(v) => setField('end_signature', v)} disabled={isLocked} />
            <TextField label="Date/Time" value={values.end_datetime} onChange={(v) => setField('end_datetime', v)} disabled={isLocked} placeholder="YYYY-MM-DD HH:MM" />
          </div>
        </section>

        <div className="text-xs text-gray-500 text-center">
          Draft saves are chart-audited server-side. Locking prevents further edits.
        </div>
      </main>
    </div>
  );
}
