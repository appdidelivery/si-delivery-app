import admin from 'firebase-admin';
import crypto from 'node:crypto';
import { brazilLocalParts, isStoreOpenForSlot, confirmedMatchEvent } from '../lib/lifecycleSchedule.js';
import { safeCurrentFixture, matchAudienceAllowed } from '../lib/footballFixtures.js';
import {
  normalizeMarketingPhone, hasEligibleMarketingConsent,
  reserveMarketingAttempt, isMarketingOptedOut
} from '../lib/whatsappMarketingGuard.js';

function millis(v) {
  if(!v) return 0;
  if(typeof v.toMillis==='function') return v.toMillis();
  if(typeof v.toDate==='function') return v.toDate().getTime();
  if(typeof v.seconds==='number') return v.seconds*1000;
  const ms=new Date(v).getTime();
  return Number.isFinite(ms)?ms:0;
}

export async function handleFootballAlert(req,res,db,windowName) {
  res.setHeader('Cache-Control','no-store');
  const secret=process.env.CRON_SECRET;
  if(req.method!=='GET') return res.status(405).json({success:false,error:'method_not_allowed'});
  if(!secret||req.headers.authorization!==`Bearer ${secret}`)
    return res.status(401).json({success:false,error:'unauthorized'});

  const now=new Date();
  const p=brazilLocalParts(now);
  const startHour=windowName==='early'?14:18;
  if(p.hour!==startHour) return res.status(200).json({success:true,skipped:'outside_time_slot'});

  const storeId='csi';
  const eventSnap=await db.collection('whatsapp_marketing_events').doc(`${storeId}_${p.dateKey}`).get();
  if(!eventSnap.exists) return res.status(200).json({success:true,skipped:'no_match_today'});
  const event=eventSnap.data();
  if(!safeCurrentFixture(event,p.dateKey,now)||!confirmedMatchEvent(event,p.dateKey,now))
    return res.status(200).json({success:true,skipped:'unconfirmed_or_stale_fixture'});

  const [settingsDoc,storeDoc]=await Promise.all([
    db.collection('settings').doc(storeId).get(),
    db.collection('stores').doc(storeId).get()
  ]);
  const wa=settingsDoc.data()?.integrations?.whatsapp||{};
  const settings=wa.footballAutomation||{};
  const template=String(settings.approvedTemplateName||'');
  // No marketing message until a dedicated game-alert template is approved and enabled.
  // A aprovação do template, por si só, não isenta o lojista das restrições
  // da Política do WhatsApp Business, especialmente para lojas de álcool.
  // Exige liberação jurídica/de políticas registrada explicitamente por loja.
  if(settings.enabled!==true || settings.policyClearedForThisStore !== true ||
    settings.contentType !== 'sports_information_only' ||
    !/^[a-z0-9_]{4,100}$/.test(template) ||
    !wa.phoneNumberId || !wa.apiToken)
    return res.status(200).json({success:true,skipped:'football_template_not_enabled'});
  if(!storeDoc.exists||!isStoreOpenForSlot(storeDoc.data(),p))
    return res.status(200).json({success:true,skipped:'store_closed'});
  const vacation=storeDoc.data()?.vacationMode;
  const start=millis(vacation?.start),end=millis(vacation?.end);
  if(vacation?.active&&(!start||now.getTime()>=start)&&(!end||now.getTime()<=end))
    return res.status(200).json({success:true,skipped:'vacation_mode'});

  const [ordersSnap,blockedSnap]=await Promise.all([
    db.collection('orders').where('storeId','==',storeId).limit(5000).get(),
    db.collection('blocked_contacts').where('storeId','==',storeId).limit(2000).get()
  ]);
  const blocked=new Set(blockedSnap.docs.map(d=>normalizeMarketingPhone(d.data().phone)).filter(Boolean));
  const ignoredStatuses=new Set(['canceled','cancelado','cancelled','refunded','estornado']);
  const byPhone=new Map();
  ordersSnap.forEach(doc=>{
    const order=doc.data();
    if(ignoredStatuses.has(String(order.status||'').toLowerCase())) return;
    const phone=normalizeMarketingPhone(order.customerPhone||order.customer?.phone);
    const at=millis(order.createdAt||order.paidAt);
    if(!phone||!at) return;
    const prev=byPhone.get(phone);
    if(!prev||at>prev.lastOrderAtMs) byPhone.set(phone,{
      phone,lastOrderAtMs:at,
      consent:hasEligibleMarketingConsent(order,true) && order.footballAlertsOptIn===true,
      adult:order.alcoholMarketingAgeConfirmed===true||
        order.customer?.alcoholMarketingAgeConfirmed===true,
      team:['gremio','internacional','both','none'].includes(order.footballTeam) ? order.footballTeam : null
    });
  });

  const candidates=[...byPhone.values()].filter(c=>!blocked.has(c.phone)&&
    matchAudienceAllowed(c,event,settings.allowUnsegmented===true))
    .sort((a,b)=>b.lastOrderAtMs-a.lastOrderAtMs);
  const stageLimit=Math.max(1,Math.min(20,Number(settings.dailyLimit)||20));
  let accepted=0,failed=0,skipped=0;
  for(const customer of candidates) {
    if(accepted>=stageLimit) break;
    if(await isMarketingOptedOut(db,storeId,customer.phone)) {skipped++;continue;}
    const hash=crypto.createHash('sha256').update(`${storeId}:${customer.phone}`).digest('hex');
    const recipientRef=db.collection('whatsapp_football_contacts').doc(`${storeId}_${hash}`);
    const prior=await recipientRef.get();
    const state=prior.data()||{};
    if(state.lastSourceId===event.sourceId || (millis(state.lastSentAt)>0&&
      now.getTime()-millis(state.lastSentAt)<7*86400000)) {skipped++;continue;}

    const reservation=await reserveMarketingAttempt(db,{
      storeId,phone:customer.phone,type:'football_match',dailyLimit:stageLimit
    });
    if(!reservation.allowed) {skipped++;if(reservation.reason==='daily_limit_reached') break;continue;}
    const kickoff=event.kickoffAt?.toDate?event.kickoffAt.toDate():new Date(event.kickoffAt);
    const localTime=new Intl.DateTimeFormat('pt-BR',{
      timeZone:'America/Sao_Paulo',weekday:'long',day:'2-digit',
      month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false
    }).format(kickoff);
    try {
      const meta=await fetch(`https://graph.facebook.com/v19.0/${wa.phoneNumberId}/messages`,{
        method:'POST',
        headers:{Authorization:`Bearer ${wa.apiToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          messaging_product:'whatsapp',recipient_type:'individual',
          to:`55${customer.phone}`,type:'template',
          template:{
            name:template,language:{code:'pt_BR'},
            components:[{type:'body',parameters:[
              {type:'text',text:String(event.matchLabel).slice(0,100)},
              {type:'text',text:localTime}
            ]}]
          }
        })
      });
      const reply=await meta.json();
      if(!meta.ok) {failed++;console.warn('[Football Alert] Meta rejected template',{status:meta.status});continue;}
      const wamid=reply.messages?.[0]?.id||null;
      const batch=db.batch();
      batch.set(recipientRef,{
        storeId,phoneHash:hash,lastSourceId:event.sourceId,
        lastSentAt:admin.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      batch.set(db.collection('whatsapp_inbound').doc(),{
        storeId,to:`55${customer.phone}`,templateName:template,
        text:`[Alerta de futebol] ${event.matchLabel} — ${localTime}`,
        campaignType:'football_match',sourceId:event.sourceId,
        matchLabel:event.matchLabel,marketingOccasion:'football',
        metaMessageId:wamid,deliveryStatus:'sent',
        sentAt:admin.firestore.FieldValue.serverTimestamp(),
        receivedAt:admin.firestore.FieldValue.serverTimestamp(),
        status:'sent',direction:'outbound'
      });
      await batch.commit();
      accepted++;
    }catch(error) {
      failed++;
      console.error('[Football Alert] Message submission failed',error.message);
    }
  }
  return res.status(200).json({
    success:true,storeId,window:windowName,fixture:event.matchLabel,
    candidates:candidates.length,acceptedByMeta:accepted,failed,skipped,
    message:'Meta accepted messages; delivery confirmed by webhooks only'
  });
}
