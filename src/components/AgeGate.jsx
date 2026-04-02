import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Wine } from 'lucide-react';

export default function AgeGate({ enabled }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Se a loja não ativou a opção, ou se não carregou ainda, não faz nada
        if (!enabled) return;

        // Verifica no navegador (localStorage) se o cliente já confirmou antes
        const isVerified = localStorage.getItem('velo_age_verified');
        
        // Se não verificou ainda, mostra o modal
        if (isVerified !== 'true') {
            setIsVisible(true);
            // Trava o scroll da página para o cliente não conseguir descer a tela
            document.body.style.overflow = 'hidden';
        }
    }, [enabled]);

    const handleConfirmAge = (isOfAge) => {
        if (isOfAge) {
            // Salva no celular do cliente que ele já é +18 para não perguntar de novo
            localStorage.setItem('velo_age_verified', 'true');
            setIsVisible(false);
            // Libera o scroll da página
            document.body.style.overflow = 'auto';
        } else {
            // Se for menor de idade, joga pro Google (ou um site educativo)
            window.location.href = "https://www.google.com";
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    // z-[9999] garante que fique por cima de TUDO no seu site
                    className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4"
                >
                    <motion.div 
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="age-modal-title"
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white w-full max-w-md rounded-[3rem] p-8 text-center shadow-2xl border-4 border-slate-800"
                    >
                        <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <Wine size={48} className="text-red-500" aria-hidden="true" />
                        </div>
                        
                        <h2 id="age-modal-title" className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-2">
                            Você tem mais de 18 anos?
                        </h2>
                        <p className="text-slate-500 font-bold mb-8 text-sm">
                            Para acessar nosso catálogo e realizar pedidos, você precisa confirmar ter idade legal para o consumo de bebidas alcoólicas.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button 
                                aria-label="Confirmar que tenho 18 anos ou mais"
                                onClick={() => handleConfirmAge(true)}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-xl"
                            >
                                Sim, tenho 18 anos ou mais
                            </button>
                            <button 
                                aria-label="Informar que sou menor de idade"
                                onClick={() => handleConfirmAge(false)}
                                className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                Não, sou menor de idade
                            </button>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 mt-6 flex items-center justify-center gap-1">
                            <ShieldAlert size={12} aria-hidden="true" /> Venda proibida para menores de 18 anos.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}