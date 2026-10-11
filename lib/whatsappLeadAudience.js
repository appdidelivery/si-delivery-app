import { hasMarketingOptIn, hasEligibleMarketingConsent, normalizeMarketingPhone } from './whatsappMarketingGuard.js';
import {hasValidCsiMarketingRecord} from './whatsappConsentCapture.js';

// This helper only analyzes contacts; inbound service inquiries never become
// marketing opt-in by inference. It never accesses Meta or sends a message.
export function buildUnifiedWhatsAppAudience(ordersByPhone, inboundByPhone, blockedPhones, storeId, nowMs=Date.now(), recordedConsents=new Map()) {
  const allPhones=new Set([...ordersByPhone.keys(),...inboundByPhone.keys(),...recordedConsents.keys()]);
  const eligible=[],breakdown={
    uniqueContacts:allPhones.size,withPurchase:0,onlyInboundLeads:0,
    inboundConversations:inboundByPhone.size,activeService24h:0,
    activeServiceWithoutMarketingConsent:0,
    missingMarketingConsent:0,missingAdultRecord:0,
    excludedBlockedOrOptOut:0,eligibleMarketing:0,explicitWhatsAppConsents:0
  };
  for(const phone of allPhones) {
    const order=ordersByPhone.get(phone);
    const inbound=inboundByPhone.get(phone);
    if(order)breakdown.withPurchase++;else breakdown.onlyInboundLeads++;
    const isActive=!!inbound && Number.isFinite(inbound.lastInboundMs) &&
      inbound.lastInboundMs>nowMs-24*60*60*1000 && inbound.lastInboundMs<=nowMs;
    if(isActive)breakdown.activeService24h++;
    if(blockedPhones.has(phone)){breakdown.excludedBlockedOrOptOut++;continue;}
    // The customer's first contact is sufficient for normal service replies
    // during the Meta 24h window, not for unrelated marketing campaigns.
    const explicit = storeId==='csi' && hasValidCsiMarketingRecord(recordedConsents.get(phone));
    if(explicit){
      eligible.push(phone);
      breakdown.explicitWhatsAppConsents++;
      continue;
    }
    if(!order||!hasMarketingOptIn(order)){
      breakdown.missingMarketingConsent++;
      if(isActive)breakdown.activeServiceWithoutMarketingConsent++;
      continue;
    }
    if(!hasEligibleMarketingConsent(order,storeId==='csi')){
      breakdown.missingAdultRecord++;
      if(isActive)breakdown.activeServiceWithoutMarketingConsent++;
      continue;
    }
    eligible.push(phone);
  }
  breakdown.eligibleMarketing=eligible.length;
  return {eligible,breakdown};
}

export function latestOrderPerPhone(map,order,timeMs) {
  const phone=normalizeMarketingPhone(order.customerPhone||order.customer?.phone);
  if(!phone||!Number.isFinite(timeMs)||timeMs<=0)return;
  const status=String(order.status||'').toLowerCase();
  if(['cancelado','canceled','cancelled','refunded','estornado'].includes(status))return;
  const prior=map.get(phone);
  if(!prior||timeMs>prior._atMs)map.set(phone,{...order,_atMs:timeMs});
}

export function addInboundLead(map,message,timeMs) {
  if(message.direction!=='inbound')return;
  const phone=normalizeMarketingPhone(message.from);
  if(!phone||!Number.isFinite(timeMs)||timeMs<=0)return;
  const existing=map.get(phone);
  if(!existing||timeMs>existing.lastInboundMs)map.set(phone,{lastInboundMs:timeMs});
}
