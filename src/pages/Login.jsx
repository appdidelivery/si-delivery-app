import React, { useState, useEffect } from 'react';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../services/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight, Store } from 'lucide-react';
import { getStoreIdFromHostname } from '../utils/domainHelper';

// --- SEUS TEMAS VISUAIS (MANTIDOS) ---
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
    
    // VARIÁVEIS DE CADASTRO (Vindas da Landing Page)
    const urlStoreSlug = searchParams.get('store');
    const urlOwnerName = searchParams.get('name');
    const urlOwnerPhone = searchParams.get('phone');
    const isRegistering = !!urlStoreSlug;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const storeId = isRegistering ? 'default' : (getStoreIdFromHostname() || 'default');
    const currentTheme = STORE_THEMES[storeId] || STORE_THEMES.default;

    // --- EFEITO: Verifica Login e Redireciona ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // CENÁRIO 1: É UM NOVO CADASTRO
                if (isRegistering) {
                    await createStoreInDb(user);
                    
                    // Se estivermos em produção, joga para o subdomínio
                    if (!window.location.hostname.includes('localhost')) {
                        // Monta o link: https://loja-do-ze.velodelivery.com.br/admin
                        const newUrl = `https://${urlStoreSlug}.velodelivery.com.br/admin`;
                        window.location.href = newUrl;
                        return;
                    }
                }
                
                // CENÁRIO 2: LOGIN NORMAL (Ou Localhost)
                // Se já estiver no subdomínio certo, só entra
                navigate('/admin');
            } else {
                setCheckingAuth(false);
            }
        });
        return () => unsubscribe();
    }, [navigate, isRegistering, urlStoreSlug]);

    // --- CRIA A LOJA NO FIRESTORE ---
    const createStoreInDb = async (user) => {
        try {
            const storeRef = doc(db, "stores", urlStoreSlug);
            const userRef = doc(db, "users", user.uid);
            
            const storeSnap = await getDoc(storeRef);

            // Cria a loja se não existir
            if (!storeSnap.exists()) {
                await setDoc(storeRef, {
                    name: urlOwnerName || user.displayName || "Minha Loja", 
                    ownerId: user.uid,
                    phone: urlOwnerPhone || "",
                    email: user.email,
                    slug: urlStoreSlug,
                    createdAt: serverTimestamp(),
                    status: 'active',
                    subscription: 'trial',
                    theme: 'default'
                });
            }

            // Atualiza usuário
            await setDoc(userRef, {
                email: user.email,
                name: urlOwnerName || user.displayName,
                currentStore: urlStoreSlug,
                role: 'admin'
            }, { merge: true });

        } catch (err) {
            console.error("Erro ao criar loja:", err);
        }
    };

    // --- LOGIN GOOGLE ---
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // O useEffect lá em cima faz o resto
        } catch (err) {
            setError("Erro ao conectar com Google. Tente novamente.");
            setLoading(false);
        }
    };

    // --- LOGIN EMAIL ---
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            let msg = "Erro no login.";
            if (err.code === 'auth/email-already-in-use') msg = "Email já existe. Faça login.";
            if (err.code === 'auth/invalid-credential') msg = "Credenciais inválidas.";
            if (err.code === 'auth/weak-password') msg = "Senha fraca (min 6 caracteres).";
            setError(msg);
            setLoading(false);
        }
    };

    if (checkingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-xl border border-slate-100 text-center">
                
                <div className="mb-8 flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 shadow-sm border border-slate-100 ${currentTheme.iconColor}`}>
                        {isRegistering ? <Store size={32} /> : <Lock size={32} />}
                    </div>
                    
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                        {isRegistering ? `Configurar: ${urlOwnerName}` : 'Painel de Gestão'}
                    </h1>
                    
                    <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${currentTheme.iconColor}`}>
                        {isRegistering ? 'Finalize seu cadastro' : currentTheme.name}
                    </p>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-4 mb-6 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all relative group"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Entrar com Google
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Ou use email</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            className="w-full p-5 pl-14 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all border-none text-slate-800"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="password" 
                            placeholder="Senha" 
                            className="w-full p-5 pl-14 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all border-none text-slate-800"
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
                                {isRegistering ? 'CRIAR E ACESSAR' : 'ENTRAR'} 
                                <ArrowRight size={20}/>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}