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
  if (digits.startsWith('1') && digits.length === 11) return digits; // NANP wa_id.
  if (digits.length >= 12) return digits; // Outros wa_id internacionais.

  // Somente número nacional brasileiro com DDD, sem código de país.
  if ((digits.length === 10 || digits.length === 11) && /^[1-9][0-9]/.test(digits)) {
    return `55${digits}`;
  }
  return null;
}
