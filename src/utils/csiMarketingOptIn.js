// Opt-in explícito da Conveniência Santa Isabel, sem herdar autorização de outras lojas.
export function buildCsiCheckoutConsent({ storeId, marketingOptIn, adultConfirmed, now = new Date() } = {}) {
  const authorized = storeId === 'csi' && marketingOptIn === true && adultConfirmed === true;
  return {
    whatsappMarketingOptIn: authorized,
    alcoholMarketingAgeConfirmed: authorized,
    marketingOptInAt: authorized ? now.toISOString() : null,
    marketingOptInSource: authorized ? 'checkout_explicit_csi' : null,
  };
}

// Link auto iniciado pelo cliente. Não envia mensagens automaticamente.
export function buildCsiOptInWhatsAppUrl(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (/^\d{10,11}$/.test(phone)) phone = '55' + phone;
  if (!/^55\d{10,11}$/.test(phone)) return null;
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent('QUERO OFERTAS 18');
}


// Checkout: exige DDD e 8/9 dígitos, sem criar o 9º dígito por suposição.
// Retorna somente o número nacional; permite entrada com +55.
export function normalizeBrazilianCheckoutPhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim();
  if (!/^\+?[0-9\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  return /^[1-9][0-9][0-9]{8,9}$/.test(digits) ? digits : null;
}
