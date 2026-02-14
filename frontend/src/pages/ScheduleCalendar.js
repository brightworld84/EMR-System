import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

function ScheduleCalendar() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [range, setRange] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const events = useMemo(() => {
    return (items || []).map((a) => ({
      id: a.id,
      title:
        (a.patient_name ? a.patient_name : 'Appointment') +
        (a.reason_for_visit ? ` — ${a.reason_for_visit}` : ''),
      start: a.scheduled_start ? new Date(a.scheduled_start) : new Date(),
      end: a.scheduled_end ? new Date(a.scheduled_end) : new Date(new Date(a.scheduled_start).getTime() + 30 * 60000),
      resource: a,
      resourceId: (a.provider_name || '').trim() || 'Unassigned',  
    }));
  }, [items]);

  const resources = useMemo(() => {
    const set = new Set();

    (items || []).forEach((a) => {
      const name = (a.provider_name || '').trim();
      set.add(name || 'Unassigned');
    });

    return Array.from(set).sort().map((name) => ({
      resourceId: name,
      resourceTitle: name,
    }));
  }, [items]);

  const fetchRange = async (start, end) => {
    try {
      setError('');
      setLoading(true);

      const qs = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const res = await api.get(`/appointments/range/?${qs.toString()}`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError('Failed to load calendar appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range.start && range.end) {
      fetchRange(range.start, range.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start?.toISOString?.(), range.end?.toISOString?.()]);

  const onRangeChange = (r) => {
    // react-big-calendar gives different shapes depending on view
    if (Array.isArray(r) && r.length > 0) {
      setRange({ start: r[0], end: r[r.length - 1] });
      return;
    }
    if (r?.start && r?.end) {
      setRange({ start: r.start, end: r.end });
      return;
    }
  };

  const handleSelectSlot = ({ start }) => {
    // Create appt starting at slot time
    const isoLocal = new Date(start);
    // We pass a suggested datetime via query param (optional)
    navigate(`/schedule/new?scheduled_start=${encodeURIComponent(isoLocal.toISOString())}`);
  };

  const handleSelectEvent = (event) => {
    navigate('/schedule/today');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar Schedule</h1>
            <p className="text-sm text-gray-600">Clinic-scoped scheduling (Week/Day/Month)</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Dashboard
            </button>

            <button
              onClick={() => navigate('/schedule/today')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
            >
              Today’s Schedule
            </button>

            <button
              onClick={() => navigate('/schedule/new')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              + Add Appointment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          {loading && <div className="text-sm text-gray-600 mb-2">Loading…</div>}

          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            resources={resources}
	    resourceIdAccessor="resourceId"
	    resourceTitleAccessor="resourceTitle"
	    style={{ height: 700 }}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="week"
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onRangeChange={onRangeChange}
          />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Tip: Click an empty slot to prefill a new appointment. This calendar uses authenticated, clinic-scoped data.
        </p>
      </main>
    </div>
  );
}

export default ScheduleCalendar;
