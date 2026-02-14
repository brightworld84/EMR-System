// src/pages/DVT_PE_Education.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

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

export default function DVTPeEducation() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const defaults = useMemo(
    () => ({
      checkin: checkinId ? Number(checkinId) : null,

      // These field names are intentionally generic.
      // They will still save even if your serializer ignores unknown keys,
      // BUT ideally they should match your model/serializer fields.
      patient_signature: "",
      nurse_signature: "",
      acknowledged_at: "", // optional (string date)

      // If your backend returns lock fields, we respect them:
      is_signed: false,
      is_complete: false,
      signed_at: null,
      completed_at: null,
    }),
    [checkinId]
  );

  const [recordId, setRecordId] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isLocked = !!data?.is_signed || !!data?.is_complete;

  const setField = (name, value) => {
    if (isLocked) return;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeList = (resData) => {
    if (Array.isArray(resData)) return resData;
    if (resData && Array.isArray(resData.results)) return resData.results;
    return [];
  };

  const loadOrCreate = async () => {
    if (!checkinId) return;

    setError("");
    setLoading(true);

    try {
      const res = await api.get(
        `patient-education-dvt-pe/?checkin=${encodeURIComponent(checkinId)}`
      );
      const list = normalizeList(res.data);

      if (list.length > 0) {
        const r = list[0];
        setRecordId(r.id);
        setData((prev) => ({
          ...prev,
          ...defaults,
          ...r,
          checkin: Number(checkinId),
        }));
        return;
      }

      // create blank record if none exists
      const created = await api.post("patient-education-dvt-pe/", {
        checkin: Number(checkinId),
      });

      setRecordId(created.data.id);
      setData((prev) => ({
        ...prev,
        ...defaults,
        ...created.data,
        checkin: Number(checkinId),
      }));
    } catch (e) {
      console.error(e);
      setError("Failed to load/create DVT/PE Education form.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(defaults);
    setRecordId(null);
    loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const saveDraft = async () => {
    if (!checkinId) return;
    if (!recordId) {
      await loadOrCreate();
      return;
    }

    setError("");
    setSaving(true);

    try {
      const payload = {
        checkin: Number(checkinId),
        patient_signature: data.patient_signature || "",
        nurse_signature: data.nurse_signature || "",
        acknowledged_at: data.acknowledged_at || null,
      };

      const res = await api.patch(`patient-education-dvt-pe/${recordId}/`, payload);
      setData((prev) => ({ ...prev, ...res.data, checkin: Number(checkinId) }));
      alert("Saved.");
    } catch (e) {
      console.error(e);
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
            <h1 className="text-2xl font-bold text-gray-900">DVT / PE Education</h1>
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
              onClick={saveDraft}
              disabled={loading || saving || isLocked}
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
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">
            Loading…
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
            {isLocked ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 print:hidden">
                This form is locked.
              </div>
            ) : null}

            <div className="text-center mb-6">
              <div className="text-sm text-gray-600">Dallas Joint &amp; Spine Center</div>
              <h2 className="text-lg font-extrabold text-gray-900 mt-2">
                ARE YOU AT RISK FOR DEEP VEIN THROMBOSIS (DVT)
                <br />
                OR PULMONARY EMBOLUS (PE)
              </h2>
            </div>

            <div className="space-y-6">
              <section className="border border-gray-300 rounded-md p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  SIGNS AND SYMPTOMS OF DEEP VEIN THROMBOSIS (DVT):
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  (Usually occurs in one leg, above or below the knee)
                </p>
                <ol className="list-decimal pl-6 text-sm text-gray-800 space-y-1">
                  <li>Swelling — one calf or thigh may be larger than the other.</li>
                  <li>Swelling along the vein of the leg, visible surface veins.</li>
                  <li>Feeling of increased warmth in the area of the leg that is swollen or painful.</li>
                  <li>Leg pain, which may increase when standing or walking.</li>
                  <li>Red or discolored skin in the affected leg.</li>
                </ol>
                <p className="text-xs text-gray-600 mt-3">
                  (Please remember that you will have some pain and swelling associated with surgery.)
                  <br />
                  If you cannot reach your physician, go to the nearest emergency department.
                </p>
              </section>

              <section className="border border-gray-300 rounded-md p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  SIGNS AND SYMPTOMS OF PULMONARY EMBOLUS (PE):
                </h3>
                <ol className="list-decimal pl-6 text-sm text-gray-800 space-y-1">
                  <li>Sudden onset of coughing.</li>
                  <li>Sharp chest pain that gets worse with deep breathing.</li>
                  <li>Shortness of breath or difficulty breathing, rapid breathing.</li>
                  <li>Severe lightheadedness, rapid heart rate, sweating.</li>
                </ol>

                <div className="mt-4 border border-gray-900 rounded-md p-4 text-center">
                  <div className="font-extrabold text-gray-900">PULMONARY EMBOLISM CAN BE FATAL</div>
                  <div className="text-sm font-bold mt-1">If you have signs or symptoms of PE</div>
                  <div className="text-lg font-extrabold mt-1">CALL 9-1-1</div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="border border-gray-300 rounded-md p-4">
                  <TextLine
                    label="Patient Acknowledgement Signature (type full name)"
                    value={data.patient_signature}
                    disabled={isLocked}
                    onChange={(v) => setField("patient_signature", v)}
                  />
                  <div className="mt-3">
                    <TextLine
                      label="Date (optional)"
                      value={data.acknowledged_at}
                      disabled={isLocked}
                      onChange={(v) => setField("acknowledged_at", v)}
                    />
                  </div>
                </div>

                <div className="border border-gray-300 rounded-md p-4">
                  <TextLine
                    label="Educating Nurse Signature (type full name)"
                    value={data.nurse_signature}
                    disabled={isLocked}
                    onChange={(v) => setField("nurse_signature", v)}
                  />
                  <div className="mt-3">
                    <div className="text-xs text-gray-500">
                      (If you want a separate nurse date field, tell me your backend field name and I’ll add it.)
                    </div>
                  </div>
                </div>
              </section>

              <div className="print:hidden text-xs text-gray-500 pt-2">
                Tip: Use “Print / PDF” to confirm the layout matches the paper.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
