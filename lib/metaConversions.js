import { createHash } from 'node:crypto';

export function buildMetaPurchaseEvent(order) {
  if (!order.id) throw new Error('Pedido sem ID para deduplicação Meta.');
  const tracking = order.metaTracking || {};
  const userData = {};
  let phone = String(order.customerPhone || '').replace(/\D/g, '');
  // DDD 55 também é brasileiro: só consideramos DDI se o comprimento conferir.
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (/^55\d{10,11}$/.test(phone)) {
    userData.ph = [createHash('sha256').update(phone).digest('hex')];
  }
  if (tracking.clientUserAgent) userData.client_user_agent = tracking.clientUserAgent;
  if (tracking.fbp) userData.fbp = tracking.fbp;
  if (tracking.fbc) userData.fbc = tracking.fbc;
  const event = {
    event_name: 'Purchase',
    event_id: String(order.id),
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
    custom_data: { currency: 'BRL', value: Number(order.total || 0), order_id: String(order.id) },
  };
  if (tracking.eventSourceUrl) event.event_source_url = tracking.eventSourceUrl;
  return event;
}

export async function sendMetaPurchaseEvent(storeId, order, db, fetchImpl = fetch) {
  try {
    const settings = await db.collection('settings').doc(storeId).get();
    const config = settings.data()?.integrations?.meta;
    if (!config?.pixelId || !config?.apiToken) return { skipped: true };
    const pixelId = String(config.pixelId).trim();
    if (!/^\d+$/.test(pixelId)) throw new Error('ID do Pixel inválido.');
    const response = await fetchImpl(`https://graph.facebook.com/v26.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiToken.trim()}` },
      body: JSON.stringify({ data: [buildMetaPurchaseEvent(order)] }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    if (!response.ok || result.error || result.events_received !== 1) {
      // Não registrar token, telefone ou payload completo.
      console.error('[Meta CAPI] Evento rejeitado', {
        storeId, orderId: order.id, status: response.status,
        code: result.error?.code, subcode: result.error?.error_subcode,
        traceId: result.error?.fbtrace_id || result.fbtrace_id,
      });
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.error('[Meta CAPI] Falha no envio', { storeId, orderId: order.id, type: error.name });
    return { success: false };
  }
}
