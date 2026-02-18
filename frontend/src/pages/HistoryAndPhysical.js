import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

// Match your backend router basename. If your backend route is different,
// update this to the correct endpoint (example: '/history-and-physical/').
const API_BASE = '/history-and-physical/';

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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled, rows = 4, placeholder }) {
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

function HistoryAndPhysical() {
  const navigate = useNavigate();
  const { checkinId } = useParams();
  const sigRef = useRef(null);

  const [hpId, setHpId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  // Option A: store all paper fields under page1 JSON
  const [data, setData] = useState({
    checkin: Number(checkinId),

    page1: {
      // Top / header style fields (adjust names later if you want exact-paper names)
      date: '',
      time: '',
      provider_name: '',
      procedure_planned: '',

      // Core H&P sections
      chief_complaint: '',
      hpi: '',
      pmh: '',
      psh: '',
      medications: '',
      allergies: '',
      social_history: '',
      family_history: '',
      ros: '',
      physical_exam: '',
      assessment: '',
      plan: '',

      // Optional checkbox-style items you might want (leave if not needed)
      nkda: false,
    },

    // Signature / lock
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

  const setPage1 = (field, value) => {
    if (isSigned) return;
    setData((prev) => ({
      ...prev,
      page1: { ...(prev.page1 || {}), [field]: value },
    }));
  };

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        // Record exists - load it
        const obj = list[0];
        setHpId(obj.id);
        setData((prev) => ({
          ...prev,
          ...obj,
          checkin: Number(checkinId),
          page1: (obj.page1 && typeof obj.page1 === 'object') ? obj.page1 : (prev.page1 || {}),
        }));
      } else {
        // Record doesn't exist - create ONE
        // Check if we're already creating (prevents double-POST in React strict mode)
        if (hpId) return; // Already have an ID, don't create again
      
        const created = await api.post(API_BASE, { checkin: Number(checkinId) });
        setHpId(created.data.id);
        setData((prev) => ({
          ...prev,
          ...created.data,
          checkin: Number(checkinId),
          page1: (created.data.page1 && typeof created.data.page1 === 'object') ? created.data.page1 : (prev.page1 || {}),
        }));
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load/create History & Physical.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!hpId) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        page1: data.page1 || {},
      };

      const res = await api.patch(`${API_BASE}${hpId}/`, payload);
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
    if (!hpId || isSigned) return;

    setError('');
    setSigning(true);
    try {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        setError('Signature is required to sign this H&P.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await api.post(`${API_BASE}${hpId}/sign/`, { signature_data_url: sigDataUrl });

      setData((prev) => ({ ...prev, ...res.data }));
      alert('Signed & locked.');
    } catch (e) {
      console.error(e);
      setError('Failed to sign. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const p1 = data.page1 || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">History & Physical</h1>
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Top fields */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TextField label="Provider" value={p1.provider_name} disabled={isSigned} onChange={(v) => setPage1('provider_name', v)} />
              <TextField label="Date" value={p1.date} disabled={isSigned} onChange={(v) => setPage1('date', v)} placeholder="YYYY-MM-DD" />
              <TextField label="Time" value={p1.time} disabled={isSigned} onChange={(v) => setPage1('time', v)} placeholder="HH:MM" />
              <div className="flex items-end">
                <Checkbox label="NKDA" checked={p1.nkda} disabled={isSigned} onChange={(v) => setPage1('nkda', v)} />
              </div>
            </section>

            <TextField label="Procedure Planned" value={p1.procedure_planned} disabled={isSigned} onChange={(v) => setPage1('procedure_planned', v)} />

            {/* Main H&P */}
            <TextArea label="Chief Complaint" value={p1.chief_complaint} disabled={isSigned} onChange={(v) => setPage1('chief_complaint', v)} rows={2} />
            <TextArea label="HPI" value={p1.hpi} disabled={isSigned} onChange={(v) => setPage1('hpi', v)} rows={5} />
            <TextArea label="Past Medical History" value={p1.pmh} disabled={isSigned} onChange={(v) => setPage1('pmh', v)} rows={4} />
            <TextArea label="Past Surgical History" value={p1.psh} disabled={isSigned} onChange={(v) => setPage1('psh', v)} rows={4} />
            <TextArea label="Medications" value={p1.medications} disabled={isSigned} onChange={(v) => setPage1('medications', v)} rows={4} />
            <TextArea label="Allergies" value={p1.allergies} disabled={isSigned} onChange={(v) => setPage1('allergies', v)} rows={3} />
            <TextArea label="Social History" value={p1.social_history} disabled={isSigned} onChange={(v) => setPage1('social_history', v)} rows={3} />
            <TextArea label="Family History" value={p1.family_history} disabled={isSigned} onChange={(v) => setPage1('family_history', v)} rows={3} />
            <TextArea label="Review of Systems" value={p1.ros} disabled={isSigned} onChange={(v) => setPage1('ros', v)} rows={5} />
            <TextArea label="Physical Exam" value={p1.physical_exam} disabled={isSigned} onChange={(v) => setPage1('physical_exam', v)} rows={6} />
            <TextArea label="Assessment" value={p1.assessment} disabled={isSigned} onChange={(v) => setPage1('assessment', v)} rows={4} />
            <TextArea label="Plan" value={p1.plan} disabled={isSigned} onChange={(v) => setPage1('plan', v)} rows={4} />

            {/* Signature */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Provider Signature</h2>
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
                  <img src={data.signature_data_url} alt="Signature" className="border border-gray-200 rounded-lg max-w-full" />
                </div>
              ) : null}
            </section>

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

export default HistoryAndPhysical;
