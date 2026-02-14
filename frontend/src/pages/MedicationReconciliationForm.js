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

function MedicationRow({ idx, row, onChange, disabled }) {
  const set = (k, v) => onChange({ ...row, [k]: v });
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-700">{idx + 1}</td>
      <td className="px-3 py-2">
        <input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.name || ''} onChange={(e) => set('name', e.target.value)} disabled={disabled} />
      </td>
      <td className="px-3 py-2">
        <input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.dose || ''} onChange={(e) => set('dose', e.target.value)} disabled={disabled} />
      </td>
      <td className="px-3 py-2">
        <input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.how_taken || ''} onChange={(e) => set('how_taken', e.target.value)} disabled={disabled} />
      </td>
      <td className="px-3 py-2">
        <input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.frequency || ''} onChange={(e) => set('frequency', e.target.value)} disabled={disabled} />
      </td>
      <td className="px-3 py-2">
        <input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.last_time_taken || ''} onChange={(e) => set('last_time_taken', e.target.value)} disabled={disabled} />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" className="h-4 w-4" checked={!!row.hold} onChange={(e) => set('hold', e.target.checked)} disabled={disabled} />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" className="h-4 w-4" checked={!!row.resume} onChange={(e) => set('resume', e.target.checked)} disabled={disabled} />
      </td>
    </tr>
  );
}

export default function MedicationReconciliationForm() {
  const { checkinId } = useParams();
  const navigate = useNavigate();

  const { values, setField, setValues, loading, saving, error, saveError, isLocked, save, sign, unlock } =
    useFormResource({
      resourcePath: 'medication-reconciliation',
      checkinId,
      defaultValues: {
        checkin: checkinId,

        source_patient: false,
        source_family: false,
        source_pcp_list: false,
        nka: false,

        allergies: [
          { item: '', reaction: '' },
          { item: '', reaction: '' },
          { item: '', reaction: '' },
        ],

        meds: Array.from({ length: 12 }).map(() => ({
          name: '',
          dose: '',
          how_taken: '',
          frequency: '',
          last_time_taken: '',
          hold: false,
          resume: false,
        })),

        med_history_verified_by_rn: '',
        med_history_datetime: '',

        surgeon_signature: '',
        discharge_rn_signature: '',
        discharge_datetime: '',

        discharge_rx: [
          { name: '', dose: '', route: '', frequency: '', reason: '' },
          { name: '', dose: '', route: '', frequency: '', reason: '' },
          { name: '', dose: '', route: '', frequency: '', reason: '' },
        ],
      },
    });

  const updateAllergy = (idx, patch) => {
    const next = [...(values.allergies || [])];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setField('allergies', next);
  };

  const updateMed = (idx, row) => {
    const next = [...(values.meds || [])];
    next[idx] = row;
    setField('meds', next);
  };

  const updateRx = (idx, patch) => {
    const next = [...(values.discharge_rx || [])];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setField('discharge_rx', next);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medication Reconciliation Form</h1>
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="bg-white rounded-lg shadow p-6 text-gray-600">Loading…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {saveError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{saveError}</div>}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Source of Medication List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxRow label="Patient" checked={values.source_patient} onChange={(v) => setField('source_patient', v)} disabled={isLocked} />
            <CheckboxRow label="Family Member / Guardian / Caregiver" checked={values.source_family} onChange={(v) => setField('source_family', v)} disabled={isLocked} />
            <CheckboxRow label="Primary Care Physician List" checked={values.source_pcp_list} onChange={(v) => setField('source_pcp_list', v)} disabled={isLocked} />
            <CheckboxRow label="No Known Allergies (NKA)" checked={values.nka} onChange={(v) => setField('nka', v)} disabled={isLocked} />
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Allergies (Medication & Food)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(values.allergies || []).map((a, idx) => (
              <React.Fragment key={idx}>
                <TextField label={`Allergy #${idx + 1}`} value={a.item} onChange={(v) => updateAllergy(idx, { item: v })} disabled={isLocked} />
                <TextField label="Reaction" value={a.reaction} onChange={(v) => updateAllergy(idx, { reaction: v })} disabled={isLocked} />
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900">Medication List (OTC, Herbals, Vitamins & Supplements)</h2>
            <p className="text-sm text-gray-600 mt-1">Do not use abbreviations. Enter what the patient actually takes.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Medication</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Dose</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">How Taken</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Frequency</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Last Time Taken</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Hold</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Resume</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(values.meds || []).map((row, idx) => (
                  <MedicationRow key={idx} idx={idx} row={row} onChange={(r) => updateMed(idx, r)} disabled={isLocked} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Medication History Verified by RN" value={values.med_history_verified_by_rn} onChange={(v) => setField('med_history_verified_by_rn', v)} disabled={isLocked} />
            <TextField label="Date/Time" value={values.med_history_datetime} onChange={(v) => setField('med_history_datetime', v)} disabled={isLocked} placeholder="YYYY-MM-DD HH:MM" />
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Prescriptions Given Upon Discharge</h2>
          <div className="grid grid-cols-1 gap-3">
            {(values.discharge_rx || []).map((rx, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.name || ''} onChange={(e) => updateRx(idx, { name: e.target.value })} disabled={isLocked} placeholder="Medication Name" />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.dose || ''} onChange={(e) => updateRx(idx, { dose: e.target.value })} disabled={isLocked} placeholder="Dose" />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.route || ''} onChange={(e) => updateRx(idx, { route: e.target.value })} disabled={isLocked} placeholder="Route" />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.frequency || ''} onChange={(e) => updateRx(idx, { frequency: e.target.value })} disabled={isLocked} placeholder="Frequency" />
                <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.reason || ''} onChange={(e) => updateRx(idx, { reason: e.target.value })} disabled={isLocked} placeholder="Reason" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextField label="Signature of Surgeon Reviewing Medications" value={values.surgeon_signature} onChange={(v) => setField('surgeon_signature', v)} disabled={isLocked} />
            <TextField label="Discharge RN Signature" value={values.discharge_rn_signature} onChange={(v) => setField('discharge_rn_signature', v)} disabled={isLocked} />
            <TextField label="Discharge Date/Time" value={values.discharge_datetime} onChange={(v) => setField('discharge_datetime', v)} disabled={isLocked} placeholder="YYYY-MM-DD HH:MM" />
          </div>
        </section>

        <div className="text-xs text-gray-500 text-center">
          Tip: If you want this to match the exact paper columns, we can tighten spacing and font to “form print” mode later.
        </div>
      </main>
    </div>
  );
}
