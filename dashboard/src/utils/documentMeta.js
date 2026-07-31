export const STATUS_META = {
  created: { label: 'Trained', badgeClass: 'badge-success', group: 'trained' },
  updated: { label: 'Trained', badgeClass: 'badge-success', group: 'trained' },
  duplicate: { label: 'Trained', badgeClass: 'badge-success', group: 'trained' },
  received: { label: 'Processing', badgeClass: 'badge-processing', group: 'processing' },
  processing: { label: 'Processing', badgeClass: 'badge-processing', group: 'processing' },
  failed: { label: 'Failed', badgeClass: 'badge-error', group: 'failed' },
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}