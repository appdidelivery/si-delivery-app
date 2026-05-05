import { google } from 'googleapis';

export default async function handler(req, res) {
    // Bloqueia tentativas que não sejam POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const { storeId, productId } = req.body;

        // Monta a URL exata do produto
        const productUrl = `https://${storeId}.velodelivery.com.br/p/${productId}`;

        // ==========================================
        // 🛡️ BLINDAGEM MÁXIMA DE VARIÁVEIS (VERCEL)
        // ==========================================
        let clientEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
        let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

        // 1. Remove aspas duplas acidentais copiadas do JSON
        clientEmail = clientEmail.replace(/^"|"$/g, '').trim();
        privateKey = privateKey.replace(/^"|"$/g, '').trim();
        
        // 2. Garante que as quebras de linha literais (\n) virem quebras reais para o RSA
        privateKey = privateKey.replace(/\\n/g, '\n');

        if (!clientEmail || !privateKey) {
            console.error("Erro: Vercel não carregou o process.env");
            return res.status(500).json({ error: 'Variáveis de ambiente vazias na Vercel.' });
        }

        // 3. Inicia Autenticação (Usando o formato de Objeto que evita erros de ordem)
        const jwtClient = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/indexing']
        });

        // Tenta gerar o token
        await jwtClient.authorize();

        // 4. Dispara a ordem proativa para os servidores do Google
        const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwtClient.credentials.access_token}`,
            },
            body: JSON.stringify({
                url: productUrl,
                type: 'URL_UPDATED',
            }),
        });

        const data = await response.json();

        return res.status(200).json({ success: true, url: productUrl, googleResponse: data });
        
    } catch (error) {
        console.error('Erro detalhado no Indexing API:', error.message);
        return res.status(500).json({ error: error.message });
    }
}