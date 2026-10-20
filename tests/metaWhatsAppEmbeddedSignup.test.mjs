import test from 'node:test';
import assert from 'node:assert/strict';
import { isWhatsAppId, validatePin, handleMetaWhatsAppSignup } from '../server/metaWhatsAppEmbeddedSignup.js';

test('somente IDs numéricos reais são aceitos', () => {
  assert.equal(isWhatsAppId('123456789012345'), true);
  assert.equal(isWhatsAppId('abc123'), false);
  assert.equal(isWhatsAppId('123'), false);
});

test('PIN exige exatamente seis dígitos', () => {
  assert.equal(validatePin('123456'), true);
  assert.equal(validatePin('12345'), false);
  assert.equal(validatePin('abcdef'), false);
});

test('onboarding existente é preservado quando já há API Oficial ativa', async () => {
  let mutation = false;
  const settings = { integrations: { whatsapp: { phoneNumberId: '123456789012345', apiToken: 'existing-value' } } };
  const db = {
    collection: name => ({
      doc: id => ({
        get: async () => ({ exists: true, data: () => name === 'stores' ? { ownerUid: 'owner-uid' } : settings }),
        set: async () => { mutation = true; }
      })
    })
  };
  const req = { method: 'POST', user: { uid: 'owner-uid' }, body: { action: 'complete', storeId: 'mercadomonteverde', code: 'some-meta-code' } };
  let code = 200, body;
  const res = { status: value => { code = value; return res; }, json: value => { body = value; return res; } };
  await handleMetaWhatsAppSignup(req, res, { db, admin: {} });
  assert.equal(code, 409);
  assert.equal(mutation, false);
  assert.match(body.error, /conexão existente foi preservada/i);
});

test('status não expõe token da loja', async () => {
  const settings = { integrations: { whatsapp: { phoneNumberId: '123456789012345', apiToken: 'sensitive-token' } } };
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => settings }) }) }) };
  const req = { method: 'POST', user: { uid: 'any', superAdmin: true }, body: { action: 'status', storeId: 'csi' } };
  let body;
  const res = { json: value => { body = value; return res; } };
  await handleMetaWhatsAppSignup(req, res, { db, admin: {} });
  assert.equal(body.active, true);
  assert.equal(JSON.stringify(body).includes('sensitive-token'), false);
});
