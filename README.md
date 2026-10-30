# HESU ICT Performance & Reporting Management System

Next.js App Router rebuild of the ICT performance and reporting workspace. Same modules, same slate/teal UI, same browser localStorage data.

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` if you want Gemini-backed Logics AI
3. Start the app: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Routes

- `/login` — sign in, register, recovery
- `/setup/company` — company registration after first login
- `/dashboard`, `/ai-assistant`, `/activities`, `/tickets`, `/sap`, `/projects`, `/kpis`, `/evidence`, `/training`, `/reports`, `/templates`, `/sharing`, `/users`, `/settings`, `/audit`, `/backup`

Data stays in the browser (`hesu_app_*_v4` keys). Existing local records continue to work.
