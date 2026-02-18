import React, { useEffect, useState } from 'react';
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

export default function PreOpPhoneCall() {
  const { checkinId } = useParams();
  const navigate = useNavigate();

  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  // Form data - matches backend model exactly (32 fields)
  const [formData, setFormData] = useState({
    dos: '',
    arrival_time: '',
    procedure: '',
    height: '',
    weight_lbs: '',
    contact_number: '',
    escort_name_relationship: '',
    
    prev_surgeries: '',
    anesthesia_issues: '',
    
    // Medical history (6 Boolean fields)
    hx_htn: false,
    hx_asthma: false,
    hx_copd: false,
    hx_cad: false,
    hx_arrhythmia: false,
    hx_sob: false,
    
    // Sleep/respiratory
    sleep_apnea: false,
    cpap_used: false,
    bipap_used: false,
    chronic_cough: false,
    
    // Lifestyle
    smoker: false,
    smoker_years: '',
    etoh_drug_use: false,
    
    // Patient instructions
    instr_npo: false,
    instr_no_bp_meds: false,
    instr_bring_insurance_id: false,
    instr_leave_valuables: false,
    instr_loose_clothing: false,
    instr_glp: false,
    instr_advanced_directive: false,
    instr_special_instructions: '',
  });

  // Load existing record or create new one
  useEffect(() => {
    const loadOrCreate = async () => {
      setLoading(true);
      setError('');
      try {
        // Try to find existing record
        const listRes = await api.get('/pre-op-phone-call/', {
          params: { checkin: checkinId }
        });

        if (listRes.data.results && listRes.data.results.length > 0) {
          // Record exists - load it
          const existing = listRes.data.results[0];
          setRecordId(existing.id);
          setFormData(existing);
          setIsSigned(existing.completed || false);
        } else {
          // Create new record
          const createRes = await api.post('/pre-op-phone-call/', {
            checkin: checkinId,
          });
          setRecordId(createRes.data.id);
          setFormData(createRes.data);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    loadOrCreate();
  }, [checkinId]);

  // Auto-save on field change
  const handleFieldChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (!recordId) return;

    try {
      await api.patch(`/pre-op-phone-call/${recordId}/`, {
        [field]: value,
      });
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  };

  // Manual save
  const handleSave = async () => {
    if (!recordId) return;
    setSaving(true);
    setError('');

    try {
      const res = await api.patch(`/pre-op-phone-call/${recordId}/`, formData);
      setFormData(res.data);
      alert('Saved successfully!');
    } catch (e) {
      console.error(e);
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Sign and lock
  const handleSign = async () => {
    if (!recordId) return;
    if (!window.confirm('Sign and lock this form? You will not be able to edit it after signing.')) return;

    setSaving(true);
    setError('');

    try {
      const res = await api.patch(`/pre-op-phone-call/${recordId}/`, {
        ...formData,
        completed: true,
      });
      setFormData(res.data);
      setIsSigned(true);
      alert('Form signed and locked!');
    } catch (e) {
      console.error(e);
      setError('Failed to sign form.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pre-Op Phone Call</h1>
            <p className="text-sm text-gray-600">
              Check-in: <span className="font-semibold">{checkinId}</span>
              {isSigned ? (
                <span className="ml-2 text-xs font-semibold text-green-600">🔒 Completed</span>
              ) : (
                <span className="ml-2 text-xs font-semibold text-gray-500">📝 Draft</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>

            {!isSigned && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !recordId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleSign}
                  disabled={saving || !recordId}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-400"
                >
                  {saving ? 'Signing…' : 'Sign & Lock'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Loading…</div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && (
          <>
            {/* Basic Information */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Date of Surgery (DOS)"
                value={formData.dos}
                onChange={(v) => handleFieldChange('dos', v)}
                disabled={isSigned}
                placeholder="YYYY-MM-DD"
              />
              <TextField
                label="Arrival Time"
                value={formData.arrival_time}
                onChange={(v) => handleFieldChange('arrival_time', v)}
                disabled={isSigned}
                placeholder="HH:MM"
              />
              <TextField
                label="Procedure"
                value={formData.procedure}
                onChange={(v) => handleFieldChange('procedure', v)}
                disabled={isSigned}
              />
              <TextField
                label="Height"
                value={formData.height}
                onChange={(v) => handleFieldChange('height', v)}
                disabled={isSigned}
                placeholder="e.g., 5'10 inches"
              />
              <TextField
                label="Weight (lbs)"
                value={formData.weight_lbs}
                onChange={(v) => handleFieldChange('weight_lbs', v)}
                disabled={isSigned}
                placeholder="e.g., 180"
              />
              <TextField
                label="Contact Number"
                value={formData.contact_number}
                onChange={(v) => handleFieldChange('contact_number', v)}
                disabled={isSigned}
              />
              <TextField
                label="Escort Name & Relationship"
                value={formData.escort_name_relationship}
                onChange={(v) => handleFieldChange('escort_name_relationship', v)}
                disabled={isSigned}
                placeholder="e.g., John Doe (spouse)"
              />
            </section>

            {/* Previous Surgeries */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Previous Surgeries</h2>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.prev_surgeries || ''}
                onChange={(e) => handleFieldChange('prev_surgeries', e.target.value)}
                disabled={isSigned}
                placeholder="List previous surgeries with dates..."
              />
            </section>

            {/* Medical History */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Medical History</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckboxRow
                  label="Hypertension (HTN)"
                  checked={formData.hx_htn}
                  onChange={(v) => handleFieldChange('hx_htn', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Coronary Artery Disease (CAD)"
                  checked={formData.hx_cad}
                  onChange={(v) => handleFieldChange('hx_cad', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Arrhythmia"
                  checked={formData.hx_arrhythmia}
                  onChange={(v) => handleFieldChange('hx_arrhythmia', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Shortness of Breath (SOB)"
                  checked={formData.hx_sob}
                  onChange={(v) => handleFieldChange('hx_sob', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="COPD"
                  checked={formData.hx_copd}
                  onChange={(v) => handleFieldChange('hx_copd', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Asthma"
                  checked={formData.hx_asthma}
                  onChange={(v) => handleFieldChange('hx_asthma', v)}
                  disabled={isSigned}
                />
              </div>
            </section>

            {/* Sleep/Respiratory */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Sleep & Respiratory</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckboxRow
                  label="Sleep Apnea"
                  checked={formData.sleep_apnea}
                  onChange={(v) => handleFieldChange('sleep_apnea', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="CPAP Used"
                  checked={formData.cpap_used}
                  onChange={(v) => handleFieldChange('cpap_used', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="BiPAP Used"
                  checked={formData.bipap_used}
                  onChange={(v) => handleFieldChange('bipap_used', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Chronic Cough"
                  checked={formData.chronic_cough}
                  onChange={(v) => handleFieldChange('chronic_cough', v)}
                  disabled={isSigned}
                />
              </div>
            </section>

            {/* Lifestyle */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Lifestyle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CheckboxRow
                  label="Smoker"
                  checked={formData.smoker}
                  onChange={(v) => handleFieldChange('smoker', v)}
                  disabled={isSigned}
                />
                <TextField
                  label="Years Smoking"
                  value={formData.smoker_years}
                  onChange={(v) => handleFieldChange('smoker_years', v)}
                  disabled={isSigned}
                  placeholder="e.g., 10"
                />
                <CheckboxRow
                  label="Alcohol / Drug Use"
                  checked={formData.etoh_drug_use}
                  onChange={(v) => handleFieldChange('etoh_drug_use', v)}
                  disabled={isSigned}
                />
              </div>
            </section>

            {/* Anesthesia History */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Anesthesia History</h2>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.anesthesia_issues || ''}
                onChange={(e) => handleFieldChange('anesthesia_issues', e.target.value)}
                disabled={isSigned}
                placeholder="Any issues with anesthesia? (N/V, difficult airway, malignant hyperthermia, etc.)"
              />
            </section>

            {/* Patient Instructions */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Patient Instructions Given</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CheckboxRow
                  label="NPO after midnight"
                  checked={formData.instr_npo}
                  onChange={(v) => handleFieldChange('instr_npo', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="No BP meds (ACE/ARB) on DOS"
                  checked={formData.instr_no_bp_meds}
                  onChange={(v) => handleFieldChange('instr_no_bp_meds', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Bring insurance card & ID"
                  checked={formData.instr_bring_insurance_id}
                  onChange={(v) => handleFieldChange('instr_bring_insurance_id', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Leave valuables at home"
                  checked={formData.instr_leave_valuables}
                  onChange={(v) => handleFieldChange('instr_leave_valuables', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Wear loose clothing"
                  checked={formData.instr_loose_clothing}
                  onChange={(v) => handleFieldChange('instr_loose_clothing', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="GLP-1 instructions"
                  checked={formData.instr_glp}
                  onChange={(v) => handleFieldChange('instr_glp', v)}
                  disabled={isSigned}
                />
                <CheckboxRow
                  label="Advanced directive reviewed"
                  checked={formData.instr_advanced_directive}
                  onChange={(v) => handleFieldChange('instr_advanced_directive', v)}
                  disabled={isSigned}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.instr_special_instructions || ''}
                  onChange={(e) => handleFieldChange('instr_special_instructions', e.target.value)}
                  disabled={isSigned}
                  placeholder="Any additional special instructions..."
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
