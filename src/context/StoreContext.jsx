import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getStoreIdFromHostname } from '../utils/domainHelper'; // Já deve estar aqui

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
        console.log("StoreContext: Slug detectado do hostname via domainHelper:", slugFromHostname);

        let finalSlug = slugFromHostname;

        // Se o slug do hostname não for útil (null, vazio ou "unknown-store"), usa o fallback
        if (!slugFromHostname || slugFromHostname === "unknown-store") { // <--- CORREÇÃO CHAVE AQUI
          console.warn("StoreContext: Slug inválido ou não detectado do hostname. Usando 'loja-teste' como fallback.");
          finalSlug = "loja-teste";
        }
        console.log("StoreContext: Slug final para busca:", finalSlug);

        const q = query(collection(db, 'stores'), where('slug', '==', finalSlug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          setStore({ id: doc.id, ...data });
          console.log("StoreContext: Loja carregada com sucesso:", { id: doc.id, name: data.name, slug: data.slug });
          document.title = data.name || "Velo Delivery";
        } else {
          console.warn(`StoreContext: Loja com slug '${finalSlug}' não encontrada no banco de dados. Verifique a coleção 'stores'.`);
          setStore(null);
        }
      } catch (error) {
        console.error("StoreContext: Erro durante o fetch da loja:", error);
        setStore(null);
      } finally {
        setLoading(false);
        console.log("StoreContext: Finalizado o carregamento da loja. Store:", store ? store.id : "null (não carregada ou erro)");
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