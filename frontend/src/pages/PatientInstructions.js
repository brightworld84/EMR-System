// src/pages/PatientInstructions.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function CheckboxRow({ checked, onChange, label, disabled }) {
  return (
    <label className="flex items-start gap-2 py-1 select-none">
      <input
        type="checkbox"
        className="mt-1"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-900 leading-snug">{label}</span>
    </label>
  );
}

function TextLine({ label, value, onChange, disabled, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, disabled, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
      />
    </label>
  );
}

export default function PatientInstructions() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const defaults = useMemo(
    () => ({
      // GIVEN PATIENT INSTRUCTIONS (checkboxes)
      npo_after_midnight: false,
      special_po_no_bp_prils_sartans: false,
      special_po_details: "",

      wear_loose_clothing: false,
      advanced_directive_discussed: false,
      bring_insurance_and_id: false,
      leave_valuables_at_home: false,

      special_instructions: "",

      // GLP-1 instructions (checkbox + optional notes)
      glp1_instructions_reviewed: false,
      glp1_notes: "",

      // Call attempts (2)
      attempt1_date: "",
      attempt1_time: "",
      attempt1_no_answer: false,
      attempt1_lvm: false,
      attempt1_spoke_to: "",
      attempt1_initials: "",

      attempt2_date: "",
      attempt2_time: "",
      attempt2_no_answer: false,
      attempt2_lvm: false,
      attempt2_spoke_to: "",
      attempt2_initials: "",

      // completion/lock
      completed: false,
    }),
    []
  );

  const [form, setForm] = useState(defaults);
  const [recordId, setRecordId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isLocked = !!form.completed;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Load existing (list filtered by checkin)
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      setRecordId(null);

      try {
        const res = await api.get(`/patient-instructions/?checkin=${checkinId}`);
        const payload = res.data;

        // DRF list usually returns array; handle object too
        const obj = Array.isArray(payload) ? payload[0] : payload;

        if (obj && mounted) {
          setRecordId(obj.id ?? null);

          // Many of your newer forms store the actual fields in obj.data (JSONField)
          const data = obj.data && typeof obj.data === "object" ? obj.data : {};

          setForm({
            ...defaults,
            ...data,
            // root-level flags if present
            completed: !!(obj.completed ?? obj.is_complete ?? data.completed),
          });
        } else if (mounted) {
          // No record yet
          setForm(defaults);
        }
      } catch (e) {
        // 404 here is okay if nothing exists yet; otherwise show message
        setError(e?.response?.data?.detail || e?.message || "Failed to load");
        setForm(defaults);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (checkinId) load();
    return () => {
      mounted = false;
    };
  }, [checkinId, defaults]);

  const buildPayload = (override = {}) => {
    // store everything in data (JSON field), plus keep completed at root if model has it
    const data = { ...form, ...override };

    // If “special PO” isn’t checked, clear its details (keeps data clean)
    if (!data.special_po_no_bp_prils_sartans) data.special_po_details = "";

    // If GLP-1 not reviewed, clear notes
    if (!data.glp1_instructions_reviewed) data.glp1_notes = "";

    return {
      checkin: Number(checkinId),
      completed: !!data.completed,
      data,
    };
  };

  const save = async (override = {}) => {
    setSaving(true);
    setError("");

    try {
      const payload = buildPayload(override);

      if (recordId) {
        const res = await api.patch(`/patient-instructions/${recordId}/`, payload);
        const obj = res.data;
        setRecordId(obj.id ?? recordId);

        const data = obj.data && typeof obj.data === "object" ? obj.data : {};
        setForm({
          ...defaults,
          ...data,
          completed: !!(obj.completed ?? obj.is_complete ?? data.completed),
        });
      } else {
        const res = await api.post(`/patient-instructions/`, payload);
        const obj = res.data;
        setRecordId(obj.id ?? null);

        const data = obj.data && typeof obj.data === "object" ? obj.data : {};
        setForm({
          ...defaults,
          ...data,
          completed: !!(obj.completed ?? obj.is_complete ?? data.completed),
        });
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    if (isLocked) return;
    setField("completed", true);
    await save({ completed: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Instructions</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId}</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold"
            >
              Print / PDF
            </button>

            <button
              onClick={() => save()}
              disabled={loading || saving || isLocked}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-300"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            <button
              onClick={markComplete}
              disabled={loading || saving || isLocked}
              className="px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-semibold disabled:bg-gray-300"
            >
              Mark Complete
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 print:hidden">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
            {isLocked ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 print:hidden">
                This form is locked (complete).
              </div>
            ) : null}

            <div className="text-center mb-6">
              <div className="text-sm text-gray-600">Dallas Joint &amp; Spine Center</div>
              <h2 className="text-xl font-extrabold text-gray-900 mt-2 uppercase">
                Given Patient Instructions
              </h2>
            </div>

            {/* Instructions */}
            <section className="border border-gray-300 rounded-md p-4">
              <div className="space-y-1">
                <CheckboxRow
                  disabled={isLocked}
                  checked={form.npo_after_midnight}
                  onChange={(v) => setField("npo_after_midnight", v)}
                  label="NPO after Midnight OR 8 hours prior to scheduled arrival time (no gum, mints, hard candy, cigarettes)"
                />

                <CheckboxRow
                  disabled={isLocked}
                  checked={form.special_po_no_bp_prils_sartans}
                  onChange={(v) => setField("special_po_no_bp_prils_sartans", v)}
                  label='Special PO instructions (NO BP medications ending “prils” or “sartans” DOS)'
                />

                {form.special_po_no_bp_prils_sartans ? (
                  <div className="mt-2">
                    <TextLine
                      disabled={isLocked}
                      label="Special PO instruction details"
                      value={form.special_po_details}
                      onChange={(v) => setField("special_po_details", v)}
                      placeholder="Type any additional details here…"
                    />
                  </div>
                ) : null}

                <CheckboxRow
                  disabled={isLocked}
                  checked={form.wear_loose_clothing}
                  onChange={(v) => setField("wear_loose_clothing", v)}
                  label="Wear loose clothing (Shoulder surgery, bring large button up)"
                />

                <CheckboxRow
                  disabled={isLocked}
                  checked={form.advanced_directive_discussed}
                  onChange={(v) => setField("advanced_directive_discussed", v)}
                  label="Do you have an advanced directive & if so, we will suspend the DNR portion while at the center"
                />

                <CheckboxRow
                  disabled={isLocked}
                  checked={form.bring_insurance_and_id}
                  onChange={(v) => setField("bring_insurance_and_id", v)}
                  label="Bring your insurance card and photo ID (driver’s license)"
                />

                <CheckboxRow
                  disabled={isLocked}
                  checked={form.leave_valuables_at_home}
                  onChange={(v) => setField("leave_valuables_at_home", v)}
                  label="Leave all valuables and jewelry (including body piercings) at home. Do not wear makeup and remove nail polish"
                />

                <div className="mt-3">
                  <TextArea
                    disabled={isLocked}
                    label="Special Instructions"
                    value={form.special_instructions}
                    onChange={(v) => setField("special_instructions", v)}
                    placeholder="Type any special instructions…"
                  />
                </div>

                <div className="mt-3 border-t border-gray-200 pt-3">
                  <CheckboxRow
                    disabled={isLocked}
                    checked={form.glp1_instructions_reviewed}
                    onChange={(v) => setField("glp1_instructions_reviewed", v)}
                    label="Special Instructions regarding GLP-1’s (reviewed)"
                  />
                  <div className="text-xs text-gray-600 ml-6 mt-1">
                    • If taking for DM then <b>ONLY clear liquids</b> 24 hours before surgery
                    <br />• If taking for weight loss then should be <b>OFF 1 WEEK</b> prior to surgery
                  </div>

                  {form.glp1_instructions_reviewed ? (
                    <div className="mt-2 ml-6">
                      <TextLine
                        disabled={isLocked}
                        label="GLP-1 notes (optional)"
                        value={form.glp1_notes}
                        onChange={(v) => setField("glp1_notes", v)}
                        placeholder="Optional notes…"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Medication lists (static content for print / reference) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="border border-gray-300 rounded-md p-4">
                <h3 className="font-extrabold text-gray-900 underline mb-2">ACE inhibitors include:</h3>
                <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                  <li>Benazepril (Lotensin)</li>
                  <li>Captopril</li>
                  <li>Enalapril (Epaned, Vasotec)</li>
                  <li>Fosinopril</li>
                  <li>Lisinopril (Qbrelis, Zestril)</li>
                  <li>Moexipril</li>
                  <li>Perindopril</li>
                  <li>Quinapril</li>
                  <li>Ramipril (Altace)</li>
                  <li>Trandolapril</li>
                </ul>
              </div>

              <div className="border border-gray-300 rounded-md p-4">
                <h3 className="font-extrabold text-gray-900 underline mb-2">
                  Angiotensin II receptor blockers include:
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                  <li>Azilsartan (Edarbi)</li>
                  <li>Candesartan (Atacand)</li>
                  <li>Irbesartan (Avapro)</li>
                  <li>Losartan (Cozaar)</li>
                  <li>Olmesartan (Benicar)</li>
                  <li>Telmisartan (Micardis)</li>
                  <li>Valsartan (Diovan)</li>
                </ul>
              </div>
            </section>

            {/* Call attempts */}
            <section className="border border-gray-300 rounded-md p-4 mt-6">
              <h3 className="font-extrabold text-gray-900 mb-3">Pre-Op Call Attempts</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Attempt 1 */}
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="font-semibold text-gray-900 mb-2">Attempt #1</div>

                  <div className="grid grid-cols-2 gap-3">
                    <TextLine
                      disabled={isLocked}
                      label="Date"
                      value={form.attempt1_date}
                      onChange={(v) => setField("attempt1_date", v)}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextLine
                      disabled={isLocked}
                      label="Time"
                      value={form.attempt1_time}
                      onChange={(v) => setField("attempt1_time", v)}
                      placeholder="HH:MM"
                    />
                  </div>

                  <div className="mt-2">
                    <CheckboxRow
                      disabled={isLocked}
                      checked={form.attempt1_no_answer}
                      onChange={(v) => {
                        setField("attempt1_no_answer", v);
                        if (v) setField("attempt1_lvm", false);
                      }}
                      label="No Answer"
                    />
                    <CheckboxRow
                      disabled={isLocked}
                      checked={form.attempt1_lvm}
                      onChange={(v) => {
                        setField("attempt1_lvm", v);
                        if (v) setField("attempt1_no_answer", false);
                      }}
                      label="LVM"
                    />
                  </div>

                  <div className="mt-2">
                    <TextLine
                      disabled={isLocked}
                      label="Spoke to"
                      value={form.attempt1_spoke_to}
                      onChange={(v) => setField("attempt1_spoke_to", v)}
                      placeholder="Name"
                    />
                  </div>

                  <div className="mt-2">
                    <TextLine
                      disabled={isLocked}
                      label="Initials"
                      value={form.attempt1_initials}
                      onChange={(v) => setField("attempt1_initials", v)}
                      placeholder="Initials"
                    />
                  </div>
                </div>

                {/* Attempt 2 */}
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="font-semibold text-gray-900 mb-2">Attempt #2</div>

                  <div className="grid grid-cols-2 gap-3">
                    <TextLine
                      disabled={isLocked}
                      label="Date"
                      value={form.attempt2_date}
                      onChange={(v) => setField("attempt2_date", v)}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextLine
                      disabled={isLocked}
                      label="Time"
                      value={form.attempt2_time}
                      onChange={(v) => setField("attempt2_time", v)}
                      placeholder="HH:MM"
                    />
                  </div>

                  <div className="mt-2">
                    <CheckboxRow
                      disabled={isLocked}
                      checked={form.attempt2_no_answer}
                      onChange={(v) => {
                        setField("attempt2_no_answer", v);
                        if (v) setField("attempt2_lvm", false);
                      }}
                      label="No Answer"
                    />
                    <CheckboxRow
                      disabled={isLocked}
                      checked={form.attempt2_lvm}
                      onChange={(v) => {
                        setField("attempt2_lvm", v);
                        if (v) setField("attempt2_no_answer", false);
                      }}
                      label="LVM"
                    />
                  </div>

                  <div className="mt-2">
                    <TextLine
                      disabled={isLocked}
                      label="Spoke to"
                      value={form.attempt2_spoke_to}
                      onChange={(v) => setField("attempt2_spoke_to", v)}
                      placeholder="Name"
                    />
                  </div>

                  <div className="mt-2">
                    <TextLine
                      disabled={isLocked}
                      label="Initials"
                      value={form.attempt2_initials}
                      onChange={(v) => setField("attempt2_initials", v)}
                      placeholder="Initials"
                    />
                  </div>
                </div>
              </div>

              <div className="print:hidden text-xs text-gray-500 pt-3">
                Tip: Use “Print / PDF” to confirm the layout matches the paper handout.
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
