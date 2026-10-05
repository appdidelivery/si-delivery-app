import admin from 'firebase-admin';
import { QueueClient } from '@vercel/queue';
import {
  CSI_STORE_ID,
  canReceiveJourneyMarketing,
  db,
  enqueueJourney,
  normalizePhone,
  sendJourneyTemplate,
  toMillis,
} from '../lib/journey-queue.js';

const queue = new QueueClient();
const { handleNodeCallback } = queue;

async function processJourneyMessage(message) {
  if (!message || message.storeId !== CSI_STORE_ID || !message.sourceId) return;

  if (message.type === 'abandoned_cart') {
    const cartRef = db.collection('abandoned_carts').doc(String(message.sourceId));
    const cartSnap = await cartRef.get();
    if (!cartSnap.exists) return;

    const cart = cartSnap.data() || {};
    if (cart.storeId !== CSI_STORE_ID || cart.status !== 'abandoned' || cart.journeyAbandonedSent === true || cart.abandonmentAlertSent === true) return;

    const lastUpdatedMs = toMillis(cart.lastUpdated);
    if (!lastUpdatedMs) return;

    const remainingMs = (lastUpdatedMs + 30 * 60 * 1000) - Date.now();
    if (remainingMs > 1000) {
      const bucket = Math.floor(lastUpdatedMs / (5 * 60 * 1000));
      await enqueueJourney(message, {
        delaySeconds: Math.ceil(remainingMs / 1000),
        retentionSeconds: 48 * 60 * 60,
        idempotencyKey: `csi:cart-recheck:${message.sourceId}:${bucket}`,
      });
      return;
    }

    const phone = normalizePhone(cart.customerPhone);
    if (!phone || !(await canReceiveJourneyMarketing(phone, cart))) return;

    const sent = await sendJourneyTemplate({
      phone,
      templateCandidates: ['velo_carrinho_bebidas'],
      stage: 'abandoned_cart',
      sourceId: cartSnap.id,
      sourceType: 'abandoned_cart',
    });

    if (sent.ok) {
      await cartRef.set({
        journeyAbandonedSent: true,
        journeyAbandonedTemplate: sent.templateName,
        journeyAbandonedMetaMessageId: sent.metaMessageId,
        journeyAbandonedSentAt: admin.firestore.FieldValue.serverTimestamp(),
        abandonmentAlertSent: true,
      }, { merge: true });
    }
    return;
  }

  if (message.type === 'post_sale') {
    const orderRef = db.collection('orders').doc(String(message.sourceId));
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return;

    const order = orderSnap.data() || {};
    if (order.storeId !== CSI_STORE_ID || String(order.status || '').toLowerCase() !== 'completed' || order.journeyPostSaleSent === true) return;

    const completedAtMs = toMillis(order.completedAt || order.updatedAt || order.createdAt);
    if (!completedAtMs) return;

    const remainingMs = (completedAtMs + 30 * 60 * 1000) - Date.now();
    if (remainingMs > 1000) {
      await enqueueJourney(message, {
        delaySeconds: Math.ceil(remainingMs / 1000),
        retentionSeconds: 48 * 60 * 60,
        idempotencyKey: `csi:post-sale-recheck:${message.sourceId}`,
      });
      return;
    }

    const phone = normalizePhone(order.customerPhone || order.customer?.phone);
    if (!phone || !(await canReceiveJourneyMarketing(phone, order))) return;

    const sent = await sendJourneyTemplate({
      phone,
      templateCandidates: ['1_velo_pos_venda_bebidas', 'velo_pos_venda_bebidas'],
      stage: 'post_sale',
      sourceId: orderSnap.id,
      sourceType: 'order',
    });

    if (sent.ok) {
      await orderRef.set({
        journeyPostSaleSent: true,
        journeyPostSaleTemplate: sent.templateName,
        journeyPostSaleMetaMessageId: sent.metaMessageId,
        journeyPostSaleSentAt: admin.firestore.FieldValue.serverTimestamp(),
        postOrderAlertSent: true,
      }, { merge: true });
    }
  }
}

export default handleNodeCallback(async (message, metadata) => {
  try {
    await processJourneyMessage(message);
  } catch (error) {
    console.error('[Journey Queue]', metadata?.messageId, error);
    throw error;
  }
}, {
  visibilityTimeoutSeconds: 120,
});
