import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Seus imports que já existiam
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// O NOVO import que criamos (O Cérebro)
import { StoreProvider } from './context/StoreContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      {/* Aqui nós "envolvemos" o App com o Cérebro da Loja */}
      <StoreProvider>
        <App />
        <Toaster position="top-center" />
      </StoreProvider>
    </HelmetProvider>
  </React.StrictMode>,
)