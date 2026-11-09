import { normalizeWhatsAppReplyRecipient } from './whatsappReplyRecipient.js';

// Chaves nacionais servem para deduplicação/consentimento, NÃO para identificar
// o destinatário na Meta. Preserva o wa_id (com ou sem nono dígito) do registro.
export function csiMarketingRecipient(value) {
  const recipient = normalizeWhatsAppReplyRecipient(value);
  // O piloto de bebidas CSI é restrito ao Brasil. Falha fechado para outros países.
  return recipient && /^55[1-9][0-9][0-9]{8,9}$/.test(recipient) ? recipient : null;
}
