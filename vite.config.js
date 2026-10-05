import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local-dev';

export default defineConfig({
  base: '/',
  define: {
    __VELO_BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  
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
        // Não precacheia HTML: o painel precisa sempre receber o shell mais novo após deploy.
        globPatterns: ['**/*.{js,css,ico,png,svg,webp,jpg,jpeg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/admin/, /^\/admin-saas/, /^\/login/, /^\/api\//],
        maximumFileSizeToCacheInBytes: 5000000
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