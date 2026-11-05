import { effectiveUnitPrice } from './promotions.js';

export const MAX_CHAT_PRODUCTS = 8;

export const productShareSlug = (name) => String(name ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 -]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '');

export function matchesChatProductSearch(product, query) {
  const normalize = value => String(value ?? '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const term = normalize(query).trim();
  if (!term) return true;
  return normalize([product?.name, product?.category, product?.sku].join(' ')).includes(term);
}

export function chatProductImageUrl(product) {
  const candidates = [product?.imageUrl, product?.images?.[0], product?.image, product?.photoUrl];
  const value = candidates.find(candidate => typeof candidate === 'string' && /^https?:\/\//i.test(candidate));
  return value || null;
}

export function formatChatProductPrice(product) {
  const rawPrice = effectiveUnitPrice(product);
  return Number.isFinite(rawPrice) && rawPrice > 0
    ? Number(rawPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Preço sob consulta';
}

export function buildChatProductShare(product, publicOrigin) {
  const formattedPrice = formatChatProductPrice(product);
  const slug = productShareSlug(product?.name) || encodeURIComponent(String(product?.id || ''));
  const url = `${String(publicOrigin).replace(/\/+$/, '')}/p/${slug}`;
  const displayName = String(product?.name || 'Produto').slice(0, 160);
  return `🛍️ *${displayName}*\n💰 ${formattedPrice}\n🔗 Veja os detalhes e compre pelo app:\n${url}\n\n✅ É este produto? Responda com o nome para confirmar, ou finalize sua compra pelo link.`;
}
