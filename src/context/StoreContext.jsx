import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
// ADICIONEI: onSnapshot na importação abaixo
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { getStoreIdFromHostname } from '../utils/domainHelper';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("StoreContext: Iniciando escuta em tempo real...");
    setLoading(true);

    let slugFromHostname = getStoreIdFromHostname();
    let finalSlug = slugFromHostname;

    // Lógica SaaS: Se estiver em desenvolvimento ou não detectado
    if (!slugFromHostname || slugFromHostname === "unknown-store") {
      console.warn("StoreContext: Modo DEV/Teste detectado. Usando 'loja-teste' (ou 'csi' se preferir testar a produção).");
      // DICA: Se quiser testar a CSI localmente, mude abaixo para 'csi'
      finalSlug = "csi"; 
    }

    console.log("StoreContext: Conectando na coleção 'stores' com slug:", finalSlug);

    // Cria a query
    const q = query(collection(db, 'stores'), where('slug', '==', finalSlug));

    // A MÁGICA: onSnapshot (Escuta ao vivo)
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        // Atualiza o estado com os dados novos vindos do Admin V5
        setStore({ id: doc.id, ...data });
        
        // Log para você ver no console se o status mudou
        console.log("🔥 ATUALIZAÇÃO RECEBIDA DO ADMIN:", { 
          Loja: data.name, 
          Aberta: data.isOpen, 
          Aviso: data.message 
        });
        
        document.title = data.name || "Velo Delivery";
      } else {
        console.error(`StoreContext: Nenhuma loja encontrada com o slug '${finalSlug}' na coleção 'stores'.`);
        setStore(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("StoreContext: Erro na conexão ao vivo:", error);
      setLoading(false);
    });

    // Função de limpeza (fecha a conexão quando sai da página)
    return () => unsubscribe();

  }, []);

  return (
    <StoreContext.Provider value={{ store, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);