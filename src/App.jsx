// src/App.jsx
import Policies from './pages/Policies';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app'; // <-- NOVO: Plugin para capturar links do WhatsApp
import VeloLeanEngine from './pages/VeloLeanEngine';
import AggregatorStore from './pages/AggregatorStore'; // <-- ADICIONE AQUI
import WifiPortal from './pages/WifiPortal'; // <-- NOVO: Rota de Captura Wi-Fi Gamificado

// Seus componentes de página
import Home from './pages/Home';
import Admin from './pages/Admin';
import Tracking from './pages/Tracking';
import Login from './pages/Login';
import AdminSaaS from './pages/AdminSaaS';
import DriverPanel from './pages/DriverPanel';
import InfluencerDashboard from './components/InfluencerDashboard'; // Ou './pages/InfluencerDashboard' dependendo de onde você salvou
import WppWebview from './pages/WppWebview'; // <-- NOVO: Importação da Webview Slim
import ProspeccaoKanban from './pages/ProspeccaoKanban';

// Firebase e Contexto
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const VELO_BUILD_VERSION = typeof __VELO_BUILD_VERSION__ !== 'undefined'
  ? __VELO_BUILD_VERSION__
  : 'local-dev';

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

// --- MOTOR DE DEEP LINK (CAPACITOR) ---
// Este componente escuta quando o celular injeta um link externo no App
function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', data => {
        try {
          const url = new URL(data.url);
          const path = url.pathname + url.search;
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

  // Atualização automática do painel: compara o build carregado com o deployment atual.
  // Quando há uma nova versão, remove apenas caches de assets/SW e recarrega uma única vez.
  useEffect(() => {
    if (Capacitor.isNativePlatform() || VELO_BUILD_VERSION === 'local-dev') return;

    let isReloading = false;

    const checkForNewBuild = async () => {
      if (isReloading) return;
      try {
        const response = await fetch(`/api/app-version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok) return;

        const data = await response.json();
        const remoteVersion = data?.version;
        if (!remoteVersion || remoteVersion === VELO_BUILD_VERSION) return;

        isReloading = true;

        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(registration => registration.unregister()));
        }

        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        }

        window.location.reload();
      } catch (error) {
        console.warn('[Velo Update] Não foi possível verificar nova versão:', error?.message || error);
      }
    };

    checkForNewBuild();
    const interval = window.setInterval(checkForNewBuild, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForNewBuild();
    };
    window.addEventListener('focus', checkForNewBuild);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkForNewBuild);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Verificando sessão...
      </div>
    );
  }

  return (
    <BrowserRouter>
          <DeepLinkListener /> {/* <-- NOVO: O Escudo de Roteamento ativo */}
          <Routes>
            <Route path="/" element={<AppRouter />} />
            <Route path="/driver-login" element={<div className="p-10 text-center mt-20 font-bold text-slate-500">Faça login com seu link de Motoboy enviado pelo lojista 🛵...</div>} />
            <Route path="/p/:productSlug" element={<Home />} />
            <Route path="/loja/:slug" element={<AggregatorStore />} />
            <Route path="/:loja/wifi" element={<WifiPortal />} /> {/* <-- NOVO: Rota PLG de Wi-Fi */}
            <Route path="/wpp/:slug" element={<WppWebview />} /> {/* <-- NOVO: Rota da Webview Slim */}
            <Route path="/track/:orderId" element={<Tracking />} />
            <Route path="/politicas" element={<Policies />} />
            <Route path="/login" element={<Login />} />
            <Route path="/driver/:storeId/:orderId" element={<DriverPanel />} />
            <Route path="/parceiro/:partnerId" element={<InfluencerDashboard />} />
            <Route path="/admin/mvp" element={<VeloLeanEngine />} />

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
            <Route
              path="/admin/prospeccao"
              element={
                <ProtectedRoute user={currentUser}>
                  <ProspeccaoKanban />
                </ProtectedRoute>
              }
            />
          </Routes>
    </BrowserRouter>
  );
}

export default App;