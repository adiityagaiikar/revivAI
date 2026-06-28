# revivAl

revivAl is a rehabilitation and cognitive care platform for patients, clinicians, and caregivers. It combines a Next.js web app with a Node.js/Express backend to support guided exercises, cognitive training, care-team coordination, medical history upload and extraction, and progress tracking in one workspace.

The frontend lives in [apps/web/package.json](apps/web/package.json#L1-L40) and the backend lives in [backend/package.json](backend/package.json#L1-L20). The repository is organized as a monorepo so both applications can be installed, developed, and built from the project root.

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

## Running the app
### Development
Start the full app from the repository root:

```bash
npm run dev
```

This runs `turbo dev`, which starts every package that exposes a `dev` script. In this repo that means the frontend Next.js app and the backend API together. By default the frontend is available at `http://localhost:3000` and the backend at `http://localhost:5000` unless you change `PORT`.

If you want to run the services separately:

- Start the backend with automatic reload (requires `nodemon`):

```bash
npm --prefix backend run dev
```

- Start the frontend:

```bash
npm --prefix apps/web run dev
```

### Production
Build the entire monorepo from the root:

```bash
npm run build
```

Then start each service with its production command:

```bash
npm --prefix backend start
npm --prefix apps/web start

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

## Health check
- Backend exposes a health endpoint: `GET /api/health` (for example, `http://localhost:5000/api/health`).

## Notes & troubleshooting
- Ensure MongoDB is reachable by the `MONGODB_URI` you provide.
- If you see auth or token errors, confirm `JWT_SECRET` is set in `.env`.
- The frontend reads `NEXT_PUBLIC_API_URL` for API calls (defaults to `http://localhost:5000/api`). See [apps/web/lib/api.ts](apps/web/lib/api.ts#L1-L5).

Frontend	npm run dev (from root)

Node backend	cd backend && npm run dev

Python FastAPI	cd backend && venv\Scripts\activate && uvicorn exercise_adapter:app --reload --port 8000


