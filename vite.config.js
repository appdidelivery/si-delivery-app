import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
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
  // 👇 INÍCIO DA OTIMIZAÇÃO DE PERFORMANCE PARA O PAGESPEED 👇
  build: {
    target: 'esnext',
    cssCodeSplit: true, // Separa o CSS para não bloquear a tela
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Fatiando o JS gigante em pedaços menores (Evita travar o celular do cliente)
            if (id.includes('firebase')) return 'firebase-core';
            if (id.includes('framer-motion')) return 'framer-motion';
            if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            return 'vendor'; // O resto das bibliotecas vai pra cá
          }
        }
      }
    }
  }
});