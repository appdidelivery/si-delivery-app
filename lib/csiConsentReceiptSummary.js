function asMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

const statuses = new Set(['sent', 'delivered', 'read', 'failed']);
export const CSI_CONSENT_INVITE_SOURCES = [
  'admin_24h_consent_invite',
  'automatic_24h_consent_invite'
];

/**
 * Report only aggregate outbound status data, never recipient phones or WAMIDs.
 * A 200/201 from Meta means accepted for processing; only webhooks can prove
 * 'delivered' or 'read'. Unknown status deliberately remains 'not_confirmed'.
 */
export function summarizeCsiConsentReceipts(records = [], { nowMs = Date.now(), hours = 48, partialScan = false } = {}) {
  const after = nowMs - hours * 3600000;
  const seen = new Set();
  const counters = { accepted: 0, sent: 0, delivered: 0, read: 0, failed: 0, notConfirmed: 0 };
  let withoutMessageId = 0;
  for (const item of records) {
    if (item.storeId !== 'csi' || !CSI_CONSENT_INVITE_SOURCES.includes(item.source)) continue;
    const at = asMillis(item.sentAt || item.receivedAt || item.createdAt);
    if (!at || at > nowMs || at < after) continue;
    const id = String(item.metaMessageId || '');
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    else withoutMessageId++;
    counters.accepted++;
    const status = String(item.deliveryStatus || '').toLowerCase();
    if (statuses.has(status)) counters[status]++;
    else counters.notConfirmed++;
  }
  // 'sent' (without delivered/read) is also an unconfirmed delivery.
  return {
    ...counters,
    pendingDelivery: counters.sent + counters.notConfirmed,
    withoutMessageId,
    hours, partialScan,
    note: 'Aceito pela API nao comprova entrega. Entregue e lido dependem dos recibos de webhook; falhas nao devem ser contabilizadas como entregues.'
  };
}
