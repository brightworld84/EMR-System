import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const emptyRow = () => ({ time: "", bp: "", hr: "", rr: "", spo2: "", temp: "", etco2: "", note: "" });
const emptyABX = () => ({ medication: "", dose: "", route: "", time: "" });
const emptyPremed = () => ({ medication: "", dose: "", route: "", time: "" });

export default function AnesthesiaRecord() {
  const { checkinId } = useParams();

  // NOTE:
  // This component’s UI state is FLAT (allergies, pmh, etc).
  // Backend model is JSONField buckets (header/history/ros/...).
  // So we must PACK on save and UNPACK on load.

  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ===== UI STATE (kept as-is from your current file) =====
  const [data, setData] = useState({
    // header-ish
    allergies: "",
    npo_since: "",
    procedure: "",
    surgeon: "",
    anesthesia_type: "",
    asa: "",
    diagnosis: "",
    age: "",
    height: "",
    weight: "",
    mallampati: "",
    dentition: "",
    airway_notes: "",
    interpreter: "",
    language: "",

    // Hx
    pmh: "",
    psh: "",
    social: "",
    meds_home: "",
    last_intake: "",
    pregnancy_test: "",
    hx_anesthesia: "",
    hx_complications: "",

    // ROS-ish
    review: "",

    // Meds/Orders-ish
    preop_antibiotics: "",
    induction_agents: "",
    maintenance: "",
    fluids: "",
    blood_products: "",
    local_anesthetic: "",

    // PE-ish
    preop_bp: "",
    preop_p: "",
    preop_rr: "",
    preop_spo2: "",
    preop_temp: "",
    lungs: "",
    heart: "",
    neuro: "",
    other_exam: "",

    // Plan-ish
    plan: "",
    risks_discussed: "",
    consent_signed: "",

    // Regional section used by UI
    regional: {
      performed: false,
      type: "",
      site: "",
      laterality: "",
      technique: "",
      local: "",
      volume: "",
      catheter: false,
      notes: "",
    },

    // chart table used by UI
    chart_rows: Array.from({ length: 16 }, emptyRow),

    // antibiotics table used by UI
    antibiotics_rows: [emptyABX()],

    // premed table used by UI
    premed_rows: [emptyPremed()],

    // Notes/signature
    anesthesia_notes: "",
    signature_data_url: "",
  });

  // =========================================================
  // PACK/UNPACK helpers to match backend schema
  // =========================================================

  const packToApi = (ui) => {
    // Only send fields that exist on the Django model.
    return {
      checkin: Number(checkinId),

      header: {
        allergies: ui.allergies,
        npo_since: ui.npo_since,
        procedure: ui.procedure,
        surgeon: ui.surgeon,
        anesthesia_type: ui.anesthesia_type,
        asa: ui.asa,
        diagnosis: ui.diagnosis,
        age: ui.age,
        height: ui.height,
        weight: ui.weight,
        interpreter: ui.interpreter,
        language: ui.language,
      },

      history: {
        pmh: ui.pmh,
        psh: ui.psh,
        social: ui.social,
        meds_home: ui.meds_home,
        last_intake: ui.last_intake,
        pregnancy_test: ui.pregnancy_test,
        hx_anesthesia: ui.hx_anesthesia,
        hx_complications: ui.hx_complications,
      },

      ros: {
        review: ui.review,
      },

      meds: {
        preop_antibiotics: ui.preop_antibiotics,
        induction_agents: ui.induction_agents,
        maintenance: ui.maintenance,
        fluids: ui.fluids,
        blood_products: ui.blood_products,
        local_anesthetic: ui.local_anesthetic,

        // store the UI tables inside meds as well (kept for your convenience)
        antibiotics_rows: ui.antibiotics_rows,
        premed_rows: ui.premed_rows,
      },

      pe: {
        preop_bp: ui.preop_bp,
        preop_p: ui.preop_p,
        preop_rr: ui.preop_rr,
        preop_spo2: ui.preop_spo2,
        preop_temp: ui.preop_temp,
        lungs: ui.lungs,
        heart: ui.heart,
        neuro: ui.neuro,
        other_exam: ui.other_exam,
      },

      airway: {
        mallampati: ui.mallampati,
        dentition: ui.dentition,
        airway_notes: ui.airway_notes,
      },

      plan: {
        plan: ui.plan,
        risks_discussed: ui.risks_discussed,
        consent_signed: ui.consent_signed,
      },

      time_series: ui.chart_rows,

      regional_anesthesia: ui.regional,

      notes: {
        anesthesia_notes: ui.anesthesia_notes,
      },
    };
  };

  const unpackFromApi = (rec) => {
    // rec is the backend serializer response.
    // Pull from JSON buckets into the flat UI state keys your component uses.
    const header = rec.header || {};
    const history = rec.history || {};
    const ros = rec.ros || {};
    const meds = rec.meds || {};
    const pe = rec.pe || {};
    const airway = rec.airway || {};
    const plan = rec.plan || {};
    const notes = rec.notes || {};

    return {
      allergies: header.allergies ?? "",
      npo_since: header.npo_since ?? "",
      procedure: header.procedure ?? "",
      surgeon: header.surgeon ?? "",
      anesthesia_type: header.anesthesia_type ?? "",
      asa: header.asa ?? "",
      diagnosis: header.diagnosis ?? "",
      age: header.age ?? "",
      height: header.height ?? "",
      weight: header.weight ?? "",
      interpreter: header.interpreter ?? "",
      language: header.language ?? "",

      pmh: history.pmh ?? "",
      psh: history.psh ?? "",
      social: history.social ?? "",
      meds_home: history.meds_home ?? "",
      last_intake: history.last_intake ?? "",
      pregnancy_test: history.pregnancy_test ?? "",
      hx_anesthesia: history.hx_anesthesia ?? "",
      hx_complications: history.hx_complications ?? "",

      review: ros.review ?? "",

      preop_antibiotics: meds.preop_antibiotics ?? "",
      induction_agents: meds.induction_agents ?? "",
      maintenance: meds.maintenance ?? "",
      fluids: meds.fluids ?? "",
      blood_products: meds.blood_products ?? "",
      local_anesthetic: meds.local_anesthetic ?? "",

      preop_bp: pe.preop_bp ?? "",
      preop_p: pe.preop_p ?? "",
      preop_rr: pe.preop_rr ?? "",
      preop_spo2: pe.preop_spo2 ?? "",
      preop_temp: pe.preop_temp ?? "",
      lungs: pe.lungs ?? "",
      heart: pe.heart ?? "",
      neuro: pe.neuro ?? "",
      other_exam: pe.other_exam ?? "",

      mallampati: airway.mallampati ?? "",
      dentition: airway.dentition ?? "",
      airway_notes: airway.airway_notes ?? "",

      plan: plan.plan ?? "",
      risks_discussed: plan.risks_discussed ?? "",
      consent_signed: plan.consent_signed ?? "",

      regional: rec.regional_anesthesia || {
        performed: false,
        type: "",
        site: "",
        laterality: "",
        technique: "",
        local: "",
        volume: "",
        catheter: false,
        notes: "",
      },

      chart_rows: Array.isArray(rec.time_series) && rec.time_series.length
        ? rec.time_series
        : Array.from({ length: 16 }, emptyRow),

      // tables stored inside meds bucket
      antibiotics_rows: Array.isArray(meds.antibiotics_rows) && meds.antibiotics_rows.length ? meds.antibiotics_rows : [emptyABX()],
      premed_rows: Array.isArray(meds.premed_rows) && meds.premed_rows.length ? meds.premed_rows : [emptyPremed()],

      anesthesia_notes: notes.anesthesia_notes ?? "",

      signature_data_url: rec.signature_data_url ?? "",
    };
  };

  // =========================================================
  // Load-or-create by checkin
  // =========================================================
  const loadOrCreate = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await api.get(`/anesthesia-record/?checkin=${checkinId}`);
      const list = res.data || [];
      if (list.length > 0) {
        const rec = list[0];
        setRecordId(rec.id);
        setData((prev) => ({ ...prev, ...unpackFromApi(rec) }));
      } else {
        // Create minimal record
        const payload = {
          checkin: Number(checkinId),
          header: {},
          history: {},
          ros: {},
          meds: {},
          pe: {},
          airway: {},
          plan: {},
          time_series: [],
          regional_anesthesia: {},
          notes: {},
        };
        const created = await api.post(`/anesthesia-record/`, payload);
        setRecordId(created.data.id);
        setData((prev) => ({ ...prev, ...unpackFromApi(created.data) }));
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load Anesthesia Record.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  // =========================================================
  // Save draft (PATCH)
  // =========================================================
  const saveDraft = async () => {
    if (!recordId) return;
    setSaving(true);
    setError("");

    try {
      const payload = packToApi(data);
      const res = await api.patch(`/anesthesia-record/${recordId}/`, payload);
      // re-sync from server response (source of truth)
      setData((prev) => ({ ...prev, ...unpackFromApi(res.data) }));
    } catch (e) {
      console.error(e);
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // Sign
  // =========================================================
  const signRecord = async () => {
    if (!recordId) return;

    try {
      const sig = (data.signature_data_url || "").trim();
      if (!sig.startsWith("data:image")) {
        setError("Signature is required to sign.");
        return;
      }

      const res = await api.post(`/anesthesia-record/${recordId}/sign/`, {
        signature_data_url: sig,
      });

      setData((prev) => ({ ...prev, ...unpackFromApi(res.data) }));
    } catch (e) {
      console.error(e);
      setError("Unable to sign this record.");
    }
  };

  // =========================================================
  // UI handlers (unchanged structure)
  // =========================================================

  const setField = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  const setRegional = (key, value) =>
    setData((prev) => ({ ...prev, regional: { ...prev.regional, [key]: value } }));

  const updateChartRow = (idx, key, value) => {
    setData((prev) => {
      const rows = [...prev.chart_rows];
      rows[idx] = { ...(rows[idx] || emptyRow()), [key]: value };
      return { ...prev, chart_rows: rows };
    });
  };

  const updateAntibioticsRow = (idx, key, value) => {
    setData((prev) => {
      const rows = [...prev.antibiotics_rows];
      rows[idx] = { ...(rows[idx] || emptyABX()), [key]: value };
      return { ...prev, antibiotics_rows: rows };
    });
  };

  const addAntibioticsRow = () =>
    setData((prev) => ({ ...prev, antibiotics_rows: [...prev.antibiotics_rows, emptyABX()] }));

  const updatePremedRow = (idx, key, value) => {
    setData((prev) => {
      const rows = [...prev.premed_rows];
      rows[idx] = { ...(rows[idx] || emptyPremed()), [key]: value };
      return { ...prev, premed_rows: rows };
    });
  };

  const addPremedRow = () =>
    setData((prev) => ({ ...prev, premed_rows: [...prev.premed_rows, emptyPremed()] }));

  // =========================================================
  // Render (keep your existing JSX below)
  // =========================================================

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Anesthesia Record</h1>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={saveDraft}
            disabled={saving || !recordId}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white"
            onClick={signRecord}
            disabled={!recordId}
          >
            Sign
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>
      ) : null}

      {/* ====== KEEP YOUR EXISTING FORM UI BELOW THIS LINE ======
          The important change is: all fields now persist via packToApi/unpackFromApi.
      */}

      {/* Example minimal fields (keep/replace with your full UI) */}
      <section className="p-4 rounded border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium">Allergies</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={data.allergies}
              onChange={(e) => setField("allergies", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Procedure</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={data.procedure}
              onChange={(e) => setField("procedure", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Surgeon</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={data.surgeon}
              onChange={(e) => setField("surgeon", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Anesthesia Notes</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={data.anesthesia_notes}
            onChange={(e) => setField("anesthesia_notes", e.target.value)}
          />
        </div>
      </section>

      {/* You will keep your full chart/antibiotics/premed/regional UI as you had it. */}
    </main>
  );
}
