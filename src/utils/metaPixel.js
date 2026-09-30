const initializedPixels = new Set();
const purchases = new Set();

export function initMetaPixel(rawId) {
  const pixelId = String(rawId || '').trim();
  if (!/^\d+$/.test(pixelId)) return false;
  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement('script');
    script.id = 'meta-pixel-script';
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (!initializedPixels.has(pixelId)) {
    window.fbq('init', pixelId);
    initializedPixels.add(pixelId);
  }
  return true;
}

export function trackMetaEvent(pixelId, name, data = {}, options = {}) {
  if (initMetaPixel(pixelId)) {
    window.fbq('trackSingle', String(pixelId).trim(), name, data, options);
  }
}

export function getMetaContext(pixelId) {
  const cookies = Object.fromEntries(document.cookie.split(';').map(value => {
    const separator = value.indexOf('=');
    return [value.slice(0, separator).trim(), value.slice(separator + 1)];
  }));
  return {
    pixelId: String(pixelId || '').trim(),
    eventSourceUrl: window.location.origin + window.location.pathname,
    clientUserAgent: navigator.userAgent,
    fbp: cookies._fbp || '',
    fbc: cookies._fbc || '',
  };
}

export function trackMetaPurchase(orderId, order) {
  const pixelId = order.metaTracking?.pixelId;
  if (!orderId || !pixelId) return;
  const key = `meta_purchase_${pixelId}_${orderId}`;
  try { if (localStorage.getItem(key)) return; } catch { /* Armazenamento indisponível. */ }
  if (purchases.has(key) || !initMetaPixel(pixelId)) return;
  trackMetaEvent(pixelId, 'Purchase', { value: Number(order.total || 0), currency: 'BRL' }, { eventID: String(orderId) });
  purchases.add(key);
  try { localStorage.setItem(key, '1'); } catch { /* A deduplicação também usa eventID. */ }
}
