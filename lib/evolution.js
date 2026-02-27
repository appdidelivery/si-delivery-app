// lib/evolution.js
export async function sendWhatsAppNotification(numero, texto) {
    // Remove qualquer espaço que tenha vindo da Vercel por erro de digitação
    const rawUrl = process.env.ZAPI_API_URL?.trim(); 
    
    if (!rawUrl) {
        console.warn("⚠️ ZAPI_API_URL não configurada!");
        return;
    }

    // Garante que a URL não termine com barra para não duplicar no fetch
    const baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    const numeroFormatado = numero.replace(/\D/g, ''); // Limpa o número

    try {
        const response = await fetch(`${baseUrl}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phone: numeroFormatado.startsWith('55') ? numeroFormatado : `55${numeroFormatado}`, 
                message: texto 
            })
        });

        if (!response.ok) throw new Error(`Erro Z-API: ${response.status}`);
        console.log(`✅ WhatsApp enviado para: ${numeroFormatado}`);
    } catch (err) {
        // Agora o log vai mostrar exatamente o que deu errado
        console.error(`❌ Erro na URL [${baseUrl}/send-text]:`, err.message);
    }
}