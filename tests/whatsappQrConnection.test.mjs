import test from 'node:test';
import assert from 'node:assert/strict';
import { qrWebhookAddress, sendWhatsAppQrReply } from '../server/whatsappQrConnection.js';

test('link de webhook usa assinatura HMAC e não revela chave', () => {
  const previous = process.env.EVOLUTION_WEBHOOK_SECRET;
  process.env.EVOLUTION_WEBHOOK_SECRET = 'chave-de-testes-local-e-isolada';
  try {
    const url = qrWebhookAddress('mercadomonteverde');
    assert.ok(url.includes('/api/whatsapp-qr-webhook?storeId=mercadomonteverde&sig='));
    assert.ok(!url.includes('chave-de-testes-local-e-isolada'));
    assert.match(new URL(url).searchParams.get('sig'), /^[a-f0-9]{64}$/);
  } finally {
    if (previous === undefined) delete process.env.EVOLUTION_WEBHOOK_SECRET;
    else process.env.EVOLUTION_WEBHOOK_SECRET = previous;
  }
});

test('canal QR não envia mensagens sem infraestrutura', async () => {
  const previousUrl = process.env.EVOLUTION_API_URL;
  const previousKey = process.env.EVOLUTION_GLOBAL_API_KEY;
  delete process.env.EVOLUTION_API_URL;
  delete process.env.EVOLUTION_GLOBAL_API_KEY;
  try {
    assert.deepEqual(await sendWhatsAppQrReply({ storeId: 'mercadomonteverde', toPhone: '5547999999999', text: 'Teste' }), {
      success: false, error: 'Canal QR indisponível.'
    });
  } finally {
    if (previousUrl === undefined) delete process.env.EVOLUTION_API_URL;
    else process.env.EVOLUTION_API_URL = previousUrl;
    if (previousKey === undefined) delete process.env.EVOLUTION_GLOBAL_API_KEY;
    else process.env.EVOLUTION_GLOBAL_API_KEY = previousKey;
  }
});
