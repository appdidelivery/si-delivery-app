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
        // 🛡️ LÊ A CHAVE NOVA DIRETO DO JSON DA VERCEL
        // ==========================================
        if (!process.env.GCP_SERVICE_ACCOUNT) {
            console.error("Erro: Variável GCP_SERVICE_ACCOUNT não encontrada.");
            return res.status(500).json({ error: 'GCP_SERVICE_ACCOUNT vazia na Vercel.' });
        }

        let credentials;
        try {
            credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
        } catch (e) {
            console.error("Erro ao dar parse no JSON:", e);
            return res.status(500).json({ error: 'GCP_SERVICE_ACCOUNT não é um JSON válido.' });
        }

        const clientEmail = credentials.client_email;
        let privateKey = credentials.private_key;

        if (!clientEmail || !privateKey) {
            return res.status(500).json({ error: 'JSON incompleto. Faltam client_email ou private_key.' });
        }
        
        // Garante que as quebras de linha literais (\n) virem quebras reais para o RSA
        privateKey = privateKey.replace(/\\n/g, '\n');

        // 3. Inicia Autenticação
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