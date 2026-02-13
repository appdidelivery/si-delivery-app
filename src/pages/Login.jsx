import React, { useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail, // Importado para recuperação de senha
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
    csi: { /* ... */ },
    mamedes: { /* ... */ },
    futtalento: { /* ... */ },
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

    // --- LÓGICA DE CADASTRO PELA LANDING PAGE (MANTIDA) ---
    const urlStoreSlug = searchParams.get('store');
    const urlOwnerName = searchParams.get('name');
    const urlOwnerPhone = searchParams.get('phone');
    const isRegisteringFromLanding = !!urlStoreSlug;

    // --- NOVOS ESTADOS ---
    const [isLoginMode, setIsLoginMode] = useState(true); // true para Entrar, false para Cadastrar
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(''); // Para mensagens de sucesso (ex: email de recuperação)
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const storeId = isRegisteringFromLanding ? 'default' : (getStoreIdFromHostname() || 'default');
    const currentTheme = STORE_THEMES[storeId] || STORE_THEMES.default;
    
    // O modo de operação é "cadastro" se vier da landing page OU se o usuário alternar manualmente
    const isRegistering = isRegisteringFromLanding || !isLoginMode;

    // --- EFEITO: Verifica Login e Redireciona (SEM ALTERAÇÕES) ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                if (isRegisteringFromLanding) {
                    await createStoreInDb(user);
                    if (!window.location.hostname.includes('localhost')) {
                        const newUrl = `https://${urlStoreSlug}.velodelivery.com.br/admin`;
                        window.location.href = newUrl;
                        return;
                    }
                }
                navigate('/admin');
            } else {
                setCheckingAuth(false);
            }
        });
        return () => unsubscribe();
    }, [navigate, isRegisteringFromLanding, urlStoreSlug]);

    // --- CRIA A LOJA NO FIRESTORE (SEM ALTERAÇÕES) ---
    const createStoreInDb = async (user) => {
        // ... (seu código original aqui)
    };

    // --- LOGIN GOOGLE (SEM ALTERAÇÕES) ---
    const handleGoogleLogin = async () => {
       // ... (seu código original aqui)
    };

    // --- LÓGICA DE AUTENTICAÇÃO HÍBRIDA (LOGIN/CADASTRO) ---
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setNotification('');

        try {
            if (isLoginMode) {
                // MODO LOGIN
                await signInWithEmailAndPassword(auth, email, password);
                // O useEffect fará o redirecionamento
            } else {
                // MODO CADASTRO
                await createUserWithEmailAndPassword(auth, email, password);
                // O useEffect também cuidará disso
            }
        } catch (err) {
            let msg = "Ocorreu um erro. Verifique seus dados.";
            if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso. Tente fazer login.";
            if (err.code === 'auth/invalid-credential') msg = "Credenciais inválidas. Verifique seu e-mail e senha.";
            if (err.code === 'auth/weak-password') msg = "Sua senha é muito fraca. Use pelo menos 6 caracteres.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // --- NOVA FUNÇÃO: RECUPERAR SENHA ---
    const handlePasswordReset = async () => {
        if (!email) {
            setError("Por favor, digite seu e-mail no campo acima para recuperar a senha.");
            return;
        }
        setLoading(true);
        setError('');
        setNotification('');
        try {
            await sendPasswordResetEmail(auth, email);
            setNotification("Link de recuperação enviado! Verifique sua caixa de entrada e spam.");
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                setError("Nenhum usuário encontrado com este e-mail.");
            } else {
                setError("Erro ao enviar o e-mail de recuperação. Tente novamente.");
            }
        } finally {
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
                         {isLoginMode ? 'Painel de Gestão' : 'Crie sua Conta'}
                    </h1>
                    
                    <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${currentTheme.iconColor}`}>
                        {isRegisteringFromLanding ? 'Finalize seu cadastro' : currentTheme.name}
                    </p>
                </div>

                {/* BOTÃO GOOGLE (MANTIDO) */}
                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-4 mb-6 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
                >
                    {/* ... (svg do google) */}
                    {isLoginMode ? 'Entrar com Google' : 'Cadastrar com Google'}
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Ou use email</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {/* CAMPO EMAIL (MANTIDO) */}
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
                    
                    {/* CAMPO SENHA (MANTIDO) */}
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

                    {/* --- BOTÃO "ESQUECEU A SENHA?" --- */}
                    {isLoginMode && (
                        <div className="text-right -mt-2">
                             <button 
                                type="button" 
                                onClick={handlePasswordReset} 
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                Esqueceu a senha?
                            </button>
                        </div>
                    )}

                    {/* MENSAGENS DE ERRO E NOTIFICAÇÃO */}
                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
                    {notification && <p className="text-green-600 text-xs font-bold bg-green-50 p-3 rounded-xl">{notification}</p>}

                    {/* BOTÃO PRINCIPAL DINÂMICO */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-5 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isRegistering ? 'bg-green-600 hover:bg-green-700' : currentTheme.color}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {isLoginMode ? 'ENTRAR' : 'CRIAR CONTA'}
                                <ArrowRight size={20}/>
                            </>
                        )}
                    </button>
                </form>

                {/* --- ALTERNADOR DE MODO (LOGIN/CADASTRO) --- */}
                {!isRegisteringFromLanding && (
                     <div className="mt-6">
                        <p className="text-sm text-slate-600">
                            {isLoginMode ? "Não tem uma conta?" : "Já tem uma conta?"}
                            <button 
                                onClick={() => {
                                    setIsLoginMode(!isLoginMode);
                                    setError('');
                                    setNotification('');
                                }} 
                                className="font-bold text-slate-800 hover:underline ml-2"
                            >
                                {isLoginMode ? "Cadastre-se" : "Faça Login"}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}