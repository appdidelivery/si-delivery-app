import { useState, useEffect, useRef } from 'react';

export default function useSmartRetention(marketingSettings, isCheckoutOpen, cartLength) {
    const [showOffer, setShowOffer] = useState(false);
    const [offerTriggered, setOfferTriggered] = useState(false);
    const inactivityTimer = useRef(null);

    useEffect(() => {
        // Verifica se a funcionalidade está ativada no painel do lojista
        if (!marketingSettings?.smartCouponsEnabled) return;
        
        // Não dispara se o carrinho estiver vazio ou a oferta já foi mostrada hoje para o usuário
        if (cartLength === 0 || offerTriggered) return;

        const triggerOffer = (reason) => {
            const today = new Date().toDateString();
            const hasShown = localStorage.getItem('smartRetentionShown');
            
            if (hasShown !== today) {
                setShowOffer(true);
                setOfferTriggered(true);
                localStorage.setItem('smartRetentionShown', today);
                console.log(`[Velo AI] Retenção disparada por: ${reason}`);
            }
        };

        // Gatilho 1: Exit Intent (Mouse saindo por cima da tela)
        const handleMouseLeave = (e) => {
            if (e.clientY <= 0) {
                triggerOffer('exit_intent');
            }
        };

        // Gatilho 2: Inatividade Dinâmica
        const resetTimer = () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            
            // Se o checkout estiver aberto, a IA é mais agressiva (45s). Caso contrário, 90s.
            const timeoutMs = isCheckoutOpen ? 45000 : 90000;
            
            inactivityTimer.current = setTimeout(() => {
                triggerOffer('inactivity');
            }, timeoutMs);
        };

        // Listeners Ativos
        document.addEventListener('mouseleave', handleMouseLeave);
        
        const activityEvents = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
        activityEvents.forEach(evt => document.addEventListener(evt, resetTimer));

        // Inicia o relógio
        resetTimer();

        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            activityEvents.forEach(evt => document.removeEventListener(evt, resetTimer));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, [marketingSettings?.smartCouponsEnabled, isCheckoutOpen, cartLength, offerTriggered]);

    const acceptOffer = () => setShowOffer(false);
    const closeOffer = () => setShowOffer(false);

    return { showOffer, acceptOffer, closeOffer };
}