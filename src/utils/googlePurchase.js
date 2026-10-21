// Google Analytics and Ads conversions are counted only after an order exists.
// The browser event is intentionally scoped to the current store's measurement ID.
const purchasesSent = new Set();

const validGa4 = (value) => /^G-[A-Z0-9]+$/.test(String(value || '').trim());
const normalizeAdsId = (value) => {
  const id = String(value || '').trim();
  if (/^AW-\d+$/.test(id)) return id;
  if (/^\d+$/.test(id)) return `AW-${id}`;
  return '';
};

export function getGoogleTrackingConfig(integrations, storeSettings) {
  const rawGa4 = integrations?.ga4?.frontendMeasurementId || storeSettings?.gaTrackingId;
  const ga4Id = validGa4(rawGa4) ? String(rawGa4).trim() : '';
  const adsId = normalizeAdsId(integrations?.gads?.conversionId);
  const rawLabel = String(integrations?.gads?.conversionLabel || '').trim();
  const conversionLabel = /^[a-zA-Z0-9_-]+$/.test(rawLabel) ? rawLabel : '';
  return { ga4Id, adsId, conversionLabel };
}

export function isGooglePurchaseEligible(order) {
  if (!order?.id || !order?.storeId || order.orderType === 'garcom') return false;
  if (['cancelled', 'canceled', 'cancelado'].includes(String(order.status || '').toLowerCase())) return false;
  if (order.paymentStatus === 'failed' || order.paymentStatus === 'rejected') return false;
  // Offline payments: a successfully recorded order is a conversion.
  // Online payments: wait for payment confirmation.
  return order.paymentStatus === 'paid' || order.paymentStatus === 'pending_on_delivery';
}

function ensureGoogleTag(destinationId) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
  }
  if (!document.getElementById('google-gtag-script') && !document.getElementById('velo-order-conversion-script')) {
    const script = document.createElement('script');
    script.id = 'velo-order-conversion-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(destinationId)}`;
    document.head.appendChild(script);
  }
  return window.gtag;
}

export function trackGooglePurchase(order) {
  if (!isGooglePurchaseEligible(order)) return false;
  const { ga4Id = '', adsId = '', conversionLabel = '' } = order.googleTracking || {};
  const hasGa4 = validGa4(ga4Id);
  const safeAdsId = normalizeAdsId(adsId);
  const hasAds = !!(safeAdsId && /^[a-zA-Z0-9_-]+$/.test(conversionLabel));
  if (!hasGa4 && !hasAds) return false;

  const key = `velo_google_purchase_${order.storeId}_${order.id}`;
  if (purchasesSent.has(key)) return false;
  try {
    if (localStorage.getItem(key)) return false;
  } catch { /* Storage may be disabled by the browser. */ }

  const gtag = ensureGoogleTag(hasGa4 ? ga4Id : safeAdsId);
  if (!gtag) return false;
  const total = Number(order.total || 0);
  const value = Number.isFinite(total) ? Math.max(0, total) : 0;
  const payload = {
    transaction_id: String(order.id),
    currency: 'BRL',
    value,
    items: (Array.isArray(order.items) ? order.items : []).map(item => ({
      item_id: String(item.id || item.productId || ''),
      item_name: String(item.name || ''),
      price: Number(item.price || 0),
      quantity: Number(item.quantity || item.qty || 1),
    })),
  };

  // Explicit destination prevents another tenant's Google destination from receiving the sale.
  if (hasGa4) {
    gtag('config', ga4Id, { send_page_view: false });
    gtag('event', 'purchase', { ...payload, send_to: ga4Id });
  }
  if (hasAds) {
    gtag('config', safeAdsId, { send_page_view: false });
    gtag('event', 'conversion', {
      send_to: `${safeAdsId}/${conversionLabel}`,
      transaction_id: String(order.id),
      currency: 'BRL',
      value,
    });
  }

  purchasesSent.add(key);
  try { localStorage.setItem(key, '1'); } catch { /* Keep in-memory protection. */ }
  return true;
}
