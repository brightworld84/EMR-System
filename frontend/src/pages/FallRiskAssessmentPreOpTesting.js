import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function FallRiskAssessmentPreOpTesting() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  // IMPORTANT: no leading slash, because api.js baseURL already ends with /api
  const ENDPOINT = "fall-risk-assessment-preop-testing";

  const defaults = useMemo(
    () => ({
      age_band: "", // '60_69' | '70_79' | '80_plus'
      gender: "", // 'male' | 'female'
      fall_within_3mo: false,
      high_risk_meds_count: "", // '1' | '2' | '3_plus'
      comorbid_count: "", // '1' | '2' | '3_plus'
      mobility_requires_assistance: false,
      mobility_unsteady_gait: false,
      mobility_visual_impairment: false,
      mobility_auditory_impairment: false,
      home_oxygen: "", // 'yes' | 'no'
      pre_admission_total_points: "",
      pre_admission_nurse_name: "",
    }),
    []
  );

  const [recordId, setRecordId] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  // --- scoring helpers ---
  const agePoints = (band) => {
    if (band === "60_69") return 1;
    if (band === "70_79") return 2;
    if (band === "80_plus") return 3;
    return 0;
  };

  const genderPoints = (g) => {
    if (g === "male") return 2;
    if (g === "female") return 1;
    return 0;
  };

  const fallHistoryPoints = (v) => (v ? 20 : 0);

  const medsPoints = (count) => {
    if (count === "1") return 1;
    if (count === "2") return 3;
    if (count === "3_plus") return 5;
    return 0;
  };

  const comorbidPoints = (count) => {
    if (count === "1") return 5;
    if (count === "2") return 10;
    if (count === "3_plus") return 15;
    return 0;
  };

  const mobilityPoints = () => {
    let pts = 0;
    if (data.mobility_requires_assistance) pts += 10;
    if (data.mobility_unsteady_gait) pts += 10;
    if (data.mobility_visual_impairment) pts += 5;
    if (data.mobility_auditory_impairment) pts += 2;
    return pts;
  };

  const homeO2Points = (v) => (v === "yes" ? 1 : 0);

  const computedTotal =
    agePoints(data.age_band) +
    genderPoints(data.gender) +
    fallHistoryPoints(data.fall_within_3mo) +
    medsPoints(data.high_risk_meds_count) +
    comorbidPoints(data.comorbid_count) +
    mobilityPoints() +
    homeO2Points(data.home_oxygen);

  // --- load existing record (if any) ---
  const loadOrCreate = async () => {
    if (!checkinId) return;

    setError("");
    setLoading(true);

    try {
      const res = await api.get(`${ENDPOINT}/`, { params: { checkin: checkinId } });

      // DRF might return an array OR {results: []}
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.results) ? res.data.results : [];

      if (list.length > 0) {
        const first = list[0];
        setRecordId(first.id);
        setData((prev) => ({
          ...prev,
          ...first,
        }));
      } else {
        // Prevent duplicate POST in React strict mode
        if (recordId) return;

        const created = await api.post(`${ENDPOINT}/`, { checkin: Number(checkinId) });
        setRecordId(created.data.id);
        setData((prev) => ({
          ...prev,
          ...created.data,
        }));
      }
    } catch (e) {
      console.error("FallRiskAssessmentPreOpTesting load failed:", e);
      setError("Failed to load this form from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const onSave = async () => {
    if (!checkinId) return;

    setError("");
    setSaving(true);

    try {
      const payload = {
        ...data,
        checkin: Number(checkinId),
        pre_admission_total_points: String(computedTotal),
      };

      if (recordId) {
        await api.patch(`${ENDPOINT}/${recordId}/`, payload);
      } else {
        const created = await api.post(`${ENDPOINT}/`, payload);
        if (created?.data?.id) setRecordId(created.data.id);
      }
      alert('Saved.');
    } catch (e) {
      console.error("FallRiskAssessmentPreOpTesting save failed:", e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fall Risk Assessment — Pre-Op Testing</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId}</p>
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
              onClick={onSave}
              disabled={loading || saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-300"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-6">
            {error ? <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</p> : null}

            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Age (single-select)</h3>
                <RadioRow
                  name="age_band"
                  value={data.age_band}
                  onChange={(v) => setField("age_band", v)}
                  options={[
                    { value: "60_69", label: "60–69 (1 point)" },
                    { value: "70_79", label: "70–79 (2 points)" },
                    { value: "80_plus", label: "≥ 80 (3 points)" },
                  ]}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Gender</h3>
                <RadioRow
                  name="gender"
                  value={data.gender}
                  onChange={(v) => setField("gender", v)}
                  options={[
                    { value: "male", label: "Male (2 points)" },
                    { value: "female", label: "Female (1 point)" },
                  ]}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Fall History</h3>
                <Checkbox
                  checked={!!data.fall_within_3mo}
                  onChange={(v) => setField("fall_within_3mo", v)}
                  label="One fall within past 3 months — accidental trips/falls/balance issues (20 points)"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Medication in last 24 hours (high fall risk meds)</h3>
                <RadioRow
                  name="high_risk_meds_count"
                  value={data.high_risk_meds_count}
                  onChange={(v) => setField("high_risk_meds_count", v)}
                  options={[
                    { value: "1", label: "On 1 high fall risk medication (1 point)" },
                    { value: "2", label: "On 2 high fall risk medications (3 points)" },
                    { value: "3_plus", label: "On 3 or more high fall risk medications (5 points)" },
                  ]}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Current co-morbid conditions</h3>
                <RadioRow
                  name="comorbid_count"
                  value={data.comorbid_count}
                  onChange={(v) => setField("comorbid_count", v)}
                  options={[
                    { value: "1", label: "1 co-morbid condition (5 points)" },
                    { value: "2", label: "2 co-morbid conditions (10 points)" },
                    { value: "3_plus", label: "3 or more co-morbid conditions (15 points)" },
                  ]}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mobility (multi-select)</h3>
                <div className="space-y-2">
                  <Checkbox
                    checked={!!data.mobility_requires_assistance}
                    onChange={(v) => setField("mobility_requires_assistance", v)}
                    label="Requires assistance/supervision for mobility, transfer, or ambulation (10 points)"
                  />
                  <Checkbox
                    checked={!!data.mobility_unsteady_gait}
                    onChange={(v) => setField("mobility_unsteady_gait", v)}
                    label="Unsteady gait (10 points)"
                  />
                  <Checkbox
                    checked={!!data.mobility_visual_impairment}
                    onChange={(v) => setField("mobility_visual_impairment", v)}
                    label="Visual impairment affecting mobility (5 points)"
                  />
                  <Checkbox
                    checked={!!data.mobility_auditory_impairment}
                    onChange={(v) => setField("mobility_auditory_impairment", v)}
                    label="Auditory impairment affecting mobility (2 points)"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Home Oxygen</h3>
                <RadioRow
                  name="home_oxygen"
                  value={data.home_oxygen}
                  onChange={(v) => setField("home_oxygen", v)}
                  options={[
                    { value: "yes", label: "Yes (1 point)" },
                    { value: "no", label: "No (0 points)" },
                  ]}
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pre-Assessment Point Total</h3>
                <div className="inline-block px-6 py-3 bg-blue-50 border-2 border-blue-600 rounded-lg">
                  <span className="text-2xl font-bold text-blue-900">{computedTotal} points</span>
                </div>
                <p className="mt-4 text-sm text-gray-700">
                  <strong>Note:</strong> Implement High Risk Fall Precautions for any patient with a fall history in the last 3 months or an assessment score of &gt; 20 points.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pre-admission Nurse</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={data.pre_admission_nurse_name || ""}
                  onChange={(e) => setField("pre_admission_nurse_name", e.target.value)}
                  placeholder="Pre-admission Nurse name"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioRow({ name, value, onChange, options }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-center gap-2 text-sm text-gray-700 mr-6">
          <input 
            type="radio" 
            name={name} 
            checked={value === opt.value} 
            onChange={() => onChange(opt.value)} 
            className="h-4 w-4"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
