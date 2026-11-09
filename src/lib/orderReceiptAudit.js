// Compara o valor gravado no pedido com os componentes financeiros persistidos.
// Nao recalcula nem altera valores cobrados; impede apenas tickets contraditorios.
const centavos = valor => Math.round((valor + Number.EPSILON) * 100);

export function assessPrintedOrderTotal(order) {
  const total = Number(order?.total);
  if (!Number.isFinite(total) || total < 0) {
    return { ok: false, reason: 'Total do pedido invalido.' };
  }

  // Pedidos antigos podem nao ter subtotal; nesse caso nao inferimos um valor.
  if (order?.subtotal === undefined || order?.subtotal === null || order.subtotal === '') {
    return { ok: true, checked: false, total };
  }

  const fields = ['subtotal', 'shippingFee', 'extraFee', 'discountAmount', 'usedCashback'];
  const amounts = fields.map(field => Number(order[field] ?? 0));
  if (amounts.some(amount => !Number.isFinite(amount))) {
    return { ok: false, reason: 'Componentes do total nao numericos.' };
  }

  const [subtotal, shipping, extraFee, discount, cashback] = amounts;
  const expected = Math.max(0, centavos(subtotal + shipping + extraFee - discount - cashback)) / 100;
  if (Math.abs(centavos(total) - centavos(expected)) > 1) {
    return { ok: false, reason: 'Subtotal, frete e descontos nao conferem com o total salvo.', expected, total };
  }
  return { ok: true, checked: true, expected, total };
}
