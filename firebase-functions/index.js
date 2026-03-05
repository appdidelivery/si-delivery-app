const functions = require("firebase-functions/v1"); // <-- CORREÇÃO AQUI
const admin = require("firebase-admin");

// --- Importações da IA (V2) ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// 1. FUNÇÃO: PONTOS VIP (PRODUÇÃO)
// ============================================================================
exports.awardVipPointsOnReview = functions
  .region("southamerica-east1")
  .firestore.document("reviews/{reviewId}")
  .onCreate(async (snap, context) => {
    const reviewData = snap.data();
    
    if (!reviewData.orderId || !reviewData.userId) {
      functions.logger.error("Dados da avaliação incompletos:", reviewData);
      return null;
    }

    const { orderId, userId } = reviewData;
    const pointsToAward = 50;

    const orderRef = db.collection("orders").doc(orderId);
    const userRef = db.collection("users").doc(userId);

    try {
      await db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists) {
          throw new Error(`Pedido ${orderId} não encontrado!`);
        }

        if (orderDoc.data().reviewPointsAwarded === true) {
          functions.logger.log(`Pontos para o pedido ${orderId} já foram concedidos. Abortando.`);
          return; 
        }

        transaction.set(userRef, {
            vipPoints: admin.firestore.FieldValue.increment(pointsToAward)
        }, { merge: true });

        transaction.update(orderRef, {
            reviewPointsAwarded: true
        });

        functions.logger.log(`Sucesso! ${pointsToAward} pontos VIP concedidos ao usuário ${userId} pelo pedido ${orderId}.`);
      });

    } catch (error) {
      functions.logger.error(`Falha na transação de pontos para o pedido ${orderId}:`, error);
    }
    
    return null;
  });

// ============================================================================
// 2. FUNÇÃO: NOTA DA LOJA (PRODUÇÃO)
// ============================================================================
exports.aggregateStoreRatings = functions
  .region("southamerica-east1")
  .firestore.document("reviews/{reviewId}")
  .onWrite(async (change, context) => {
    const reviewData = change.after.exists ? change.after.data() : change.before.data();
    
    if (!reviewData || !reviewData.storeId) return null;
    
    const storeId = reviewData.storeId;
    
    try {
        const reviewsSnapshot = await db.collection("reviews").where("storeId", "==", storeId).get();
        
        let totalRating = 0;
        let ratingCount = 0;

        reviewsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.rating) {
                totalRating += data.rating;
                ratingCount++;
            }
        });

        const ratingAggregate = ratingCount > 0 ? (totalRating / ratingCount) : 0;

        await db.collection("stores").doc(storeId).update({
            rating_aggregate: ratingAggregate,
            rating_count: ratingCount
        });

        functions.logger.log(`Nota da loja ${storeId} atualizada para ${ratingAggregate} (${ratingCount} avaliações).`);
    } catch (error) {
        functions.logger.error(`Erro ao recalcular nota da loja ${storeId}:`, error);
    }
    
    return null;
  });

// ============================================================================
// 3. FUNÇÃO: SUPORTE VELO DELIVERY COM IA
// ============================================================================
const geminiApiKey = defineSecret("GEMINI_API_KEY");

const SYSTEM_INSTRUCTION = `
Você é o Assistente Virtual Sênior de Suporte da Velo Delivery, um sistema SaaS B2B completo para lojistas de conveniência, adegas, hamburguerias e restaurantes.
Seu tom de voz deve ser extremamente profissional, ágil, educado e direto ao ponto. Use listas para facilitar a leitura.
Seu objetivo principal é tirar a dúvida do lojista explicando como as funcionalidades da Velo operam, baseando-se ESTRITAMENTE nas regras de negócio abaixo.

=== REGRAS DE NEGÓCIO E FUNCIONAMENTO DA VELO DELIVERY ===

1. FINANCEIRO E ASSINATURA (SaaS)
- A mensalidade base custa R$ 49,90 e inclui Storage e Banco de Dados ilimitados, além de franquia de 100 pedidos/mês. Pedidos extras custam R$ 0,25/cada.
- Faturas não pagas geram bloqueio de acesso ao painel admin.
- Pagamentos de vendas online (Cartão/Pix direto no site) exigem que o lojista ative a conta "Stripe Connect" na aba Financeiro.

2. GESTÃO DE PEDIDOS, PDV E CHECKOUT
- O cliente final (comprador) tem 4 formas de pagamento: Pix, Cartão Online (via Stripe), Dinheiro (exige troco) ou Cartão com Motoboy.
- Pedidos em Dinheiro ou Motoboy são direcionados automaticamente formatados para o WhatsApp da loja.
- O sistema bloqueia vendas se o produto exceder o limite de estoque.
- Mudança de status do pedido para "Entregue" envia uma mensagem via WhatsApp pedindo avaliação com link do Google Meu Negócio.

3. ESTOQUE, PRODUTOS E VITRINE (Catálogo)
- O lojista escolhe o visual da loja: "Grade" (fotos pequenas, conveniência) ou "Lista" (fotos grandes, restaurantes). As cores mudam via "Nicho da Loja".
- Produtos podem ter Complementos Adicionais (obrigatórios ou não, com limites de escolha, ex: Ponto da Carne) e Upsell (Compre Junto).
- O sistema avisa o administrador se o estoque for menor ou igual a 2.
- A Loja atua como um App (PWA), oferecendo instalação direta no celular do cliente final (iOS e Android). Possui também bloqueio para maiores de 18 anos (+18).

4. FRETES E LOGÍSTICA (Mapa Inteligente)
- O frete da loja pode ser calculado automaticamente pela distância exata em KM (usando a fórmula de Haversine e Google Maps), ou fallback por Faixa de CEP e Nome do Bairro.
- O Lojista pode configurar uma "Meta de Frete Grátis" que gera uma barra de progresso no carrinho do cliente.

5. MARKETING, RETENÇÃO E FIDELIDADE
- Clube Fidelidade: O cliente final vê a pontuação e uma barra de progresso no topo do app. O lojista define quantos pontos o cliente ganha por real gasto.
- Exit Intent (Resgate): Se o cliente tentar sair do site (ou demorar 30s), a Velo dispara um modal automático oferecendo um Cupom de Desconto ("Não vá ainda!").
- Cupons: Configuráveis em % ou R$, com limite global, uso único por CPF ou pedido mínimo.
- Analytics: A plataforma coleta dados nativamente (Velo Analytics) e aceita injeção de ID do Google Analytics 4 (GA4).

=== REGRA DE OURO OBRIGATÓRIA ===
Ao final de TODAS as suas respostas, independentemente da pergunta, você DEVE pular uma linha e sugerir obrigatoriamente que o usuário consulte os manuais ilustrados completos e passo a passo acessando o link oficial: https://ajuda.velodelivery.com.br
`;

exports.veloSupportWidget = onCall(
  { secrets: [geminiApiKey], region: "southamerica-east1", cors: true },
  async (request) => {
    const userMessage = request.data.message;
    const chatHistory = request.data.history || [];
    
    if (!userMessage) throw new HttpsError("invalid-argument", "Mensagem vazia.");

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(userMessage);
      return { reply: result.response.text() };
    } catch (error) {
      console.error("Erro no Gemini:", error);
      throw new HttpsError("internal", "Erro ao processar suporte.");
    }
  }
);
exports.gerarCopyProduto = onCall(
    { secrets: [geminiApiKey], region: "southamerica-east1", cors: true },
    async (request) => {
        const { termoRaw, lojaNome, lojaNicho, lojaLocalizacao } = request.data;

        if (!termoRaw) {
            throw new HttpsError("invalid-argument", "O termo do produto é obrigatório.");
        }

        try {
            // Inicializa o Gemini usando a mesma chave secreta que o seu widget já usa!
            const genAI = new GoogleGenerativeAI(geminiApiKey.value());
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
            Você é um especialista Sênior em Local SEO e Copywriting para Delivery.
            Sua missão é transformar um termo simples em um cadastro de produto altamente conversivo.
            
            === CONTEXTO DO PRODUTO ===
            - Produto desejado: "${termoRaw}"
            
            === CONTEXTO DO LOJISTA (SEO LOCAL) ===
            - Nome da Loja: "${lojaNome || 'Nossa Loja'}"
            - Nicho de Mercado: "${lojaNicho || 'Delivery'}"
            - Localização / Cidade: "${lojaLocalizacao || 'nossa região'}"

            === REGRAS DE GERAÇÃO ===
            1. NOME DO PRODUTO: Crie um nome claro e otimizado para o algoritmo de busca do Google.
            2. DESCRIÇÃO: Escreva um texto persuasivo (gatilhos de desejo) de no máximo 3 frases. 
            3. SEO LOCAL MÁGICO: Na descrição, insira de forma EXTREMAMENTE SUTIL E NATURAL o nome da loja e a localização para forçar o ranqueamento regional no Google.
            
            Responda ESTRITAMENTE com um objeto JSON válido, sem formatação markdown, neste formato exato:
            {
                "nome": "Nome comercial otimizado",
                "descricao": "Descrição persuasiva com SEO local embutido"
            }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            // Limpa o markdown do JSON que a IA costuma mandar
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(cleanJson);

        } catch (error) {
            console.error("Erro na IA:", error);
            throw new HttpsError("internal", "Falha ao gerar conteúdo otimizado.");
        }
    }
);