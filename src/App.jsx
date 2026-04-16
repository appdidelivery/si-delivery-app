// src/App.jsx
import Policies from './pages/Policies';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app'; // <-- NOVO: Plugin para capturar links do WhatsApp

// Seus componentes de página
import Home from './pages/Home';
import Admin from './pages/Admin';
import Tracking from './pages/Tracking';
import Login from './pages/Login';
import AdminSaaS from './pages/AdminSaaS';
import DriverPanel from './pages/DriverPanel';

// Firebase e Contexto
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { StoreProvider } from './context/StoreContext'; 

function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// --- BLINDAGEM DO APLICATIVO NATIVO ---
// Se o utilizador abrir o APK direto pelo ícone, cai aqui.
function AppRouter() {
  if (Capacitor.isNativePlatform()) {
    return <Navigate to="/driver-login" replace />;
  }
  return <Home />;
}

// --- NOVO: MOTOR DE DEEP LINK (CAPACITOR) ---
// Este componente escuta quando o celular injeta um link externo no App
function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', data => {
        try {
          // Extrai o caminho do link (Ex: de "https://.../driver/csi/123" ele extrai "/driver/csi/123")
          const url = new URL(data.url);
          const path = url.pathname + url.search;
          
          // Força o React Router a carregar a tela do Motoboy
          if (path) {
            navigate(path);
          }
        } catch (error) {
          console.error("Erro ao interpretar o Deep Link:", error);
        }
      });
    }
  }, [navigate]);

  return null;
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Verificando sessão...
      </div>
    );
  }

  return (
    <HelmetProvider>
      {/* ENVOLVA TUDO COM O STOREPROVIDER */}
      <StoreProvider> 
        <BrowserRouter>
          <DeepLinkListener /> {/* <-- NOVO: O Escudo de Roteamento ativo */}
          <Routes>
            <Route path="/" element={<AppRouter />} />
            <Route path="/driver-login" element={<div className="p-10 text-center mt-20 font-bold text-slate-500">Faça login com seu link de Motoboy enviado pelo lojista 🛵...</div>} />
            <Route path="/p/:productSlug" element={<Home />} />
            <Route path="/track/:orderId" element={<Tracking />} />
            <Route path="/politicas" element={<Policies />} />
            <Route path="/login" element={<Login />} />
            <Route path="/driver/:storeId/:orderId" element={<DriverPanel />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute user={currentUser}>
                  <Admin currentUser={currentUser} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-saas"
              element={
                <ProtectedRoute user={currentUser}>
                  <AdminSaaS />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </HelmetProvider>
  );
}

export default App;