# revivAl

revivAl is a monorepo containing a Next.js frontend (`apps/web`) and a Node.js/Express backend (`backend`) for a rehabilitation / cognitive health application.

**Contents**
- Frontend: [apps/web/package.json](apps/web/package.json#L1-L40) (Next.js)
- Backend: [backend/server.js](backend/server.js#L1-L120) (Express + WebSocket)
- Root scripts: [package.json](package.json#L1-L40) (turborepo dev/build)

## Prerequisites
- Node.js >= 20 and npm >= 10
- MongoDB running (local or a hosted URI)
- (Optional) Google Gemini API key if you plan to use the history OCR features

## Setup
1. Clone the repo and install dependencies from the workspace root:

```bash
npm install
```

2. Create a `.env` file at the project root (you can copy the provided `.env.example`). The backend reads environment variables using `dotenv`.

```bash
cp .env.example .env
```

Edit `.env` and set the values as needed (see `.env.example`).

## Environment variables (`.env.example`)
The project needs the following environment variables at minimum:

- `MONGODB_URI` — MongoDB connection string (default: `mongodb://localhost:27017/revival`)
- `PORT` — Backend port (default: `5000`)
- `JWT_SECRET` — Secret used to sign auth tokens
- `GEMINI_API_KEY` — (Optional) API key for Google GenAI features used by `/api/history`
- `NEXT_PUBLIC_API_URL` — Frontend's API base (e.g. `http://localhost:5000/api`)

An example file is provided as `.env.example` in the repo root.

## Running (development)
From the repository root you can start the entire monorepo dev environment with turborepo:

```bash
npm run dev
```

This runs `turbo dev` which will start the `apps/web` dev server (`next dev`) and other packages that expose a `dev` script. By default the frontend is available at `http://localhost:3000` and the backend at `http://localhost:5000` (unless you changed `PORT`).

If you prefer to run services individually:

- Start the backend with automatic reload (requires `nodemon`):

```bash
npm --prefix backend run dev
```

- Start the frontend (from `apps/web`):

```bash
cd apps/web
npm install
npm run dev
```

## Health check
- Backend exposes a health endpoint: `GET /api/health` (e.g. `http://localhost:5000/api/health`).

## Notes & troubleshooting
- Ensure MongoDB is reachable by the `MONGODB_URI` you provide.
- If you see auth or token errors, confirm `JWT_SECRET` is set in `.env`.
- The frontend reads `NEXT_PUBLIC_API_URL` for API calls (defaults to `http://localhost:5000/api`). See [apps/web/lib/api.ts](apps/web/lib/api.ts#L1-L5).

## Building for production
- Build all packages:

```bash
npm run build
```

Then run the production backend and serve the frontend according to your deployment strategy.

## Contributing
- Fork, make changes in feature branches, and open pull requests against the main branch.

---
If you want, I can start the dev servers now and stream the terminal output here. Which would you prefer: start the full monorepo (`npm run dev`) or start the backend and frontend individually?
