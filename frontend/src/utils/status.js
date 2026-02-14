import { titleize } from './labels';

export const STATUS_COLORS = {
  scheduled: 'bg-gray-100 text-gray-800 border border-gray-200',
  checked_in: 'bg-orange-100 text-orange-800 border border-orange-200',
  roomed: 'bg-blue-100 text-blue-800 border border-blue-200',
  ready: 'bg-purple-100 text-purple-800 border border-purple-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
  no_show: 'bg-red-100 text-red-800 border border-red-200',
};

export const DEFAULT_STATUS_LABELS = {
  scheduled: 'Scheduled',
  checked_in: 'Checked In',
  roomed: 'Roomed',
  ready: 'Ready',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const STATUS_LABELS = DEFAULT_STATUS_LABELS;

export const statusLabel = (status, clinicLabels = null) => {
  if (!status) return '—';
  // clinicLabels may contain keys like roomed/ready/in_progress/completed/checked_in
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
    case 'roomed':
      return { backgroundColor: '#3b82f6', borderColor: '#2563eb', textColor: '#ffffff' };
    case 'ready':
      return { backgroundColor: '#9333ea', borderColor: '#7e22ce', textColor: '#ffffff' };
    case 'in_progress':
      return { backgroundColor: '#eab308', borderColor: '#ca8a04', textColor: '#111827' };
    case 'completed':
      return { backgroundColor: '#22c55e', borderColor: '#16a34a', textColor: '#ffffff' };
    case 'cancelled':
    case 'no_show':
      return { backgroundColor: '#ef4444', borderColor: '#dc2626', textColor: '#ffffff' };
    case 'scheduled':
    default:
      return { backgroundColor: '#9ca3af', borderColor: '#6b7280', textColor: '#111827' };
  }
};
