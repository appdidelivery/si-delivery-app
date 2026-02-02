// si-delivery-app-main/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inclua todos os assets de imagem relevantes para o Service Worker caching
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'logo-square.png', 'logo-padrao-velo.png', 'logo-loja.png', 'logo retangular Vero Delivery.png'],
      manifest: {
        name: 'Conveniência Santa Isabel', // Nome completo do PWA
        short_name: 'Conv. Sta. Isabel', // Nome curto do PWA para ícones
        theme_color: '#1d4ed8', // Cor do tema da barra de status
        background_color: '#ffffff', // Cor de fundo da tela de splash
        display: 'standalone', // Modo de exibição (aplicativo completo)
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo-loja.png', // Ícone principal do PWA (192x192)
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-loja.png', // Ícone maior do PWA (512x512)
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Configurações Workbox para caching, se necessário (ex: para modo offline)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}']
      }
    })
  ],
});