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

function TextField({ label, value, onChange, disabled, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Change this if your backend route differs
const API_BASE = '/anesthesia-orders/';

export default function AnesthesiaOrders() {
  const navigate = useNavigate();
  const { checkinId } = useParams();
  const sigRef = useRef(null);

  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),

    // ---- Assumed JSON fields (adjust if your model uses different field names) ----
    preop: {
      nkda: false,
      allergies_text: '',

      admit_to_center: true,
      confirm_npo_status: true,
      start_iv_lidocaine_ok: true,
      iv_fluids_lactated_ringers_75: true,
      vital_signs_per_protocol: true,

      other_orders: '',

      anesthesiologist_signature_name: '',
      anesthesiologist_signature_date: '',
      anesthesiologist_signature_time: '',
      noted_by_name: '',
      noted_by_date: '',
      noted_by_time: '',
    },

    pacu: {
      // These are “protocol text” on the paper (not fields). We still store “Other orders”.
      other_orders: '',

      anesthesiologist_signature_name: '',
      anesthesiologist_signature_date: '',
      anesthesiologist_signature_time: '',
      noted_by_name: '',
      noted_by_date: '',
      noted_by_time: '',
    },

    // Signature lock (same pattern as your other forms)
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

  const setPreop = (name, value) =>
    setData((prev) => ({ ...prev, preop: { ...(prev.preop || {}), [name]: value } }));

  const setPacu = (name, value) =>
    setData((prev) => ({ ...prev, pacu: { ...(prev.pacu || {}), [name]: value } }));

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await api.get(`${API_BASE}?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {   
        const o = list[0];
        setOrderId(o.id);
        setData((prev) => ({
          ...prev,
          ...o,
          checkin: Number(checkinId),
          preop: o.preop || prev.preop,   
          pacu: o.pacu || prev.pacu,
        }));
      } else {
        // Prevent duplicate POST in React strict mode
        if (orderId) return;
      
        const created = await api.post(API_BASE, { checkin: Number(checkinId) });
        setOrderId(created.data.id);
        setData((prev) => ({
          ...prev,
          ...created.data,
          checkin: Number(checkinId),
          preop: created.data.preop || prev.preop,
          pacu: created.data.pacu || prev.pacu,
        }));
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Anesthesia Orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!orderId) return;
    setError('');
    setSaving(true);

    try {
      const payload = {
        preop: data.preop || {},
        pacu: data.pacu || {},
      };

      const res = await api.patch(`${API_BASE}${orderId}/`, payload);
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
    if (!orderId || isSigned) return;

    setError('');
    setSigning(true);

    try {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        setError('Signature is required to sign this form.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await api.post(`${API_BASE}${orderId}/sign/`, { signature_data_url: sigDataUrl });

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
            <h1 className="text-2xl font-bold text-gray-900">Anesthesia Orders</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId} • {headerSubtitle}</p>
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
              title="Locks the form after signing"
            >
              {isSigned ? 'Signed' : signing ? 'Signing…' : 'Sign & Lock'}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-8">
            {/* Top: NKDA / Allergies */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Checkbox
                  label="NKDA"
                  checked={data.preop?.nkda}
                  disabled={isSigned}
                  onChange={(v) => setPreop('nkda', v)}
                />

                <div className="flex-1 min-w-[260px]">
                  <TextField
                    label="Allergies"
                    value={data.preop?.allergies_text}
                    disabled={isSigned}
                    onChange={(v) => setPreop('allergies_text', v)}
                    placeholder="List allergies (if any)…"
                  />
                </div>
              </div>
            </div>

            {/* PREOPERATIVE ORDERS */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h2 className="text-lg font-bold text-gray-900">Preoperative Orders</h2>
              </div>

              <div className="space-y-2">
                <Checkbox
                  label="Admit to Dallas Joint and Spine Center"
                  checked={!!data.preop?.admit_to_center}
                  disabled={isSigned}
                  onChange={(v) => setPreop('admit_to_center', v)}
                />
                <Checkbox
                  label="Confirm NPO Status"
                  checked={!!data.preop?.confirm_npo_status}
                  disabled={isSigned}
                  onChange={(v) => setPreop('confirm_npo_status', v)}
                />
                <Checkbox
                  label="Start IV: May use Lidocaine 1% 0.5 ml subcutaneously at IV insertion site"
                  checked={!!data.preop?.start_iv_lidocaine_ok}
                  disabled={isSigned}
                  onChange={(v) => setPreop('start_iv_lidocaine_ok', v)}
                />
                <Checkbox
                  label="IV Fluids: Lactated Ringers at 75 ml/hr"
                  checked={!!data.preop?.iv_fluids_lactated_ringers_75}
                  disabled={isSigned}
                  onChange={(v) => setPreop('iv_fluids_lactated_ringers_75', v)}
                />
                <Checkbox
                  label="Vital signs per Pre-Op Protocol"
                  checked={!!data.preop?.vital_signs_per_protocol}
                  disabled={isSigned}
                  onChange={(v) => setPreop('vital_signs_per_protocol', v)}
                />
              </div>

              <TextArea
                label="Other"
                value={data.preop?.other_orders}
                disabled={isSigned}
                onChange={(v) => setPreop('other_orders', v)}
                rows={3}
                placeholder="Additional pre-op orders…"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField
                  label="Anesthesiologist Signature (name)"
                  value={data.preop?.anesthesiologist_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setPreop('anesthesiologist_signature_name', v)}
                />
                <TextField
                  label="Date"
                  type="date"
                  value={data.preop?.anesthesiologist_signature_date}
                  disabled={isSigned}
                  onChange={(v) => setPreop('anesthesiologist_signature_date', v)}
                />
                <TextField
                  label="Time"
                  type="time"
                  value={data.preop?.anesthesiologist_signature_time}
                  disabled={isSigned}
                  onChange={(v) => setPreop('anesthesiologist_signature_time', v)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField
                  label="Noted by"
                  value={data.preop?.noted_by_name}
                  disabled={isSigned}
                  onChange={(v) => setPreop('noted_by_name', v)}
                />
                <TextField
                  label="Date"
                  type="date"
                  value={data.preop?.noted_by_date}
                  disabled={isSigned}
                  onChange={(v) => setPreop('noted_by_date', v)}
                />
                <TextField
                  label="Time"
                  type="time"
                  value={data.preop?.noted_by_time}
                  disabled={isSigned}
                  onChange={(v) => setPreop('noted_by_time', v)}
                />
              </div>
            </div>

            {/* PACU PHASE I ORDERS */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <h2 className="text-lg font-bold text-gray-900">PACU Phase I Orders</h2>
              </div>

              <div className="text-sm text-gray-800 space-y-2">
                <div><b>1.</b> Vital Signs per PACU protocol</div>
                <div><b>2.</b> Oxygen: PRN via facemask, face tent, or nasal cannula; titrate to maintain SpO₂ &gt; 92%</div>
                <div><b>3.</b> IV: Continue at current rate; discontinue IV when tolerating fluids.</div>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="font-semibold">4. Medications (order of use / ranked)</div>
                  <div className="mt-2 space-y-2 text-xs text-gray-700 leading-5">
                    <div><b>Mild Pain (1–3):</b> Norco 5/325; Fentanyl 25–50 mcg slow IVP q5 min PRN (max 200 mcg)</div>
                    <div><b>Moderate Pain (4–6):</b> Norco 5/325; Morphine 2 mg slow IVP q5 min PRN (max 12 mg); Dilaudid 0.25 mg slow IVP q5 min PRN (max 2 mg)</div>
                    <div><b>Severe Pain (7–10):</b> Norco 5/325; Fentanyl 25–50 mcg slow IVP q5 min PRN (max 200 mcg); Morphine 2 mg slow IVP q5 min PRN (max 12 mg); Dilaudid 0.5 mg slow IVP q5 min PRN (max 2 mg)</div>
                    <div><b>Nausea:</b> Zofran 4 mg slow IVP ODT; Phenergan 6.25 mg IV in 25 ml LR over 5 min (q15 min PRN, max 25 mg)</div>
                    <div><b>Respiratory distress:</b> Albuterol 2.5 mg neb PRN stridor x1; Racemic epi 2.25% neb PRN stridor x1</div>
                    <div><b>Shivering:</b> Demerol ___ mg IV q ___ min; max dose ___ mg</div>
                    <div><b>Hypertension:</b> Labetalol / Metoprolol / Hydralazine per protocol fields</div>
                  </div>
                </div>

                <div><b>5.</b> Transfer to PACU Phase II / discharge after: General anesthesia — awake, stable, Aldrete &gt; 8</div>
              </div>

              <TextArea
                label="6. Other orders"
                value={data.pacu?.other_orders}
                disabled={isSigned}
                onChange={(v) => setPacu('other_orders', v)}
                rows={3}
                placeholder="Additional PACU Phase I orders…"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField
                  label="Anesthesiologist Signature (name)"
                  value={data.pacu?.anesthesiologist_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setPacu('anesthesiologist_signature_name', v)}
                />
                <TextField
                  label="Date"
                  type="date"
                  value={data.pacu?.anesthesiologist_signature_date}
                  disabled={isSigned}
                  onChange={(v) => setPacu('anesthesiologist_signature_date', v)}
                />
                <TextField
                  label="Time"
                  type="time"
                  value={data.pacu?.anesthesiologist_signature_time}
                  disabled={isSigned}
                  onChange={(v) => setPacu('anesthesiologist_signature_time', v)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField
                  label="Noted by"
                  value={data.pacu?.noted_by_name}
                  disabled={isSigned}
                  onChange={(v) => setPacu('noted_by_name', v)}
                />
                <TextField
                  label="Date"
                  type="date"
                  value={data.pacu?.noted_by_date}
                  disabled={isSigned}
                  onChange={(v) => setPacu('noted_by_date', v)}
                />
                <TextField
                  label="Time"
                  type="time"
                  value={data.pacu?.noted_by_time}
                  disabled={isSigned}
                  onChange={(v) => setPacu('noted_by_time', v)}
                />
              </div>
            </div>

            {/* Signature capture */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Signature</h2>
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
