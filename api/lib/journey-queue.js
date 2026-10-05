import admin from 'firebase-admin';
import { send } from '@vercel/queue';

export const JOURNEY_TOPIC = 'velo-whatsapp-journey';
export const CSI_STORE_ID = 'csi';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    }),
  });
}

export const db = admin.firestore();

export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits.length === 11 ? digits : null;
}

export function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value.seconds) return Number(value.seconds) * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function enqueueJourney(payload, options = {}) {
  const delaySeconds = Math.max(0, Math.min(604800, Number(options.delaySeconds) || 0));
  const retentionSeconds = Math.max(60, Math.min(604800, Number(options.retentionSeconds) || Math.max(delaySeconds + 3600, 86400)));

  return send(JOURNEY_TOPIC, payload, {
    delaySeconds,
    retentionSeconds,
    idempotencyKey: options.idempotencyKey,
  });
}

export async function canReceiveJourneyMarketing(phone, source = {}) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const [blockedSnap, inboundSnap] = await Promise.all([
    db.collection('blocked_contacts').where('storeId', '==', CSI_STORE_ID).limit(2000).get(),
    db.collection('whatsapp_inbound').where('storeId', '==', CSI_STORE_ID).limit(5000).get(),
  ]);

  let blocked = false;
  blockedSnap.forEach((doc) => {
    if (normalizePhone(doc.data().phone) === normalized) blocked = true;
  });
  if (blocked) return false;

  if (source.marketingOptIn === true || source.whatsappMarketingOptIn === true) return true;

  let related = false;
  inboundSnap.forEach((doc) => {
    const data = doc.data();
    if (data.direction === 'outbound') return;
    if (normalizePhone(data.from || data.phone) === normalized) related = true;
  });

  return related;
}

export async function sendJourneyTemplate({ phone, templateCandidates, stage, sourceId, sourceType }) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, reason: 'invalid_phone' };

  const settingsDoc = await db.collection('settings').doc(CSI_STORE_ID).get();
  const waConfig = settingsDoc.data()?.integrations?.whatsapp;
  if (!waConfig?.phoneNumberId || !waConfig?.apiToken) {
    throw new Error('WhatsApp oficial da CSI não configurado.');
  }

  const endpoint = `https://graph.facebook.com/v19.0/${waConfig.phoneNumberId}/messages`;
  const safePhone = `55${normalized}`;
  let lastError = null;

  for (const templateName of templateCandidates) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${waConfig.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: safePhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'pt_BR' },
        },
      }),
    });

    const metaData = await response.json();
    if (!response.ok) {
      lastError = metaData;
      continue;
    }

    const metaMessageId = metaData.messages?.[0]?.id || null;

    await db.collection('whatsapp_inbound').add({
      storeId: CSI_STORE_ID,
      to: safePhone,
      text: `[Jornada Automática: ${stage}] Template oficial enviado: ${templateName}`,
      templateName,
      campaignType: 'journey_automation',
      journeyStage: stage,
      journeySourceId: sourceId || null,
      journeySourceType: sourceType || null,
      metaMessageId,
      deliveryStatus: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      direction: 'outbound',
    });

    return { ok: true, templateName, metaMessageId };
  }

  const message = lastError?.error?.message || 'Meta recusou o template da jornada.';
  throw new Error(message);
}
