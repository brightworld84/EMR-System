// src/pages/PostOpInfectionEducation.js
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

export default function PostOpInfectionEducation() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  
  const endpoint = "patient-education-infection-risk/";

  const defaults = useMemo(
    () => ({
      checkin: Number(checkinId),
      patient_ack_name: "",
      educating_nurse_name: "",
      patient_signature_date: "",
      nurse_signature_date: "",
      is_complete: false,
      completed_by: null,
      completed_at: null,
    }),
    [checkinId]
  );

  const [recordId, setRecordId] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isLocked = !!data?.is_complete;

  const setField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get(`${endpoint}?checkin=${encodeURIComponent(checkinId)}`);

      // DRF can return [] or {results: []}
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const first = list.length ? list[0] : null;

      if (first?.id) {
        setRecordId(first.id);
        setData({ ...defaults, ...first, checkin: Number(checkinId) });
      } else {
        setRecordId(null);
        setData(defaults);
      }
    } catch (e) {
      console.error("PostOpInfectionEducation load failed:", e);
      setError("Failed to load form.");
    } finally {
      setLoading(false);
    }
  };

  const save = async (overrides = null) => {
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...data,
        ...(overrides || {}),
        checkin: Number(checkinId),
      };

      let res;
      if (recordId) {
        res = await api.patch(`${endpoint}${recordId}/`, payload);
      } else {
        res = await api.post(endpoint, payload);
      }

      const saved = res.data;
      if (saved?.id) setRecordId(saved.id);
      setData({ ...defaults, ...saved, checkin: Number(checkinId) });

      return saved;
    } catch (e) {
      console.error("PostOpInfectionEducation save failed:", e);
      setError("Failed to save. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    if (isLocked) return;
    await save({ is_complete: true });
  };

  useEffect(() => {
    if (!checkinId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Post-Op Infection Education</h1>
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
              <h2 className="text-xl font-extrabold text-gray-900 mt-2 underline">
                Are You At Risk For A Post-Op Infection?
              </h2>
            </div>

            <div className="space-y-6 text-sm text-gray-800 leading-relaxed">
              <section className="border border-gray-300 rounded-md p-4">
                <p>
                  You have just had a surgical procedure at Dallas Joint and Spine Center. Your next step is to recover.
                  This is probably the most important part of the surgery process. Your main goal is to recover 100% and
                  remain infection free while doing so. We at Dallas Joint and Spine Center are here to provide
                  information and help you to accomplish this.
                </p>

                <p className="mt-3">
                  You have probably heard the word <span className="font-bold">infection</span> before, but don’t really
                  know the causes, signs, and symptoms and how you can prevent getting an infection.
                </p>

                <p className="mt-3">
                  <span className="font-bold">Infection</span> is defined as the process by which germs enter a
                  susceptible site in the body and multiply, resulting in an infection.
                </p>

                <p className="mt-3">
                  The immune system is made up of many different organs. The largest organ in the body is the skin and
                  is also the first line of defense in fighting off infection. 30% of people have bacteria already in
                  their noses or on their skin, and Staph (another bacteria) is present on most people’s skin on a day
                  to day basis.
                </p>

                <p className="mt-3">
                  Unfortunately, surgery usually means you had an intentional break in the skin somewhere which puts you
                  at risk from the start, but there are many things you can do to help prevent an infection from
                  occurring:
                </p>

                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Demonstrate good hand washing technique.</li>
                  <li>
                    Maintain good hygiene (shower daily unless otherwise specified by discharge instructions given to you
                    after your procedure).
                  </li>
                  <li>
                    Keep dressing(s) clean and dry. (Bacteria love dark, moist places.) If dressing(s) becomes soiled or
                    wet before post-op visit with your doctor, call your physician’s office for recommendations on
                    dressing changes before your next office visit.
                  </li>
                  <li>Maintain a clean environment (regular dusting, sweeping, vacuuming, etc…).</li>
                  <li>
                    If you are diabetic, keeping your sugars <span className="font-bold">UNDER CONTROL</span> will lessen
                    your risk of getting an infection and promote healing.
                  </li>
                  <li>Take it easy! Follow your post-op activity restrictions. Don’t overdo it.</li>
                  <li>Know the signs and symptoms of infection and report them to your physician immediately!</li>
                </ul>
              </section>

              <section className="border border-gray-300 rounded-md p-4">
                <h3 className="font-extrabold text-gray-900 underline mb-2">SIGNS AND SYMPTOMS OF INFECTIONS</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Redness or swelling at the incision/operative site</li>
                  <li>Pus formation at the incision/operative site</li>
                  <li>Fever of 100 degrees F or above</li>
                  <li>Chills and sweating</li>
                  <li>Increased pain at the incision site</li>
                </ul>

                <p className="mt-3">
                  By following these simple preventive measures, you can help reduce your risk of acquiring an infection
                  and you will be on the road to a great recovery! Thank you for visiting Dallas Joint and Spine Center.
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="border border-gray-300 rounded-md p-4">
                  <TextLine
                    label="Patient Acknowledgement Signature (type full name)"
                    value={data.patient_ack_name}
                    disabled={isLocked}
                    onChange={(v) => setField("patient_ack_name", v)}
                  />
                  <div className="mt-3">
                    <TextLine
                      label="Date"
                      value={data.patient_signature_date}
                      disabled={isLocked}
                      onChange={(v) => setField("patient_signature_date", v)}
                    />
                  </div>
                </div>

                <div className="border border-gray-300 rounded-md p-4">
                  <TextLine
                    label="Educating Nurse Signature (type full name)"
                    value={data.educating_nurse_name}
                    disabled={isLocked}
                    onChange={(v) => setField("educating_nurse_name", v)}
                  />
                  <div className="mt-3">
                    <TextLine
                      label="Date"
                      value={data.nurse_signature_date}
                      disabled={isLocked}
                      onChange={(v) => setField("nurse_signature_date", v)}
                    />
                  </div>
                </div>
              </section>

              <div className="print:hidden text-xs text-gray-500 pt-2">
                Tip: Print preview should look extremely close to the paper handout.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
