import test from 'node:test';
import assert from 'node:assert/strict';
import { getCashierSessionFromLogs, cashLogTimestampToDate } from '../src/utils/cashRegisterState.js';

const log = (storeId, userEmail, action, timestamp) => ({ storeId, userEmail, action, timestamp });

test('computador compartilhado: o caixa aberto de Nicole não passa para Marcelle', () => {
  const logs = [
    log('csi', 'nicole@exemplo.com', 'ABRIU O CAIXA', new Date('2026-10-09T15:00:00Z')),
    log('csi', 'marcelle@exemplo.com', 'FECHOU O CAIXA', new Date('2026-10-08T23:00:00Z')),
  ];
  assert.equal(getCashierSessionFromLogs(logs, 'nicole@exemplo.com', 'csi').isOpen, true);
  assert.equal(getCashierSessionFromLogs(logs, 'marcelle@exemplo.com', 'csi').isOpen, false);
});

test('o fechamento encerra somente a sessão do operador correspondente', () => {
  const logs = [
    log('csi', 'a@exemplo.com', 'FECHOU O CAIXA', new Date('2026-10-09T20:00:00Z')),
    log('csi', 'b@exemplo.com', 'ABRIU O CAIXA', new Date('2026-10-09T19:00:00Z')),
    log('csi', 'a@exemplo.com', 'ABRIU O CAIXA', new Date('2026-10-09T18:00:00Z')),
  ];
  assert.equal(getCashierSessionFromLogs(logs, 'a@exemplo.com', 'csi').isOpen, false);
  assert.equal(getCashierSessionFromLogs(logs, 'b@exemplo.com', 'csi').isOpen, true);
});

test('a sessão não vaza entre lojas, mesmo quando o email é o mesmo', () => {
  const logs = [
    log('csi', 'equipe@exemplo.com', 'ABRIU O CAIXA', new Date('2026-10-09T16:00:00Z')),
    log('filialsantaisabel', 'equipe@exemplo.com', 'FECHOU O CAIXA', new Date('2026-10-09T17:00:00Z')),
  ];
  assert.equal(getCashierSessionFromLogs(logs, 'equipe@exemplo.com', 'csi').isOpen, true);
  assert.equal(getCashierSessionFromLogs(logs, 'equipe@exemplo.com', 'filialsantaisabel').isOpen, false);
});

test('email é comparado sem diferenciar letras maiúsculas e espaços', () => {
  const logs = [log('csi', 'Atendente@Exemplo.Com ', 'ABRIU O CAIXA', new Date())];
  assert.equal(getCashierSessionFromLogs(logs, ' atendente@exemplo.com', 'csi').isOpen, true);
});

test('sem autenticação, sem loja ou sem registros, o caixa fica fechado', () => {
  const logs = [log('csi', 'equipe@exemplo.com', 'ABRIU O CAIXA', new Date())];
  assert.equal(getCashierSessionFromLogs(logs, '', 'csi').isOpen, false);
  assert.equal(getCashierSessionFromLogs(logs, 'equipe@exemplo.com', '').isOpen, false);
  assert.equal(getCashierSessionFromLogs([], 'equipe@exemplo.com', 'csi').isOpen, false);
});

test('aceita timestamps Firestore e os transforma em datas sem horário inventado', () => {
  const ts = { seconds: 1791566400, nanoseconds: 0 };
  assert.equal(cashLogTimestampToDate(ts).toISOString(), '2026-10-09T14:40:00.000Z');
  assert.equal(cashLogTimestampToDate(null), null);
  assert.equal(cashLogTimestampToDate('invalido'), null);
});
