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
