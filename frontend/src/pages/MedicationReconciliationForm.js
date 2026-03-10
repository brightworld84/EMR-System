// src/pages/MedicationReconciliationForm.js
import React, { useEffect, useMemo, useState } from 'react';
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

const EMPTY_ALLERGIES = Array.from({ length: 3 }).map(() => ({ item: '', reaction: '' }));
const EMPTY_MEDS = Array.from({ length: 12 }).map(() => ({ name: '', dose: '', how_taken: '', frequency: '', last_time_taken: '', hold: false, resume: false }));
const EMPTY_RX = Array.from({ length: 3 }).map(() => ({ name: '', dose: '', route: '', frequency: '', reason: '' }));

export default function MedicationReconciliationForm() {
  const { checkinId } = useParams();
  const navigate = useNavigate();

  const defaults = useMemo(() => ({
    checkin: checkinId ? Number(checkinId) : null,
    source_patient: false,
    source_family: false,
    source_pcp_list: false,
    nka: false,
    allergies: EMPTY_ALLERGIES,
    meds: EMPTY_MEDS,
    med_history_verified_by_rn: '',
    med_history_datetime: '',
    surgeon_signature: '',
    discharge_rn_signature: '',
    discharge_datetime: '',
    discharge_rx: EMPTY_RX,
    is_signed: false,
    signed_at: null,
  }), [checkinId]);

  const [recordId, setRecordId] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const isLocked = !!data?.is_signed;

  const setField = (name, value) => {
    if (isLocked) return;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeList = (resData) => {
    if (Array.isArray(resData)) return resData;
    if (resData && Array.isArray(resData.results)) return resData.results;
    return [];
  };

  const loadOrCreate = async () => {
    if (!checkinId) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/medication-reconciliation/?checkin=${encodeURIComponent(checkinId)}`);
      const list = normalizeList(res.data);
      if (list.length > 0) {
        const r = list[0];
        setRecordId(r.id);
        setData((prev) => ({
          ...prev,
          ...defaults,
          ...r,
          allergies: r.allergies?.length ? r.allergies : EMPTY_ALLERGIES,
          meds: r.meds?.length ? r.meds : EMPTY_MEDS,
          discharge_rx: r.discharge_rx?.length ? r.discharge_rx : EMPTY_RX,
          checkin: Number(checkinId),
        }));
        return;
      }
      const created = await api.post('/medication-reconciliation/', { checkin: Number(checkinId) });
      setRecordId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...defaults,
        ...created.data,
        checkin: Number(checkinId),
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Medication Reconciliation form.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(defaults);
    setRecordId(null);
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!checkinId) return;
    if (!recordId) { await loadOrCreate(); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        checkin: Number(checkinId),
        source_patient: !!data.source_patient,
        source_family: !!data.source_family,
        source_pcp_list: !!data.source_pcp_list,
        nka: !!data.nka,
        allergies: data.allergies || EMPTY_ALLERGIES,
        meds: data.meds || EMPTY_MEDS,
        med_history_verified_by_rn: data.med_history_verified_by_rn || '',
        med_history_datetime: data.med_history_datetime || null,
        surgeon_signature: data.surgeon_signature || '',
        discharge_rn_signature: data.discharge_rn_signature || '',
        discharge_datetime: data.discharge_datetime || null,
        discharge_rx: data.discharge_rx || EMPTY_RX,
      };
      const res = await api.patch(`/medication-reconciliation/${recordId}/`, payload);
      setData((prev) => ({ ...prev, ...res.data, checkin: Number(checkinId) }));
      alert('Saved.');
    } catch (e) {
      console.error(e);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const signAndLock = async () => {
    if (!recordId || isLocked) return;
    setError('');
    setSigning(true);
    try {
      await saveDraft();
      const res = await api.post(`/medication-reconciliation/${recordId}/sign/`, {});
      setData((prev) => ({ ...prev, ...res.data, checkin: Number(checkinId) }));
      alert('Signed & locked.');
    } catch (e) {
      console.error(e);
      setError('Failed to sign. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const updateAllergy = (idx, patch) => {
    const next = [...(data.allergies || EMPTY_ALLERGIES)];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setField('allergies', next);
  };

  const updateMed = (idx, row) => {
    const next = [...(data.meds || EMPTY_MEDS)];
    next[idx] = row;
    setField('meds', next);
  };

  const updateRx = (idx, patch) => {
    const next = [...(data.discharge_rx || EMPTY_RX)];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setField('discharge_rx', next);
  };

  const headerSubtitle = data.signed_at
    ? `Signed ${new Date(data.signed_at).toLocaleString()}`
    : 'Draft';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── STANDARDIZED HEADER ── */}
      <header className="bg-white shadow print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medication Reconciliation</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId} &bull; {headerSubtitle}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => navigate(-1)} className="px-3 py-2 text-gray-700 hover:text-gray-900 font-medium">&larr; Back</button>
            <button onClick={() => window.print()} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold">Print / PDF</button>
            <button onClick={saveDraft} disabled={loading || saving || isLocked} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={signAndLock} disabled={loading || signing || isLocked} className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400">
              {isLocked ? 'Signed' : signing ? 'Signing…' : 'Sign / Lock'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 print:hidden">{error}</div>
        )}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-8">
            {isLocked && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg print:hidden">
                This form is locked and cannot be edited.
              </div>
            )}

            {/* SOURCE OF INFORMATION */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Source of Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CheckboxRow label="Patient" checked={data.source_patient} onChange={(v) => setField('source_patient', v)} disabled={isLocked} />
                <CheckboxRow label="Family" checked={data.source_family} onChange={(v) => setField('source_family', v)} disabled={isLocked} />
                <CheckboxRow label="PCP / Med List" checked={data.source_pcp_list} onChange={(v) => setField('source_pcp_list', v)} disabled={isLocked} />
                <CheckboxRow label="NKA (No Known Allergies)" checked={data.nka} onChange={(v) => setField('nka', v)} disabled={isLocked} />
              </div>
            </section>

            {/* ALLERGIES */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Allergies &amp; Reactions</h2>
              <div className="space-y-3">
                {(data.allergies || EMPTY_ALLERGIES).map((a, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <TextField label={`Allergy ${i + 1}`} value={a.item} onChange={(v) => updateAllergy(i, { item: v })} disabled={isLocked} />
                    <TextField label="Reaction" value={a.reaction} onChange={(v) => updateAllergy(i, { reaction: v })} disabled={isLocked} />
                  </div>
                ))}
              </div>
            </section>

            {/* MEDICATIONS */}
            <section className="bg-white rounded-lg shadow p-6 overflow-x-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Current Medications</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Medication</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Dose</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">How Taken</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Frequency</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Last Taken</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Hold</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Resume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.meds || EMPTY_MEDS).map((row, i) => (
                    <MedicationRow key={i} idx={i} row={row} onChange={(r) => updateMed(i, r)} disabled={isLocked} />
                  ))}
                </tbody>
              </table>
            </section>

            {/* MED HISTORY VERIFICATION */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Medication History Verification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Verified By (RN)" value={data.med_history_verified_by_rn} onChange={(v) => setField('med_history_verified_by_rn', v)} disabled={isLocked} />
                <TextField label="Date / Time" value={data.med_history_datetime} onChange={(v) => setField('med_history_datetime', v)} disabled={isLocked} />
              </div>
            </section>

            {/* DISCHARGE RX */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Discharge Prescriptions</h2>
              <div className="space-y-4">
                {(data.discharge_rx || EMPTY_RX).map((rx, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <TextField label="Medication" value={rx.name} onChange={(v) => updateRx(i, { name: v })} disabled={isLocked} />
                    <TextField label="Dose" value={rx.dose} onChange={(v) => updateRx(i, { dose: v })} disabled={isLocked} />
                    <TextField label="Route" value={rx.route} onChange={(v) => updateRx(i, { route: v })} disabled={isLocked} />
                    <TextField label="Frequency" value={rx.frequency} onChange={(v) => updateRx(i, { frequency: v })} disabled={isLocked} />
                    <TextField label="Reason" value={rx.reason} onChange={(v) => updateRx(i, { reason: v })} disabled={isLocked} />
                  </div>
                ))}
              </div>
            </section>

            {/* SIGNATURES */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Signatures</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Surgeon Signature" value={data.surgeon_signature} onChange={(v) => setField('surgeon_signature', v)} disabled={isLocked} />
                <TextField label="Discharge RN Signature" value={data.discharge_rn_signature} onChange={(v) => setField('discharge_rn_signature', v)} disabled={isLocked} />
                <TextField label="Discharge Date / Time" value={data.discharge_datetime} onChange={(v) => setField('discharge_datetime', v)} disabled={isLocked} />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
