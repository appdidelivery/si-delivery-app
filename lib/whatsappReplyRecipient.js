// Normaliza APENAS o destinatário da resposta de atendimento da Cloud API.
// O wa_id devolvido pela Meta tem precedência: nunca inserir/remover o 9º dígito.
function validBrazilianNumber(digits) {
  return /^55[1-9][0-9][0-9]{8,9}$/.test(digits);
}

export function normalizeWhatsAppReplyRecipient(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim();
  if (!raw || !/^\+?[0-9\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) return null;

  // Prefixo +: identificador internacional informado explicitamente.
  if (raw.startsWith('+')) {
    return digits.startsWith('55') ? (validBrazilianNumber(digits) ? digits : null) : digits;
  }

  // IDs completos já identificados pela Meta são preservados sem alteração.
  if (digits.startsWith('55') && digits.length >= 12) {
    return validBrazilianNumber(digits) ? digits : null;
  }
  // DDDs brasileiros 11-19 têm 9 na posição inicial do celular nacional.
  // IDs NANP sem esse padrão são preservados como wa_id; nunca reescrever o DDD 11.
  if (digits.startsWith('1') && digits.length === 11 && digits[2] !== '9') return digits;
  if (digits.length >= 12) return digits; // Outros wa_id internacionais.

  // Somente número nacional brasileiro com DDD, sem código de país.
  if ((digits.length === 10 || digits.length === 11) && /^[1-9][0-9]/.test(digits)) {
    return `55${digits}`;
  }
  return null;
}


// A chave visual do chat remove o prefixo 55 e pode inserir o nono dígito
// somente para agrupamento. Nunca use essa chave para decidir o wa_id do envio.
function messageTimestampMs(message) {
  const timestamp = message?.receivedAt || message?.timestamp || message?.sentAt;
  if (timestamp && typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (Number.isFinite(timestamp?.seconds)) return timestamp.seconds * 1000;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'string') return Date.parse(timestamp) || 0;
  return 0;
}

export function resolveWhatsAppChatRecipient(messages) {
  if (!Array.isArray(messages)) return null;
  let result = null;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message?.direction !== 'inbound') continue;
    const phone = normalizeWhatsAppReplyRecipient(message.from);
    if (!phone) continue;
    const time = messageTimestampMs(message);
    if (!result || time > result.time || (time === result.time && i > result.index)) {
      result = { phone, time, index: i };
    }
  }
  return result?.phone || null;
}

// Permite buscar com 55, +55, DDD ou nome, sem mexer no identificador Meta.
export function matchesWhatsAppChatSearch(term, nationalPhone, displayName = '') {
  const search = String(term || '').trim().toLowerCase();
  if (!search) return true;
  if (String(displayName || '').toLowerCase().includes(search)) return true;
  const digits = search.replace(/\D/g, '');
  if (!digits) return false;
  const phone = String(nationalPhone || '').replace(/\D/g, '');
  return phone.includes(digits) || `55${phone}`.includes(digits);
}
