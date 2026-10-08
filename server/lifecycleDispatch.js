import admin from 'firebase-admin';
import crypto from 'node:crypto';
import {
  getLifecycleStage, hasMarketingOptIn, isMarketingOptedOut,
  normalizeMarketingPhone, reserveMarketingAttempt
} from '../lib/whatsappMarketingGuard.js';
import {
  dispatchWindow, confirmedMatchEvent, occasionPurchaseScore, isStoreOpenForSlot
} from '../lib/lifecycleSchedule.js';
import { safeCurrentFixture } from '../lib/footballFixtures.js';
import { occasionTemplateComponents, canUseGenericOccasionTemplate } from '../lib/csiOccasionTemplate.js';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      }),
    });
  }
  return admin.firestore();
}

export async function handleOccasionLifecycle(req, res, slot) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Método não permitido' });

  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, error: 'CRON_SECRET ausente' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }

  // A janela pode variar até 59 minutos no Vercel Hobby.
  const dispatch = dispatchWindow(slot);
  if (!dispatch.allowed) {
    return res.status(200).json({ success: true, skipped: dispatch.reason, slot });
  }

  const storeId = 'csi'; // Piloto exclusivo: outras lojas não herdam templates de bebidas.
  const db = getFirestore();
  const [settingsDoc, storeDoc] = await Promise.all([
    db.collection('settings').doc(storeId).get(),
    db.collection('stores').doc(storeId).get()
  ]);
  if (!settingsDoc.exists || !storeDoc.exists) {
    return res.status(200).json({ success: true, skipped: 'store_not_configured' });
  }

  const wa = settingsDoc.data()?.integrations?.whatsapp || {};
  const cfg = wa.lifecycleAutomation || {};
  if (cfg.enabled === false || !wa.phoneNumberId || !wa.apiToken) {
    return res.status(200).json({ success: true, skipped: 'disabled_or_meta_missing' });
  }

  const store = storeDoc.data() || {};
  if (!isStoreOpenForSlot(store, dispatch.now)) {
    return res.status(200).json({ success: true, skipped: 'store_closed_at_slot' });
  }
  if (store.vacationMode?.active) {
    const start = toMillis(store.vacationMode.start);
    const end = toMillis(store.vacationMode.end);
    if ((!start || Date.now() >= start) && (!end || Date.now() <= end)) {
      return res.status(200).json({ success: true, skipped: 'store_on_vacation' });
    }
  }

  if (slot === 'wed') {
    // Não usar linguagem de jogo sem partida confirmada.
    const eventDoc = await db.collection('whatsapp_marketing_events')
      .doc(`${storeId}_${dispatch.now.dateKey}`).get();
    if (!eventDoc.exists || !safeCurrentFixture(eventDoc.data(), dispatch.now.dateKey) || !confirmedMatchEvent(eventDoc.data(), dispatch.now.dateKey)) {
      return res.status(200).json({ success: true, skipped: 'football_match_not_confirmed' });
    }
  }

  // A jornada 30/60/90 existente continua válida. Somente usar o modelo
  // genérico após aprovação explícita na Meta e revisão de política.
  const useGenericOccasion = canUseGenericOccasionTemplate(cfg);
  const genericTemplate = useGenericOccasion ? String(cfg.occasionTemplateName) : null;
  const genericComponents = useGenericOccasion ? occasionTemplateComponents(slot) : null;
  const templates = {
    30: 'velo_retencao_30_bebidas',
    60: 'velo_retencao_60_bebidas',
    90: 'velo_retencao_90_bebidas',
    ...(cfg.templates || {})
  };
  if (![30, 60, 90].every(stage => typeof templates[stage] === 'string' && templates[stage])) {
    return res.status(200).json({ success: true, skipped: 'templates_incomplete' });
  }

  const [ordersSnap, blockedSnap, lifecycleSnap] = await Promise.all([
    db.collection('orders').where('storeId', '==', storeId).limit(5000).get(),
    db.collection('blocked_contacts').where('storeId', '==', storeId).limit(2000).get(),
    db.collection('whatsapp_lifecycle_contacts').where('storeId', '==', storeId).limit(3000).get()
  ]);
  const blocked = new Set(blockedSnap.docs.map(d => normalizeMarketingPhone(d.data().phone)).filter(Boolean));
  const previousByHash = new Map(lifecycleSnap.docs.map(d => [d.id, d.data()]));
  const deniedStatuses = new Set(['canceled','cancelado','cancelled','refunded','estornado']);
  const customers = new Map();

  ordersSnap.forEach(doc => {
    const order = doc.data();
    if (deniedStatuses.has(String(order.status || '').toLowerCase())) return;
    const phone = normalizeMarketingPhone(order.customerPhone || order.customer?.phone);
    const purchasedAt = toMillis(order.createdAt || order.paidAt);
    if (!phone || !purchasedAt) return;
    const entry = customers.get(phone) || { phone, purchaseTimes: [], lastOrderAtMs: 0 };
    entry.purchaseTimes.push(new Date(purchasedAt));
    if (purchasedAt > entry.lastOrderAtMs) {
      entry.lastOrderAtMs = purchasedAt;
      entry.customerName = order.customerName || order.customer?.name || 'Cliente';
      entry.optedIn = hasMarketingOptIn(order);
      // Bebidas alcoólicas: um contato sem confirmação de maioridade não é elegível.
      entry.adultConfirmed = order.alcoholMarketingAgeConfirmed === true ||
        order.customer?.alcoholMarketingAgeConfirmed === true;
    }
    customers.set(phone, entry);
  });

  const now = Date.now();
  const cooldownMs = 7 * 86400000;
  const candidates = Array.from(customers.values()).map(customer => ({
    ...customer,
    daysInactive: Math.floor((now - customer.lastOrderAtMs) / 86400000),
  })).filter(c => c.daysInactive >= 30 && c.optedIn && c.adultConfirmed && !blocked.has(c.phone))
    .map(c => {
      const hash = crypto.createHash('sha256').update(`${storeId}:${c.phone}`).digest('hex');
      const previous = previousByHash.get(hash) || {};
      const stage = getLifecycleStage(c.daysInactive);
      const newCycle = c.lastOrderAtMs > (Number(previous.lastOrderAtMs) || 0);
      const lastStage = newCycle ? 0 : Number(previous.lastStageSent) || 0;
      const lastSent = newCycle ? 0 : toMillis(previous.lastSentAt);
      return {
        ...c, hash, stage,
        allowed: stage > lastStage && (!lastSent || now - lastSent >= cooldownMs),
        score: occasionPurchaseScore(c.purchaseTimes, slot)
      };
    }).filter(c => c.allowed)
    .sort((a, b) => b.score - a.score || a.daysInactive - b.daysInactive);

  // Teto compartilhado com os disparos manuais/carrinho/pós-venda.
  const dailyLimit = Math.max(1, Math.min(20, Number(cfg.dailyLimit) || 20));
  let accepted = 0;
  let failed = 0;
  let skippedOptOut = 0;
  let stoppedByQuota = false;

  for (const customer of candidates) {
    if (accepted >= dailyLimit) break;
    if (await isMarketingOptedOut(db, storeId, customer.phone)) { skippedOptOut++; continue; }

    const reserved = await reserveMarketingAttempt(db, {
      storeId, phone: customer.phone, type: `occasion_${slot}_${customer.stage}`, dailyLimit
    });
    if (!reserved.allowed) {
      if (reserved.reason === 'daily_limit_reached') { stoppedByQuota = true; break; }
      continue;
    }

    const selectedTemplate = useGenericOccasion ? genericTemplate : templates[customer.stage];
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${wa.apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', recipient_type: 'individual',
          to: `55${customer.phone}`, type: 'template',
          template: {
            name: selectedTemplate,
            language: { code: 'pt_BR' },
            ...(useGenericOccasion ? { components: genericComponents } : {})
          }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        failed++;
        console.warn('[Lifecycle Occasion] Template recusado pela Meta', { slot, stage: customer.stage, status: response.status });
        continue;
      }

      const metaMessageId = data.messages?.[0]?.id || null;
      const batch = db.batch();
      batch.set(db.collection('whatsapp_lifecycle_contacts').doc(customer.hash), {
        storeId, phoneHash: customer.hash, customerName: customer.customerName,
        lastStageSent: customer.stage, lastTemplateName: selectedTemplate,
        lastOrderAtMs: customer.lastOrderAtMs, lastDaysInactive: customer.daysInactive,
        lastMetaMessageId: metaMessageId,
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      batch.set(db.collection('whatsapp_inbound').doc(), {
        storeId, to: `55${customer.phone}`,
        text: `[Jornada ${customer.stage}d / ${slot}] Template oficial: ${selectedTemplate}`,
        templateName: selectedTemplate, campaignType: 'lifecycle_retention',
        lifecycleStage: customer.stage, marketingOccasion: slot,
        metaMessageId, deliveryStatus: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent', direction: 'outbound'
      });
      await batch.commit();
      accepted++;
    } catch (error) {
      failed++;
      console.error('[Lifecycle Occasion] Erro de envio', error.message);
    }
  }

  return res.status(200).json({
    success: true, storeId, slot, localDate: dispatch.now.dateKey,
    eligible: candidates.length, acceptedByMeta: accepted, failed,
    skippedOptOut, stoppedByQuota, dailyLimit,
    note: 'Meta aceitou o envio; entrega, leitura e conversão dependem dos webhooks.'
  });
}
