import admin from 'firebase-admin';

// Inicialização do Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
    });
}
const db = admin.firestore();

// Função de gerar SLUG segura (não quebra se o texto for nulo)
const generateSlug = (text) => {
    if (!text) return 'produto';
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9 -]/g, '') 
        .replace(/\s+/g, '-') 
        .replace(/-+/g, '-') 
        .replace(/^-+/, '').replace(/-+$/, ''); 
};

export default async function handler(req, res) {
    // 1. Identifica a loja pelo subdomínio da URL
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    let storeId = host.split('.')[0]; 

    // Fallback para testes no localhost
    if (host.includes('localhost') || !storeId) {
        storeId = req.query.store || 'csi';
    }

    if (!storeId) return res.status(400).send('Loja não informada.');

    try {
        const storeDoc = await db.collection('stores').doc(storeId).get();
        if (!storeDoc.exists) return res.status(404).send('Loja não encontrada no banco.');
        const storeData = storeDoc.data();

        // 2. Busca APENAS pela loja (Evita o erro de Índice do Firebase)
        const productsSnapshot = await db.collection('products')
                                       .where('storeId', '==', storeId)
                                       .get();

        let xml = `<?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
        <channel>
            <title><![CDATA[${storeData.name || 'Velo Delivery'}]]></title>
            <link>https://${host}</link>
            <description><![CDATA[Catálogo de produtos da ${storeData.name || 'loja'}]]></description>
        `;

        productsSnapshot.forEach(doc => {
            const p = doc.data();
            
            // 3. Proteção anti-quebra: Pula produtos sem nome
            if (!p.name) return;

           // 4. Filtro de Estoque (Exatamente igual ao seu frontend Home.jsx)
            const hasStock = (p.stock && parseInt(p.stock) > 0) || !p.stock;
            if (!hasStock) return; // Não manda produto esgotado pro Google

            // 5. FILTRO ANTI-BAN (Cigarros, Vapes e Narguile)
            const nomeProduto = p.name.toLowerCase();
            const palavrasProibidas = ['cigarro', 'tabaco', 'vape', 'narguile', 'essência', 'essencia', 'palheiro', 'gift'];
            const contemProibido = palavrasProibidas.some(palavra => nomeProduto.includes(palavra));
            if (contemProibido) return; // Pula este produto (não vai pro Google)

            // 6. FILTRO DE IMAGEM VÁLIDA (Google recusa sem foto ou .webp/.svg)
            if (!p.imageUrl || typeof p.imageUrl !== 'string' || !p.imageUrl.startsWith('http')) return; 
            const urlImagem = p.imageUrl.toLowerCase();
            if (urlImagem.includes('.webp') || urlImagem.includes('.svg')) return; // Pula formatos não aceitos
            
            const slug = generateSlug(p.name);
            const productLink = `https://${host}/p/${slug}`;
            const price = Number(p.price || 0).toFixed(2);

            xml += `
            <item>
                <g:id>${doc.id}</g:id>
                <g:title><![CDATA[${p.name}]]></g:title>
                <g:description><![CDATA[${p.description || p.name}]]></g:description>
                <g:link>${productLink}</g:link>
                <g:image_link>${p.imageUrl || 'https://velodelivery.com.br/logo.png'}</g:image_link>
                <g:condition>new</g:condition>
                <g:availability>in_stock</g:availability>
                <g:price>${price} BRL</g:price>
                ${Number(p.promotionalPrice) > 0 ? `<g:sale_price>${Number(p.promotionalPrice).toFixed(2)} BRL</g:sale_price>` : ''}
                <g:brand>Bebidas</g:brand>
            </item>`;
        });

        xml += `</channel></rss>`;

        res.setHeader('Content-Type', 'text/xml; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
        res.status(200).send(xml);

    } catch (error) {
        console.error("Erro no feed:", error);
        // 🔥 AGORA O ERRO VAI APARECER NA TELA EM VEZ DE FICAR ESCONDIDO
        res.status(500).send(`Erro interno do servidor: ${error.message}`);
    }
}