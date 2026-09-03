import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../services/firebase';

const PAGE_SIZE = 20; // Carrega 20 itens por vez

export default function useProducts(storeId, activeCategory = 'all', searchTerm = '') {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastVisible, setLastVisible] = useState(null);

    const fetchProducts = useCallback(async (isLoadMore = false) => {
        if (!storeId) return;

        // Controle de estados de carregamento
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setHasMore(true);
        }

        // Cache Inteligente (Evita reler a primeira página se o cliente voltar da Home)
        const cacheKey = `veloProducts_${storeId}_${activeCategory}_${searchTerm.toLowerCase()}`;
        if (!isLoadMore && sessionStorage.getItem(cacheKey)) {
            const cachedParams = JSON.parse(sessionStorage.getItem(cacheKey));
            setProducts(cachedParams.items);
            setLastVisible(null); // Desativa paginação em cache para forçar recarregamento se ele descer muito
            setHasMore(cachedParams.items.length >= PAGE_SIZE);
            setLoading(false);
            return;
        }

        try {
            let baseConstraints = [
                where("storeId", "==", storeId),
                where("isActive", "==", true)
            ];

            if (activeCategory !== 'all') {
                baseConstraints.push(where("category", "==", activeCategory));
            }

            let q;
            if (isLoadMore && lastVisible) {
                q = query(collection(db, "products"), ...baseConstraints, startAfter(lastVisible), limit(PAGE_SIZE));
            } else {
                q = query(collection(db, "products"), ...baseConstraints, limit(PAGE_SIZE));
            }

            const querySnapshot = await getDocs(q);
            
            let fetchedProducts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filtro local de busca textual (O Firestore não faz busca "contains" nativa eficientemente)
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                fetchedProducts = fetchedProducts.filter(p => 
                    p.name.toLowerCase().includes(searchLower) || 
                    (p.description && p.description.toLowerCase().includes(searchLower))
                );
            }

            if (isLoadMore) {
                setProducts(prev => {
                    const merged = [...prev, ...fetchedProducts];
                    // Remove duplicados por segurança
                    const unique = Array.from(new Set(merged.map(a => a.id))).map(id => merged.find(a => a.id === id));
                    return unique;
                });
            } else {
                setProducts(fetchedProducts);
                // Salva a primeira página no cache
                if (!searchTerm) {
                    sessionStorage.setItem(cacheKey, JSON.stringify({ items: fetchedProducts }));
                }
            }

            const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastVisible(lastDoc);
            
            // Se trouxe menos que o limite, significa que acabaram os itens
            if (querySnapshot.docs.length < PAGE_SIZE) {
                setHasMore(false);
            }

        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [storeId, activeCategory, searchTerm, lastVisible]);

    // Gatilho inicial e recálculos quando categoria ou busca mudam
    useEffect(() => {
        setLastVisible(null); // Reseta a paginação
        setProducts([]); // Limpa a tela
        fetchProducts(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, activeCategory, searchTerm]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchProducts(true);
        }
    };

    return { products, loading, loadingMore, hasMore, loadMore };
}