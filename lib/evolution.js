// lib/evolution.js
export async function sendWhatsAppNotification(numero, texto) {
    // .trim() remove espaços invisíveis que causam o erro de URL inválida
    const rawUrl = process.env.ZAPI_API_URL?.trim(); 
    
    if (!rawUrl) {
        console.warn("⚠️ ZAPI_API_URL não encontrada nas variáveis da Vercel!");
        return;
    }

    // Remove a barra ou o /send-text se você tiver colocado por engano na Vercel
    const baseUrl = rawUrl.replace(/\/+$/, '').replace(/\/send-text$/, '');
    
    // Limpa o número para ter apenas dígitos
    const numeroLimpo = numero.replace(/\D/g, '');
    const numeroFinal = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;

    try {
        const response = await fetch(`${baseUrl}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phone: numeroFinal, 
                message: texto 
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erro Z-API (${response.status}): ${errorData}`);
        }
        
        console.log(`✅ WhatsApp enviado com sucesso para: ${numeroFinal}`);
    } catch (err) {
        console.error(`❌ Falha ao enviar Zap. URL tentada: [${baseUrl}/send-text]. Erro:`, err.message);
    }
}