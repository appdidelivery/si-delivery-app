import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  
  // 👇 A MÁGICA ENTRA AQUI: Força o Vite a usar apenas UMA versão do React
  // e resolve a Tela Branca (ReactCurrentBatchConfig undefined)
  resolve: {
    dedupe: ['react', 'react-dom'],
  },

  plugins: [
    react(),
    VitePWA({
      injectRegister: 'inline',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'logo-square.png', 'logo-padrao-velo.png', 'logo-loja.png', 'logo retangular Vero Delivery.png'],
      manifest: {
        name: 'Conveniência Santa Isabel',
        short_name: 'Conv. Sta. Isabel',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo-loja.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-loja.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5000000 // Aumenta o limite para 5MB, resolvendo o erro da Vercel
      }
    })
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true
    // Removemos o manualChunks agressivo que separou o React e causou a tela branca.
    // O Vite fará a otimização de forma automática e segura agora.
  }
});