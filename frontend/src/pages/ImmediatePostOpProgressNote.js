import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

function ImmediatePostOpProgressNote() {
  const navigate = useNavigate();
  const { checkinId } = useParams();
  const sigRef = useRef(null);

  const [noteId, setNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),

    surgeon_assist: '',

    pre_procedure_diagnosis: '',
    post_procedure_diagnosis_same: false,
    post_procedure_diagnosis_other: '',

    anesthesia_general: false,
    anesthesia_spinal: false,
    anesthesia_epidural: false,
    anesthesia_mac_local: false,
    anesthesia_regional: false,
    anesthesia_local: false,
    anesthesia_iv_sedation: false,

    procedure_name: '',
    findings: '',
    disposition: '',
    disposition_other: '',

    status_stable: false,
    status_other: '',

    drain_or_pack_none: false,
    drain_or_pack_yes: false,
    drain_or_pack_type: '',

    complications_none: false,
    complications_other: '',

    ebl_negligible: false,
    ebl_mls: '',

    specimen_no: false,
    specimen_pathology: false,
    specimen_discarded: false,

    operative_note_dictated_required: false,

    notes: '',

    is_signed: false,
    signed_by: null,
    signed_at: null,
    signature_data_url: '',
  });

  const isSigned = !!data.is_signed;

  // Badge support 
  const isAutofilled =
    !!data.autofilled_from_schedule ||
    !!data.postop_autofilled ||
    !!data.auto_filled ||
    !!data.autofilled ||
    !!data.autofilled_at;

  const headerSubtitle = useMemo(() => {
    if (!data.signed_at) return 'Draft';
    return `Signed at ${new Date(data.signed_at).toLocaleString()}`;
  }, [data.signed_at]);

  const setField = (name, value) => setData((prev) => ({ ...prev, [name]: value }));

  const loadOrCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/immediate-postop-progress-note/?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const n = list[0];
        setNoteId(n.id);
        setData((prev) => ({ ...prev, ...n, checkin: Number(checkinId) }));
        return;
      }

      const created = await api.post('/immediate-postop-progress-note/', { checkin: Number(checkinId) });
      setNoteId(created.data.id);
      setData((prev) => ({ ...prev, ...created.data, checkin: Number(checkinId) }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Immediate Post-Op Progress Note.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!noteId) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        surgeon_assist: data.surgeon_assist || '',
        pre_procedure_diagnosis: data.pre_procedure_diagnosis || '',
        post_procedure_diagnosis_same: !!data.post_procedure_diagnosis_same,
        post_procedure_diagnosis_other: data.post_procedure_diagnosis_other || '',
        anesthesia_general: !!data.anesthesia_general,
        anesthesia_spinal: !!data.anesthesia_spinal,
        anesthesia_epidural: !!data.anesthesia_epidural,
        anesthesia_mac_local: !!data.anesthesia_mac_local,
        anesthesia_regional: !!data.anesthesia_regional,
        anesthesia_local: !!data.anesthesia_local,
        anesthesia_iv_sedation: !!data.anesthesia_iv_sedation,
        procedure_name: data.procedure_name || '',
        findings: data.findings || '',
        disposition: data.disposition || '',
        disposition_other: data.disposition_other || '',
        status_stable: !!data.status_stable,
        status_other: data.status_other || '',
        drain_or_pack_none: !!data.drain_or_pack_none,
        drain_or_pack_yes: !!data.drain_or_pack_yes,
        drain_or_pack_type: data.drain_or_pack_type || '',
        complications_none: !!data.complications_none,
        complications_other: data.complications_other || '',
        ebl_negligible: !!data.ebl_negligible,
        ebl_mls: data.ebl_mls || '',
        specimen_no: !!data.specimen_no,
        specimen_pathology: !!data.specimen_pathology,
        specimen_discarded: !!data.specimen_discarded,
        operative_note_dictated_required: !!data.operative_note_dictated_required,
        notes: data.notes || '',
      };

      const res = await api.patch(`/immediate-postop-progress-note/${noteId}/`, payload);
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
    if (!noteId || isSigned) return;

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
      const res = await api.post(`/immediate-postop-progress-note/${noteId}/sign/`, {
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

  const Checkbox = ({ checked, disabled, onChange, label }) => (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Immediate Post-Op Progress Note</h1>
            <p className="text-sm text-gray-600">
              Check-in #{checkinId} • {headerSubtitle}
            </p>
          </div>

          {isAutofilled ? (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                Auto-filled from surgery schedule
              </span>
            </div>
          ) : null}

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
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Surgeon Assist</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.surgeon_assist || ''}
                  disabled={isSigned}
                  onChange={(e) => setField('surgeon_assist', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Procedure Name</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.procedure_name || ''}
                  disabled={isSigned}
                  onChange={(e) => setField('procedure_name', e.target.value)}
                />
              </div>
            </section>

            <section>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pre-Procedure Diagnosis</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                value={data.pre_procedure_diagnosis || ''}
                disabled={isSigned}
                onChange={(e) => setField('pre_procedure_diagnosis', e.target.value)}
              />
            </section>

            <section className="space-y-2">
              <div className="flex flex-wrap items-center gap-4">
                <Checkbox
                  label="Post-Procedure Diagnosis (Same)"
                  checked={data.post_procedure_diagnosis_same}
                  disabled={isSigned}
                  onChange={(v) => setField('post_procedure_diagnosis_same', v)}
                />
              </div>

              <label className="block text-sm font-semibold text-gray-700 mb-1">Post-Procedure Diagnosis (Other)</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
                value={data.post_procedure_diagnosis_other || ''}
                disabled={isSigned || data.post_procedure_diagnosis_same}
                onChange={(e) => setField('post_procedure_diagnosis_other', e.target.value)}
              />
            </section>

            <section>
              <div className="text-sm font-semibold text-gray-700 mb-2">Anesthesia</div>
              <div className="flex flex-wrap gap-4">
                <Checkbox label="General" checked={data.anesthesia_general} disabled={isSigned} onChange={(v) => setField('anesthesia_general', v)} />
                <Checkbox label="Spinal" checked={data.anesthesia_spinal} disabled={isSigned} onChange={(v) => setField('anesthesia_spinal', v)} />
                <Checkbox label="Epidural" checked={data.anesthesia_epidural} disabled={isSigned} onChange={(v) => setField('anesthesia_epidural', v)} />
                <Checkbox label="MAC/Local" checked={data.anesthesia_mac_local} disabled={isSigned} onChange={(v) => setField('anesthesia_mac_local', v)} />
                <Checkbox label="Regional" checked={data.anesthesia_regional} disabled={isSigned} onChange={(v) => setField('anesthesia_regional', v)} />
                <Checkbox label="Local" checked={data.anesthesia_local} disabled={isSigned} onChange={(v) => setField('anesthesia_local', v)} />
                <Checkbox label="IV Sedation" checked={data.anesthesia_iv_sedation} disabled={isSigned} onChange={(v) => setField('anesthesia_iv_sedation', v)} />
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Disposition</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.disposition || ''}
                  disabled={isSigned}
                  onChange={(e) => setField('disposition', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="PACU">PACU</option>
                  <option value="Home">Home</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Disposition (Other)</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.disposition_other || ''}
                  disabled={isSigned || data.disposition !== 'Other'}
                  onChange={(e) => setField('disposition_other', e.target.value)}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Checkbox label="Status: Stable" checked={data.status_stable} disabled={isSigned} onChange={(v) => setField('status_stable', v)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status (Other)</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.status_other || ''}
                  disabled={isSigned || data.status_stable}
                  onChange={(e) => setField('status_other', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  <Checkbox label="Drain/Pack: None" checked={data.drain_or_pack_none} disabled={isSigned} onChange={(v) => setField('drain_or_pack_none', v)} />
                  <Checkbox label="Drain/Pack: Yes" checked={data.drain_or_pack_yes} disabled={isSigned} onChange={(v) => setField('drain_or_pack_yes', v)} />
                </div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Drain/Pack Type</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.drain_or_pack_type || ''}
                  disabled={isSigned || !data.drain_or_pack_yes}
                  onChange={(e) => setField('drain_or_pack_type', e.target.value)}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Checkbox label="Complications: None" checked={data.complications_none} disabled={isSigned} onChange={(v) => setField('complications_none', v)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1">Complications (Other)</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.complications_other || ''}
                  disabled={isSigned || data.complications_none}
                  onChange={(e) => setField('complications_other', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Checkbox label="EBL: Negligible" checked={data.ebl_negligible} disabled={isSigned} onChange={(v) => setField('ebl_negligible', v)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1">EBL (mLs)</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={data.ebl_mls || ''}
                  disabled={isSigned || data.ebl_negligible}
                  onChange={(e) => setField('ebl_mls', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700">Specimen</div>
                <div className="flex flex-wrap gap-4">
                  <Checkbox label="No" checked={data.specimen_no} disabled={isSigned} onChange={(v) => setField('specimen_no', v)} />
                  <Checkbox label="Pathology" checked={data.specimen_pathology} disabled={isSigned} onChange={(v) => setField('specimen_pathology', v)} />
                  <Checkbox label="Discarded" checked={data.specimen_discarded} disabled={isSigned} onChange={(v) => setField('specimen_discarded', v)} />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <Checkbox
                label="Operative note dictated (required)"
                checked={data.operative_note_dictated_required}
                disabled={isSigned}
                onChange={(v) => setField('operative_note_dictated_required', v)}
              />
              <label className="block text-sm font-semibold text-gray-700 mb-1">Findings / Description</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border rounded-lg"
                value={data.findings || ''}
                disabled={isSigned}
                onChange={(e) => setField('findings', e.target.value)}
              />
              <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                value={data.notes || ''}
                disabled={isSigned}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </section>

            {/* Signature */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Physician Signature</h2>
                <button
                  type="button"
                  onClick={() => sigRef.current && sigRef.current.clear()}
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
                  <img src={data.signature_data_url} alt="Signature" className="border border-gray-200 rounded-lg max-w-full" />
                </div>
              ) : null}
            </section>

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

export default ImmediatePostOpProgressNote;

