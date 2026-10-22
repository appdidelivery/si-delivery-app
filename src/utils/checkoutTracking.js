// GA4 checkout events must use the measurement ID belonging to the current store.
// This module is intentionally independent of React and payment gateways.
export function buildBeginCheckoutPayload(cart, measurementId) {
  const id = String(measurementId || '').trim();
  if (!/^G-[A-Z0-9]+$/.test(id) || !Array.isArray(cart)) return null;
  const items = cart.map(item => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    return {
      item_id: String(item?.id || item?.productId || ''),
      item_name: String(item?.name || ''),
      price,
      quantity,
    };
  }).filter(item => item.item_id && Number.isFinite(item.price) && item.price >= 0 && Number.isFinite(item.quantity) && item.quantity > 0);
  if (!items.length) return null;
  const value = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
  return { send_to: id, currency: 'BRL', value, items };
}
