import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function makeEmptyRow() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
    initials: '',
    notes: '',
  };
}

function PacuProgressNotes() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const sigRef = useRef(null);

  const [notesId, setNotesId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),
    entries: [],
    is_signed: false,
    signed_by: null,
    signed_at: null,
    signature_data_url: '',
  });

  const isSigned = !!data.is_signed;

  const handlePrint = () => {
    window.print();
  };

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await api.get(`/pacu-progress-notes/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const n = list[0];
        setNotesId(n.id);
        setData((prev) => ({
          ...prev,
          ...n,
          checkin: Number(checkinId),
          entries: Array.isArray(n.entries) ? n.entries : [],
        }));
        return;
      }

      const created = await api.post('/pacu-progress-notes/', { checkin: Number(checkinId) });
      setNotesId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...created.data,
        checkin: Number(checkinId),
        entries: Array.isArray(created.data.entries) ? created.data.entries : [],
      }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create PACU Progress Notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const headerSubtitle = useMemo(() => {
    if (!data.signed_at) return 'Draft';
    return `Signed at ${new Date(data.signed_at).toLocaleString()}`;
  }, [data.signed_at]);

  const addRow = () => {
    if (isSigned) return;
    setData((prev) => ({
      ...prev,
      entries: [...(Array.isArray(prev.entries) ? prev.entries : []), makeEmptyRow()],
    }));
  };

  const removeRow = (idx) => {
    if (isSigned) return;
    setData((prev) => {
      const arr = Array.isArray(prev.entries) ? [...prev.entries] : [];
      arr.splice(idx, 1);
      return { ...prev, entries: arr };
    });
  };

  const updateRow = (idx, key, value) => {
    if (isSigned) return;
    setData((prev) => {
      const arr = Array.isArray(prev.entries) ? [...prev.entries] : [];
      const row = { ...(arr[idx] || makeEmptyRow()) };
      row[key] = value;
      arr[idx] = row;
      return { ...prev, entries: arr };
    });
  };

  const saveDraft = async () => {
    if (!notesId) return;
    setError('');
    setSaving(true);

    try {
      const payload = {
        entries: Array.isArray(data.entries) ? data.entries : [],
      };

      const res = await api.patch(`/pacu-progress-notes/${notesId}/`, payload);
      setData((prev) => ({
        ...prev,
        ...res.data,
        entries: Array.isArray(res.data.entries) ? res.data.entries : [],
      }));
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
    if (!notesId) return;
    if (isSigned) return;

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
      const res = await api.post(`/pacu-progress-notes/${notesId}/sign/`, {
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
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-block { display: block !important; }
          body { background: white !important; }
          .print-page { padding: 0 !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          .print-small { font-size: 11px !important; }
        }
      `}</style>

      <header className="bg-white shadow no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PACU Progress Notes</h1>
            <p className="text-sm text-gray-600">
              Check-in #{checkinId} • {headerSubtitle}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-semibold"
            >
              Print / PDF
            </button>

            <button
              onClick={addRow}
              disabled={loading || isSigned}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-200 disabled:text-blue-800"
            >
              + Add Row
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 print-page">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg no-print">
            {error}
          </div>
        )}

        {/* Print header */}
        <div className="hidden print-block">
          <div className="print-small">
            <div><strong>PACU Progress Notes</strong></div>
            <div>Check-in #{checkinId}</div>
            <div>{headerSubtitle}</div>
          </div>
          <hr className="my-3" />
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600 print-card">
            Loading…
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-6 print-card">
            <div className="text-sm text-gray-600 no-print">
              Add as many rows as needed. Save anytime. Signing will lock the form and capture a verified signature.
            </div>

            {/* Entries table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initials</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">Row</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {(Array.isArray(data.entries) ? data.entries : []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-sm text-gray-600 text-center">
                        No progress note entries yet.
                      </td>
                    </tr>
                  ) : (
                    (data.entries || []).map((row, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={row?.date || ''}
                            onChange={(e) => updateRow(idx, 'date', e.target.value)}
                            disabled={isSigned}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg no-print"
                          />
                          <div className="hidden print-block print-small">{row?.date || '—'}</div>
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={row?.time || ''}
                            onChange={(e) => updateRow(idx, 'time', e.target.value)}
                            disabled={isSigned}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg no-print"
                          />
                          <div className="hidden print-block print-small">{row?.time || '—'}</div>
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row?.initials || ''}
                            onChange={(e) => updateRow(idx, 'initials', e.target.value)}
                            disabled={isSigned}
                            placeholder="e.g., MF"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg no-print"
                          />
                          <div className="hidden print-block print-small">{row?.initials || '—'}</div>
                        </td>

                        <td className="px-4 py-3">
                          <textarea
                            value={row?.notes || ''}
                            onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                            disabled={isSigned}
                            rows={2}
                            placeholder="Progress note…"
                            className="w-[28rem] max-w-full px-3 py-2 border border-gray-300 rounded-lg no-print"
                          />
                          <div className="hidden print-block print-small" style={{ whiteSpace: 'pre-wrap' }}>
                            {row?.notes || '—'}
                          </div>
                        </td>

                        <td className="px-4 py-3 no-print">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={isSigned}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2 no-print">
                <h2 className="text-lg font-bold text-gray-900">Signature</h2>
                <button
                  type="button"
                  onClick={clearSignature}
                  disabled={isSigned}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold disabled:text-gray-400"
                >
                  Clear
                </button>
              </div>

              {isSigned ? (
                <div className="text-sm text-gray-700">
                  ✅ Signed. This form is locked.
                </div>
              ) : (
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-2 no-print">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="black"
                    canvasProps={{
                      width: 900,
                      height: 200,
                      className: 'bg-white rounded',
                    }}
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
              ) : (
                <div className="mt-4 hidden print-block print-small">
                  Signature: ________________________________
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500 no-print">
                Signing is audit-logged and stores a signature hash + content hash server-side.
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default PacuProgressNotes;
