import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase'; // ADICIONEI auth
import { onAuthStateChanged } from 'firebase/auth'; // ADICIONEI onAuthStateChanged
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'; // ADICIONEI doc, getDoc
import { getStoreIdFromHostname } from '../utils/domainHelper';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("StoreContext: Iniciando sistema de detecção...");
    setLoading(true);

    // Variável para guardar a "escuta" do banco e poder desligar depois
    let unsubscribeStore = () => {};

    // 1. Monitorar o estado do Login (Auth)
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      
      let currentSlug = getStoreIdFromHostname();
      
      // LÓGICA SAAS INTELIGENTE:
      // Se estamos em localhost ou domínio principal (sem subdomínio),
      // tentamos descobrir a loja pelo USUÁRIO logado.
      if (!currentSlug || currentSlug === "unknown-store") {
        
        if (user) {
          console.log("StoreContext: Usuário logado detectado! Buscando a loja dele...");
          try {
            // Busca o perfil do usuário para saber qual é a loja dele (storeId)
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.storeId) {
                currentSlug = userData.storeId; // ACHEI! Usa a loja do dono.
                console.log("StoreContext: Loja do usuário encontrada:", currentSlug);
              }
            }
          } catch (error) {
            console.error("StoreContext: Erro ao buscar perfil do usuário", error);
          }
        }
        
        // Se mesmo logado não achou (ou não tá logado), cai no fallback
        if (!currentSlug || currentSlug === "unknown-store") {
           // Mude 'csi' para 'default' ou mantenha 'csi' se quiser ver a loja cheia como fallback
           currentSlug = 'csi'; 
           console.warn("StoreContext: Nenhuma loja vinculada. Usando fallback:", currentSlug);
        }
      }

      console.log("StoreContext: Conectando na loja final:", currentSlug);

      // 2. Conectar na Loja (Firestore Realtime)
      // Se já tinha uma conexão aberta, fecha ela antes de abrir a nova
      unsubscribeStore();

      const q = query(collection(db, 'stores'), where('slug', '==', currentSlug));
      
      unsubscribeStore = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const storeDoc = querySnapshot.docs[0];
          const storeData = storeDoc.data();
          
          setStore({ id: storeDoc.id, ...storeData });
          document.title = storeData.name || "Velo Delivery";
        } else {
          console.error(`StoreContext: Loja '${currentSlug}' não encontrada.`);
          setStore(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("StoreContext: Erro na conexão:", error);
        setLoading(false);
      });
      
    });

    // Limpeza ao sair da tela
    return () => {
      unsubscribeAuth(); // Para de ouvir o Auth
      unsubscribeStore(); // Para de ouvir o Banco
    };

  }, []);

  return (
    <StoreContext.Provider value={{ store, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);