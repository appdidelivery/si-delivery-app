// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react';

// Seus componentes de página
import Home from './pages/Home';
import Admin from './pages/Admin_bkp';
import Tracking from './pages/Tracking';
import Login from './pages/Login';

// Firebase e Contexto
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { StoreProvider } from './context/StoreContext'; // <<--- IMPORTE AQUI

function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/track/:orderId" element={<Tracking />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute user={currentUser}>
                  <Admin currentUser={currentUser} />
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