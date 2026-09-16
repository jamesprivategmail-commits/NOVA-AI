# Base44 Dev Environment — NOVA AI / VOID AI

## Architecture
- **Single-origin fullstack app**: `tsx server.ts` starts an Express server on port 3000 that uses Vite in **middleware mode** to serve the React frontend. No separate frontend/backend processes.
- **Dev vs prod**: The server checks `NODE_ENV !== "production"` to decide whether to use Vite middleware (dev) or serve `dist/` (prod). The Base44 compose sets `NODE_ENV=development` so Vite middleware is active and edits are live.
- **Firebase (client SDK only)**: Both frontend and backend use the Firebase **client** SDK (`firebase/app`, `firebase/firestore`) — NOT `firebase-admin`. The Firebase project config (apiKey, projectId, etc.) is **hardcoded** in `src/config/firebase.ts` and `firebase-applet-config.json`. No Firebase env vars or service account keys are needed.
- **No local database**: All data is in hosted Firestore. No Postgres/Redis/etc. compose services.

## AI Providers
- Chat completions go through the server's `/api/chat` endpoint which proxies to **Groq**, **Cohere**, or **BazaarLink**.
- API keys are read from Firestore (`settings/apikeys` doc) first, falling back to env vars (`GROQ_API_KEY`, `COHERE_API_KEY`, `BAZAARLINK_API_KEY`).
- `GEMINI_API_KEY` appears in `.env.example` and metadata but is **not referenced** in the code — it's vestigial.
- The app boots and renders the UI without any AI keys; chat will fail until keys are provided (via env or the admin panel in Firestore).

## Telegram Bot
- The server auto-starts a Telegram bot on boot (`telegramBot.start()`). It has a **hardcoded default token** in `src/telegram/bot.ts`. If the token is invalid it logs a warning and retries silently — does not crash the server.

## Setup & Verification
- `docker compose -f docker-compose.base44.yml up -d` starts the app.
- Health check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → expect `200`.
- Verify dev mode (not prebuilt): `curl -s http://localhost:3000/ | grep "@vite/client"` should return the Vite client script tag.
- Source modules served live: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/src/main.tsx` → `200`.

## Notes
- `firebase-admin@14.2.0` warns it needs Node >=22, but it is never imported; Node 20 is fine.
- The repo has both `bun.lock` and `package-lock.json`; the Base44 compose uses `npm install`.
