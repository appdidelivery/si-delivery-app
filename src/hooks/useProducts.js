import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { effectivePromoPrice } from '../lib/promotions';

export default function useProducts(storeId, activeCategory, searchTerm) {
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(12);
    const [promotionClock, setPromotionClock] = useState(() => Date.now());
    useEffect(() => {
      const id = setInterval(() => setPromotionClock(Date.now()), 15000);
      return () => clearInterval(id);
    }, []);

    const fetchCatalog = useCallback(async () => {
        if (!storeId) return;
        
        // 1. CHAVE DO CACHE (Segurança e Isolamento por Loja)
        const cacheKey = `velo_catalog_${storeId}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        const fetchedAt = Number(sessionStorage.getItem(`${cacheKey}_fetchedAt`) || 0);

        // 2. SE TEM EM CACHE, USA A MEMÓRIA (Custo ZERO no Firebase)
        if (cachedData && fetchedAt > 0 && Date.now() - fetchedAt < 5 * 60 * 1000) {
            try {
                setAllProducts(JSON.parse(cachedData));
                setLoading(false);
                return; 
            } catch (e) {
                sessionStorage.removeItem(cacheKey);
            }
        }

        setLoading(true);
        try {
            // 3. SE NÃO TEM CACHE, FAZ A FOTO (getDocs) DO BANCO 1 VEZ
            const q = query(collection(db, "products"), where("storeId", "==", storeId));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isActive !== false);
            
            docs.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
            
            setAllProducts(docs);
            
            // 4. SALVA O RESULTADO NO CACHE DO NAVEGADOR
            sessionStorage.setItem(cacheKey, JSON.stringify(docs));
            sessionStorage.setItem(`${cacheKey}_fetchedAt`, String(Date.now()));
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    // Dispara a busca quando entra na loja
    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    // Reseta a paginação ao trocar de categoria
    useEffect(() => {
        setVisibleCount(12);
    }, [activeCategory, searchTerm]);

    // Motor In-Memory de Filtro, Busca e Paginação (Super Rápido)
    const { products, hasMore } = useMemo(() => {
        let filtered = allProducts;

        if (activeCategory && activeCategory !== 'all') {
            filtered = filtered.filter(p => p.category === activeCategory);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) || 
                (p.description && p.description.toLowerCase().includes(term))
            );
        }

        const paginated = filtered.slice(0, visibleCount).map(p => ({
          ...p,
          promotionOriginalPrice: Number(p.promotionalPrice || 0),
          promotionalPrice: effectivePromoPrice(p, promotionClock)
        }));
        const hasMoreItems = visibleCount < filtered.length;

        return { products: paginated, hasMore: hasMoreItems };
    }, [allProducts, activeCategory, searchTerm, visibleCount, promotionClock]);

    return { 
        products, 
        loading, 
        loadingMore: false, 
        hasMore, 
        loadMore: () => {
            if (hasMore) setVisibleCount(prev => prev + 12);
        } 
    };
}