// Display names for return statuses (the API sends RECEIVED, UNDER_INSPECTION, ...).
export const STATUS_LABELS = {
  RECEIVED: 'Received',
  UNDER_INSPECTION: 'Under inspection',
  EVALUATED: 'Evaluated',
  DECIDED: 'Decided',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
}
