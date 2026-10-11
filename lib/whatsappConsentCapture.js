import {normalizeMarketingPhone} from './whatsappMarketingGuard.js';

// Explicit affirmative statement and 18+ confirmation, sent by the customer.
// Neither prior purchases nor opening a chat implicitly grants permission.
export const CSI_MARKETING_OPT_IN = 'QUERO OFERTAS 18';
export const CSI_MARKETING_PROMPT = 'Quer receber novidades e ofertas de bebidas da Conveniência Santa Isabel aqui no WhatsApp? Se você tem 18 anos ou mais e deseja participar, responda exatamente QUERO OFERTAS 18. Se não quiser, basta ignorar. Para sair depois, responda PARAR.';

export function normalizeCommand(input) {
  return String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().toLowerCase().replace(/\s+/g,' ');
}
export function isExplicitCsiOptIn(text) {
  return normalizeCommand(text)==='quero ofertas 18' ||
    normalizeCommand(text)==='quero ofertas tenho 18 anos';
}
export function isExplicitCsiOptOut(text) {
  return ['parar','stop','sair da lista','remover da lista','nao quero receber ofertas','cancelar mensagens']
    .includes(normalizeCommand(text));
}
export function hasValidCsiMarketingRecord(record) {
  return record?.optedIn===true &&
    record?.adultConfirmed===true &&
    record?.source==='whatsapp_inbound_explicit_keyword' &&
    record?.consentVersion==='2026-10-v1' &&
    typeof record.sourceMessageId==='string' && record.sourceMessageId.length>0;
}
export function storedCsiConsentId(storeId,phone) {
  const normalized=normalizeMarketingPhone(phone);
  if(!storeId||!normalized)return null;
  return `${storeId}_${normalized}`;
}
export function shouldOfferCsiOptIn({storeId,hasApiCredentials,optedOut,alreadyOptedIn,lastPromptAtMs,nowMs,hasText,blocked}={}){
  if(storeId!=='csi'||!hasApiCredentials||optedOut||alreadyOptedIn||blocked||!hasText)return false;
  if(Number.isFinite(lastPromptAtMs)&&lastPromptAtMs>0 && nowMs-lastPromptAtMs<45*86400000)return false;
  return true;
}
