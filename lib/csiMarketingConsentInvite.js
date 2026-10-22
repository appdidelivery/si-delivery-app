import { CSI_MARKETING_PROMPT } from './whatsappConsentCapture.js';

export const CSI_CONSENT_BUTTON_YES = 'csi_marketing_yes_18';
export const CSI_CONSENT_BUTTON_NO = 'csi_marketing_no';

export function buildCsiConsentInvite(to) {
  const recipient = String(to || '').replace(/\D/g, '');
  if (!/^55[1-9][0-9]{9,10}$/.test(recipient)) throw new Error('Telefone inválido para convite CSI.');
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: CSI_MARKETING_PROMPT },
      action: {
        buttons: [
          { type: 'reply', reply: { id: CSI_CONSENT_BUTTON_YES, title: 'Sou 18+ e aceito' } },
          { type: 'reply', reply: { id: CSI_CONSENT_BUTTON_NO, title: 'Não aceito' } }
        ]
      }
    }
  };
}
