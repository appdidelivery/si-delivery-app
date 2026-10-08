// Pré-integração de pedidos Velo -> Linvix.
// Sem chamadas de escrita à Linvix até homologação do esquema, canal de venda
// e comportamento de baixa de estoque. Não registrar dados pessoais nos logs.

const ORDER_LIMIT = 200;
const normalize = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/[\s-]+/g, '_');

const CANCELLED = new Set(['cancelled', 'canceled', 'cancelado', 'cancelada', 'rejected', 'rejeitado', 'refunded', 'reembolsado']);
const UNCONFIRMED = new Set(['pending', 'pendente', 'aguardando_pagamento', 'awaiting_payment', 'new', 'novo', 'abandoned']);
const APPROVED = new Set(['confirmed', 'confirmado', 'accepted', 'aceito', 'preparing', 'preparando', 'preparo', 'ready', 'pronto', 'delivery', 'delivering', 'em_entrega', 'delivered', 'entregue', 'completed', 'concluido', 'finished', 'finalizado']);
const PAID = new Set(['paid', 'pago', 'approved', 'aprovado', 'captured', 'capturado', 'settled', 'liquidado']);

const identifier = (value) => String(value ?? '').trim();
const finiteAmount = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

function readItems(raw) {
  const items = Array.isArray(raw) ? raw : [];
  return items.map((item) => ({
    productId: identifier(item?.productId ?? item?.id),
    gtin: identifier(item?.gtin ?? item?.ean ?? item?.barcode),
    linvixCode: identifier(item?.linvixCode),
    quantity: Number(item?.quantity ?? item?.qty),
    unitPrice: finiteAmount(item?.price ?? item?.unitPrice),
  }));
}

/** Resultado não é uma requisição Linvix: é só um envelope interno, sem PII. */
export function assessLinvixOrder(order, orderId, storeId) {
  if (!storeId || order?.storeId !== storeId) {
    throw new Error('Pedido fora do escopo da unidade.');
  }

  const status = normalize(order.status);
  const payment = normalize(order.paymentStatus ?? order.payment?.status);
  const items = readItems(order.items);
  const quantityValid = items.length > 0 && items.every((item) =>
    Number.isFinite(item.quantity) && item.quantity > 0 &&
    item.unitPrice !== null && !!item.productId
  );
  const withoutErpCode = items.filter((item) => !item.gtin && !item.linvixCode).length;
  const total = finiteAmount(order.total);

  let category = 'review';
  let reason = 'status_nao_mapeado';
  if (CANCELLED.has(status)) {
    category = 'ignored';
    reason = 'pedido_cancelado';
  } else if (UNCONFIRMED.has(status)) {
    category = 'ignored';
    reason = 'pedido_nao_confirmado';
  } else if (!APPROVED.has(status)) {
    reason = 'status_nao_mapeado';
  } else if (!PAID.has(payment)) {
    reason = 'pagamento_nao_confirmado';
  } else if (!quantityValid || total === null) {
    reason = 'dados_dos_itens_incompletos';
  } else if (withoutErpCode > 0) {
    reason = 'produtos_sem_codigo_erp';
  } else {
    category = 'mapping_candidate';
    reason = 'pronto_para_mapear_com_erp';
  }

  return {
    orderId: String(orderId),
    storeId,
    reference: `velo:${storeId}:${orderId}`,
    status,
    payment,
    category,
    reason,
    total,
    lineCount: items.length,
    withoutErpCode,
    items,
  };
}

/** Monta rascunho interno determinístico; nunca é payload da API Linvix. */
export function buildVeloOrderDraft(assessment, location) {
  if (assessment?.category !== 'mapping_candidate' || !assessment?.storeId || !assessment?.orderId) {
    throw new Error('Pedido ainda não está pronto para preparação do ERP.');
  }
  const locationId = identifier(location?.id ?? location?.code);
  if (!locationId) throw new Error('Estoque Local ainda não selecionado.');
  return {
    schema: 'velo.linvix.draft.v1',
    exportEnabled: false,
    storeId: assessment.storeId,
    reference: assessment.reference,
    orderId: assessment.orderId,
    locationId,
    total: assessment.total,
    items: assessment.items.map((item) => ({
      sourceProductId: item.productId,
      gtin: item.gtin,
      linvixCode: item.linvixCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

/** Consulta somente esta loja e não persiste nem exporta pedidos. */
export async function previewLinvixOrders(db, storeId) {
  if (!storeId) throw new Error('Loja não informada.');
  const snapshot = await db.collection('orders')
    .where('storeId', '==', storeId)
    .limit(ORDER_LIMIT)
    .get();

  const totals = {
    scanned: 0, mappingCandidates: 0, needReview: 0, ignored: 0,
    paymentUnconfirmed: 0, missingErpCodes: 0, incompleteItems: 0,
  };
  const sample = [];

  for (const doc of snapshot.docs) {
    const order = doc.data();
    if (order?.storeId !== storeId) continue; // defesa adicional multi-tenant
    const current = assessLinvixOrder(order, doc.id, storeId);
    totals.scanned++;
    if (current.category === 'mapping_candidate') totals.mappingCandidates++;
    else if (current.category === 'ignored') totals.ignored++;
    else totals.needReview++;
    if (current.reason === 'pagamento_nao_confirmado') totals.paymentUnconfirmed++;
    if (current.reason === 'produtos_sem_codigo_erp') totals.missingErpCodes++;
    if (current.reason === 'dados_dos_itens_incompletos') totals.incompleteItems++;
    if (sample.length < 12) {
      sample.push({
        orderId: current.orderId,
        status: current.status,
        payment: current.payment,
        category: current.category,
        reason: current.reason,
        lineCount: current.lineCount,
        withoutErpCode: current.withoutErpCode,
      });
    }
  }

  return {
    ...totals,
    maxScanned: ORDER_LIMIT,
    truncated: snapshot.size === ORDER_LIMIT,
    exportEnabled: false,
    contractStatus: 'awaiting_linvix_schema_validation',
    sample,
  };
}
