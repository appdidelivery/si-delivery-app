import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildMetaPurchaseEvent, sendMetaPurchaseEvent } from './metaConversions.js';

const order = {
  id: 'pedido-123', total: 42.5, customerPhone: '(55) 99999-1234',
  metaTracking: { eventSourceUrl: 'https://loja.example/', clientUserAgent: 'test-browser', fbp: 'fb.1.123.456', fbc: 'fb.1.123.click' },
};
const db = config => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => ({ integrations: { meta: config } }) }) }) }) });

test('compra usa ID compartilhado, contexto do navegador e telefone DDD 55 normalizado', () => {
  const event = buildMetaPurchaseEvent(order);
  assert.equal(event.event_id, order.id);
  assert.equal(event.custom_data.value, 42.5);
  assert.equal(event.event_source_url, order.metaTracking.eventSourceUrl);
  assert.equal(event.user_data.client_user_agent, 'test-browser');
  assert.equal(event.user_data.fbc, order.metaTracking.fbc);
  assert.equal(event.user_data.ph[0], createHash('sha256').update('5555999991234').digest('hex'));
  assert.deepEqual(buildMetaPurchaseEvent({ ...order, customerPhone: '+55 55 99999-1234' }).user_data.ph, event.user_data.ph);
  assert.equal(buildMetaPurchaseEvent({ ...order, customerPhone: 'abc' }).user_data.ph, undefined);
});

test('envio confirma recebimento e mantém token fora da URL', async () => {
  const result = await sendMetaPurchaseEvent('loja', order, db({ pixelId: ' 123 ', apiToken: 'secret' }), async (url, options) => {
    assert.equal(url, 'https://graph.facebook.com/v26.0/123/events');
    assert.equal(options.headers.Authorization, 'Bearer secret');
    assert.equal(JSON.parse(options.body).data[0].event_id, order.id);
    return { ok: true, json: async () => ({ events_received: 1 }) };
  });
  assert.deepEqual(result, { success: true });
});

test('rejeição e resposta sem eventos recebidos não são tratadas como sucesso', async t => {
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  for (const response of [
    { ok: false, status: 400, json: async () => ({ error: { code: 190 } }) },
    { ok: true, status: 200, json: async () => ({ events_received: 0 }) },
  ]) {
    assert.deepEqual(await sendMetaPurchaseEvent('loja', order, db({ pixelId: '123', apiToken: 'secret' }), async () => response), { success: false });
  }
  assert.equal(errors.length, 2);
  assert.ok(!JSON.stringify(errors).includes('secret'));
});

test('loja sem CAPI configurada não faz requisição', async () => {
  assert.deepEqual(await sendMetaPurchaseEvent('loja', order, db({}), () => assert.fail('requisição indevida')), { skipped: true });
});
