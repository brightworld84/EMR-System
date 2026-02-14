import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function PacuMobilityAssessment() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const sigRef = useRef(null);

  const [assessmentId, setAssessmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),
    level1_result: '',
    level1_time_initials: '',
    level2_result: '',
    level2_time_initials: '',
    level3_result: '',
    level3_time_initials: '',
    notes: '',
    is_signed: false,
    signed_by: null,
    signed_at: null,
    signature_data_url: '',
  });

  const isSigned = !!data.is_signed;

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);
    try {
      // 1) Try load existing assessment for this check-in
      const res = await api.get(`/pacu-mobility/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const a = list[0];
        setAssessmentId(a.id);
        setData((prev) => ({ ...prev, ...a, checkin: Number(checkinId) }));
        return;
      }

      // 2) If none exists, create it
      const created = await api.post('/pacu-mobility/', { checkin: Number(checkinId) });
      setAssessmentId(created.data.id);
      setData((prev) => ({ ...prev, ...created.data, checkin: Number(checkinId) }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create PACU Mobility Assessment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const setField = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const saveDraft = async () => {
    if (!assessmentId) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        level1_result: data.level1_result,
        level1_time_initials: data.level1_time_initials,
        level2_result: data.level2_result,
        level2_time_initials: data.level2_time_initials,
        level3_result: data.level3_result,
        level3_time_initials: data.level3_time_initials,
        notes: data.notes,
      };

      const res = await api.patch(`/pacu-mobility/${assessmentId}/`, payload);
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
    if (!assessmentId) return;
    if (isSigned) return;

    setError('');
    setSigning(true);
    try {
      // require signature
      if (!sigRef.current || sigRef.current.isEmpty()) {
        setError('Signature is required to sign this form.');
        setSigning(false);
        return;
      }

      // make sure latest edits are saved before signing
      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');

      const res = await api.post(`/pacu-mobility/${assessmentId}/sign/`, {
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

  const headerSubtitle = useMemo(() => {
    if (!data.signed_at) return 'Draft';
    return `Signed at ${new Date(data.signed_at).toLocaleString()}`;
  }, [data.signed_at]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PACU Mobility Assessment</h1>
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">
            Loading…
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="text-sm text-gray-600">
              Enter Level results. Save anytime. Signing will lock the form and capture a verified signature.
            </div>

            {/* LEVEL 1 */}
            <section className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Level 1</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Result</label>
                  <select
                    value={data.level1_result}
                    onChange={(e) => setField('level1_result', e.target.value)}
                    disabled={isSigned}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">—</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Time / Initials</label>
                  <input
                    type="text"
                    value={data.level1_time_initials}
                    onChange={(e) => setField('level1_time_initials', e.target.value)}
                    disabled={isSigned}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 10:14 AM / MF"
                  />
                </div>
              </div>
            </section>

            {/* LEVEL 2 */}
            <section className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Level 2</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Result</label>
                  <select
                    value={data.level2_result}
                    onChange={(e) => setField('level2_result', e.target.value)}
                    disabled={isSigned}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">—</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Time / Initials</label>
                  <input
                    type="text"
                    value={data.level2_time_initials}
                    onChange={(e) => setField('level2_time_initials', e.target.value)}
                    disabled={isSigned}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 10:22 AM / MF"
                  />
                </div>
              </div>
            </section>

            {/* LEVEL 3 */}
            <section className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Level 3</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Result</label>
                  <select
                    value={data.level3_result}
                    onChange={(e) => setField('level3_result', e.target.value)}
                    disabled={isSigned}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">—</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Time / Initials</label>
                  <input
                    type="text"
                    value={data.level3_time_initials}
                    onChange={(e) => setField('level3_time_initials', e.target.value)}
                    disabled={isSigned}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 10:35 AM / MF"
                  />
                </div>
              </div>
            </section>

            {/* Notes */}
            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={data.notes}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={isSigned}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Additional notes…"
              />
            </section>

            {/* Read-only Instructions (paper-faithful) */}
            <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-label="Mobility assessment instructions">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Instructions (Read-Only)</h3>

              <div className="text-sm text-gray-800 space-y-3">
                <div>
                  <p className="font-semibold">REMINDER:</p>
                  <p>
                    All PACU patients are considered <span className="font-semibold">High Risk for falls</span>. Additional protocols for
                    patients experiencing mobility risks should be followed.
                  </p>
                </div>

                <div>
                  <p className="font-semibold">Assistive Device for use if negative responses above</p>

                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="font-semibold">Level 1 Assessment</p>
                      <p>Wait 5 minutes and test again.</p>
                      <p>Do not transfer a patient if negative response, offer a urinal or bedpan.</p>
                    </div>

                    <div>
                      <p className="font-semibold">Level 2 Assessment</p>
                      <p>Gait Belt should be utilized at all times.</p>
                      <p>If weight-bearing on both lower extremities, walker should be utilized and 2 person assist during ambulation.</p>
                      <p>If weight-bearing on one lower extremity, axillary crutches or cane should be utilized during ambulation.</p>
                    </div>

                    <div>
                      <p className="font-semibold">Level 3 Assessment</p>
                      <p>Gait Belt should be utilized at all times.</p>
                      <p>If weight-bearing on both lower extremities, walker should be utilized and 2 person assist during ambulation.</p>
                      <p>If weight-bearing on one lower extremity, axillary crutches or cane should be utilized during ambulation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Signature */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
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
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-2">
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
              ) : null}

              <div className="mt-3 text-xs text-gray-500">
                Signing is audit-logged and stores a signature hash + content hash server-side.
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default PacuMobilityAssessment;
