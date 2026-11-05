import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { productShareSlug, matchesChatProductSearch, chatProductImageUrl, buildChatProductShare, MAX_CHAT_PRODUCTS } from '../src/lib/chatProductShare.js';

test('gera o link real da vitrine com slug idêntico à página de produtos', () => {
  const item = { id: 'p123', name: 'Água Tônica 350ml', price: 5.9, imageUrl: 'https://cdn.example.com/agua.jpg' };
  assert.equal(productShareSlug(item.name), 'agua-tonica-350ml');
  const msg = buildChatProductShare(item, 'https://convenienciasantaisabel.com.br');
  assert.match(msg, /R\$\s*5,90/);
  assert.match(msg, /https:\/\/convenienciasantaisabel\.com\.br\/p\/agua-tonica-350ml/);
  assert.match(msg, /Escolher produto/);
});
test('suporta preço promocional vigente e não oferece preço falso quando está vazio', () => {
  const sale = { name: 'Red Label', price: 149.9, promotionalPrice: 129.9, promotionStartAt: '2020-01-01', promotionEndAt: '2099-01-01' };
  assert.match(buildChatProductShare(sale, 'https://csi.velodelivery.com.br'), /129,90/);
  assert.match(buildChatProductShare({ name: 'Sem valor' }, 'https://csi.velodelivery.com.br'), /Preço sob consulta/);
});
test('busca sem acentos e imagem HTTP válida, limita seleção múltipla', () => {
  assert.equal(matchesChatProductSearch({ name: 'Água Tônica', category: 'Bebidas' }, 'agua tonica'), true);
  assert.equal(matchesChatProductSearch({ name: 'Água Tônica' }, 'vinho'), false);
  assert.equal(chatProductImageUrl({ imageUrl: 'javascript:alert(1)', images: ['https://cdn.example.com/p.png'] }), 'https://cdn.example.com/p.png');
  assert.equal(MAX_CHAT_PRODUCTS, 8);
});

test('interface usa seleção manual e chat_reply oficial sem disparos automáticos', () => {
  const ui = readFileSync(new URL('../src/components/AdminChat.jsx', import.meta.url), 'utf8');
  const start = ui.indexOf('const handleSendCatalogProducts = async');
  const end = ui.indexOf('const handleOpenChat = async', start);
  const action = ui.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(ui, /onClick={openProductPicker}/);
  assert.match(ui, /onClick={handleSendCatalogProducts}/);
  assert.match(action, /resolveWhatsAppChatRecipient/);
  assert.match(action, /action: 'chat_reply'/);
  assert.match(action, /mediaType: 'image'/);
  assert.match(action, /sentIds\.push\(product\.id\)/);
});

test('lista interativa do catálogo usa WhatsApp oficial e devolve a escolha no chat, sem pedido automático', () => {
  const ui = readFileSync(new URL('../src/components/AdminChat.jsx', import.meta.url), 'utf8');
  const api = readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
  const handlerStart = ui.indexOf('const handleSendCatalogProducts = async');
  const handlerEnd = ui.indexOf('const handleOpenChat = async', handlerStart);
  const action = ui.slice(handlerStart, handlerEnd);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.match(action, /action: 'chat_product_offer'/);
  assert.match(action, /productIds: sentIds/);
  assert.match(ui, /msg\.source === 'chat_product_selection'/);

  const sendStart = api.indexOf("if (action === 'chat_product_offer')");
  const sendEnd = api.indexOf("if (action === 'chat_reply')", sendStart);
  assert.ok(sendStart >= 0 && sendEnd > sendStart);
  const send = api.slice(sendStart, sendEnd);
  assert.match(send, /await assertStoreAccess|const productSnaps/);
  assert.match(send, /type: 'list'/);
  assert.match(send, /Escolher produto/);
  assert.match(send, /whatsapp_product_offers/);
  assert.match(send, /data\.storeId === storeId/);

  const receiver = api.indexOf("if (String(interactivePayload).startsWith('velo_pick_'))");
  const normalInbound = api.indexOf('const inboundMessageRef = await db.collection', receiver);
  assert.ok(receiver >= 0 && normalInbound > receiver, 'deve capturar a escolha antes do chatbot');
  const capture = api.slice(receiver, normalInbound);
  assert.match(capture, /expectedPhone !== normalizedPhone/);
  assert.match(capture, /source: 'chat_product_selection'/);
  assert.match(capture, /tx\.set\(selectionRef/);
  assert.match(capture, /tx\.update\(offerRef/);
  assert.match(capture, /continue;/);
});

test('cliente confirma quantidade e subtotal antes de aparecer como escolha do vendedor', () => {
  const api = readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/components/AdminChat.jsx', import.meta.url), 'utf8');
  const start = api.indexOf("if (String(interactivePayload).startsWith('velo_pick_'))");
  const end = api.indexOf('// 2. SALVA A MENSAGEM NO PAINEL DO LOJISTA COM A MÍDIA!', start);
  assert.ok(start >= 0 && end > start);
  const flow = api.slice(start, end);

  assert.match(flow, /pendingProductQuantity/);
  assert.match(flow, /velo_qty_/);
  assert.match(flow, /length: 9/);
  assert.match(flow, /title: 'Outra quantidade'/);
  assert.match(flow, /typedQuantity/);
  assert.match(flow, /quantity < 1 \|\| quantity > 999/);
  assert.match(flow, /quantity, subtotal, offerId/);
  assert.match(flow, /Quantidade:/);
  assert.match(flow, /pendingProductQuantity: admin\.firestore\.FieldValue\.delete\(\)/);
  assert.match(flow, /alreadyRecorded\.exists/);
  assert.match(flow, /expectedPhone !== normalizedPhone/);
  assert.match(ui, /msg\.selectedProduct\?\.quantity/);
  assert.match(ui, /Nenhum pedido é criado automaticamente/);
});
