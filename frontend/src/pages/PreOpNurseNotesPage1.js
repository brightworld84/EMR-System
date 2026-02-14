import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function PreOpNurseNotesPage1() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const defaults = useMemo(
    () => ({
      checkin: Number(checkinId),

      // Header
      preop_time: "",
      med_surg_history_reviewed: false,

      // Vitals
      vitals_temp: "",
      vitals_pulse: "",
      vitals_resp: "",
      vitals_bp: "",
      vitals_o2sat: "",
      on_room_air: false,

      // Height/Weight
      height: "",
      weight_lbs: "",
      weight_kgs: "",
      weight_type: "", // "actual" | "stated"
      bmi: "",

      // Allergies
      nka: false,
      allergies_reactions: "",

      // Admission Assessment (Left)
      resp_lung_sounds_clear: false,
      resp_lung_sounds_other: "",
      resp_depth_even: false,
      resp_depth_unlabored: false,
      resp_depth_labored: false,
      resp_depth_dyspnea: false,
      oxygen_room_air: false,
      oxygen_other: "",

      cv_rhythm_regular: false,
      cv_rhythm_irregular: false,

      cap_refill_not_indicated: false,
      cap_refill_quick_lt3: false,
      cap_refill_slow_gt3: false,
      cap_refill_right: false,
      cap_refill_left: false,
      cap_refill_upper: false,
      cap_refill_lower: false,

      // Peripheral pulses (P=Palpable, D=Doppler, A=Absent)
      pulses_radial_right: "", // "P" | "D" | "A" | "N/A"
      pulses_radial_left: "",
      pulses_radial_strength: "",
      pulses_radial_marked: false,

      pulses_dp_right: "",
      pulses_dp_left: "",
      pulses_dp_strength: "",
      pulses_dp_marked: false,

      pulses_pt_right: "",
      pulses_pt_left: "",
      pulses_pt_strength: "",
      pulses_pt_marked: false,

      // Neuro
      neuro_alert: false,
      neuro_speech_clear: false,
      neuro_orientation_oriented: false,
      neuro_orientation_disoriented: false,
      sensory_none: false,
      sensory_visual: false,
      sensory_hearing: false,
      sensory_language: false,

      // GI
      gi_not_indicated: false,
      gi_reports_no_problems: false,
      gi_unexplained_weight_loss: false,
      gi_nausea_vomiting: false,
      gi_reflux: false,
      gi_dysphagia: false,
      gi_diarrhea: false,
      gi_constipation: false,
      gi_rectal_bleeding: false,
      gi_other: "",
      abdomen_soft_nontender: false,
      abdomen_hard_tender: false,
      abdomen_pain: false,

      // GU
      gu_not_indicated: false,
      gu_reports_no_problems: false,
      gu_burning: false,
      gu_difficulty_urinating: false,
      gu_urinary_catheter: false,

      // Integumentary
      integ_warm_dry: false,
      integ_cool: false,
      integ_diaphoretic: false,
      integ_color_normal: false,
      integ_color_flushed: false,
      integ_color_pale: false,
      integ_other: "",
      integ_intact: false,
      integ_lesion: false,
      integ_rash: false,
      integ_bruise: false,
      integ_location: "",

      // Musculoskeletal
      msk_no_limitations: false,
      msk_limited_rom_right: false,
      msk_limited_rom_left: false,
      msk_limited_rom_upper: false,
      msk_limited_rom_lower: false,
      msk_limited_sensation_right: false,
      msk_limited_sensation_left: false,
      msk_limited_sensation_upper: false,
      msk_limited_sensation_lower: false,
      msk_assist_cane: false,
      msk_assist_walker: false,
      msk_assist_wheelchair: false,
      msk_assist_sling: false,
      msk_assist_splint: false,
      msk_assist_walking_boot: false,

      // Psychosocial
      psych_calm_relaxed: false,
      psych_anxious_restless: false,
      psych_agitated_angry: false,
      psych_confused: false,
      psych_power_of_attorney: false,

      religious_cultural_none: false,

      abuse_neglect_suspected: "", // "yes" | "no" | ""
      abuse_neglect_describe: "",
      physician_notified: false,
      supervisor_notified: false,

      // Admission Assessment (Right) - Pain
      pain_none: false,
      pain_chronic: false,
      pain_acute: false,
      pain_scale_explained: false,
      pain_current_level: "",
      pain_location: "",
      pain_duration_constant: false,
      pain_duration_intermittent: false,
      pain_duration_with_movement: false,
      pain_quality_aching: false,
      pain_quality_stabbing: false,
      pain_quality_tingling: false,
      pain_quality_burning: false,
      pain_quality_throbbing: false,
      pain_quality_tight_pressure: false,
      pain_quality_shooting: false,
      pain_quality_dull: false,
      pain_quality_sharp: false,
      pain_quality_numbness: false,
      pain_quality_other: "",

      // Surgical Site Prep
      hibiclens_yes: false,
      hibiclens_no: false,
      hibiclens_na: false,
      site_clipped_yes: false,
      site_clipped_prior_to_arrival: false,
      site_clipped_na: false,
      chg_wipe_yes: false,
      chg_wipe_na: false,

      // IV
      iv_site_right: false,
      iv_site_left: false,
      iv_gauge: "",
      iv_fluid_lr: false,
      iv_fluid_ns: false,
      iv_fluid_other: "",
      iv_rate_75: false,
      iv_rate_25: false,
      iv_rate_other: "",
      iv_attempts: "",
      iv_lidocaine_intradermal: false,
      iv_started_by: "",

      // Caregiver
      caregiver_name: "",
      caregiver_relationship: "",
      caregiver_phone: "",
      caregiver_may_hear_all_info: false,
      caregiver_may_hear_dc_only: false,
      caregiver_confirms_transport_24h: false,

      // optional lock
      is_signed: false,
    }),
    [checkinId]
  );

  const [recordId, setRecordId] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isLocked = !!data?.is_signed;

  const setField = (key, value) => setData((p) => ({ ...p, [key]: value }));

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/preoperative-nurses-notes/?checkin=${checkinId}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const first = list.length ? list[0] : null;

      if (first?.id) {
        setRecordId(first.id);
        setData((p) => ({ ...p, ...first }));
      } else {
        setRecordId(null);
        setData(defaults);
      }
    } catch (e) {
      console.error("PreOpNurseNotesPage1 load failed:", e);
      setError("Failed to load this form.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const save = async () => {
    if (isLocked) return;
    setSaving(true);
    setError("");
    try {
      const payload = { ...data, checkin: Number(checkinId) };

      if (recordId) {
        const res = await api.patch(`/preoperative-nurses-notes/${recordId}/`, payload);
        setData((p) => ({ ...p, ...res.data }));
      } else {
        const res = await api.post(`/preoperative-nurses-notes/`, payload);
        setRecordId(res.data?.id || null);
        setData((p) => ({ ...p, ...res.data }));
      }
    } catch (e) {
      console.error("PreOpNurseNotesPage1 save failed:", e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preoperative Nurse’s Notes — Page 1</h1>
            <p className="text-sm text-gray-600">Check-in #{checkinId}</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => navigate(-1)} className="px-3 py-2 text-gray-700 hover:text-gray-900 font-medium">
              ← Back
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold"
            >
              Print / PDF
            </button>

            <button
              onClick={save}
              disabled={loading || saving || isLocked}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold disabled:bg-gray-300"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 print:hidden">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0 space-y-6">
            {isLocked ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg print:hidden">
                This form is signed/locked.
              </div>
            ) : null}

            {/* TOP STRIP */}
            <section className="border border-gray-300 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextLine
                  label="Preop Time"
                  value={data.preop_time}
                  disabled={isLocked}
                  onChange={(v) => setField("preop_time", v)}
                />
                <div className="md:col-span-2">
                  <Checkbox
                    label="Patient’s Medical and Surgical History reviewed"
                    checked={!!data.med_surg_history_reviewed}
                    disabled={isLocked}
                    onChange={(v) => setField("med_surg_history_reviewed", v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="text-sm font-bold text-gray-900 mb-2">Preop Vital Signs</div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextLine label="Temp" value={data.vitals_temp} disabled={isLocked} onChange={(v) => setField("vitals_temp", v)} />
                    <TextLine label="Pulse" value={data.vitals_pulse} disabled={isLocked} onChange={(v) => setField("vitals_pulse", v)} />
                    <TextLine label="Resp" value={data.vitals_resp} disabled={isLocked} onChange={(v) => setField("vitals_resp", v)} />
                    <TextLine label="B/P" value={data.vitals_bp} disabled={isLocked} onChange={(v) => setField("vitals_bp", v)} />
                    <TextLine label="O2 Sat" value={data.vitals_o2sat} disabled={isLocked} onChange={(v) => setField("vitals_o2sat", v)} />
                    <div className="flex items-end">
                      <Checkbox
                        label="On room air"
                        checked={!!data.on_room_air}
                        disabled={isLocked}
                        onChange={(v) => setField("on_room_air", v)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-md p-3">
                  <div className="text-sm font-bold text-gray-900 mb-2">Height / Weight</div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextLine label="Height" value={data.height} disabled={isLocked} onChange={(v) => setField("height", v)} />
                    <TextLine label="BMI" value={data.bmi} disabled={isLocked} onChange={(v) => setField("bmi", v)} />
                    <TextLine label="Weight (lbs)" value={data.weight_lbs} disabled={isLocked} onChange={(v) => setField("weight_lbs", v)} />
                    <TextLine label="Weight (kgs)" value={data.weight_kgs} disabled={isLocked} onChange={(v) => setField("weight_kgs", v)} />
                  </div>

                  <div className="mt-3 flex gap-4">
                    <Checkbox
                      label="Actual"
                      checked={data.weight_type === "actual"}
                      disabled={isLocked}
                      onChange={(v) => setField("weight_type", v ? "actual" : data.weight_type)}
                    />
                    <Checkbox
                      label="Stated"
                      checked={data.weight_type === "stated"}
                      disabled={isLocked}
                      onChange={(v) => setField("weight_type", v ? "stated" : data.weight_type)}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-bold text-gray-900">Allergies & Reactions</div>
                    <Checkbox
                      label="NKA"
                      checked={!!data.nka}
                      disabled={isLocked}
                      onChange={(v) => setField("nka", v)}
                    />
                  </div>
                  <textarea
                    value={data.allergies_reactions || ""}
                    disabled={isLocked}
                    onChange={(e) => setField("allergies_reactions", e.target.value)}
                    className="w-full min-h-[90px] border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
                    placeholder="List allergies and reactions…"
                  />
                </div>
              </div>
            </section>

            {/* ADMISSION ASSESSMENT GRID */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* LEFT PANEL */}
              <div className="border border-gray-300 rounded-md p-4 space-y-5">
                <h2 className="text-base font-extrabold text-gray-900">Admission Assessment</h2>

                <Block title="Respiratory">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Checkbox label="Lung Sounds: Clear" checked={!!data.resp_lung_sounds_clear} disabled={isLocked} onChange={(v) => setField("resp_lung_sounds_clear", v)} />
                    <TextLine label="Other" value={data.resp_lung_sounds_other} disabled={isLocked} onChange={(v) => setField("resp_lung_sounds_other", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Depth / Quality</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="Even" checked={!!data.resp_depth_even} disabled={isLocked} onChange={(v) => setField("resp_depth_even", v)} />
                      <Checkbox label="Unlabored" checked={!!data.resp_depth_unlabored} disabled={isLocked} onChange={(v) => setField("resp_depth_unlabored", v)} />
                      <Checkbox label="Labored" checked={!!data.resp_depth_labored} disabled={isLocked} onChange={(v) => setField("resp_depth_labored", v)} />
                      <Checkbox label="Dyspnea" checked={!!data.resp_depth_dyspnea} disabled={isLocked} onChange={(v) => setField("resp_depth_dyspnea", v)} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Checkbox label="Oxygen: Room Air" checked={!!data.oxygen_room_air} disabled={isLocked} onChange={(v) => setField("oxygen_room_air", v)} />
                    <TextLine label="Oxygen: Other" value={data.oxygen_other} disabled={isLocked} onChange={(v) => setField("oxygen_other", v)} />
                  </div>
                </Block>

                <Block title="Cardiovascular">
                  <div className="flex gap-4 flex-wrap">
                    <Checkbox label="Rhythm: Regular" checked={!!data.cv_rhythm_regular} disabled={isLocked} onChange={(v) => setField("cv_rhythm_regular", v)} />
                    <Checkbox label="Rhythm: Irregular" checked={!!data.cv_rhythm_irregular} disabled={isLocked} onChange={(v) => setField("cv_rhythm_irregular", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Capillary Refill</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="Not Indicated" checked={!!data.cap_refill_not_indicated} disabled={isLocked} onChange={(v) => setField("cap_refill_not_indicated", v)} />
                      <Checkbox label="Quick (&lt; 3 sec)" checked={!!data.cap_refill_quick_lt3} disabled={isLocked} onChange={(v) => setField("cap_refill_quick_lt3", v)} />
                      <Checkbox label="Slow (&gt; 3 sec)" checked={!!data.cap_refill_slow_gt3} disabled={isLocked} onChange={(v) => setField("cap_refill_slow_gt3", v)} />
                      <div />
                      <Checkbox label="Right" checked={!!data.cap_refill_right} disabled={isLocked} onChange={(v) => setField("cap_refill_right", v)} />
                      <Checkbox label="Left" checked={!!data.cap_refill_left} disabled={isLocked} onChange={(v) => setField("cap_refill_left", v)} />
                      <Checkbox label="Upper" checked={!!data.cap_refill_upper} disabled={isLocked} onChange={(v) => setField("cap_refill_upper", v)} />
                      <Checkbox label="Lower" checked={!!data.cap_refill_lower} disabled={isLocked} onChange={(v) => setField("cap_refill_lower", v)} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Peripheral Pulses</div>
                    <PulsesRow
                      title="Radial"
                      right={data.pulses_radial_right}
                      left={data.pulses_radial_left}
                      strength={data.pulses_radial_strength}
                      marked={!!data.pulses_radial_marked}
                      disabled={isLocked}
                      onChange={(patch) => setData((p) => ({ ...p, ...patch }))}
                      keys={{
                        right: "pulses_radial_right",
                        left: "pulses_radial_left",
                        strength: "pulses_radial_strength",
                        marked: "pulses_radial_marked",
                      }}
                    />
                    <PulsesRow
                      title="Dorsalis Pedis"
                      right={data.pulses_dp_right}
                      left={data.pulses_dp_left}
                      strength={data.pulses_dp_strength}
                      marked={!!data.pulses_dp_marked}
                      disabled={isLocked}
                      onChange={(patch) => setData((p) => ({ ...p, ...patch }))}
                      keys={{
                        right: "pulses_dp_right",
                        left: "pulses_dp_left",
                        strength: "pulses_dp_strength",
                        marked: "pulses_dp_marked",
                      }}
                    />
                    <PulsesRow
                      title="Posterior Tibial"
                      right={data.pulses_pt_right}
                      left={data.pulses_pt_left}
                      strength={data.pulses_pt_strength}
                      marked={!!data.pulses_pt_marked}
                      disabled={isLocked}
                      onChange={(patch) => setData((p) => ({ ...p, ...patch }))}
                      keys={{
                        right: "pulses_pt_right",
                        left: "pulses_pt_left",
                        strength: "pulses_pt_strength",
                        marked: "pulses_pt_marked",
                      }}
                    />

                    <div className="text-[11px] text-gray-600 mt-2">
                      Code: P = Palpable, D = Doppler, A = Absent
                    </div>
                  </div>
                </Block>

                <Block title="Neurological">
                  <div className="flex gap-4 flex-wrap">
                    <Checkbox label="LOC: Alert" checked={!!data.neuro_alert} disabled={isLocked} onChange={(v) => setField("neuro_alert", v)} />
                    <Checkbox label="Speech Clear" checked={!!data.neuro_speech_clear} disabled={isLocked} onChange={(v) => setField("neuro_speech_clear", v)} />
                  </div>

                  <div className="mt-3 flex gap-4 flex-wrap">
                    <Checkbox label="Orientation: Oriented" checked={!!data.neuro_orientation_oriented} disabled={isLocked} onChange={(v) => setField("neuro_orientation_oriented", v)} />
                    <Checkbox label="Orientation: Disoriented" checked={!!data.neuro_orientation_disoriented} disabled={isLocked} onChange={(v) => setField("neuro_orientation_disoriented", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Sensory Deficit</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="None" checked={!!data.sensory_none} disabled={isLocked} onChange={(v) => setField("sensory_none", v)} />
                      <Checkbox label="Visual" checked={!!data.sensory_visual} disabled={isLocked} onChange={(v) => setField("sensory_visual", v)} />
                      <Checkbox label="Hearing" checked={!!data.sensory_hearing} disabled={isLocked} onChange={(v) => setField("sensory_hearing", v)} />
                      <Checkbox label="Language" checked={!!data.sensory_language} disabled={isLocked} onChange={(v) => setField("sensory_language", v)} />
                    </div>
                  </div>
                </Block>

                <Block title="Gastrointestinal">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="Not Indicated" checked={!!data.gi_not_indicated} disabled={isLocked} onChange={(v) => setField("gi_not_indicated", v)} />
                    <Checkbox label="Reports No Problems" checked={!!data.gi_reports_no_problems} disabled={isLocked} onChange={(v) => setField("gi_reports_no_problems", v)} />
                    <Checkbox label="Unexplained Weight Loss" checked={!!data.gi_unexplained_weight_loss} disabled={isLocked} onChange={(v) => setField("gi_unexplained_weight_loss", v)} />
                    <Checkbox label="Nausea / Vomiting" checked={!!data.gi_nausea_vomiting} disabled={isLocked} onChange={(v) => setField("gi_nausea_vomiting", v)} />
                    <Checkbox label="Reflux" checked={!!data.gi_reflux} disabled={isLocked} onChange={(v) => setField("gi_reflux", v)} />
                    <Checkbox label="Dysphagia" checked={!!data.gi_dysphagia} disabled={isLocked} onChange={(v) => setField("gi_dysphagia", v)} />
                    <Checkbox label="Diarrhea" checked={!!data.gi_diarrhea} disabled={isLocked} onChange={(v) => setField("gi_diarrhea", v)} />
                    <Checkbox label="Constipation" checked={!!data.gi_constipation} disabled={isLocked} onChange={(v) => setField("gi_constipation", v)} />
                    <Checkbox label="Rectal Bleeding" checked={!!data.gi_rectal_bleeding} disabled={isLocked} onChange={(v) => setField("gi_rectal_bleeding", v)} />
                  </div>
                  <div className="mt-3">
                    <TextLine label="Other" value={data.gi_other} disabled={isLocked} onChange={(v) => setField("gi_other", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Abdomen</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="Soft / Non-tender" checked={!!data.abdomen_soft_nontender} disabled={isLocked} onChange={(v) => setField("abdomen_soft_nontender", v)} />
                      <Checkbox label="Hard / Tender" checked={!!data.abdomen_hard_tender} disabled={isLocked} onChange={(v) => setField("abdomen_hard_tender", v)} />
                      <Checkbox label="Pain" checked={!!data.abdomen_pain} disabled={isLocked} onChange={(v) => setField("abdomen_pain", v)} />
                    </div>
                  </div>
                </Block>

                <Block title="Genitourinary">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="Not Indicated" checked={!!data.gu_not_indicated} disabled={isLocked} onChange={(v) => setField("gu_not_indicated", v)} />
                    <Checkbox label="Reports No Problems" checked={!!data.gu_reports_no_problems} disabled={isLocked} onChange={(v) => setField("gu_reports_no_problems", v)} />
                    <Checkbox label="Burning" checked={!!data.gu_burning} disabled={isLocked} onChange={(v) => setField("gu_burning", v)} />
                    <Checkbox label="Difficulty Urinating" checked={!!data.gu_difficulty_urinating} disabled={isLocked} onChange={(v) => setField("gu_difficulty_urinating", v)} />
                    <Checkbox label="Urinary Catheter" checked={!!data.gu_urinary_catheter} disabled={isLocked} onChange={(v) => setField("gu_urinary_catheter", v)} />
                  </div>
                </Block>

                <Block title="Integumentary">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="Warm / Dry" checked={!!data.integ_warm_dry} disabled={isLocked} onChange={(v) => setField("integ_warm_dry", v)} />
                    <Checkbox label="Cool" checked={!!data.integ_cool} disabled={isLocked} onChange={(v) => setField("integ_cool", v)} />
                    <Checkbox label="Diaphoretic" checked={!!data.integ_diaphoretic} disabled={isLocked} onChange={(v) => setField("integ_diaphoretic", v)} />
                    <Checkbox label="Color: Normal" checked={!!data.integ_color_normal} disabled={isLocked} onChange={(v) => setField("integ_color_normal", v)} />
                    <Checkbox label="Color: Flushed" checked={!!data.integ_color_flushed} disabled={isLocked} onChange={(v) => setField("integ_color_flushed", v)} />
                    <Checkbox label="Color: Pale" checked={!!data.integ_color_pale} disabled={isLocked} onChange={(v) => setField("integ_color_pale", v)} />
                  </div>

                  <div className="mt-3">
                    <TextLine label="Other" value={data.integ_other} disabled={isLocked} onChange={(v) => setField("integ_other", v)} />
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="Intact" checked={!!data.integ_intact} disabled={isLocked} onChange={(v) => setField("integ_intact", v)} />
                    <Checkbox label="Lesion" checked={!!data.integ_lesion} disabled={isLocked} onChange={(v) => setField("integ_lesion", v)} />
                    <Checkbox label="Rash" checked={!!data.integ_rash} disabled={isLocked} onChange={(v) => setField("integ_rash", v)} />
                    <Checkbox label="Bruise" checked={!!data.integ_bruise} disabled={isLocked} onChange={(v) => setField("integ_bruise", v)} />
                  </div>

                  <div className="mt-3">
                    <TextLine label="Location" value={data.integ_location} disabled={isLocked} onChange={(v) => setField("integ_location", v)} />
                  </div>
                </Block>

                <Block title="Musculoskeletal">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="No limitations with ROM / Sensation" checked={!!data.msk_no_limitations} disabled={isLocked} onChange={(v) => setField("msk_no_limitations", v)} />
                    <Checkbox label="Limited ROM: Right" checked={!!data.msk_limited_rom_right} disabled={isLocked} onChange={(v) => setField("msk_limited_rom_right", v)} />
                    <Checkbox label="Limited ROM: Left" checked={!!data.msk_limited_rom_left} disabled={isLocked} onChange={(v) => setField("msk_limited_rom_left", v)} />
                    <Checkbox label="Limited ROM: Upper" checked={!!data.msk_limited_rom_upper} disabled={isLocked} onChange={(v) => setField("msk_limited_rom_upper", v)} />
                    <Checkbox label="Limited ROM: Lower" checked={!!data.msk_limited_rom_lower} disabled={isLocked} onChange={(v) => setField("msk_limited_rom_lower", v)} />
                    <Checkbox label="Limited Sensation: Right" checked={!!data.msk_limited_sensation_right} disabled={isLocked} onChange={(v) => setField("msk_limited_sensation_right", v)} />
                    <Checkbox label="Limited Sensation: Left" checked={!!data.msk_limited_sensation_left} disabled={isLocked} onChange={(v) => setField("msk_limited_sensation_left", v)} />
                    <Checkbox label="Limited Sensation: Upper" checked={!!data.msk_limited_sensation_upper} disabled={isLocked} onChange={(v) => setField("msk_limited_sensation_upper", v)} />
                    <Checkbox label="Limited Sensation: Lower" checked={!!data.msk_limited_sensation_lower} disabled={isLocked} onChange={(v) => setField("msk_limited_sensation_lower", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Use of</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="Cane" checked={!!data.msk_assist_cane} disabled={isLocked} onChange={(v) => setField("msk_assist_cane", v)} />
                      <Checkbox label="Walker" checked={!!data.msk_assist_walker} disabled={isLocked} onChange={(v) => setField("msk_assist_walker", v)} />
                      <Checkbox label="Wheelchair" checked={!!data.msk_assist_wheelchair} disabled={isLocked} onChange={(v) => setField("msk_assist_wheelchair", v)} />
                      <Checkbox label="Sling" checked={!!data.msk_assist_sling} disabled={isLocked} onChange={(v) => setField("msk_assist_sling", v)} />
                      <Checkbox label="Splint" checked={!!data.msk_assist_splint} disabled={isLocked} onChange={(v) => setField("msk_assist_splint", v)} />
                      <Checkbox label="Walking boot" checked={!!data.msk_assist_walking_boot} disabled={isLocked} onChange={(v) => setField("msk_assist_walking_boot", v)} />
                    </div>
                  </div>
                </Block>

                <Block title="Psychosocial">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="Calm / Relaxed" checked={!!data.psych_calm_relaxed} disabled={isLocked} onChange={(v) => setField("psych_calm_relaxed", v)} />
                    <Checkbox label="Anxious / Restless" checked={!!data.psych_anxious_restless} disabled={isLocked} onChange={(v) => setField("psych_anxious_restless", v)} />
                    <Checkbox label="Agitated / Angry" checked={!!data.psych_agitated_angry} disabled={isLocked} onChange={(v) => setField("psych_agitated_angry", v)} />
                    <Checkbox label="Confused" checked={!!data.psych_confused} disabled={isLocked} onChange={(v) => setField("psych_confused", v)} />
                    <Checkbox label="Power of Attorney" checked={!!data.psych_power_of_attorney} disabled={isLocked} onChange={(v) => setField("psych_power_of_attorney", v)} />
                  </div>
                </Block>

                <div className="border border-gray-200 rounded-md p-3">
                  <Checkbox
                    label="Religious or Cultural Concerns / Requests: None"
                    checked={!!data.religious_cultural_none}
                    disabled={isLocked}
                    onChange={(v) => setField("religious_cultural_none", v)}
                  />
                </div>

                <Block title="Abuse / Neglect Suspected">
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="abuse_neglect_suspected"
                        checked={data.abuse_neglect_suspected === "yes"}
                        disabled={isLocked}
                        onChange={() => setField("abuse_neglect_suspected", "yes")}
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="abuse_neglect_suspected"
                        checked={data.abuse_neglect_suspected === "no"}
                        disabled={isLocked}
                        onChange={() => setField("abuse_neglect_suspected", "no")}
                      />
                      No
                    </label>
                  </div>

                  <div className="mt-3">
                    <TextLine
                      label="If yes, describe"
                      value={data.abuse_neglect_describe}
                      disabled={isLocked}
                      onChange={(v) => setField("abuse_neglect_describe", v)}
                    />
                  </div>

                  <div className="mt-3 flex gap-4 flex-wrap">
                    <Checkbox label="Physician Notified" checked={!!data.physician_notified} disabled={isLocked} onChange={(v) => setField("physician_notified", v)} />
                    <Checkbox label="Supervisor Notified" checked={!!data.supervisor_notified} disabled={isLocked} onChange={(v) => setField("supervisor_notified", v)} />
                  </div>
                </Block>
              </div>

              {/* RIGHT PANEL */}
              <div className="border border-gray-300 rounded-md p-4 space-y-5">
                <h2 className="text-base font-extrabold text-gray-900">Admission Assessment</h2>

                <Block title="Pain">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Checkbox label="No Pain" checked={!!data.pain_none} disabled={isLocked} onChange={(v) => setField("pain_none", v)} />
                    <Checkbox label="Chronic" checked={!!data.pain_chronic} disabled={isLocked} onChange={(v) => setField("pain_chronic", v)} />
                    <Checkbox label="Acute" checked={!!data.pain_acute} disabled={isLocked} onChange={(v) => setField("pain_acute", v)} />
                    <Checkbox label="Pain Scale Explained / Understanding Verbalized" checked={!!data.pain_scale_explained} disabled={isLocked} onChange={(v) => setField("pain_scale_explained", v)} />
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextLine label="Current Pain Level" value={data.pain_current_level} disabled={isLocked} onChange={(v) => setField("pain_current_level", v)} />
                    <TextLine label="Location" value={data.pain_location} disabled={isLocked} onChange={(v) => setField("pain_location", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Duration</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="Constant" checked={!!data.pain_duration_constant} disabled={isLocked} onChange={(v) => setField("pain_duration_constant", v)} />
                      <Checkbox label="Intermittent" checked={!!data.pain_duration_intermittent} disabled={isLocked} onChange={(v) => setField("pain_duration_intermittent", v)} />
                      <Checkbox label="With Movement" checked={!!data.pain_duration_with_movement} disabled={isLocked} onChange={(v) => setField("pain_duration_with_movement", v)} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Quality</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Checkbox label="Aching" checked={!!data.pain_quality_aching} disabled={isLocked} onChange={(v) => setField("pain_quality_aching", v)} />
                      <Checkbox label="Stabbing" checked={!!data.pain_quality_stabbing} disabled={isLocked} onChange={(v) => setField("pain_quality_stabbing", v)} />
                      <Checkbox label="Tingling" checked={!!data.pain_quality_tingling} disabled={isLocked} onChange={(v) => setField("pain_quality_tingling", v)} />
                      <Checkbox label="Burning" checked={!!data.pain_quality_burning} disabled={isLocked} onChange={(v) => setField("pain_quality_burning", v)} />
                      <Checkbox label="Throbbing" checked={!!data.pain_quality_throbbing} disabled={isLocked} onChange={(v) => setField("pain_quality_throbbing", v)} />
                      <Checkbox label="Tight/Pressure" checked={!!data.pain_quality_tight_pressure} disabled={isLocked} onChange={(v) => setField("pain_quality_tight_pressure", v)} />
                      <Checkbox label="Shooting" checked={!!data.pain_quality_shooting} disabled={isLocked} onChange={(v) => setField("pain_quality_shooting", v)} />
                      <Checkbox label="Dull" checked={!!data.pain_quality_dull} disabled={isLocked} onChange={(v) => setField("pain_quality_dull", v)} />
                      <Checkbox label="Sharp" checked={!!data.pain_quality_sharp} disabled={isLocked} onChange={(v) => setField("pain_quality_sharp", v)} />
                      <Checkbox label="Numbness" checked={!!data.pain_quality_numbness} disabled={isLocked} onChange={(v) => setField("pain_quality_numbness", v)} />
                    </div>
                    <div className="mt-3">
                      <TextLine label="Other" value={data.pain_quality_other} disabled={isLocked} onChange={(v) => setField("pain_quality_other", v)} />
                    </div>
                  </div>

                  <div className="mt-4 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                    <div className="font-semibold text-gray-900 mb-1">0–10 Numeric Pain Intensity Scale</div>
                    <div className="text-xs text-gray-600">0 None · 2 Mild · 4 Moderate · 6 Severe · 8 Very Severe · 10 Worst</div>
                  </div>
                </Block>

                <Block title="Surgical Site Prep">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Hibiclens wash prior to arrival</div>
                  <div className="flex gap-4 flex-wrap">
                    <Checkbox label="Yes" checked={!!data.hibiclens_yes} disabled={isLocked} onChange={(v) => setField("hibiclens_yes", v)} />
                    <Checkbox label="No" checked={!!data.hibiclens_no} disabled={isLocked} onChange={(v) => setField("hibiclens_no", v)} />
                    <Checkbox label="N/A" checked={!!data.hibiclens_na} disabled={isLocked} onChange={(v) => setField("hibiclens_na", v)} />
                  </div>

                  <div className="mt-3 text-xs font-semibold text-gray-700 mb-1">Surgical site clipped</div>
                  <div className="flex gap-4 flex-wrap">
                    <Checkbox label="Yes" checked={!!data.site_clipped_yes} disabled={isLocked} onChange={(v) => setField("site_clipped_yes", v)} />
                    <Checkbox label="Prior to arrival" checked={!!data.site_clipped_prior_to_arrival} disabled={isLocked} onChange={(v) => setField("site_clipped_prior_to_arrival", v)} />
                    <Checkbox label="N/A" checked={!!data.site_clipped_na} disabled={isLocked} onChange={(v) => setField("site_clipped_na", v)} />
                  </div>

                  <div className="mt-3 text-xs font-semibold text-gray-700 mb-1">Surgical site cleansed with CHG wipe in preop</div>
                  <div className="flex gap-4 flex-wrap">
                    <Checkbox label="Yes" checked={!!data.chg_wipe_yes} disabled={isLocked} onChange={(v) => setField("chg_wipe_yes", v)} />
                    <Checkbox label="N/A" checked={!!data.chg_wipe_na} disabled={isLocked} onChange={(v) => setField("chg_wipe_na", v)} />
                  </div>
                </Block>

                <Block title="IV">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">Site</div>
                      <div className="flex gap-4 flex-wrap">
                        <Checkbox label="Right" checked={!!data.iv_site_right} disabled={isLocked} onChange={(v) => setField("iv_site_right", v)} />
                        <Checkbox label="Left" checked={!!data.iv_site_left} disabled={isLocked} onChange={(v) => setField("iv_site_left", v)} />
                      </div>
                    </div>
                    <TextLine label="Gauge" value={data.iv_gauge} disabled={isLocked} onChange={(v) => setField("iv_gauge", v)} />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Fluid</div>
                    <div className="flex gap-4 flex-wrap">
                      <Checkbox label="LR" checked={!!data.iv_fluid_lr} disabled={isLocked} onChange={(v) => setField("iv_fluid_lr", v)} />
                      <Checkbox label="NS" checked={!!data.iv_fluid_ns} disabled={isLocked} onChange={(v) => setField("iv_fluid_ns", v)} />
                    </div>
                    <div className="mt-2">
                      <TextLine label="Other" value={data.iv_fluid_other} disabled={isLocked} onChange={(v) => setField("iv_fluid_other", v)} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Rate</div>
                    <div className="flex gap-4 flex-wrap">
                      <Checkbox label="75 mL/hr" checked={!!data.iv_rate_75} disabled={isLocked} onChange={(v) => setField("iv_rate_75", v)} />
                      <Checkbox label="25 mL/hr" checked={!!data.iv_rate_25} disabled={isLocked} onChange={(v) => setField("iv_rate_25", v)} />
                    </div>
                    <div className="mt-2">
                      <TextLine label="Other" value={data.iv_rate_other} disabled={isLocked} onChange={(v) => setField("iv_rate_other", v)} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextLine label="Attempts" value={data.iv_attempts} disabled={isLocked} onChange={(v) => setField("iv_attempts", v)} />
                    <TextLine label="Started by" value={data.iv_started_by} disabled={isLocked} onChange={(v) => setField("iv_started_by", v)} />
                  </div>

                  <div className="mt-3">
                    <Checkbox
                      label="Lidocaine 1% intradermal for IV start"
                      checked={!!data.iv_lidocaine_intradermal}
                      disabled={isLocked}
                      onChange={(v) => setField("iv_lidocaine_intradermal", v)}
                    />
                  </div>
                </Block>

                <Block title="Caregiver">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextLine label="Caregiver Name" value={data.caregiver_name} disabled={isLocked} onChange={(v) => setField("caregiver_name", v)} />
                    <TextLine label="Relationship" value={data.caregiver_relationship} disabled={isLocked} onChange={(v) => setField("caregiver_relationship", v)} />
                    <div className="md:col-span-2">
                      <TextLine label="Phone #" value={data.caregiver_phone} disabled={isLocked} onChange={(v) => setField("caregiver_phone", v)} />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Checkbox
                      label="This person may hear all medical information"
                      checked={!!data.caregiver_may_hear_all_info}
                      disabled={isLocked}
                      onChange={(v) => setField("caregiver_may_hear_all_info", v)}
                    />
                    <Checkbox
                      label="This person may hear DC instructions only"
                      checked={!!data.caregiver_may_hear_dc_only}
                      disabled={isLocked}
                      onChange={(v) => setField("caregiver_may_hear_dc_only", v)}
                    />
                    <Checkbox
                      label="Pt / significant other confirms transportation home and assistance upon discharge for 24 hours."
                      checked={!!data.caregiver_confirms_transport_24h}
                      disabled={isLocked}
                      onChange={(v) => setField("caregiver_confirms_transport_24h", v)}
                    />
                  </div>
                </Block>

                <div className="border border-gray-300 rounded-md p-4">
                  <div className="text-sm font-bold text-gray-900 mb-2">Signatures</div>
                  <div className="text-xs text-gray-600">
                    (Signatures for this form can remain on Page 2 if that’s how you’re handling it.)
                  </div>
                </div>
              </div>
            </section>

            <div className="print:hidden text-xs text-gray-500">
              Tip: Use “Print / PDF” to verify the paper layout.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Block({ title, children }) {
  return (
    <section className="border border-gray-200 rounded-md p-3">
      <div className="text-sm font-bold text-gray-900 mb-2">{title}</div>
      {children}
    </section>
  );
}

function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-800">
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );
}

function TextLine({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
      />
    </label>
  );
}

function PulsesRow({ title, right, left, strength, marked, disabled, onChange, keys }) {
  const set = (k, v) => onChange({ [k]: v });

  return (
    <div className="border border-gray-200 rounded-md p-3 mb-2">
      <div className="text-sm font-semibold text-gray-900 mb-2">{title}</div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <SelectLine
          label="Right"
          value={right}
          disabled={disabled}
          onChange={(v) => set(keys.right, v)}
        />
        <SelectLine
          label="Left"
          value={left}
          disabled={disabled}
          onChange={(v) => set(keys.left, v)}
        />
        <TextLine
          label="Strength"
          value={strength}
          disabled={disabled}
          onChange={(v) => set(keys.strength, v)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={!!marked}
            disabled={disabled}
            onChange={(e) => set(keys.marked, e.target.checked)}
          />
          Marked
        </label>
      </div>
    </div>
  );
}

function SelectLine({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <select
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
      >
        <option value="">—</option>
        <option value="P">P (Palpable)</option>
        <option value="D">D (Doppler)</option>
        <option value="A">A (Absent)</option>
        <option value="N/A">N/A</option>
      </select>
    </label>
  );
}
