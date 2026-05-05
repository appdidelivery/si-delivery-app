import { google } from 'googleapis';

export default async function handler(req, res) {
    // Bloqueia tentativas que não sejam POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { storeId, productId, action } = req.body;

        // Monta a URL exata do produto que o Google precisa ler
        const productUrl = `https://${storeId}.velodelivery.com.br/p/${productId}`;

        // Puxa as credenciais trancadas na Vercel
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        // O replace garante que a Vercel leia as quebras de linha da chave corretamente
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!clientEmail || !privateKey) {
            return res.status(500).json({ error: 'Chaves do Google não configuradas.' });
        }

        // 1. Inicia a Autenticação Segura (Server-to-Server)
        const jwtClient = new google.auth.JWT(
            clientEmail,
            null,
            privateKey,
            ['https://www.googleapis.com/auth/indexing'],
            null
        );

        await jwtClient.authorize();

        // 2. Dispara a ordem proativa para os servidores do Google
        const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwtClient.credentials.access_token}`,
            },
            body: JSON.stringify({
                url: productUrl,
                type: 'URL_UPDATED', // Avisa que é conteúdo novo ou recém atualizado
            }),
        });

        const data = await response.json();

        return res.status(200).json({ success: true, url: productUrl, googleResponse: data });
        
    } catch (error) {
        console.error('Erro Crítico no Indexing API:', error);
        return res.status(500).json({ error: 'Falha interna ao avisar o Google.' });
    }
}