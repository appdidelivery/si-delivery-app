import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getStoreIdFromHostname } from '../utils/domainHelper';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      console.log("StoreContext: Iniciando fetchStore...");
      setLoading(true);

      try {
        let slugFromHostname = getStoreIdFromHostname();
        console.log("StoreContext: Slug detectado do hostname:", slugFromHostname);

        let finalSlug = slugFromHostname;

        // Lógica SaaS: Se estiver em desenvolvimento ou não detectado, usa o ambiente de teste
        if (!slugFromHostname || slugFromHostname === "unknown-store") {
          console.warn("StoreContext: Usando fallback 'loja-teste' para o ambiente SaaS Demo.");
          finalSlug = "loja-teste";
        }

        console.log("StoreContext: Buscando no Firestore por slug:", finalSlug);

        // Busca na coleção 'stores' para validar se o lojista existe
        const q = query(collection(db, 'stores'), where('slug', '==', finalSlug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          
          // Define a loja com o ID e o Slug (essencial para as Settings funcionarem)
          setStore({ id: data.slug, ...data });
          
          console.log("StoreContext: Loja carregada:", { id: data.slug, name: data.name });
          
          // Atualiza o título da aba do navegador para o nome da loja do lojista
          document.title = data.name || "Velo Delivery";
        } else {
          console.error(`StoreContext: Loja '${finalSlug}' não encontrada. Verifique a coleção 'stores'.`);
          setStore(null);
        }
      } catch (error) {
        console.error("StoreContext: Erro crítico no carregamento da loja:", error);
        setStore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  return (
    <StoreContext.Provider value={{ store, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);