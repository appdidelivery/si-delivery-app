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
    console.log("StoreContext: Iniciando...");
    setLoading(true);

    let unsubscribeStore = () => {};
    let unsubscribeUser = () => {}; 

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      
      unsubscribeStore();
      unsubscribeUser();
      
      let currentSlug = getStoreIdFromHostname();

      // --- CORREÇÃO APLICADA AQUI ---
      // Agora ele detecta múltiplos ambientes de teste/desenvolvimento.
      if (
        window.location.hostname.includes('si-delivery-app') || 
        window.location.hostname.includes('github.dev') || 
        window.location.hostname.includes('localhost')
      ) {
          console.log("StoreContext: Ambiente de teste/dev detectado. Ignorando hostname.");
          currentSlug = null;
      }

      const loadStore = (slugToLoad) => {
        if (!slugToLoad || slugToLoad === "unknown-store") {
            setStore(null); // Garante que a loja seja nula se o slug for inválido
            setLoading(false);
            return;
        };
        
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
             console.warn(`StoreContext: ⚠️ Loja '${slugToLoad}' ainda não existe no banco.`);
             setStore(null);
          }
          setLoading(false);
        });
      };

      if (currentSlug && currentSlug !== 'unknown-store') {
          loadStore(currentSlug);
          return;
      }

      if (user) {
          console.log("StoreContext: 👤 Usuário logado detectado. Buscando ID no perfil...");
          const userRef = doc(db, "users", user.uid);
          
          unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists() && docSnap.data().storeId) {
                  const userStoreId = docSnap.data().storeId;
                  console.log("StoreContext: 🎯 ID encontrado no perfil:", userStoreId);
                  loadStore(userStoreId);
              } else {
                  console.log("StoreContext: ⏳ Usuário logado, mas sem loja vinculada ainda.");
                  setStore(null);
                  setLoading(false);
              }
          });
          return;
      }

      // Se não há slug e não há usuário, para de carregar.
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