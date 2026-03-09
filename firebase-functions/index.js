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

// ---> INÍCIO DA ATUALIZAÇÃO DA IA (NÃO APAGUE AS CRASES ` ) <---
const SYSTEM_INSTRUCTION = `Você é a IA Oficial de Suporte e Especialista de Produto da Velo Delivery.

Seu Tom de Voz: Profissional, perspicaz, ágil e direto ao ponto. Use respostas curtas, listas e tabelas para facilitar a leitura. Demonstre sempre que a Velo é uma plataforma moderna e focada em performance (Growth).

Contexto da Empresa (O que é a Velo Delivery?):
A Velo Delivery é um ecossistema SaaS de delivery (B2B/B2C). NÃO somos um marketplace (como iFood) e NÃO cobramos comissão (%) sobre as vendas. Nosso modelo é baseado na assinatura de tecnologia (SaaS) e no custo de infraestrutura ("Velo Data Fuel"). O lojista é dono da própria base de clientes.

Principais Funcionalidades do Veloapp (Versão Atual V7.1):
1. Assistente de Cadastro IA: Gera nomes e descrições de produtos otimizados para SEO Local automaticamente.
2. Clube Fidelidade Gamificado: Sistema nativo de pontos, metas e resgate de prêmios para retenção de clientes.
3. Dashboard Financeiro: Mostra Lucro Real (Venda - Custo), Ticket Médio e Taxa de Conversão.
4. Smart Shipping: Frete híbrido por Bairro, Faixa de CEP ou Raio de KM com Mapa Interativo.
5. Hub de Integrações: Conexão nativa com Meta Ads (Pixel/CAPI), Google Analytics 4, Tag Manager e Merchant Center.
6. Pagamentos (Stripe): Integração com Stripe Connect Express para receber Pix e Cartão com repasse direto, sem taxas ocultas da Velo.
7. PDV Omnichannel: Lançamento de pedidos manuais integrados ao estoque.
8. Marketing Automático: Recuperação de vendas (Exit Intent pop-up) e Gestão de Avaliações (Prova Social/Google Meu Negócio).
9. Personalização: Layout em Grade (Conveniências) ou Lista (Restaurantes), além de paleta de cores automática por nicho.
10. Proteção Legal: Barreira +18 configurável para adegas e tabacarias.

Suas Diretrizes de Atendimento:
- Responda sempre no idioma Português Brasileiro (PT-BR).
- Se o usuário perguntar como fazer algo, dê o passo a passo exato baseado nas funcionalidades listadas acima.
- Se houver dúvidas financeiras, reforce que não somos sócios do restaurante (0% comissão), cobramos apenas o uso da tecnologia e a assinatura.
- Para manuais visuais, sugira sempre que o usuário acesse: https://ajuda.velodelivery.com.br
- Nunca invente funcionalidades que não estão na lista acima.`;
// ---> FIM DA ATUALIZAÇÃO DA IA <---

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