import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function ImplantBillableInformation() {
  const navigate = useNavigate();
  const { checkinId } = useParams();
  const sigRef = useRef(null);

  const [formId, setFormId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),

    // TODO: add real implant/billable fields to match paper
    notes: '',

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

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await api.get(`/implant-billable-information/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const f = list[0];
        setFormId(f.id);
        setData((prev) => ({ ...prev, ...f, checkin: Number(checkinId) }));
      } else {
        // Prevent duplicate POST in React strict mode
        if (formId) return;
  
        const created = await api.post('/implant-billable-information/', { checkin: Number(checkinId) });
        setFormId(created.data.id);
        setData((prev) => ({ ...prev, ...created.data, checkin: Number(checkinId) }));
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Implant/Billable Information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!formId) return;
    setError('');
    setSaving(true);

    try {
      const payload = {
        notes: data.notes || '',
      };

      const res = await api.patch(`/implant-billable-information/${formId}/`, payload);
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
    if (!formId || isSigned) return;

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
      const res = await api.post(`/implant-billable-information/${formId}/sign/`, {
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
            <h1 className="text-2xl font-bold text-gray-900">Implant / Billable Information</h1>
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
            <div className="text-sm text-gray-600">
              MVP scaffold: we’ll replace the fields to match the paper implant/billable sheet exactly.
            </div>

            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
              <textarea
                rows={6}
                value={data.notes || ''}
                disabled={isSigned}
                onChange={(e) => setField('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </section>

            <section className="border-t border-gray-200 pt-6">
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
                  <SignatureCanvas ref={sigRef} penColor="black" canvasProps={{ width: 900, height: 200, className: 'bg-white rounded' }} />
                </div>
              )}

              {data.signature_data_url ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Captured Signature</div>
                  <img src={data.signature_data_url} alt="Signature" className="border border-gray-200 rounded-lg max-w-full" />
                </div>
              ) : null}

              <div className="mt-3 text-xs text-gray-500">
                Signing is audit-logged and locks further edits.
              </div>
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

export default ImplantBillableInformation;
