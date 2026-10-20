// A sessão do caixa pertence ao operador autenticado na loja, nunca ao navegador.
// Os registros já persistidos em pos_logs são a fonte de verdade para o estado atual.
const normalizedEmail = (value) => String(value || '').trim().toLowerCase();

export function cashLogTimestampToDate(timestamp) {
  if (!timestamp) return null;
  let value = timestamp;
  if (typeof timestamp.toDate === 'function') value = timestamp.toDate();
  else if (typeof timestamp.seconds === 'number') value = new Date(timestamp.seconds * 1000);
  else if (typeof timestamp.toMillis === 'function') value = new Date(timestamp.toMillis());
  else value = new Date(timestamp);
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

export function getCashierSessionFromLogs(logs = [], userEmail = '', storeId = '') {
  const email = normalizedEmail(userEmail);
  if (!email || !storeId) return { isOpen: false, openingLog: null, latestLog: null };

  const relevant = (Array.isArray(logs) ? logs : [])
    .filter((log) => (
      log.storeId === storeId
      && normalizedEmail(log.userEmail) === email
      && (log.action === 'ABRIU O CAIXA' || log.action === 'FECHOU O CAIXA')
    ))
    .sort((a, b) => (
      (cashLogTimestampToDate(b.timestamp)?.getTime() || 0)
      - (cashLogTimestampToDate(a.timestamp)?.getTime() || 0)
    ));

  const latestLog = relevant[0] || null;
  const isOpen = latestLog?.action === 'ABRIU O CAIXA';
  return {
    isOpen,
    openingLog: isOpen ? latestLog : null,
    latestLog,
  };
}
