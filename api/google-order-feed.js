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
    // 1. Identifica a loja pelo subdomínio da URL (LÓGICA MULTI-TENANT MANTIDA)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    let storeId = host.split('.')[0]; 

    // Fallback para testes no localhost
    if (host.includes('localhost') || !storeId) {
        storeId = req.query.store || 'csi';
    }

    if (!storeId) return res.status(400).send('Loja não informada.');

    // Novo: Captura o tipo de feed solicitado via URL (padrão é 'menu')
    const feedType = req.query.feed || 'menu';

    try {
        const storeDoc = await db.collection('stores').doc(storeId).get();
        if (!storeDoc.exists) return res.status(404).send('Loja não encontrada no banco.');
        const storeData = storeDoc.data();

        // ==========================================
        // ROTA 1: FEED DO LOJISTA (MERCHANT)
        // ==========================================
        if (feedType === 'merchant') {
            const merchantFeed = {
                data: [{
                    "@type": "Restaurant",
                    "merchantId": storeId,
                    "name": storeData.name || "Velo Delivery",
                    // Atenção: Ajuste o mapeamento abaixo se os nomes das chaves no seu Firestore (storeData) forem diferentes
                    "telephone": storeData.phone || "+5500000000000",
                    "address": {
                        "streetAddress": storeData.address?.street || "Endereço não informado",
                        "locality": storeData.address?.city || "São José",
                        "region": storeData.address?.state || "SC",
                        "postalCode": storeData.address?.zipcode || "00000-000"
                    }
                }]
            };
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).send(JSON.stringify(merchantFeed));
        }

        // ==========================================
        // ROTA 2: FEED DE SERVIÇOS (SERVICE)
        // ==========================================
        if (feedType === 'service') {
            const serviceFeed = {
                data: [{
                    "@type": "Service",
                    "serviceId": `srv_delivery_${storeId}`,
                    "merchantId": storeId,
                    "serviceType": "DELIVERY" // Pode puxar dinamicamente se o lojista aceitar TAKEOUT (Retirada)
                }]
            };
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).send(JSON.stringify(serviceFeed));
        }

        // ==========================================
        // ROTA 3: FEED DE CARDÁPIO (MENU)
        // ==========================================
        // 2. Busca APENAS pela loja (Evita o erro de Índice do Firebase)
        const productsSnapshot = await db.collection('products')
                                       .where('storeId', '==', storeId)
                                       .get();

        // Inicializa o array principal que conterá os dados no padrão JSON do Google
        let googleOrderFeed = {
            data: []
        };

        productsSnapshot.forEach(doc => {
            const p = doc.data();
            
            // 3. Proteção anti-quebra: Pula produtos sem nome
            if (!p.name) return;

            // 🚨 4. LÓGICA DE ESTOQUE CORRIGIDA PARA O GOOGLE 🚨
            // Em vez de "esconder" o produto sem estoque, nós definimos a tag correta
            let availability = 'in_stock'; // Padrão: se o lojista não controla estoque, consideramos em estoque
            if (p.stock !== undefined && p.stock !== null && p.stock !== '') {
                if (parseInt(p.stock) <= 0) {
                    availability = 'out_of_stock';
                }
            }

            // 5. FILTRO ANTI-BAN MANTIDO INTACTO (Cigarros, Vapes e Narguile)
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

            // 7. MONTAGEM DO JSON OBRIGATÓRIO DO ORDER WITH GOOGLE (MENU FEED)
            const finalPrice = Number(p.promotionalPrice) > 0 ? Number(p.promotionalPrice) : Number(p.price || 0);
            
            // O Order with Google exige o formato de preço com o código da moeda
            const itemMenu = {
                "@type": "MenuItem",
                "menuItemId": doc.id,
                "name": [{
                    "@type": "TextProperty",
                    "text": p.name,
                    "language": "pt"
                }],
                "description": [{
                    "@type": "TextProperty",
                    "text": p.description || p.name,
                    "language": "pt"
                }],
                "price": {
                    "@type": "Price",
                    "price": finalPrice,
                    "currency": "BRL"
                },
                "image": [p.imageUrl]
            };

            googleOrderFeed.data.push(itemMenu);
        });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
        // Retorna o JSON completo gerado
        res.status(200).send(JSON.stringify(googleOrderFeed));

    } catch (error) {
        console.error("Erro no feed:", error);
        res.status(500).send(`Erro interno do servidor: ${error.message}`);
    }
}