// Consulta restrita por número no diagnóstico CSI. Nunca devolve número ou WAMID.
function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function csiTestPhoneVariants(input) {
  const original = String(input ?? '').trim();
  const digits = original.replace(/\D/g, '');
  if (original.startsWith('+') && !/^55\d{10,11}$/.test(digits)) return null;
  const national = /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
  if (!/^[1-9]{2}\d{8,9}$/.test(national)) return null;
  return [national, '55' + national];
}

export function summarizeCsiReplyReceipts(records = [], {nowMs = Date.now(), days = 14, partialScan = false} = {}) {
  const after = nowMs - days * 86400000;
  const seen = new Set();
  const result = {
    total: 0, apiAccepted: 0, sent: 0, delivered: 0, read: 0,
    failed: 0, awaitingDelivery: 0, withoutMessageId: 0,
    latestStatus: null, latestAt: null, days, partialScan,
    note: 'Aceite da Cloud API não comprova entrega. Apenas delivered/read no webhook confirmam entrega.'
  };
  let latest = 0;
  for (const item of records) {
    if (item.storeId !== 'csi' || item.direction !== 'outbound' || item.source !== 'chat_reply') continue;
    const when = toMillis(item.sentAt || item.receivedAt || item.createdAt);
    if (!when || when > nowMs || when < after) continue;
    const id = String(item.metaMessageId || '');
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    result.total++;
    if (id) result.apiAccepted++;
    else result.withoutMessageId++;
    const status = String(item.deliveryStatus || '').toLowerCase();
    if (['sent', 'delivered', 'read', 'failed'].includes(status)) result[status]++;
    else result.awaitingDelivery++;
    if (status === 'sent') result.awaitingDelivery++;
    if (when > latest) {
      latest = when;
      result.latestAt = new Date(when).toISOString();
      result.latestStatus = status === 'accepted' || ['sent', 'delivered', 'read', 'failed'].includes(status)
        ? status : 'not_confirmed';
    }
  }
  return result;
}
