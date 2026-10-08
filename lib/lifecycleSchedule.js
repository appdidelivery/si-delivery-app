// Slots de relacionamento no horário de Brasília. Vercel chama os crons em UTC.
export const OCCASION_SLOTS = Object.freeze({
  wed: { day: 3, hour: 17, minute: 0, occasion: 'football', title: 'Quarta de futebol' },
  fri: { day: 5, hour: 17, minute: 30, occasion: 'weekend', title: 'Sexta-feira' },
  sat: { day: 6, hour: 11, minute: 0, occasion: 'barbecue', title: 'Sábado de churrasco' },
  sun: { day: 0, hour: 11, minute: 0, occasion: 'sunday', title: 'Domingo' },
});

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function brazilLocalParts(date = new Date()) {
  const formatted = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return {
    day: weekdays.indexOf(formatted.weekday),
    hour: Number(formatted.hour),
    minute: Number(formatted.minute),
    dateKey: `${formatted.year}-${formatted.month}-${formatted.day}`
  };
}

export function dispatchWindow(slot, date = new Date()) {
  const cfg = OCCASION_SLOTS[slot];
  if (!cfg) return { allowed: false, reason: 'invalid_slot' };
  const now = brazilLocalParts(date);
  // Intervalo de uma hora: compatível com precisão por hora do plano Hobby.
  const elapsedMinutes = now.hour * 60 + now.minute - (cfg.hour * 60 + cfg.minute);
  if (now.day !== cfg.day || elapsedMinutes < 0 || elapsedMinutes >= 60) {
    return { allowed: false, reason: 'outside_local_window', now };
  }
  return { allowed: true, cfg, now };
}

export function confirmedMatchEvent(event = {}, localDate) {
  if (!event || event.confirmed !== true || event.active !== true) return false;
  if (event.type !== 'football_match' || event.date !== localDate) return false;
  // A data e o horário devem ser confirmados por fonte confiável; não inventar confrontos.
  return typeof event.matchLabel === 'string' && event.matchLabel.trim().length > 3;
}

// Perfil mínimo: em um piloto de baixo volume, prioriza quem já comprou naquele dia
// da semana em vez de disparar por ordem de antiguidade.
export function occasionPurchaseScore(orderDates = [], slot, now = new Date()) {
  const cfg = OCCASION_SLOTS[slot];
  if (!cfg) return 0;
  let score = 0;
  for (const value of orderDates) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) continue;
    const p = brazilLocalParts(date);
    if (p.day === cfg.day) score += 4;
    if (Math.abs(p.hour - cfg.hour) <= 3) score += 1;
  }
  return score;
}
