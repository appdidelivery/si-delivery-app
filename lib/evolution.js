// lib/evolution.js (Adaptado para Z-API)

/**
 * Envia uma mensagem de WhatsApp
 * @param {string} numero - O número do cliente (ex: 48991311442)
 * @param {string} texto - A mensagem formatada 
 */
export async function sendWhatsAppNotification(numero, texto) {
    // A Z-API exige que o número comece com o código do país (55 para o Brasil)
    const numeroFormatado = numero.startsWith("55") ? numero : `55${numero}`;
    const API_URL = process.env.ZAPI_API_URL; 

    if (!API_URL) {
        console.warn("⚠️ ZAPI_API_URL não configurada no .env");
        return;
    }

    try {
        // A Z-API usa o final /send-text para enviar mensagens de texto
        const response = await fetch(`${API_URL}/send-text`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: numeroFormatado,
                message: texto
            })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        console.log(`📱 WhatsApp disparado com sucesso via Z-API para: ${numeroFormatado}`);
    } catch (err) {
        console.error("❌ Falha crítica ao conectar com Z-API:", err.message);
    }
}