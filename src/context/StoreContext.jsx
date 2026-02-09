import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'; // Removi getDoc, agora é tudo onSnapshot
import { getStoreIdFromHostname } from '../utils/domainHelper';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("StoreContext: Iniciando sistema...");
    setLoading(true);

    let unsubscribeStore = () => {};
    let unsubscribeUser = () => {}; // Nova escuta para o usuário

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      
      // Limpa escutas anteriores ao mudar status de login
      unsubscribeStore();
      unsubscribeUser();

      // 1. Tenta pegar pelo SUBDOMÍNIO (prioridade máxima)
      let currentSlug = getStoreIdFromHostname();

      // 2. Tenta pegar pela URL (Link da Landing Page)
      if (!currentSlug || currentSlug === 'unknown-store') {
        const urlParams = new URLSearchParams(window.location.search);
        const storeFromUrl = urlParams.get('store');
        if (storeFromUrl) {
            currentSlug = storeFromUrl;
        }
      }

      // Função auxiliar para carregar a loja (evita repetir código)
      const loadStore = (slugToLoad) => {
        if (!slugToLoad || slugToLoad === "unknown-store") return;
        
        console.log("StoreContext: Carregando loja:", slugToLoad);
        unsubscribeStore(); // Para a anterior se houver
        
        const q = query(collection(db, 'stores'), where('slug', '==', slugToLoad));
        unsubscribeStore = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const storeDoc = querySnapshot.docs[0];
            setStore({ id: storeDoc.id, ...storeDoc.data() });
          } else {
             // Se estamos tentando carregar uma loja específica que não existe, null (criação)
             // Se for fallback, mantém null também
             console.log(`StoreContext: Loja '${slugToLoad}' não encontrada.`);
             setStore(null);
          }
          setLoading(false);
        });
      };

      // 3. SE TEM SLUG DEFINIDO (URL ou Subdomínio), CARREGA ELE DIRETO
      if (currentSlug && currentSlug !== 'unknown-store') {
          loadStore(currentSlug);
          return;
      }

      // 4. SE NÃO TEM SLUG, MAS TEM USUÁRIO LOGADO -> MONITORAR PERFIL (A CORREÇÃO!)
      if (user) {
          console.log("StoreContext: Monitorando perfil do usuário...");
          const userRef = doc(db, "users", user.uid);
          
          unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                  const userData = docSnap.data();
                  if (userData.storeId) {
                      console.log("StoreContext: Loja detectada no perfil:", userData.storeId);
                      loadStore(userData.storeId);
                  } else {
                      // Se o usuário existe mas não tem loja ainda (fallback temporário)
                      console.warn("StoreContext: Usuário sem loja vinculada. Aguardando...");
                  }
              }
          });
          return;
      }

      // 5. FALLBACK FINAL (Visitante sem login e sem URL) -> MOSTRA DEMO (Sushi/CSI)
      const isLoginPage = window.location.pathname.includes('/login');
      if (!isLoginPage) {
           console.warn("StoreContext: Visitante detectado. Carregando Loja Demo.");
           loadStore('csi'); // Mude para o slug da sua loja demo oficial se quiser
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