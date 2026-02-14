import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import api from '../services/api';
import { calendarColors, statusLabel } from '../utils/status';

function ScheduleCalendarFC() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { resources, events, overlayEvents } = useMemo(() => {
    const providerSet = new Set();
    (items || []).forEach((a) => {
    providerSet.add((a.provider_display_name || a.provider_name || '').trim() || 'Unassigned');
    });

    const resourcesArr = Array.from(providerSet)
      .sort()
      .map((p) => ({ id: p, title: p }));

    const eventsArr = (items || []).map((a) => {
      const colors = calendarColors(a.status);

      return {
        id: String(a.id),
        title: `${a.patient_name || 'Appointment'}${
          a.reason_for_visit ? ' — ' + a.reason_for_visit : ''
        }`,
        start: a.scheduled_start,
        end: a.scheduled_end || null,
        resourceId: (a.provider_display_name || a.provider_name || '').trim() || 'Unassigned',
        extendedProps: a,

        // 🎨 STATUS-BASED COLORS
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textColor: colors.textColor,
      };
    });

    //  SOFT AVAILABILITY OVERLAYS (busy blocks)
    const overlayEventsArr = (items || [])
      .filter((a) => a?.scheduled_start)
      .map((a) => ({
        id: `busy-${a.id}`,
        start: a.scheduled_start,
        end:
          a.scheduled_end ||
          new Date(new Date(a.scheduled_start).getTime() + 30 * 60000),
        display: 'background',
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // soft red
        resourceId: (a.provider_name || '').trim() || 'Unassigned',
      }));

    return {
      resources: resourcesArr,
      events: eventsArr,
      overlayEvents: overlayEventsArr,
    };
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar Schedule</h1>
            <p className="text-sm text-gray-600">FullCalendar (Month/Week/Day + provider lanes)</p>
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
        {loading && <div className="text-sm text-gray-600 mb-2">Loading…</div>}

        <div className="bg-white rounded-lg shadow p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
          initialView="resourceTimeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,resourceTimeGridWeek,timeGridDay,agenda',
          }}
          height={720}
          selectable
          editable={false}
          resources={resources}
          events={[...overlayEvents, ...events]}
          datesSet={(arg) => fetchRange(arg.start, arg.end)}

          eventDidMount={(info) => {
            const a = info.event.extendedProps || {};

            const who = a.patient_name || 'Appointment';
            const provider = a.provider_display_name || a.provider_name || 'Unassigned';
            const statusText = statusLabel(a.status || 'scheduled');
            const when = a.scheduled_start ? new Date(a.scheduled_start).toLocaleString() : '';

            info.el.title = `${who}\nProvider: ${provider}\n${statusText}\n${when}`;
          }}
          dateClick={(info) => {
            navigate(`/schedule/new?scheduled_start=${encodeURIComponent(info.dateStr)}`);
          }}
          eventClick={(info) => {
            navigate('/schedule/today');
          }}
        />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          HIPAA-safe: authenticated + clinic-scoped scheduling data only.
        </p>
      </main>
    </div>
  );
}

export default ScheduleCalendarFC;
