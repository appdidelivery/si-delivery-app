import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";

// A função agora espera um objeto com todos os dados necessários.
export const enviarAvaliacao = async (reviewData) => {
  try {
    // Validação básica dos dados recebidos
    if (!reviewData.userId || !reviewData.storeId || !reviewData.orderId || !reviewData.rating) {
      throw new Error("Dados insuficientes para enviar a avaliação.");
    }

    await addDoc(collection(db, "reviews"), {
      userId: reviewData.userId,
      storeId: reviewData.storeId,
      orderId: reviewData.orderId,
      rating: reviewData.rating,
      comment: reviewData.comment || "", // Garante que o campo exista mesmo que vazio
      createdAt: serverTimestamp()
    });
    
    console.log("Avaliação salva com sucesso!");
    return true; // Sucesso

  } catch (error) {
    console.error("Erro ao salvar a avaliação no Firestore:", error);
    throw error; // Propaga o erro para ser tratado na UI
  }
};

// Nenhuma mudança necessária nesta função
export const subscribeToVipPoints = (userId, callback) => {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (d) => {
    callback(d.exists() ? d.data().vipPoints || 0 : 0);
  });
};