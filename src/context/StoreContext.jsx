import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getStoreIdFromHostname } from '../utils/domainHelper';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("StoreContext: Iniciando sistema de detecção...");
    setLoading(true);

    let unsubscribeStore = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      
      // 1. Tenta pegar pelo SUBDOMÍNIO (prioridade máxima)
      let currentSlug = getStoreIdFromHostname();

      // 2. SE NÃO ACHOU, TENTA PEGAR PELA URL (Link da Landing Page)
      // Isso resolve o seu problema de criar loja nova!
      if (!currentSlug || currentSlug === 'unknown-store') {
        const urlParams = new URLSearchParams(window.location.search);
        const storeFromUrl = urlParams.get('store');
        if (storeFromUrl) {
            currentSlug = storeFromUrl;
            console.log("StoreContext: Loja detectada pela URL:", currentSlug);
        }
      }
      
      // 3. SE AINDA NÃO ACHOU, TENTA PEGAR PELO USUÁRIO LOGADO
      if ((!currentSlug || currentSlug === "unknown-store") && user) {
          console.log("StoreContext: Buscando loja do usuário logado...");
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().storeId) {
                currentSlug = userDoc.data().storeId;
            }
          } catch (error) {
            console.error("StoreContext: Erro ao buscar usuário", error);
          }
      }
        
      // 4. FALLBACK FINAL (Só carrega a padrão se tudo falhar)
      if (!currentSlug || currentSlug === "unknown-store") {
           // Se estiver na tela de login tentando criar conta, não carregue fallback
           // para não confundir o usuário com a loja errada.
           const isLoginPage = window.location.pathname.includes('/login');
           if (!isLoginPage) {
               currentSlug = 'csi'; // Loja Demo apenas se NÃO estiver criando conta
               console.warn("StoreContext: Usando fallback (Loja Demo).");
           }
      }

      // Se ainda assim não tiver slug (ex: criando conta nova), paramos aqui
      if (!currentSlug || currentSlug === "unknown-store") {
          setLoading(false);
          return;
      }

      console.log("StoreContext: Conectando na loja final:", currentSlug);

      unsubscribeStore();
      const q = query(collection(db, 'stores'), where('slug', '==', currentSlug));
      
      unsubscribeStore = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const storeDoc = querySnapshot.docs[0];
          setStore({ id: storeDoc.id, ...storeDoc.data() });
        } else {
          // Se a loja não existe no banco (é nova), mantemos null
          // para o Login.jsx saber que pode criar.
          console.log(`StoreContext: Loja '${currentSlug}' ainda não existe no banco (Criação).`);
          setStore(null); 
        }
        setLoading(false);
      });
      
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };

  }, []);

  return (
    <StoreContext.Provider value={{ store, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);