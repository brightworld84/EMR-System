import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

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
    <label className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="text-sm text-gray-900">{label}</span>
    </label>
  );
}

function MedicationRow({ idx, row, onChange, disabled }) {
  const set = (k, v) => onChange({ ...row, [k]: v });
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-700">{idx + 1}</td>
      <td className="px-3 py-2"><input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.name || ''} onChange={(e) => set('name', e.target.value)} disabled={disabled} /></td>
      <td className="px-3 py-2"><input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.dose || ''} onChange={(e) => set('dose', e.target.value)} disabled={disabled} /></td>
      <td className="px-3 py-2"><input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.how_taken || ''} onChange={(e) => set('how_taken', e.target.value)} disabled={disabled} /></td>
      <td className="px-3 py-2"><input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.frequency || ''} onChange={(e) => set('frequency', e.target.value)} disabled={disabled} /></td>
      <td className="px-3 py-2"><input className="w-full px-2 py-1 border border-gray-300 rounded" value={row.last_time_taken || ''} onChange={(e) => set('last_time_taken', e.target.value)} disabled={disabled} /></td>
      <td className="px-3 py-2 text-center"><input type="checkbox" className="h-4 w-4" checked={!!row.hold} onChange={(e) => set('hold', e.target.checked)} disabled={disabled} /></td>
      <td className="px-3 py-2 text-center"><input type="checkbox" className="h-4 w-4" checked={!!row.resume} onChange={(e) => set('resume', e.target.checked)} disabled={disabled} /></td>
    </tr>
  );
}

const DEFAULT_MEDS = Array.from({ length: 12 }).map(() => ({ name: '', dose: '', how_taken: '', frequency: '', last_time_taken: '', hold: false, resume: false }));
const DEFAULT_ALLERGIES = [{ item: '', reaction: '' }, { item: '', reaction: '' }, { item: '', reaction: '' }];
const DEFAULT_RX = [{ name: '', dose: '', route: '', frequency: '', reason: '' }, { name: '', dose: '', route: '', frequency: '', reason: '' }, { name: '', dose: '', route: '', frequency: '', reason: '' }];

export default function MedicationReconciliationForm() {
  const { checkinId } = useParams();
  const navigate = useNavigate();
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    checkin: Number(checkinId),
    source_patient: false, source_family: false, source_pcp_list: false, nka: false,
    allergies: DEFAULT_ALLERGIES, meds: DEFAULT_MEDS,
    med_history_verified_by_rn: '', med_history_datetime: '',
    surgeon_signature: '', discharge_rn_signature: '', discharge_datetime: '',
    discharge_rx: DEFAULT_RX, is_signed: false, signed_by: null, signed_at: null,
  });
  const isSigned = !!data.is_signed;
  const setField = (name, value) => setData((prev) => ({ ...prev, [name]: value }));

  const loadOrCreate = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.get(`/medication-reconciliation/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      if (list.length > 0) {
        const record = list[0];
        setRecordId(record.id);
        setData((prev) => ({ ...prev, ...record, allergies: record.allergies?.length ? record.allergies : DEFAULT_ALLERGIES, meds: record.meds?.length ? record.meds : DEFAULT_MEDS, discharge_rx: record.discharge_rx?.length ? record.discharge_rx : DEFAULT_RX, checkin: Number(checkinId) }));
        return;
      }
      const created = await api.post('/medication-reconciliation/', { checkin: Number(checkinId) });
      setRecordId(created.data.id);
      setData((prev) => ({ ...prev, ...created.data, allergies: created.data.allergies?.length ? created.data.allergies : DEFAULT_ALLERGIES, meds: created.data.meds?.length ? created.data.meds : DEFAULT_MEDS, discharge_rx: created.data.discharge_rx?.length ? created.data.discharge_rx : DEFAULT_RX, checkin: Number(checkinId) }));
    } catch (e) { console.error(e); setError('Failed to load/create Medication Reconciliation form.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrCreate(); }, [checkinId]); // eslint-disable-line

  const saveDraft = async () => {
    if (!recordId) return;
    setError(''); setSaving(true);
    try {
      const payload = { source_patient: !!data.source_patient, source_family: !!data.source_family, source_pcp_list: !!data.source_pcp_list, nka: !!data.nka, allergies: data.allergies || DEFAULT_ALLERGIES, meds: data.meds || DEFAULT_MEDS, med_history_verified_by_rn: data.med_history_verified_by_rn || '', med_history_datetime: data.med_history_datetime || '', surgeon_signature: data.surgeon_signature || '', discharge_rn_signature: data.discharge_rn_signature || '', discharge_datetime: data.discharge_datetime || '', discharge_rx: data.discharge_rx || DEFAULT_RX };
      const res = await api.patch(`/medication-reconciliation/${recordId}/`, payload);
      setData((prev) => ({ ...prev, ...res.data }));
      alert('Saved.');
    } catch (e) { console.error(e); setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const signAndLock = async () => {
    if (!recordId || isSigned) return;
    setError(''); setSigning(true);
    try {
      await saveDraft();
      const res = await api.post(`/medication-reconciliation/${recordId}/sign/`, {});
      setData((prev) => ({ ...prev, ...res.data }));
      alert('Signed & locked.');
    } catch (e) { console.error(e); setError('Failed to sign. Please try again.'); }
    finally { setSigning(false); }
  };

  const updateAllergy = (idx, patch) => { const next = [...(data.allergies || DEFAULT_ALLERGIES)]; next[idx] = { ...(next[idx] || {}), ...patch }; setField('allergies', next); };
  const updateMed = (idx, row) => { const next = [...(data.meds || DEFAULT_MEDS)]; next[idx] = row; setField('meds', next); };
  const updateRx = (idx, patch) => { const next = [...(data.discharge_rx || DEFAULT_RX)]; next[idx] = { ...(next[idx] || {}), ...patch }; setField('discharge_rx', next); };
  const headerSubtitle = data.signed_at ? `Signed at ${new Date(data.signed_at).toLocaleString()}` : 'Draft';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Medication Reconciliation Form</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId} • {headerSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">← Back</button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold">Print / PDF</button>
            <button onClick={saveDraft} disabled={loading || saving || isSigned} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={signAndLock} disabled={loading || signing || isSigned} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400">{isSigned ? 'Signed' : signing ? 'Signing…' : 'Sign / Lock'}</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">{error}</div>}
        {loading ? <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div> : (
          <>
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Source of Medication List</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckboxRow label="Patient" checked={data.source_patient} onChange={(v) => setField('source_patient', v)} disabled={isSigned} />
                <CheckboxRow label="Family Member / Guardian / Caregiver" checked={data.source_family} onChange={(v) => setField('source_family', v)} disabled={isSigned} />
                <CheckboxRow label="Primary Care Physician List" checked={data.source_pcp_list} onChange={(v) => setField('source_pcp_list', v)} disabled={isSigned} />
                <CheckboxRow label="No Known Allergies (NKA)" checked={data.nka} onChange={(v) => setField('nka', v)} disabled={isSigned} />
              </div>
            </section>
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Allergies (Medication & Food)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data.allergies || DEFAULT_ALLERGIES).map((a, idx) => (
                  <React.Fragment key={idx}>
                    <TextField label={`Allergy #${idx + 1}`} value={a.item} onChange={(v) => updateAllergy(idx, { item: v })} disabled={isSigned} />
                    <TextField label="Reaction" value={a.reaction} onChange={(v) => updateAllergy(idx, { reaction: v })} disabled={isSigned} />
                  </React.Fragment>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900">Medication List (OTC, Herbals, Vitamins &amp; Supplements)</h2>
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
                    {(data.meds || DEFAULT_MEDS).map((row, idx) => (
                      <MedicationRow key={idx} idx={idx} row={row} onChange={(r) => updateMed(idx, r)} disabled={isSigned} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Medication History Verified by RN" value={data.med_history_verified_by_rn} onChange={(v) => setField('med_history_verified_by_rn', v)} disabled={isSigned} />
                <TextField label="Date/Time" value={data.med_history_datetime} onChange={(v) => setField('med_history_datetime', v)} disabled={isSigned} placeholder="YYYY-MM-DD HH:MM" />
              </div>
            </section>
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Prescriptions Given Upon Discharge</h2>
              <div className="grid grid-cols-1 gap-3">
                {(data.discharge_rx || DEFAULT_RX).map((rx, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.name || ''} onChange={(e) => updateRx(idx, { name: e.target.value })} disabled={isSigned} placeholder="Medication Name" />
                    <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.dose || ''} onChange={(e) => updateRx(idx, { dose: e.target.value })} disabled={isSigned} placeholder="Dose" />
                    <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.route || ''} onChange={(e) => updateRx(idx, { route: e.target.value })} disabled={isSigned} placeholder="Route" />
                    <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.frequency || ''} onChange={(e) => updateRx(idx, { frequency: e.target.value })} disabled={isSigned} placeholder="Frequency" />
                    <input className="px-3 py-2 border border-gray-300 rounded-lg" value={rx.reason || ''} onChange={(e) => updateRx(idx, { reason: e.target.value })} disabled={isSigned} placeholder="Reason" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <TextField label="Signature of Surgeon Reviewing Medications" value={data.surgeon_signature} onChange={(v) => setField('surgeon_signature', v)} disabled={isSigned} />
                <TextField label="Discharge RN Signature" value={data.discharge_rn_signature} onChange={(v) => setField('discharge_rn_signature', v)} disabled={isSigned} />
                <TextField label="Discharge Date/Time" value={data.discharge_datetime} onChange={(v) => setField('discharge_datetime', v)} disabled={isSigned} placeholder="YYYY-MM-DD HH:MM" />
              </div>
            </section>
            {isSigned && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-semibold">✅ This form is signed and locked.</div>}
          </>
        )}
      </main>
      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } section { page-break-inside: avoid; } }`}</style>
    </div>
  );
}
