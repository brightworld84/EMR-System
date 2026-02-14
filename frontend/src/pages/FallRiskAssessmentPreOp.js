// src/pages/FallRiskAssessmentPreOp.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function CheckboxRow({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-start gap-3 py-1">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-800 leading-snug">{label}</span>
    </label>
  );
}

function RadioRow({ name, options, value, onChange, disabled }) {
  return (
    <div className="space-y-2 mt-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-start gap-3">
          <input
            type="radio"
            name={name}
            className="mt-1 h-4 w-4"
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
          />
          <span className="text-sm text-gray-800 leading-snug">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function FallRiskAssessmentPreOp() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const endpoint = "fall-risk-assessment-preop/";
  const defaults = useMemo(
    () => ({
      checkin: Number(checkinId),

      // Carry-over / reference from Pre-Op Testing (PAT) total
      pre_admission_total_points: "",

      // Tubes & Cords (multi)
      tubes_ivs: false,
      tubes_o2: false,
      tubes_scds: false,

      // Blocks / Sedation (multi)
      blocks_preprocedure_sedation: false,
      blocks_regional_block: false,

      // Type of Procedure (single)
      procedure_type: "", // "lower_ext_not_total_joint" | "pain" | "total_knee_hip" | "colonoscopy"

      // Cognitive or behavioral issues (multi)
      cognitive_agitated: false,
      cognitive_impulse_control: false,
      cognitive_noncompliance: false,
      cognitive_lack_understanding: false,

      // Computed totals
      pre_procedure_total_points: "",
      combined_total_points: "",

      // Nurse
      pre_procedure_nurse_name: "",
    }),
    [checkinId]
  );

  const [recordId, setRecordId] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  // --- points mapping (matches the paper)
  const tubesPoints =
    (data.tubes_ivs ? 1 : 0) + (data.tubes_o2 ? 1 : 0) + (data.tubes_scds ? 1 : 0);

  const blocksPoints =
    (data.blocks_preprocedure_sedation ? 5 : 0) + (data.blocks_regional_block ? 5 : 0);

  const procedurePoints = (() => {
    if (data.procedure_type === "lower_ext_not_total_joint") return 20;
    if (data.procedure_type === "pain") return 15;
    if (data.procedure_type === "total_knee_hip") return 10;
    if (data.procedure_type === "colonoscopy") return 5;
    return 0;
  })();

  const cognitivePoints =
    (data.cognitive_agitated ? 2 : 0) +
    (data.cognitive_impulse_control ? 5 : 0) +
    (data.cognitive_noncompliance ? 5 : 0) +
    (data.cognitive_lack_understanding ? 5 : 0);

  const preProcedureTotal = tubesPoints + blocksPoints + procedurePoints + cognitivePoints;

  const combinedTotal =
    (Number(data.pre_admission_total_points || 0) || 0) + (Number(preProcedureTotal) || 0);

  // --- load existing record for this checkin (take first result)
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!checkinId) return;
      setError("");
      setLoading(true);

      try {
        const res = await api.get(`${endpoint}?checkin=${checkinId}`);
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const first = list.length ? list[0] : null;

        if (!mounted) return;

        if (first?.id) {
          setRecordId(first.id);
          setData((prev) => ({
            ...prev,
            ...first,
            checkin: Number(checkinId),
          }));
        } else {
          setRecordId(null);
          setData(defaults);
        }
      } catch (e) {
        console.error("FallRiskAssessmentPreOp load failed:", e);
        if (!mounted) return;
        setError("Failed to load this form.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [checkinId, endpoint, defaults]);

  // keep computed totals in state (so backend can store them)
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      pre_procedure_total_points: String(preProcedureTotal),
      combined_total_points: String(combinedTotal),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preProcedureTotal, combinedTotal]);

  const onSave = async () => {
    if (!checkinId) return;

    setError("");
    setSaving(true);

    try {
      const payload = {
        ...data,
        checkin: Number(checkinId),
        pre_procedure_total_points: String(preProcedureTotal),
        combined_total_points: String(combinedTotal),
      };

      let res;
      if (recordId) {
        res = await api.patch(`${endpoint}${recordId}/`, payload);
      } else {
        res = await api.post(endpoint, payload);
      }

      const saved = res.data;
      setRecordId(saved?.id || null);
      setData((prev) => ({ ...prev, ...saved }));
    } catch (e) {
      console.error("FallRiskAssessmentPreOp save failed:", e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fall Risk Assessment — Pre-Operative</h1>
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
              onClick={onSave}
              disabled={loading || saving}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-300"
            >
              {saving ? "Saving…" : "Save"}
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
            <div className="text-center mb-6">
              <div className="text-sm text-gray-600">Dallas Joint &amp; Spine Center</div>
              <h2 className="text-xl font-extrabold text-gray-900 mt-2 uppercase">
                Fall Risk Assessment — Pre-Operative
              </h2>
              <div className="text-xs text-gray-500 mt-1">
                Pre-Procedure Assessment (RN pre-op phone call or DOS)
              </div>
            </div>

            {/* Pre-admission total */}
            <section className="border border-gray-300 rounded-md p-4 mb-5">
              <h3 className="font-bold text-gray-900">Pre-Admission Assessment Total Points (from Pre-Op Testing)</h3>
              <input
                value={data.pre_admission_total_points || ""}
                onChange={(e) => setField("pre_admission_total_points", e.target.value)}
                className="mt-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Enter PAT total points (from Pre-Op Testing)"
              />
            </section>

            {/* Tubes & Cords */}
            <section className="border border-gray-300 rounded-md p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">Tubes &amp; Cords (multi-select)</h3>
                <div className="text-sm font-semibold text-gray-800">Points: {tubesPoints}</div>
              </div>

              <div className="mt-2">
                <CheckboxRow
                  label="IVs (1 point)"
                  checked={data.tubes_ivs}
                  onChange={(v) => setField("tubes_ivs", v)}
                />
                <CheckboxRow
                  label="O2 (1 point)"
                  checked={data.tubes_o2}
                  onChange={(v) => setField("tubes_o2", v)}
                />
                <CheckboxRow
                  label="SCDs (1 point)"
                  checked={data.tubes_scds}
                  onChange={(v) => setField("tubes_scds", v)}
                />
              </div>
            </section>

            {/* Blocks / Sedation */}
            <section className="border border-gray-300 rounded-md p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">Blocks / Sedation</h3>
                <div className="text-sm font-semibold text-gray-800">Points: {blocksPoints}</div>
              </div>

              <div className="mt-2">
                <CheckboxRow
                  label="Pre-Procedure Sedation (5 points)"
                  checked={data.blocks_preprocedure_sedation}
                  onChange={(v) => setField("blocks_preprocedure_sedation", v)}
                />
                <CheckboxRow
                  label="Regional Block (5 points)"
                  checked={data.blocks_regional_block}
                  onChange={(v) => setField("blocks_regional_block", v)}
                />
              </div>
            </section>

            {/* Type of Procedure */}
            <section className="border border-gray-300 rounded-md p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">Type of Procedure (single-select)</h3>
                <div className="text-sm font-semibold text-gray-800">Points: {procedurePoints}</div>
              </div>

              <RadioRow
                name="procedure_type"
                value={data.procedure_type}
                onChange={(v) => setField("procedure_type", v)}
                options={[
                  { value: "lower_ext_not_total_joint", label: "Lower Extremity NOT Total Joint (20 points)" },
                  { value: "pain", label: "Pain (15 points)" },
                  { value: "total_knee_hip", label: "Total Knee or Hip Joint Replacement (10 points)" },
                  { value: "colonoscopy", label: "Colonoscopy (5 points)" },
                ]}
              />
            </section>

            {/* Cognitive */}
            <section className="border border-gray-300 rounded-md p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">Cognitive or behavioral issues (multi-select)</h3>
                <div className="text-sm font-semibold text-gray-800">Points: {cognitivePoints}</div>
              </div>

              <div className="mt-2">
                <CheckboxRow
                  label="Agitated (2 points)"
                  checked={data.cognitive_agitated}
                  onChange={(v) => setField("cognitive_agitated", v)}
                />
                <CheckboxRow
                  label="Impulse control (5 points)"
                  checked={data.cognitive_impulse_control}
                  onChange={(v) => setField("cognitive_impulse_control", v)}
                />
                <CheckboxRow
                  label="Noncompliance (5 points)"
                  checked={data.cognitive_noncompliance}
                  onChange={(v) => setField("cognitive_noncompliance", v)}
                />
                <CheckboxRow
                  label="Lack of Understanding limitations (5 points)"
                  checked={data.cognitive_lack_understanding}
                  onChange={(v) => setField("cognitive_lack_understanding", v)}
                />
              </div>
            </section>

            {/* Totals */}
            <section className="border border-gray-900 rounded-md p-4 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                  <div className="text-sm font-bold text-gray-900">Pre-procedure Assessment Point Total</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-2">{preProcedureTotal}</div>
                </div>

                <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                  <div className="text-sm font-bold text-gray-900">
                    Combined Total (PAT + Pre-procedure)
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-2">{combinedTotal}</div>
                </div>
              </div>

              <div className="text-xs text-gray-700 mt-4 leading-relaxed">
                <div className="font-semibold">
                  Implement High Risk Fall Precautions for any patient with a fall history in the last 6 months or an
                  assessment score of &gt; 20 points.
                </div>
                <div className="mt-2 font-semibold">
                  Wheelchair required for any patient using assistive devices or has visible difficulty with ambulation.
                </div>
              </div>
            </section>

            {/* Nurse */}
            <section className="border border-gray-300 rounded-md p-4">
              <h3 className="font-bold text-gray-900">Pre-procedure Nurse</h3>
              <input
                value={data.pre_procedure_nurse_name || ""}
                onChange={(e) => setField("pre_procedure_nurse_name", e.target.value)}
                className="mt-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Pre-procedure Nurse name"
              />
            </section>

            <div className="print:hidden text-xs text-gray-500 pt-4">
              Tip: Use “Print / PDF” to confirm it matches the paper layout.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
