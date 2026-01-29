// si-delivery-app-main/src/pages/Login.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Importa a função de login
import { auth } from '../services/firebase'; // Importa o objeto 'auth' que você exportou
import { useNavigate } from 'react-router-dom'; // Para redirecionar após o login
import { motion } from 'framer-motion'; // Para as animações
import { LogIn } from 'lucide-react'; // Ícone de login

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Impede o recarregamento da página
    setError(''); // Limpa mensagens de erro anteriores
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin'); // Redireciona para o painel de administração após o login bem-sucedido
    } catch (err) {
      console.error("Erro no login:", err.message); // Loga o erro completo no console
      setError("Email ou senha incorretos. Verifique suas credenciais."); // Mensagem de erro amigável
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-100 flex items-center justify-center p-4"
    >
      <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md w-full text-center border border-slate-100">
        <LogIn size={48} className="text-blue-600 mx-auto mb-6"/>
        <h2 className="text-3xl font-black text-slate-900 italic mb-4">Acesso Restrito</h2>
        <p className="text-slate-500 mb-8">Insira suas credenciais para acessar o painel de gestão.</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500 transition-all"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500 transition-all"
            required
          />