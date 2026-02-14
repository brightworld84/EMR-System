import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';

const API_BASE = '/consent-for-anesthesia-services/';

function Checkbox({ checked, onChange, disabled, label }) {
  return (
    <label className="inline-flex items-start gap-2 text-sm text-gray-800">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 mt-0.5"
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

function ConsentForAnesthesiaServices() {
  const navigate = useNavigate();
  const { checkinId } = useParams();
  const sigRef = useRef(null);

  const [consentId, setConsentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState({
    checkin: Number(checkinId),

    // selections (patient checks)
    general_anesthesia: false,

    spinal_epidural_with_sedation: false,
    spinal_epidural_without_sedation: false,

    major_minor_nerve_block_with_sedation: false,
    major_minor_nerve_block_without_sedation: false,

    iv_regional_with_sedation: false,
    iv_regional_without_sedation: false,

    mac_with_sedation: false,
    mac_without_sedation: false,

    peribulbar_block: false,

    // optional notes/ack
    patient_acknowledges: false,
    additional_notes: '',

    // signature lines
    patient_signature_name: '',
    witness_signature_name: '',
    guardian_signature_name: '',
    relationship_to_patient: '',
    anesthesiologist_signature_name: '',

    patient_date_time: '',
    witness_date_time: '',
    guardian_date_time: '',
    anesthesiologist_date_time: '',

    // lock
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
      const res = await api.get(`${API_BASE}?checkin=${encodeURIComponent(checkinId)}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);

      if (list.length > 0) {
        const c = list[0];
        setConsentId(c.id);
        setData((prev) => ({ ...prev, ...c, checkin: Number(checkinId) }));
        return;
      }

      const created = await api.post(API_BASE, { checkin: Number(checkinId) });
      setConsentId(created.data.id);
      setData((prev) => ({ ...prev, ...created.data, checkin: Number(checkinId) }));
    } catch (e) {
      console.error(e);
      setError('Failed to load/create Consent for Anesthesia Services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!consentId) return;
    setError('');
    setSaving(true);
    try {
      // only send writable fields
      const payload = {
        general_anesthesia: !!data.general_anesthesia,

        spinal_epidural_with_sedation: !!data.spinal_epidural_with_sedation,
        spinal_epidural_without_sedation: !!data.spinal_epidural_without_sedation,

        major_minor_nerve_block_with_sedation: !!data.major_minor_nerve_block_with_sedation,
        major_minor_nerve_block_without_sedation: !!data.major_minor_nerve_block_without_sedation,

        iv_regional_with_sedation: !!data.iv_regional_with_sedation,
        iv_regional_without_sedation: !!data.iv_regional_without_sedation,

        mac_with_sedation: !!data.mac_with_sedation,
        mac_without_sedation: !!data.mac_without_sedation,

        peribulbar_block: !!data.peribulbar_block,

        patient_acknowledges: !!data.patient_acknowledges,
        additional_notes: data.additional_notes || '',

        patient_signature_name: data.patient_signature_name || '',
        witness_signature_name: data.witness_signature_name || '',
        guardian_signature_name: data.guardian_signature_name || '',
        relationship_to_patient: data.relationship_to_patient || '',
        anesthesiologist_signature_name: data.anesthesiologist_signature_name || '',

        patient_date_time: data.patient_date_time || '',
        witness_date_time: data.witness_date_time || '',
        guardian_date_time: data.guardian_date_time || '',
        anesthesiologist_date_time: data.anesthesiologist_date_time || '',
      };

      const res = await api.patch(`${API_BASE}${consentId}/`, payload);
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
    if (!consentId || isSigned) return;

    setError('');
    setSigning(true);

    try {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        setError('Patient signature is required to sign this consent.');
        setSigning(false);
        return;
      }

      await saveDraft();

      const sigDataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const res = await api.post(`${API_BASE}${consentId}/sign/`, {
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
            <h1 className="text-2xl font-bold text-gray-900">Consent for Anesthesia Services</h1>
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
              title="Locks the consent after signing"
            >
              {isSigned ? 'Signed' : signing ? 'Signing…' : 'Sign & Lock'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-8">
            {/* Consent text (display only) */}
            <section className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="text-sm text-gray-800 leading-relaxed space-y-2">
                <p>
                  I understand that anesthesia services are needed so that my doctor can perform the procedure.
                  All forms of anesthesia involve some risks and no guarantees can be made concerning results.
                  I acknowledge I have been advised not to drive until effects of anesthesia/medication have worn off.
                </p>
                <p className="text-xs text-gray-500">
                  (This is a simplified on-screen version of the paper consent language; the signed PDF/printout is the legal record.)
                </p>
              </div>
            </section>

            {/* Type selections */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Type of Anesthesia</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">General</div>
                  <Checkbox
                    label="General Anesthesia"
                    checked={data.general_anesthesia}
                    disabled={isSigned}
                    onChange={(v) => setField('general_anesthesia', v)}
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Spinal / Epidural Analgesia</div>
                  <Checkbox
                    label="With sedation"
                    checked={data.spinal_epidural_with_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('spinal_epidural_with_sedation', v)}
                  />
                  <Checkbox
                    label="Without sedation"
                    checked={data.spinal_epidural_without_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('spinal_epidural_without_sedation', v)}
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Major / Minor Nerve Block</div>
                  <Checkbox
                    label="With sedation"
                    checked={data.major_minor_nerve_block_with_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('major_minor_nerve_block_with_sedation', v)}
                  />
                  <Checkbox
                    label="Without sedation"
                    checked={data.major_minor_nerve_block_without_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('major_minor_nerve_block_without_sedation', v)}
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Intravenous Regional Anesthesia</div>
                  <Checkbox
                    label="With sedation"
                    checked={data.iv_regional_with_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('iv_regional_with_sedation', v)}
                  />
                  <Checkbox
                    label="Without sedation"
                    checked={data.iv_regional_without_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('iv_regional_without_sedation', v)}
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Monitored Anesthesia Care</div>
                  <Checkbox
                    label="With sedation"
                    checked={data.mac_with_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('mac_with_sedation', v)}
                  />
                  <Checkbox
                    label="Without sedation"
                    checked={data.mac_without_sedation}
                    disabled={isSigned}
                    onChange={(v) => setField('mac_without_sedation', v)}
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-700">Other</div>
                  <Checkbox
                    label="Peribulbar Block"
                    checked={data.peribulbar_block}
                    disabled={isSigned}
                    onChange={(v) => setField('peribulbar_block', v)}
                  />
                </div>
              </div>
            </section>

            {/* Acknowledgement + notes */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-700">Acknowledgement</div>
                <Checkbox
                  label="I have read (or had read to me) this consent and understand the risks, benefits, and alternatives."
                  checked={data.patient_acknowledges}
                  disabled={isSigned}
                  onChange={(v) => setField('patient_acknowledges', v)}
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <TextArea
                  label="Notes (optional)"
                  value={data.additional_notes}
                  disabled={isSigned}
                  onChange={(v) => setField('additional_notes', v)}
                  rows={4}
                />
              </div>
            </section>

            {/* Signature lines */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Signatures</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Patient Signature (name)"
                  value={data.patient_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setField('patient_signature_name', v)}
                />
                <TextField
                  label="Patient Date/Time"
                  value={data.patient_date_time}
                  disabled={isSigned}
                  onChange={(v) => setField('patient_date_time', v)}
                  placeholder="MM/DD/YYYY HH:MM"
                />

                <TextField
                  label="Witness to Signature Only"
                  value={data.witness_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setField('witness_signature_name', v)}
                />
                <TextField
                  label="Witness Date/Time"
                  value={data.witness_date_time}
                  disabled={isSigned}
                  onChange={(v) => setField('witness_date_time', v)}
                  placeholder="MM/DD/YYYY HH:MM"
                />

                <TextField
                  label="Guardian Signature"
                  value={data.guardian_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setField('guardian_signature_name', v)}
                />
                <TextField
                  label="Relationship to Patient"
                  value={data.relationship_to_patient}
                  disabled={isSigned}
                  onChange={(v) => setField('relationship_to_patient', v)}
                />

                <TextField
                  label="Anesthesiologist Signature"
                  value={data.anesthesiologist_signature_name}
                  disabled={isSigned}
                  onChange={(v) => setField('anesthesiologist_signature_name', v)}
                />
                <TextField
                  label="Anesthesiologist Date/Time"
                  value={data.anesthesiologist_date_time}
                  disabled={isSigned}
                  onChange={(v) => setField('anesthesiologist_date_time', v)}
                  placeholder="MM/DD/YYYY HH:MM"
                />
              </div>
            </section>

            {/* Signature capture */}
            <section className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Patient Signature Capture</h2>
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

              <div className="mt-3 text-xs text-gray-500">
                Signing is audit-logged and locks the form.
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

export default ConsentForAnesthesiaServices;
