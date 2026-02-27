import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'; 

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    let unsubscribeStore = () => {};
    let unsubscribeUser = () => {}; 

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeStore();
      unsubscribeUser();
      
      // 1. NOVA EXTRAÇÃO DE SLUG (Mais robusta para domínios .com.br)
      const hostname = window.location.hostname;
      let currentSlug = null;

      if (
        hostname !== 'localhost' &&
        !hostname.startsWith('www.') &&
        !hostname.startsWith('app.') &&
        hostname.includes('.')
      ) {
          // Pega exatamente a primeira parte antes do ponto
          currentSlug = hostname.split('.')[0]; 
      }

      // 2. AMBIENTE DE DESENVOLVIMENTO
      if (hostname.includes('github.dev') || hostname === 'localhost') {
          currentSlug = import.meta.env.VITE_LOJA_LOCAL || currentSlug || 'csi';
      }

      const loadStore = (slugToLoad) => {
        if (!slugToLoad || slugToLoad === "unknown-store") {
            setStore(null);
            setLoading(false);
            return;
        };
        
        unsubscribeStore(); 
        
        const q = query(collection(db, 'stores'), where('slug', '==', slugToLoad));
        unsubscribeStore = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const storeDoc = querySnapshot.docs[0];
            setStore({ id: storeDoc.id, ...storeDoc.data() });
          } else {
             // Loja não existe: Garante que o estado seja limpo, impedindo vazamentos
             setStore(null);
          }
          setLoading(false);
        });
      };

      // 3. REGRA DE ISOLAMENTO: Se existe subdomínio, ignora o perfil do usuário
      if (currentSlug && currentSlug !== 'unknown-store') {
          loadStore(currentSlug);
          return; // Este return impede que a loja da CSI seja carregada acidentalmente
      }

      // 4. FALLBACK: Só busca o perfil do usuário se estiver no domínio central (ex: app.velodelivery)
      if (user) {
          const userRef = doc(db, "users", user.uid);
          
          unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists() && docSnap.data().storeId) {
                  loadStore(docSnap.data().storeId);
              } else {
                  setStore(null);
                  setLoading(false);
              }
          });
          return;
      }

      setStore(null);
      setLoading(false);
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