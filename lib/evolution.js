// Arquivo: lib/evolution.js
// Finalidade: Enviar mensagens de WhatsApp via Evolution API

export const sendWhatsAppNotification = async (phone, message, instanceName) => {
    try {
        const apiUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const instance = instanceName || process.env.DEFAULT_INSTANCE_NAME || 'Velo_CSI';

        if (!apiUrl || !apiKey) {
            console.error('❌ Faltam credenciais da Evolution API no .env');
            return false;
        }

        // Limpa o número para conter apenas dígitos
        let cleanPhone = String(phone).replace(/\D/g, '');
        // Garante que o número tem o código do país (55 para Brasil)
        if (!cleanPhone.startsWith('55')) {
            cleanPhone = `55${cleanPhone}`;
        }

        const payload = {
            number: cleanPhone,
            options: {
                delay: 1200, // Delay humano
                presence: 'composing' // Mostra "digitando..."
            },
            textMessage: {
                text: message
            }
        };

        const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`⚠️ Erro na Evolution API (${response.status}):`, errorData);
            return false;
        }

        console.log(`✅ WhatsApp enviado com sucesso para ${cleanPhone}`);
        return true;

    } catch (error) {
        console.error('❌ Falha crítica ao enviar WhatsApp:', error.message);
        return false;
    }
};