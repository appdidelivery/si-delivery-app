import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        // Por enquanto, vamos forçar pegar a loja 'loja-teste'
        // Futuramente isso virá do subdomínio (ex: diego.velodelivery.com)
        const slug = "loja-teste"; 
        
        const q = query(collection(db, 'stores'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setStore({ id: querySnapshot.docs[0].id, ...data });
          
          // Muda o título da aba do navegador
          document.title = data.name || "Velo Delivery";
        } else {
          console.log("Loja não encontrada no banco novo.");
        }
      } catch (error) {
        console.error("Erro ao buscar loja:", error);
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