import admin from 'firebase-admin';
import { buildUnifiedWhatsAppAudience, latestOrderPerPhone, addInboundLead } from '../lib/whatsappLeadAudience.js';
import { normalizeMarketingPhone } from '../lib/whatsappMarketingGuard.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    })
  });
}
const db = admin.firestore();
const LIMIT = 25000;
const PAGE_SIZE = 50;

async function authorizeStore(decoded, storeId) {
  if (decoded.admin === true || decoded.superAdmin === true) return true;
  const email = String(decoded.email || '').trim().toLowerCase();
  if (['appdedelivery@gmail.com','appdidelivery@gmail.com','projetosdiego.l@gmail.com'].includes(email)) return true;
  const [user, store] = await Promise.all([
    db.collection('users').doc(decoded.uid).get(),
    db.collection('stores').doc(storeId).get()
  ]);
  const record = user.data() || {}, storeData = store.data() || {};
  if (record.storeId === storeId || storeData.ownerUid === decoded.uid ||
     (email && email === String(storeData.ownerEmail || storeData.email || '').trim().toLowerCase())) return true;
  if (email) {
    const team = await db.collection('team').where('storeId', '==', storeId).where('email', '==', email).limit(1).get();
    if (!team.empty) {
      const member = team.docs[0].data() || {};
      if (member.active !== false && member.disabled !== true &&
         !['inactive','inativo','disabled','bloqueado'].includes(String(member.status || '').toLowerCase())) return true;
    }
  }
  return false;
}

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value.seconds) return Number(value.seconds) * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function scan(storeId, collectionName, consume) {
  let scanned = 0, after = null;
  for (;;) {
    let q = db.collection(collectionName).where('storeId', '==', storeId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(Math.min(1000, LIMIT - scanned));
    if (after) q = q.startAfter(after);
    const page = await q.get();
    page.forEach(d => consume(d.data()));
    scanned += page.size;
    if (page.empty || page.size < 1000) return {scanned, truncated:false};
    if (scanned >= LIMIT) return {scanned, truncated:true};
    after = page.docs[page.docs.length - 1];
  }
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido'});
  const storeId = String(req.body?.storeId || '').trim();
  if (storeId !== 'csi') return res.status(403).json({error:'Consulta disponível somente para a loja CSI'});
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'');
  if (!token) return res.status(401).json({error:'Autenticação necessária'});
  try {
    const user = await admin.auth().verifyIdToken(token);
    if (!(await authorizeStore(user,storeId))) return res.status(403).json({error:'Acesso negado à loja'});
    const page = Math.max(1,Math.floor(Number(req.body?.page)||1));
    const orders=new Map(), inbound=new Map(), consents=new Map(), blocked=new Set();
    const [os, is, cs, bs, xs] = await Promise.all([
      scan(storeId, 'orders', data => latestOrderPerPhone(orders,data,millis(data.createdAt || data.paidAt))),
      scan(storeId, 'whatsapp_inbound', data => addInboundLead(inbound,data,millis(data.receivedAt || data.sentAt))),
      scan(storeId, 'whatsapp_marketing_consents', data => {
        const phone=normalizeMarketingPhone(data.phone);
        if(phone) consents.set(phone,data);
      }),
      scan(storeId, 'blocked_contacts', data => {
        const phone=normalizeMarketingPhone(data.phone);
        if(phone) blocked.add(phone);
      }),
      scan(storeId, 'whatsapp_marketing_optouts', data => {
        const phone=normalizeMarketingPhone(data.phone);
        if(phone) blocked.add(phone);
      })
    ]);
    const result=buildUnifiedWhatsAppAudience(orders,inbound,blocked,storeId,Date.now(),consents);
    const contacts=result.contacts.sort((a,b)=>a.phone.localeCompare(b.phone));
    return res.status(200).json({
      success:true, storeId, page, pageSize:PAGE_SIZE, total:contacts.length,
      totalPages:Math.ceil(contacts.length/PAGE_SIZE),
      contacts:contacts.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),
      breakdown:result.breakdown,
      truncated:os.truncated||is.truncated||cs.truncated||bs.truncated||xs.truncated,
      scanned:{orders:os.scanned,whatsapp:is.scanned,consents:cs.scanned}
    });
  } catch(error) {
    console.error('[WhatsApp contacts]',error?.message);
    return res.status(error?.code?.startsWith('auth/')?401:500).json({error:'Não foi possível listar os leads WhatsApp.'});
  }
}
