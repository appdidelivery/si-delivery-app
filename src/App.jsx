import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect } from 'react';
import { seedDatabase } from './services/seed';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Tracking from './pages/Tracking'; // Adicione aqui

function App() {
  useEffect(() => { seedDatabase(); }, []);
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/track/:orderId" element={<Tracking />} /> {/* Nova Rota */}
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
export default App;