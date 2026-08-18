# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Velo Delivery** — a multi-tenant white-label delivery SaaS. One React/Vite codebase + one Firestore project (`zetesteapp`) serves every merchant ("loja"), each on its own subdomain (`csi.velodelivery.com.br`) or custom domain (`convenienciasantaisabel.com.br`). The tenant is derived from the request hostname, never from a route param.

Code, comments, and UI strings are in **Portuguese (pt-BR)**. Match that when editing.

## Commands

```bash
npm run dev        # Vite dev server (frontend ONLY — /api/* returns 404)
vercel dev         # frontend + serverless functions; required to exercise /api/*
                   # (Vercel CLI is not a devDependency — needs a global install)
npm run build      # vite build → dist/
npm run lint       # eslint .
npm run preview    # serve the built dist/

# Firebase Functions (separate codebase, own node_modules)
cd firebase-functions && npm run serve     # emulator, functions only
cd firebase-functions && npm run deploy    # firebase deploy --only functions
cd firebase-functions && npm run logs

# Android (Capacitor — the driver/motoboy app, appId com.velodelivery.motoboy)
npm run build && npx cap sync android && npx cap open android
```

There is **no test framework** in this repo — no test runner, no test files, nothing to run for a single test. Verification is `npm run lint` plus manual exercise via `vercel dev`.

Local tenant selection: `?store=<slug>` on the URL, or `VITE_LOJA_LOCAL` in `.env`. On localhost both the frontend and the API default to `loja-teste`.

## Architecture

### 1. Tenant resolution is duplicated in four places — keep them in sync

The same hostname→`storeId` logic (vercel.app subdomain / `main-app` for the bare base domain / last label of a `*.velodelivery.com.br` subdomain / a hardcoded `domainMap` for custom domains) is reimplemented in:

- `middleware.js` — Vercel Edge, for SEO meta injection
- `api/index.js` (top of `handler`) — for every serverless request
- `src/utils/domainHelper.js` → `getStoreIdFromHostname()` — for the browser
- `vercel.json` `redirects` — canonical-host redirects per tenant

Onboarding a merchant with a custom domain means editing the `domainMap` in **all three** JS copies (they have already drifted: `coelhoscuca.com.br` is missing from `api/index.js`) and adding the redirect to `vercel.json`. Fallbacks differ per file (`velo`, `csi`, `loja-teste`, `unknown-store`) — don't "unify" them without checking each caller.

### 2. `/api` is one monolithic router, but the filesystem wins

`vercel.json` rewrites `/api/(.*)` → `/api/index`, so **`api/index.js` (~6.4k lines) handles most endpoints** as a flat `if (path === '/api/x') … else if (path === '/api/y') …` chain. Vercel applies rewrites *after* the filesystem check, so a real file in `api/` shadows the catch-all: `api/google-gmb.js`, `api/social.js`, `api/sitemap.js`, `api/robots.js`, `api/llms.js`, `api/google-index.js`, `api/generate-promo-copy.js`, `api/change-team-password.js`, `api/fiscal-setup.js`, `api/velopay/create-mp-preference.js` are standalone handlers.

Consequence: adding an endpoint means either a new `else if` branch in the chain, or a new file — **never both for the same path**, or the file silently wins and the branch becomes dead code. Standalone handlers must re-initialize `firebase-admin` themselves (they do, guarded by `if (!admin.apps.length)`).

The file-level handlers use a secondary `action` dispatch in the POST body (`api/google-gmb.js`: `checkStatus`, `getProfile`, `createGooglePost`, `syncVeloProducts`, `askGmbAgent`, …). Several branches inside `api/index.js` do the same.

`api/index.js` sets `export const config = { api: { bodyParser: false } }` and reads the raw body manually via `getRawBody()`, because Stripe and Binance webhooks need the unparsed payload for signature verification. Every other path gets `req.body` JSON-parsed by hand, and `req.query` is rebuilt from the URL. If you add a signature-verified webhook, branch **before** the `JSON.parse` (see how `/api/stripe-webhook` and `/api/binance-webhook` are excluded).

### 3. Firestore data model: flat collections, filtered by `storeId`

There are no per-tenant subcollections. Almost every collection is global and scoped by a `storeId` **field**:

`products`, `orders`, `categories`, `banners`, `coupons`, `reviews`, `shipping_rates`, `ingredients`, `team`, `customers`, `store_customers`, `partners`, `partner_missions`, `partner_withdrawals`, `withdrawals`, `loyalty_missions`, `loyalty_ledger`, `loyalty_redemptions`, `whatsapp_inbound`, `whatsapp_carts`, `whatsapp_sessions`, `blocked_contacts`, `abandoned_carts`, `pos_logs`, `fiado_payments`, `leads_prospeccao`, `velo_lean_features`, `ai_promo_cache`, `ai_product_cache`, `tenant_usage_stats`, `analytics`.

Two documents are keyed **by** `storeId` instead:
- **`stores/{storeId}`** — public tenant config: `name`, `slug`, `logoUrl`/`storeLogoUrl`, `schedule` (per-weekday, supports `splitShift`), `isOpen`, `vacationMode`, `createdAt` (drives rolling billing day), `faturasHistorico`.
- **`settings/{storeId}`** — private/server-side config, notably `integrations.{whatsapp, google_my_business, mercadopago, meta, ga, gads, gtm}` holding per-tenant OAuth tokens and API keys. The API reads this 39× — it is the tenant integration hub.

Note the id/slug duality: the server does `stores.doc(storeId)` while the client does `where('slug', '==', slug)`. **A store's document ID and its `slug` field are assumed identical.** Breaking that breaks one side or the other.

Any new query must be `storeId`-filtered or it leaks tenant data. `useProducts.js` deliberately fetches the whole catalog once and sorts/filters/paginates in memory to avoid needing Firestore composite indexes — follow that pattern rather than adding indexed queries.

### 4. Frontend

`src/App.jsx` — all routes, wrapped in `HelmetProvider` → `StoreProvider` → `BrowserRouter`. Auth is a single `onAuthStateChanged` gate; `ProtectedRoute` guards `/admin`, `/admin-saas`, `/admin/prospeccao`.

`src/context/StoreContext.jsx` — resolves the tenant. **Isolation rule:** if the hostname yields a slug, it loads that store and returns early, ignoring the logged-in user's `users/{uid}.storeId`. The user-profile lookup is only a fallback on the central domain. Don't reorder this — it exists to stop store A's data appearing on store B's domain.

`src/pages/Admin.jsx` is a thin loader that always renders **`src/pages/AdminLegacy.jsx` (~17k lines)** — that file, despite the name, is the *current* merchant panel and where most admin work lands. `AdminSaaS.jsx` is the platform-owner panel (billing, tenants), a different audience.

When native (`Capacitor.isNativePlatform()`), `/` redirects to `/driver-login`: the APK is the courier app, not the storefront. `DeepLinkListener` maps `appUrlOpen` into React Router.

### 5. SEO / social-bot rendering

This is an SPA, so per-tenant meta tags are injected server-side:
- `middleware.js` (Edge) fetches `stores/{storeId}` over the **Firestore REST API** (the Admin SDK doesn't run on Edge), with a 1.5s abort timeout, strips existing `<title>`/`og:`/`twitter:` tags from `index.html`, and injects tenant ones. It sets `Vary: Host` — critical, otherwise the CDN serves store A's HTML on store B's domain. Debug via the `X-SEO-Debug` / `X-Store-Id` response headers.
- Social crawlers (WhatsApp, facebookexternalhit, Twitterbot, …) are routed to `api/social.js` from both `middleware.js` and `vercel.json`. Search-engine bots are deliberately *not* — they must reach the real HTML.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt` are rewrites to `api/robots`, `api/sitemap`, `api/llms`.

### 6. Two backends

Vercel serverless (`api/`, `lib/`) does the bulk: payments, WhatsApp, AI, Google/Meta integrations. **Firebase Functions (`firebase-functions/`) is a separate deploy** — node 20, region `southamerica-east1`, secrets via `defineSecret` (not `.env`), and `.vercelignore` excludes it from Vercel builds. It holds Firestore triggers (`awardVipPointsOnReview`, `aggregateStoreRatings`, `emitirNotaFiscal` for Brazilian NF-e/SEFAZ) and callables (`veloSupportWidget`, `gerarCopyProduto`).

### 7. Scheduled jobs

`vercel.json` `crons`: `/api/cron-automations` daily 08:00 UTC (rolling per-tenant billing — invoices generated 7 days before each store's `createdAt` day-of-month — plus retention automations), `/api/sync-google-reviews` at 09:00. The handler also accepts calls from **cron-job.org** and only *warns* when `CRON_SECRET`/`user-agent: Vercel Cron` is absent — it does not reject. Treat these endpoints as publicly triggerable.

### 8. External integrations

Payments: Mercado Pago (primary — checkout, transparent PIX, POS, refunds, OAuth marketplace via `/api/mp-callback`), Efí/Gerencianet PIX ("VeloPay", with `api/certs/*.p12`), Binance Pay, Stripe Connect (**gated off by `const STRIPE_ENABLED = false` at the top of `api/index.js`** — those branches return 404).

WhatsApp: Meta Cloud API is primary (`/api/whatsapp-webhook`, ~1.2k lines: conversational ordering, store-hours checks, AI replies, cart building in `whatsapp_carts`). Evolution API on a per-tenant VPS is the fallback (`sendViaEvolutionAPI`, `lib/evolution.js`, `/api/evolution-manager` for instance/QR lifecycle). A module-level `phoneToStoreCache` Map maps inbound numbers to tenants to save Firestore reads — it survives across warm invocations, so stale entries are possible.

Also: Google Business Profile (OAuth per tenant, reviews/posts/hours/catalog sync), Google Order Feed, GA4, Meta Ads (campaign create/pause), iFood webhook, Serper (prospecting), Cloudinary (images), Replicate (image gen).

Gemini is called over raw `fetch` to `generativelanguage.googleapis.com`. **Model names in this repo are inconsistent and partly invalid** — `gemini-3.5-flash` and `gemini-3-pro` appear in `api/index.js` and `api/generate-promo-copy.js` and are not real model IDs; `api/google-gmb.js` uses `gemini-1.5-flash-latest`, `firebase-functions` uses `gemini-2.5-flash`. Some call sites have a `modelsToTry` fallback list that masks the failure, others don't. Verify the model ID against Google's current list before touching AI code, and prefer the fallback-list pattern.

## Gotchas

- `vite.config.js` sets `resolve.dedupe: ['react', 'react-dom']` and deliberately has **no `manualChunks`**. Both comments record real white-screen regressions (`ReactCurrentBatchConfig undefined`). Don't add aggressive chunk splitting.
- Firebase **client** config is hardcoded in `src/services/firebase.js` (public web keys — that's expected for Firebase). Server credentials come from env: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (newlines escaped, unescaped at init), `GCP_SERVICE_ACCOUNT`/`GOOGLE_SERVICE_ACCOUNT_JSON`, plus `GEMINI_API_KEY`, `MP_ACCESS_TOKEN`, `MP_CLIENT_ID/SECRET`, `EFI_*`, `META_APP_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `STRIPE_*`, `IFOOD_*`, `SERPER_API_KEY`, `REPLICATE_API_TOKEN`, `CLOUDINARY_*`, `ZAPI_*`, `CRON_SECRET`.
- `.env` and `.env.local` are gitignored but **present in the working tree with live secrets**. Never echo their values or commit them.
- `getGoogleAuthToken(storeId)` is hybrid: per-tenant OAuth token from `settings/{storeId}` first (refreshing at ~58min), falling back to the platform service account. Google token refresh failures surface as "reconnect the Google account in the panel" — usually genuine, not a code bug.
- PWA precache limit is raised to 5MB (`maximumFileSizeToCacheInBytes`) because the Vercel build failed without it.
- `src/pages/wpp/[slug].js` uses Next.js-style dynamic-route naming inside a Vite project — the filename is meaningless here; routing comes from `App.jsx` (`/wpp/:slug` → `WppWebview.jsx`).
- `dist/`, `firestore-debug.log`, and `firebase-functions/firebase-debug.log` exist in the working tree but are gitignored — stale artifacts, not source. Don't read them for current behavior.
