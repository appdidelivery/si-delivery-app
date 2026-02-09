import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight, Store } from 'lucide-react';
import { getStoreIdFromHostname } from '../utils/domainHelper';

// --- CONFIGURAÇÃO DE TEMAS POR LOJA ---
const STORE_THEMES = {
    csi: {
        name: "Conv St Isabel",
        color: "bg-blue-600 hover:bg-blue-700",
        logo: "https://res.cloudinary.com/dgn627g1j/image/upload/v1/logo-csi-share.png",
        iconColor: "text-blue-600"
    },
    mamedes: {
        name: "Mamedes Papéis",
        color: "bg-orange-500 hover:bg-orange-600",
        logo: null,
        iconColor: "text-orange-500"
    },
    futtalento: {
        name: "FutTalento",
        color: "bg-green-600 hover:bg-green-700",
        logo: null,
        iconColor: "text-green-600"
    },
    default: {
        name: "Velo Delivery",
        color: "bg-slate-900 hover:bg-slate-800",
        logo: "/logo-square.png",
        iconColor: "text-slate-900"
    }
};

export default function Login() {
    const [searchParams] = useSearchParams(); 
    const navigate = useNavigate();

    // --- LÓGICA DE DETECÇÃO DE NOVO CLIENTE ---
    const newStoreSlug = searchParams.get('store');
    const newOwnerName = searchParams.get('name');
    const newOwnerPhone = searchParams.get('phone');
    const isRegistering = !!newStoreSlug; // Se tem slug, é cadastro!

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Identifica a loja atual (Para login normal) ou usa Default (Para cadastro)
    const storeId = isRegistering ? 'default' : (getStoreIdFromHostname() || 'default');
    const currentTheme = STORE_THEMES[storeId] || STORE_THEMES.default;

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegistering) {
                // --- MODO CADASTRO INTELIGENTE (AUTO-CURA) ---
                const fakeEmail = `${newOwnerPhone}@velo.com`;
                let user;

                try {
                    // TENTATIVA 1: Criar Usuário Novo
                    const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
                    user = userCredential.user;
                } catch (createError) {
                    // TENTATIVA 2: Se já existe, tenta LOGAR automaticamente
                    if (createError.code === 'auth/email-already-in-use') {
                        console.log("Usuário já existe. Tentando login automático...");
                        try {
                            const loginCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
                            user = loginCredential.user;
                        } catch (loginError) {
                            throw new Error("A loja já existe, mas a senha está incorreta.");
                        }
                    } else {
                        throw createError; // Se for outro erro, repassa
                    }
                }

                // --- GARANTIA DE DADOS (CRIA OU RECUPERA A LOJA) ---
                // Se o usuário apagou o banco de dados mas o login ficou, isso aqui CONSERTA TUDO.
                // O { merge: true } garante que não apagamos dados se eles já existirem.
                
                await setDoc(doc(db, "stores", newStoreSlug), {
                    name: newOwnerName, 
                    ownerId: user.uid,
                    phone: newOwnerPhone,
                    slug: newStoreSlug,
                    createdAt: serverTimestamp(),
                    status: 'active',
                    subscription: 'trial',
                    theme: 'default'
                }, { merge: true });

                await setDoc(doc(db, "users", user.uid), {
                    email: fakeEmail,
                    storeId: newStoreSlug, // Vincula a loja ao usuário (Crucial para o Admin funcionar)
                    role: 'admin'
                }, { merge: true });

            } else {
                // --- MODO LOGIN NORMAL ---
                await signInWithEmailAndPassword(auth, email, password);
            }

            // Redireciona para o Admin
            navigate('/admin');

        } catch (err) {
            console.error(err);
            // Tratamento de mensagens amigáveis
            let msg = err.message;
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') msg = "Senha incorreta.";
            if (err.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-xl border border-slate-100 text-center">
                
                {/* CABEÇALHO DINÂMICO */}
                <div className="mb-8 flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 shadow-sm border border-slate-100 ${currentTheme.iconColor}`}>
                        {isRegistering ? <Store size={32} /> : <Lock size={32} />}
                    </div>
                    
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                        {isRegistering ? `Olá, ${newOwnerName}!` : 'Painel de Gestão'}
                    </h1>
                    
                    <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${currentTheme.iconColor}`}>
                        {isRegistering ? 'Crie sua senha para ativar' : currentTheme.name}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    
                    {/* ESCONDE O EMAIL SE FOR CADASTRO (POIS USA O TELEFONE) */}
                    {!isRegistering && (
                        <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="email" 
                                placeholder="Seu E-mail" 
                                className="w-full p-5 pl-14 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all border-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required={!isRegistering}
                            />
                        </div>
                    )}
                    
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="password" 
                            placeholder={isRegistering ? "Crie sua Senha Mestra" : "Sua Senha"} 
                            className="w-full p-5 pl-14 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all border-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-5 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isRegistering ? 'bg-green-600 hover:bg-green-700' : currentTheme.color}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {isRegistering ? 'ATIVAR LOJA GRÁTIS' : 'ENTRAR'} 
                                <ArrowRight size={20}/>
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {isRegistering ? `Login será: ${newOwnerPhone}@velo.com` : 'Powered by Velo Delivery'}
                </p>
            </div>
        </div>
    );
}