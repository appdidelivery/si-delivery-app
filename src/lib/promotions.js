// Agendamento de ofertas. Vigência por dias corridos no fuso de São Paulo,
// com término EXCLUSIVO (00h do dia seguinte) para evitar problemas de 23:59:59.
const ZONE = 'America/Sao_Paulo';
const SAO_PAULO_OFFSET = '-03:00';

export function dateInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

function validDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00${SAO_PAULO_OFFSET}`)) &&
    new Date(`${value}T12:00:00${SAO_PAULO_OFFSET}`).toISOString().slice(0, 10) === value;
}
function addDays(value, days) {
  const ms = Date.parse(`${value}T12:00:00Z`);
  return new Date(ms + days * 86400000).toISOString().slice(0, 10);
}
export function promotionStartIso(dateStr) {
  return validDateString(dateStr) ? new Date(`${dateStr}T00:00:00${SAO_PAULO_OFFSET}`).toISOString() : '';
}
export function promotionEndIso(dateStr) {
  return validDateString(dateStr) ? new Date(`${addDays(dateStr, 1)}T00:00:00${SAO_PAULO_OFFSET}`).toISOString() : '';
}
export function promotionDateInput(iso, isEnd = false) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // Término salvo como meia-noite do dia seguinte (limite exclusivo).
  return dateInSaoPaulo(new Date(date.getTime() - (isEnd ? 1000 : 0)));
}
export function presetPromotionRange(preset, today = dateInSaoPaulo()) {
  if (preset === 'none') return { promotionStartAt: '', promotionEndAt: '' };
  if (!validDateString(today)) throw new Error('Data inválida');
  let first = today, last = today;
  if (preset === 'week') last = addDays(today, 6);
  if (preset === 'weekend') {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    const offset = day === 0 ? 0 : day === 6 ? 0 : 6 - day;
    first = addDays(today, offset);
    last = addDays(first, day === 0 ? 0 : day === 6 ? 1 : 1);
  }
  return { promotionStartAt: promotionStartIso(first), promotionEndAt: promotionEndIso(last) };
}
export function promotionStatus(product, now = Date.now()) {
  const promo = Number(product?.promotionOriginalPrice ?? product?.promotionalPrice);
  if (!Number.isFinite(promo) || promo <= 0) return 'none';
  const start = product?.promotionStartAt;
  const end = product?.promotionEndAt;
  if (!start && !end) return 'active'; // Ofertas legadas permanecem ativas, sem prazo.
  if (!start || !end) return 'invalid';
  const startMs = Date.parse(start), endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 'invalid';
  const currentMs = Number(now);
  if (currentMs < startMs) return 'scheduled';
  if (currentMs >= endMs) return 'expired';
  return 'active';
}
export function effectivePromoPrice(product, now = Date.now()) {
  return promotionStatus(product, now) === 'active' ? Number(product.promotionOriginalPrice ?? product.promotionalPrice) : 0;
}
export function effectiveUnitPrice(product, now = Date.now()) {
  return effectivePromoPrice(product, now) || Number(product?.catalogBasePrice ?? product?.price ?? 0);
}
export function validatePromotion(product) {
  const promotionalPrice = Number(product?.promotionalPrice || 0);
  const normalPrice = Number(product?.price || 0);
  if (!Number.isFinite(promotionalPrice) || promotionalPrice < 0) return 'Preço promocional inválido.';
  if (promotionalPrice > 0 && (!Number.isFinite(normalPrice) || promotionalPrice >= normalPrice)) {
    return 'O preço promocional deve ser menor que o preço normal.';
  }
  const a = product?.promotionStartAt, b = product?.promotionEndAt;
  if (!a && !b) return null;
  if (!a || !b) return 'Informe a data de início e a data de término da promoção.';
  if (promotionalPrice <= 0) return 'Informe o preço promocional antes de agendar.';
  if (!Number.isFinite(Date.parse(a)) || !Number.isFinite(Date.parse(b)) || Date.parse(b) <= Date.parse(a)) {
    return 'A data final deve ser igual ou posterior à data de início.';
  }
  return null;
}
