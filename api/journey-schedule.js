import { CSI_STORE_ID, db, enqueueJourney, toMillis } from './lib/journey-queue.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' });

  try {
    const { storeId, type, sourceId } = req.body || {};
    if (storeId !== CSI_STORE_ID || !sourceId) {
      return res.status(400).json({ success: false, error: 'Solicitação inválida.' });
    }

    if (type === 'abandoned_cart') {
      const cartRef = db.collection('abandoned_carts').doc(String(sourceId));
      const cartSnap = await cartRef.get();
      if (!cartSnap.exists) return res.status(404).json({ success: false, error: 'Carrinho não encontrado.' });

      const cart = cartSnap.data() || {};
      if (cart.storeId !== CSI_STORE_ID || cart.status !== 'abandoned' || cart.journeyAbandonedSent === true) {
        return res.status(200).json({ success: true, skipped: true });
      }

      const lastUpdatedMs = toMillis(cart.lastUpdated) || Date.now();
      const dueAt = lastUpdatedMs + 30 * 60 * 1000;
      const delaySeconds = Math.max(1, Math.ceil((dueAt - Date.now()) / 1000));
      const bucket = Math.floor(lastUpdatedMs / (5 * 60 * 1000));

      const result = await enqueueJourney(
        { type: 'abandoned_cart', storeId, sourceId: String(sourceId) },
        {
          delaySeconds,
          retentionSeconds: 48 * 60 * 60,
          idempotencyKey: `csi:cart:${sourceId}:${bucket}`,
        },
      );

      return res.status(200).json({ success: true, queued: true, messageId: result.messageId, delaySeconds });
    }

    if (type === 'post_sale') {
      const orderRef = db.collection('orders').doc(String(sourceId));
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });

      const order = orderSnap.data() || {};
      if (order.storeId !== CSI_STORE_ID || String(order.status || '').toLowerCase() !== 'completed' || order.journeyPostSaleSent === true) {
        return res.status(200).json({ success: true, skipped: true });
      }

      const completedAtMs = toMillis(order.completedAt) || Date.now();
      const dueAt = completedAtMs + 30 * 60 * 1000;
      const delaySeconds = Math.max(1, Math.ceil((dueAt - Date.now()) / 1000));

      const result = await enqueueJourney(
        { type: 'post_sale', storeId, sourceId: String(sourceId) },
        {
          delaySeconds,
          retentionSeconds: 48 * 60 * 60,
          idempotencyKey: `csi:post-sale:${sourceId}`,
        },
      );

      return res.status(200).json({ success: true, queued: true, messageId: result.messageId, delaySeconds });
    }

    return res.status(400).json({ success: false, error: 'Tipo de jornada inválido.' });
  } catch (error) {
    console.error('[Journey Schedule]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
