import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function FallRiskAssessmentPreOpTesting() {
  const { checkinId } = useParams();

  // IMPORTANT: no leading slash, because api.js baseURL already ends with /api
  const ENDPOINT = "fall-risk-assessment-preop-testing";

  const defaults = useMemo(
    () => ({
      age_band: "", // '60_69' | '70_79' | '80_plus'
      gender: "", // 'male' | 'female'
      fall_within_6_months: false,
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
    fallHistoryPoints(data.fall_within_6_months) +
    medsPoints(data.high_risk_meds_count) +
    comorbidPoints(data.comorbid_count) +
    mobilityPoints() +
    homeO2Points(data.home_oxygen);

  // --- load existing record (if any) ---
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!checkinId) return;

      setError("");
      setLoading(true);

      try {
        const res = await api.get(`${ENDPOINT}/`, { params: { checkin: checkinId } });

        // DRF might return an array OR {results: []}
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.results) ? res.data.results : [];
        const first = list.length ? list[0] : null;

        if (!mounted) return;

        if (first?.id) {
          setRecordId(first.id);
          setData((prev) => ({
            ...prev,
            ...first,
          }));
        } else {
          setRecordId(null);
          setData(defaults);
        }
      } catch (e) {
        console.error("FallRiskAssessmentPreOpTesting load failed:", e);
        if (!mounted) return;
        setError("Failed to load this form from the server.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [checkinId, ENDPOINT, defaults]);

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
    } catch (e) {
      console.error("FallRiskAssessmentPreOpTesting save failed:", e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Fall Risk Assessment — Pre-Op Testing</h2>

      {loading ? <p>Loading…</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Age (single-select)</h3>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Gender</h3>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Fall History</h3>
        <Checkbox
          checked={!!data.fall_within_6_months}
          onChange={(v) => setField("fall_within_6_months", v)}
          label="One fall within past 6 months — accidental trips/falls/balance issues (20 points)"
        />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Medication in last 24 hours (high fall risk meds)</h3>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Current co-morbid conditions</h3>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Mobility (multi-select)</h3>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Home Oxygen</h3>
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Pre-Assessment Point Total</h3>
        <p style={styles.totalBox}>{computedTotal} points</p>
        <p style={styles.note}>
          Implement High Risk Fall Precautions for any patient with a fall history in the last 6 months or an assessment
          score of &gt; 20 points.
        </p>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Pre-admission Nurse</h3>
        <input
          style={styles.input}
          value={data.pre_admission_nurse_name || ""}
          onChange={(e) => setField("pre_admission_nurse_name", e.target.value)}
          placeholder="Pre-admission Nurse name"
        />
      </div>

      <div style={styles.actions}>
        <button style={styles.saveBtn} onClick={onSave} disabled={saving || loading}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={styles.row}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={styles.label}>{label}</span>
    </label>
  );
}

function RadioRow({ name, value, onChange, options }) {
  return (
    <div style={{ marginTop: 6 }}>
      {options.map((opt) => (
        <label key={opt.value} style={styles.row}>
          <input type="radio" name={name} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          <span style={styles.label}>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

const styles = {
  page: { padding: 20, maxWidth: 900, margin: "0 auto" },
  title: { marginBottom: 12 },
  section: { border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 12 },
  sectionTitle: { margin: 0, marginBottom: 8, fontSize: 16 },
  row: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  label: { lineHeight: "20px" },
  input: { width: "100%", padding: 10, borderRadius: 6, border: "1px solid #bbb" },
  actions: { display: "flex", justifyContent: "flex-end", marginTop: 10 },
  saveBtn: { padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer" },
  error: { color: "crimson" },
  totalBox: {
    display: "inline-block",
    padding: "10px 14px",
    border: "1px solid #bbb",
    borderRadius: 8,
    fontWeight: 700,
    margin: 0,
  },
  note: { marginTop: 10, marginBottom: 0, color: "#444" },
};
