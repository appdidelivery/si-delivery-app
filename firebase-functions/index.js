const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();


// Cloud Function que escuta a criação de novas avaliações
exports.awardVipPointsOnReview = functions
  .region("southamerica-east1") // Opcional: Especifique a região mais próxima
  .firestore.document("reviews/{reviewId}")
  .onCreate(async (snap, context) => {
    const reviewData = snap.data();
    
    // Validação básica dos dados do gatilho
    if (!reviewData.orderId || !reviewData.userId) {
      functions.logger.error("Dados da avaliação incompletos:", reviewData);
      return null;
    }

    const { orderId, userId } = reviewData;
    const pointsToAward = 50; // Pontos a serem creditados

    const orderRef = db.collection("orders").doc(orderId);
    const userRef = db.collection("users").doc(userId);

    try {
      // Usar uma transação para garantir a atomicidade e idempotência
      await db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists) {
          throw new Error(`Pedido ${orderId} não encontrado!`);
        }

        // --- PONTO CHAVE DE SEGURANÇA (IDEMPOTÊNCIA) ---
        // Verifica se os pontos para este pedido já foram concedidos
        if (orderDoc.data().reviewPointsAwarded === true) {
          functions.logger.log(`Pontos para o pedido ${orderId} já foram concedidos. Abortando.`);
          return; // Aborta a transação
        }

        // Se chegou aqui, os pontos ainda não foram dados.
        // 1. Credita os pontos no perfil do usuário
        transaction.set(userRef, {
            vipPoints: admin.firestore.FieldValue.increment(pointsToAward)
        }, { merge: true }); // 'merge: true' para não sobrescrever outros dados do usuário

        // 2. Marca o pedido para não conceder pontos novamente
        transaction.update(orderRef, {
            reviewPointsAwarded: true
        });

        functions.logger.log(`Sucesso! ${pointsToAward} pontos VIP concedidos ao usuário ${userId} pelo pedido ${orderId}.`);
      });

    } catch (error) {
      functions.logger.error(
        `Falha na transação de pontos para o pedido ${orderId}:`,
        error
      );
      // Opcional: Você pode registrar este erro em um sistema de monitoramento
    }
    
    return null;
    exports.aggregateStoreRatings = functions
  .region("southamerica-east1") // Mantendo a mesma região da sua outra função
  .firestore.document("reviews/{reviewId}")
  .onWrite(async (change, context) => {
    // Pega os dados do review (novo ou antigo, caso tenha sido deletado)
    const reviewData = change.after.exists ? change.after.data() : change.before.data();
    
    if (!reviewData || !reviewData.storeId) return null;
    
    const storeId = reviewData.storeId;
    
    try {
        // Busca todas as avaliações dessa loja
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

        // Calcula a média exata (Ex: 4.8)
        const ratingAggregate = ratingCount > 0 ? (totalRating / ratingCount) : 0;

        // Atualiza o documento da loja com os totais
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
  });
  // --- INÍCIO DO CÓDIGO DO SUPORTE VELO DELIVERY ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const SYSTEM_INSTRUCTION = `
Você é o Assistente de Suporte da Velo Delivery, um sistema SaaS B2B de entregas.
Seu tom deve ser extremamente profissional, ágil e educado.
Seu objetivo principal é tirar a dúvida do cliente da forma mais rápida e direta possível.
Regra de ouro: Ao final de TODAS as suas respostas, você deve obrigatoriamente sugerir que o usuário consulte os manuais completos em: https://ajuda.velodelivery.com.br.
`;

exports.veloSupportWidget = onCall(
  { secrets: [geminiApiKey], region: "southamerica-east1", cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Apenas usuários logados podem usar o suporte.");
    }
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
// --- FIM DO CÓDIGO DO SUPORTE VELO DELIVERY ---