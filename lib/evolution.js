// lib/evolution.js
export async function sendWhatsAppNotification(numero, texto) {
    const numeroFormatado = numero.startsWith("55") ? numero : `55${numero}`;
    const API_URL = process.env.ZAPI_API_URL; 

    if (!API_URL) {
        console.warn("⚠️ ZAPI_API_URL não configurada no .env");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: numeroFormatado, message: texto })
        });

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        console.log(`📱 WhatsApp disparado com sucesso via Z-API para: ${numeroFormatado}`);
    } catch (err) {
        console.error("❌ Falha crítica ao conectar com Z-API:", err.message);
    }
}