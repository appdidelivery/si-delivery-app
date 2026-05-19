import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function useProducts(storeId, activeCategory, searchTerm) {
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(12); // Só desenha 12 na tela

    // 1. Busca no Banco UMA ÚNICA VEZ
    const fetchCatalog = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        try {
            const q = query(collection(db, "products"), where("storeId", "==", storeId));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isActive !== false);
            
            // Ordena nativamente pelo Javascript para não exigir Índice no Firebase
            docs.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
            setAllProducts(docs);
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    // 2. Sempre que mudar de categoria ou buscar, volta a mostrar apenas 12
    useEffect(() => {
        setVisibleCount(12);
    }, [activeCategory, searchTerm]);

    // 3. Filtra na memória e Pagina a Tela (Super Rápido)
    const { products, hasMore } = useMemo(() => {
        let filtered = allProducts;

        // Filtro de Categoria
        if (activeCategory && activeCategory !== 'all') {
            filtered = filtered.filter(p => p.category === activeCategory);
        }

        // Filtro de Busca
        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) || 
                (p.description && p.description.toLowerCase().includes(term))
            );
        }

        // Corta o array para mostrar só o limite atual (12, 24, 36...)
        const paginated = filtered.slice(0, visibleCount);
        const hasMoreItems = visibleCount < filtered.length;

        return { products: paginated, hasMore: hasMoreItems };
    }, [allProducts, activeCategory, searchTerm, visibleCount]);

    return { 
        products, 
        loading, 
        loadingMore: false, 
        hasMore, 
        loadMore: () => {
            // Quando rolar a tela, adiciona mais 12 itens
            if (hasMore) setVisibleCount(prev => prev + 12);
        } 
    };
}