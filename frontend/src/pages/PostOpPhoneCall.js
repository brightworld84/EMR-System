import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function normalizeList(resData) {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.results)) return resData.results;
  return [];
}

function YesNo({ value, onChange, disabled }) {
  // value: true | false | null
  return (
    <div className="flex items-center gap-6">
      <label className="inline-flex items-center gap-2">
        <input
          type="radio"
          checked={value === true}
          onChange={() => onChange(true)}
          disabled={disabled}
        />
        <span>Yes</span>
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="radio"
          checked={value === false}
          onChange={() => onChange(false)}
          disabled={disabled}
        />
        <span>No</span>
      </label>
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder }) {
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

function QuestionRow({ label, ynValue, onYNChange, commentValue, onCommentChange, disabled }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 border-b border-gray-200 py-4 last:border-b-0">
      <div>
        <div className="font-semibold text-gray-900">{label}</div>
        <div className="mt-2">
          <YesNo value={ynValue} onChange={onYNChange} disabled={disabled} />
        </div>
      </div>

      <div>
        <Field
          label="Comments"
          value={commentValue}
          onChange={onCommentChange}
          disabled={disabled}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}

export default function PostOpPhoneCall() {
  const navigate = useNavigate();
  const { checkinId } = useParams();

  const endpoint = "post-op-phone-call";

  const defaults = useMemo(
    () => ({
      checkin: Number(checkinId),

      phone_number: "",
      ok_to_leave_message: null, // true/false/null

      // Inquire of the patient
      tolerating_food_liquids: null,
      tolerating_food_liquids_comments: "",

      nausea_vomiting: null,
      nausea_vomiting_comments: "",

      pain_med_effective: null,
      pain_med_effective_comments: "",

      dressing_intact: null,
      dressing_intact_comments: "",

      drainage: null,
      drainage_describe: "",

      swelling_redness_at_site: null,
      swelling_redness_describe: "",

      change_color_numbness_tingling_coldness: null,
      change_color_describe: "",

      follow_up_appt_scheduled: null,
      follow_up_appt_comments: "",

      referred_to_physician: null,
      referred_to_physician_comments: "",

      general_comments: "",

      // Attempt #1
      attempt1_date: "",
      attempt1_time: "",
      attempt1_by: "",
      attempt1_no_phone: false,
      attempt1_no_answer: false,
      attempt1_left_message: false,
      attempt1_spoke_to: "",

      // Attempt #2
      attempt2_date: "",
      attempt2_time: "",
      attempt2_by: "",
      attempt2_no_phone: false,
      attempt2_no_answer: false,
      attempt2_left_message: false,
      attempt2_spoke_to: "",

      // Not contacted letter sent
      not_contacted_letter_sent: false,
      letter_sent_by: "",
    }),
    [checkinId]
  );

  const [record, setRecord] = useState(null);
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isLocked = !!record?.is_signed; // if your model has is_signed (safe if it doesn't)

  const setField = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  const load = async () => {
    if (!checkinId) return;
    setError("");
    setLoading(true);

    try {
      const res = await api.get(`${endpoint}/`, { params: { checkin: checkinId } });
      const list = normalizeList(res.data);
      const first = list.length ? list[0] : null;

      setRecord(first);

      if (first) {
        setData((prev) => ({ ...prev, ...first }));
      } else {
        setData(defaults);
      }
    } catch (e) {
      console.error("PostOpPhoneCall load failed:", e);
      setError("Failed to load form.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  const save = async () => {
    if (!checkinId) return;
    setError("");
    setSaving(true);

    try {
      const payload = {
        ...data,
        checkin: Number(checkinId),
      };

      let res;
      if (record?.id) {
        res = await api.patch(`${endpoint}/${record.id}/`, payload);
      } else {
        res = await api.post(`${endpoint}/`, payload);
      }

      setRecord(res.data);
      setData((prev) => ({ ...prev, ...res.data }));
    } catch (e) {
      console.error("PostOpPhoneCall save failed:", e);
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
            <h1 className="text-2xl font-bold text-gray-900">Post-Operative Phone Call</h1>
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
              onClick={save}
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
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
            {isLocked ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 print:hidden">
                This form is locked (signed).
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Field
                label="Phone #"
                value={data.phone_number}
                onChange={(v) => setField("phone_number", v)}
                disabled={isLocked}
                placeholder="(###) ###-####"
              />

              <div className="border border-gray-300 rounded-md p-4">
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Is it OK to leave a message?
                </div>
                <YesNo
                  value={data.ok_to_leave_message}
                  onChange={(v) => setField("ok_to_leave_message", v)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <section className="border border-gray-300 rounded-md">
              <div className="px-4 py-3 border-b border-gray-300 bg-gray-50">
                <div className="font-bold text-gray-900">Inquire of the patient</div>
              </div>

              <div className="px-4">
                <QuestionRow
                  label="Tolerating food and liquids?"
                  ynValue={data.tolerating_food_liquids}
                  onYNChange={(v) => setField("tolerating_food_liquids", v)}
                  commentValue={data.tolerating_food_liquids_comments}
                  onCommentChange={(v) => setField("tolerating_food_liquids_comments", v)}
                  disabled={isLocked}
                />

                <QuestionRow
                  label="Nausea and vomiting?"
                  ynValue={data.nausea_vomiting}
                  onYNChange={(v) => setField("nausea_vomiting", v)}
                  commentValue={data.nausea_vomiting_comments}
                  onCommentChange={(v) => setField("nausea_vomiting_comments", v)}
                  disabled={isLocked}
                />

                <QuestionRow
                  label="Pain medication effective?"
                  ynValue={data.pain_med_effective}
                  onYNChange={(v) => setField("pain_med_effective", v)}
                  commentValue={data.pain_med_effective_comments}
                  onCommentChange={(v) => setField("pain_med_effective_comments", v)}
                  disabled={isLocked}
                />

                <QuestionRow
                  label="Dressing intact?"
                  ynValue={data.dressing_intact}
                  onYNChange={(v) => setField("dressing_intact", v)}
                  commentValue={data.dressing_intact_comments}
                  onCommentChange={(v) => setField("dressing_intact_comments", v)}
                  disabled={isLocked}
                />

                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 border-b border-gray-200 py-4">
                  <div>
                    <div className="font-semibold text-gray-900">Drainage?</div>
                    <div className="mt-2">
                      <YesNo
                        value={data.drainage}
                        onChange={(v) => setField("drainage", v)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div>
                    <Field
                      label="Describe"
                      value={data.drainage_describe}
                      onChange={(v) => setField("drainage_describe", v)}
                      disabled={isLocked}
                      placeholder="If Yes, describe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 border-b border-gray-200 py-4">
                  <div>
                    <div className="font-semibold text-gray-900">Swelling, redness at operative site?</div>
                    <div className="mt-2">
                      <YesNo
                        value={data.swelling_redness_at_site}
                        onChange={(v) => setField("swelling_redness_at_site", v)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div>
                    <Field
                      label="Describe"
                      value={data.swelling_redness_describe}
                      onChange={(v) => setField("swelling_redness_describe", v)}
                      disabled={isLocked}
                      placeholder="If Yes, describe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 border-b border-gray-200 py-4">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Change in color, numbness, tingling, coldness at site?
                    </div>
                    <div className="mt-2">
                      <YesNo
                        value={data.change_color_numbness_tingling_coldness}
                        onChange={(v) => setField("change_color_numbness_tingling_coldness", v)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div>
                    <Field
                      label="Describe"
                      value={data.change_color_describe}
                      onChange={(v) => setField("change_color_describe", v)}
                      disabled={isLocked}
                      placeholder="If Yes, describe"
                    />
                  </div>
                </div>

                <QuestionRow
                  label="Follow up appointment scheduled?"
                  ynValue={data.follow_up_appt_scheduled}
                  onYNChange={(v) => setField("follow_up_appt_scheduled", v)}
                  commentValue={data.follow_up_appt_comments}
                  onCommentChange={(v) => setField("follow_up_appt_comments", v)}
                  disabled={isLocked}
                />

                <QuestionRow
                  label="Referred to Physician?"
                  ynValue={data.referred_to_physician}
                  onYNChange={(v) => setField("referred_to_physician", v)}
                  commentValue={data.referred_to_physician_comments}
                  onCommentChange={(v) => setField("referred_to_physician_comments", v)}
                  disabled={isLocked}
                />

                <div className="py-4">
                  <TextArea
                    label="Comments"
                    value={data.general_comments}
                    onChange={(v) => setField("general_comments", v)}
                    disabled={isLocked}
                    placeholder="Additional notes…"
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="border border-gray-300 rounded-md p-4">
                <div className="font-bold text-gray-900 mb-3">Call Attempt #1</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Date"
                    value={data.attempt1_date}
                    onChange={(v) => setField("attempt1_date", v)}
                    disabled={isLocked}
                    placeholder="MM/DD/YYYY"
                  />
                  <Field
                    label="Time"
                    value={data.attempt1_time}
                    onChange={(v) => setField("attempt1_time", v)}
                    disabled={isLocked}
                    placeholder="HH:MM"
                  />
                  <Field
                    label="By"
                    value={data.attempt1_by}
                    onChange={(v) => setField("attempt1_by", v)}
                    disabled={isLocked}
                    placeholder="Initials / name"
                  />
                  <Field
                    label="Spoke to"
                    value={data.attempt1_spoke_to}
                    onChange={(v) => setField("attempt1_spoke_to", v)}
                    disabled={isLocked}
                    placeholder="Name (if applicable)"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!data.attempt1_no_phone}
                      onChange={(e) => setField("attempt1_no_phone", e.target.checked)}
                      disabled={isLocked}
                    />
                    <span className="text-sm">No Phone</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!data.attempt1_no_answer}
                      onChange={(e) => setField("attempt1_no_answer", e.target.checked)}
                      disabled={isLocked}
                    />
                    <span className="text-sm">No Answer</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!data.attempt1_left_message}
                      onChange={(e) => setField("attempt1_left_message", e.target.checked)}
                      disabled={isLocked}
                    />
                    <span className="text-sm">Left Message</span>
                  </label>
                </div>
              </div>

              <div className="border border-gray-300 rounded-md p-4">
                <div className="font-bold text-gray-900 mb-3">Call Attempt #2</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Date"
                    value={data.attempt2_date}
                    onChange={(v) => setField("attempt2_date", v)}
                    disabled={isLocked}
                    placeholder="MM/DD/YYYY"
                  />
                  <Field
                    label="Time"
                    value={data.attempt2_time}
                    onChange={(v) => setField("attempt2_time", v)}
                    disabled={isLocked}
                    placeholder="HH:MM"
                  />
                  <Field
                    label="By"
                    value={data.attempt2_by}
                    onChange={(v) => setField("attempt2_by", v)}
                    disabled={isLocked}
                    placeholder="Initials / name"
                  />
                  <Field
                    label="Spoke to"
                    value={data.attempt2_spoke_to}
                    onChange={(v) => setField("attempt2_spoke_to", v)}
                    disabled={isLocked}
                    placeholder="Name (if applicable)"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!data.attempt2_no_phone}
                      onChange={(e) => setField("attempt2_no_phone", e.target.checked)}
                      disabled={isLocked}
                    />
                    <span className="text-sm">No Phone</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!data.attempt2_no_answer}
                      onChange={(e) => setField("attempt2_no_answer", e.target.checked)}
                      disabled={isLocked}
                    />
                    <span className="text-sm">No Answer</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!data.attempt2_left_message}
                      onChange={(e) => setField("attempt2_left_message", e.target.checked)}
                      disabled={isLocked}
                    />
                    <span className="text-sm">Left Message</span>
                  </label>
                </div>
              </div>
            </section>

            <section className="border border-gray-300 rounded-md p-4 mt-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!data.not_contacted_letter_sent}
                  onChange={(e) => setField("not_contacted_letter_sent", e.target.checked)}
                  disabled={isLocked}
                />
                <span className="font-semibold text-gray-900">
                  Not contacted, letter sent
                </span>
              </label>

              <div className="mt-3 max-w-sm">
                <Field
                  label="by"
                  value={data.letter_sent_by}
                  onChange={(v) => setField("letter_sent_by", v)}
                  disabled={isLocked}
                  placeholder="Initials / name"
                />
              </div>
            </section>

            <div className="print:hidden text-xs text-gray-500 pt-4">
              Tip: Use “Print / PDF” to confirm the layout matches the paper.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
