// si-delivery-app-main/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Adicione Navigate
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react'; // Adicione useState
import { seedDatabase } from './services/seed';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Tracking from './pages/Tracking';
import Login from './pages/Login'; // <--- Importe o componente Login
import { auth } from './services/firebase'; // <--- Importe o objeto 'auth' do seu firebase.js
import { onAuthStateChanged } from 'firebase/auth'; // <--- Importe onAuthStateChanged

// Componente para proteger rotas:
// Se o usuário não estiver logado, redireciona para a página de login.
function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [currentUser, setCurrentUser] = useState(null); // Estado para armazenar o usuário logado
  const [loading, setLoading] = useState(true); // Estado para controlar o carregamento inicial (verificando sessão)

  useEffect(() => {
    seedDatabase(); // Continua semeando o banco de dados (apenas se precisar de dados de teste)
  }, []);

  useEffect(() => {
    // onAuthStateChanged é um listener que detecta mudanças no estado de autenticação do usuário (login/logout)
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user); // Atualiza o estado com o usuário logado (ou null se não houver)
      setLoading(false); // Indica que a verificação inicial da sessão foi concluída
    });
    return () => unsubscribe(); // Retorna uma função de limpeza para cancelar o listener quando o componente for desmontado
  }, []);

  if (loading) {
    // Pode mostrar um spinner de carregamento enquanto verifica o status do usuário
    // Isso evita que a página pisque ou que o usuário veja conteúdo restrito por um breve momento
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 text-lg font-bold">
        Verificando sessão...
      </div>
    );
  }

  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track/:orderId" element={<Tracking />} />
          <Route path="/login" element={<Login />} /> {/* <--- Nova Rota para a página de Login */}

          {/* Rota Protegida para o Painel Administrativo */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={currentUser}>
                {/* Passa o usuário logado para o componente Admin, se necessário (boa prática) */}
                <Admin currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
export default App;