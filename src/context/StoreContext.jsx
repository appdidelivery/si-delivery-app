import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'; 
import { getStoreIdFromHostname } from '../utils/domainHelper';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("StoreContext: Iniciando (Modo Estrito)...");
    setLoading(true);

    let unsubscribeStore = () => {};
    let unsubscribeUser = () => {}; 

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      
      // Resetar tudo ao mudar o user
      unsubscribeStore();
      unsubscribeUser();
      
      // 1. Tenta pegar pelo SUBDOMÍNIO (prioridade máxima)
      let currentSlug = getStoreIdFromHostname();

      // 2. Se for link com ?store= (ex: vindo da landing page)
      if (window.location.hostname.includes('si-delivery-app')) {
          console.log("StoreContext: Ambiente Vercel detectado. Ignorando hostname.");
          currentSlug = null;
      }

      // Função auxiliar para carregar a loja
      const loadStore = (slugToLoad) => {
        if (!slugToLoad || slugToLoad === "unknown-store") return;
        
        console.log("StoreContext: Carregando loja alvo:", slugToLoad);
        unsubscribeStore(); 
        
        const q = query(collection(db, 'stores'), where('slug', '==', slugToLoad));
        unsubscribeStore = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const storeDoc = querySnapshot.docs[0];
            const storeData = storeDoc.data();
            console.log("StoreContext: ✅ Loja carregada com sucesso:", storeData.name);
            setStore({ id: storeDoc.id, ...storeData });
          } else {
             console.warn(`StoreContext: ⚠️ Loja '${slugToLoad}' ainda não existe no banco. Aguardando...`);
             // IMPORTANTE: Mantém null. Não carrega fallback.
             setStore(null);
          }
          setLoading(false);
        });
      };

      // CENÁRIO A: Temos um slug definido na URL (ex: subdomínio)
      if (currentSlug && currentSlug !== 'unknown-store') {
          loadStore(currentSlug);
          return;
      }

      // CENÁRIO B: Usuário Logado (O CASO CRÍTICO)
      if (user) {
          console.log("StoreContext: 👤 Usuário logado detectado. Buscando ID no perfil...");
          const userRef = doc(db, "users", user.uid);
          
          unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              // Se o perfil existe e tem storeId
              if (docSnap.exists() && docSnap.data().storeId) {
                  const userStoreId = docSnap.data().storeId;
                  console.log("StoreContext: 🎯 ID encontrado no perfil:", userStoreId);
                  loadStore(userStoreId);
              } else {
                  // Se ainda não tem storeId (delay da criação), ESPERA.
                  console.log("StoreContext: ⏳ Aguardando criação do vínculo da loja...");
                  // NÃO define setLoading(false) aqui. Deixa rodando o loading.
              }
          });
          return; // <--- IMPEDE DE CAIR NO FALLBACK
      }

      // CENÁRIO C: Visitante Deslogado (Aí sim mostra a Demo/Lara)
      const isLoginPage = window.location.pathname.includes('/login');
      if (!isLoginPage && (!currentSlug || currentSlug === "unknown-store")) {
           console.log("StoreContext: Visitante anônimo. Carregando Demo.");
           loadStore('csi'); // Só carrega a Lara se NÃO for login e NÃO tiver usuário
      } else {
           setLoading(false);
      }

    });

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
      unsubscribeUser();
    };

  }, []);

  return (
    <StoreContext.Provider value={{ store, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);