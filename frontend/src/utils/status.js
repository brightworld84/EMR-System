import { titleize } from './labels';

export const STATUS_COLORS = {
  scheduled:      'bg-gray-100 text-gray-800 border border-gray-200',
  checked_in:     'bg-orange-100 text-orange-800 border border-orange-200',
  pre_op:         'bg-blue-100 text-blue-800 border border-blue-200',
  operating_room: 'bg-red-100 text-red-800 border border-red-200',
  pacu:           'bg-yellow-100 text-yellow-800 border border-yellow-200',
  discharged:     'bg-green-100 text-green-800 border border-green-200',
  cancelled:      'bg-red-100 text-red-800 border border-red-200',
  no_show:        'bg-red-100 text-red-800 border border-red-200',
};

export const DEFAULT_STATUS_LABELS = {
  scheduled:      'Scheduled',
  checked_in:     'Checked In',
  pre_op:         'Pre-Op',
  operating_room: 'Operating Room',
  pacu:           'PACU',
  discharged:     'Discharged',
  cancelled:      'Cancelled',
  no_show:        'No Show',
};

export const STATUS_LABELS = DEFAULT_STATUS_LABELS;

export const statusLabel = (status, clinicLabels = null) => {
  if (!status) return '—';
  if (clinicLabels && clinicLabels[status]) return clinicLabels[status];
  return DEFAULT_STATUS_LABELS[status] || titleize(status);
};

export const statusPillClass = (status) => {
  const base = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold';
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  return `${base} ${color}`;
};

export const calendarColors = (status) => {
  switch (status) {
    case 'checked_in':
      return { backgroundColor: '#f97316', borderColor: '#ea580c', textColor: '#ffffff' };
    case 'pre_op':
      return { backgroundColor: '#3b82f6', borderColor: '#2563eb', textColor: '#ffffff' };
    case 'operating_room':
      return { backgroundColor: '#ef4444', borderColor: '#dc2626', textColor: '#ffffff' };
    case 'pacu':
      return { backgroundColor: '#eab308', borderColor: '#ca8a04', textColor: '#111827' };
    case 'discharged':
      return { backgroundColor: '#22c55e', borderColor: '#16a34a', textColor: '#ffffff' };
    case 'cancelled':
    case 'no_show':
      return { backgroundColor: '#ef4444', borderColor: '#dc2626', textColor: '#ffffff' };
    case 'scheduled':
    default:
      return { backgroundColor: '#9ca3af', borderColor: '#6b7280', textColor: '#111827' };
  }
};
