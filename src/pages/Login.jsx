import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { getStoreIdFromHostname } from '../utils/domainHelper';

// --- CONFIGURAÇÃO DE TEMAS POR LOJA ---
const STORE_THEMES = {
    csi: {
        name: "Conv St Isabel",
        color: "bg-blue-600 hover:bg-blue-700",
        logo: "https://res.cloudinary.com/dgn627g1j/image/upload/v1/logo-csi-share.png", // Se não tiver, usa o texto
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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Identifica a loja atual
    const storeId = getStoreIdFromHostname() || 'default';
    const currentTheme = STORE_THEMES[storeId] || STORE_THEMES.default;

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin');
        } catch (err) {
            setError('Credenciais inválidas. Verifique e tente novamente.');
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
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                        Painel de Gestão
                    </h1>
                    <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${currentTheme.iconColor}`}>
                        {currentTheme.name}
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="email" 
                            placeholder="Seu E-mail" 
                            className="w-full p-5 pl-14 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all border-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="password" 
                            placeholder="Sua Senha" 
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
                        className={`w-full py-5 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${currentTheme.color}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={20}/></>}
                    </button>
                </form>

                <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Powered by Velo Delivery
                </p>
            </div>
        </div>
    );
}