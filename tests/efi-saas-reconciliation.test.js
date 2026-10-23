import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
const prices = { start: { monthly: 49.90 }, pro: { monthly: 149.90 }, infinity: { monthly: 249.90 } };

function invoiceResolver(store) {
  const begin = source.indexOf('async function resolveSubscriptionAmount(');
  const end = source.indexOf('\n}\n\n// INÍCIO DO ROTEADOR CENTRAL', begin);
  assert.ok(begin !== -1 && end > begin);
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => store }) }) }) };
  const fn = new Function('db', 'PLAN_PRICES', source.slice(begin, end + 2) + '\nreturn resolveSubscriptionAmount;');
  return fn(db, prices);
}

function webhookReconciliation(store, invoiceId, pixValue) {
  const webhook = source.indexOf('// É UMA MENSALIDADE SAAS! DANDO BAIXA AUTOMÁTICA');
  const begin = source.indexOf('                                if (!storeDoc.exists) {', webhook);
  const end = source.indexOf('                                const batch = db.batch();', begin);
  assert.ok(webhook > 0 && begin > webhook && end > begin);
  const code = source.slice(begin, end);
  // O continue no handler original descarta a iteração e não envia pagamentos.
  const fn = new Function('storeDoc','saasInvoiceId','chargeDetails','PLAN_PRICES','console','saasStoreId','txid',
    'for (let i=0;i<1;i++) {\n' + code + '\nreturn {accepted:true, invoices:faturasHistorico};\n} return {accepted:false};');
  return fn({ exists:true, data:() => store }, invoiceId,
    { status:'CONCLUIDA', valor:{original:pixValue}, pix:[{valor:pixValue}] },
    prices, { error() {} }, 'test-store', 'txid-fake');
}

function store(plan, amount, status='PENDENTE') {
  const base = prices[plan].monthly;
  return { plan, billingBasePrice: base, faturasHistorico: [
    {id:'fatura', status, amount}
  ] };
}

test('Efí gera cobrança pelo plano Pro de R$ 149,90', async () => {
  assert.equal(await invoiceResolver(store('pro', 'R$ 149,90'))({storeId:'test-store',invoiceId:'fatura'}),149.90);
});
test('Efí bloqueia fatura Start desatualizada após upgrade Pro', async () => {
  await assert.rejects(invoiceResolver(store('pro','R$ 49,90'))({storeId:'test-store',invoiceId:'fatura'}),/desatualizada/);
});
test('Efí mantém cobrança do plano Start em R$ 49,90', async () => {
  assert.equal(await invoiceResolver(store('start','R$ 49,90'))({storeId:'test-store',invoiceId:'fatura'}),49.90);
});
test('Webhook baixa Pix Pro integral', () => {
  const result = webhookReconciliation(store('pro','R$ 149,90'),'fatura','149.90');
  assert.equal(result.accepted,true);
  assert.equal(result.invoices[0].status,'PAGO');
});
test('Webhook impede baixa parcial de R$ 49,90 em fatura R$ 149,90', () => {
  assert.equal(webhookReconciliation(store('pro','R$ 149,90'),'fatura','49.90').accepted,false);
});
test('Webhook impede Pix antigo em fatura desatualizada', () => {
  assert.equal(webhookReconciliation(store('pro','R$ 49,90'),'fatura','49.90').accepted,false);
});
test('Webhook impede reprocessar fatura já paga', () => {
  assert.equal(webhookReconciliation(store('pro','R$ 149,90','PAGO'),'fatura','149.90').accepted,false);
});
test('Pix avulso insuficiente não desbloqueia plano Pro', () => {
  assert.equal(webhookReconciliation(store('pro','R$ 149,90'),'avulsa','49.90').accepted,false);
});
test('Pix avulso suficiente não dá baixa nas demais faturas', () => {
  const result = webhookReconciliation(store('pro','R$ 149,90'),'avulsa','149.90');
  assert.equal(result.accepted,true);
  assert.equal(result.invoices[0].status,'PENDENTE');
});
test('cron monta preço conforme plano e adicional', () => {
  const begin = source.indexOf('const catalogBase = PLAN_PRICES[storeData.plan]?.monthly',
    source.indexOf('const extraOrders = Math.max(0, ordersCount - 100)'));
  const tail = "const statusFatura = isCortesia ? 'ISENTO' : 'PENDENTE';";
  const end = source.indexOf(tail, begin);
  assert.ok(begin !== -1 && end > begin);
  const fn = new Function('storeData','PLAN_PRICES','extraCost','isCortesia',
    source.slice(begin,end+tail.length) + '\nreturn totalFatura;');
  for (const [plan, expected] of [['start',49.9],['pro',149.9],['infinity',249.9]]) {
    assert.equal(fn({plan,billingBasePrice:expected},prices,0,false),expected);
  }
  assert.equal(fn({plan:'pro',billingBasePrice:329.9},prices,2,false),331.9);
});
