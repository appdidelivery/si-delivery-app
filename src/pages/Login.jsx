import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase'; // ADICIONEI 'db' AQUI
import { useNavigate, useSearchParams } from 'react-router-dom'; // ADICIONEI 'useSearchParams'
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
    const [searchParams] = useSearchParams(); // CAPTURA URL
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
                // --- MODO CADASTRO AUTOMÁTICO ---
                const fakeEmail = `${newOwnerPhone}@velo.com`; // Email gerado automaticamente

                // 1. Criar Usuário
                const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
                const user = userCredential.user;

                // 2. Criar Documento da Loja
                await setDoc(doc(db, "stores", newStoreSlug), {
                    name: newOwnerName, // Nome que veio da Landing Page
                    ownerId: user.uid,
                    phone: newOwnerPhone,
                    slug: newStoreSlug,
                    createdAt: serverTimestamp(),
                    status: 'active',
                    subscription: 'trial',
                    theme: 'default'
                });

                // 3. Criar Perfil do Dono
                await setDoc(doc(db, "users", user.uid), {
                    email: fakeEmail,
                    storeId: newStoreSlug,
                    role: 'admin'
                });

            } else {
                // --- MODO LOGIN NORMAL ---
                await signInWithEmailAndPassword(auth, email, password);
            }

            // Redireciona para o Admin
            navigate('/admin');

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Esta loja já foi ativada. Tente fazer login.');
            } else {
    setError('ERRO REAL: ' + err.message); 
}
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