// Arquivo: lib/analytics.js
import { db, auth } from '../services/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

/**
 * Registra uma visualização de página na loja (Atualiza stats diários)
 */
export const trackPageView = async (storeId) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        const statsRef = doc(db, 'stats', storeId, 'daily', today);
        
        await setDoc(statsRef, {
            pageViews: increment(1),
            date: today
        }, { merge: true });
    } catch (error) {
        console.error("Erro Analytics (PageView):", error);
    }
};

/**
 * Registra a intenção de adicionar ao carrinho
 */
export const trackAddToCart = async (storeId, product) => {
    try {
        const user = auth.currentUser;
        let userType = 'anonymous';

        if (user) {
            // Verifica se a conta foi criada a menos de 24h para definir "novo" ou "recorrente"
            const creationTime = new Date(user.metadata.creationTime).getTime();
            const now = Date.now();
            userType = (now - creationTime < 86400000) ? 'new_user' : 'returning_user';
        }

        // Usamos addDoc para guardar um log cronológico das intenções (Útil para IA no futuro)
        await addDoc(collection(db, 'analytics_events'), {
            eventType: 'add_to_cart',
            storeId: storeId,
            productId: product.id,
            productName: product.name,
            price: product.price || 0,
            userId: user ? user.uid : null,
            userType: userType,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Erro Analytics (AddToCart):", error);
    }
};