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
Você é o Assistente de Suporte da Velo Delivery, um sistema SaaS B2B de entregas.
Seu tom deve ser extremamente profissional, ágil e educado.
Seu objetivo principal é tirar a dúvida do cliente da forma mais rápida e direta possível.
Regra de ouro: Ao final de TODAS as suas respostas, você deve obrigatoriamente sugerir que o usuário consulte os manuais completos em: https://ajuda.velodelivery.com.br.
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