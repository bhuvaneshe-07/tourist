# Tourist Management System & Executive Travel Command Engine

A production-grade, full-stack tourism management platform featuring curated global expeditions, instant tour reservations, 25% downpayment processing, role-based administration, interactive 3D WebGL telemetry, and an intelligent AI Travel Concierge.

---

## Architecture Overview

- **Frontend**:
  - **Executive Pro Dashboard** (`/pro`): High-density full-width command center, real-time Chart.js revenue telemetry, Three.js 3D holographic globe, dynamic multi-currency converter (`USD`, `EUR`, `GBP`, `JPY`, `INR`, `AUD`), and 16 expedition destination cards with 3D tilt effects.
  - **Classic Portal** (`/`, `/classic`): Immersive traveler portal with search, category filtering, user booking history, interactive reviews, and administrative operations.
  - **PWA & Desktop**: Service worker offline caching (`sw.js`), Web App Manifest (`manifest.json`), and standalone desktop distribution (`/download-app`).
- **Backend**:
  - Node.js & TypeScript with Express.
  - RESTful API with strict schema validation and error handling.
  - JWT session token authentication with bcrypt password hashing.
  - Role-based authorization (`admin` and `tourist`).
- **Database Architecture**:
  - Dual-mode resilient data layer:
    1. **Supabase PostgreSQL** via `@supabase/supabase-js` and `pg` connection pooling for cloud persistence.
    2. **High-Performance In-Memory Repository** automatically active with seeded mock data when cloud database credentials are absent, guaranteeing zero-downtime development and testing.
- **AI Engine**:
  - Google Gemini API (`@google/genai`) for conversational travel advisory and natural language expedition search.
  - Built-in heuristic fallback engine for uninterrupted availability during offline states or rate limits.

---

## Seeded Default Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@tourism.gov` | `AdminSecure2026!` | Full administrative CRUD, analytics, pricing, ledger |
| **Executive Traveler** | `traveler@executive.io` | `Travel2026!` | Tour booking, review submission, booking history |
| **Standard Tourist** | `tourist@example.com` | `password123` | Tour booking, payment simulation |

---

## Local Development Setup

### 1. Prerequisites
- **Node.js**: v20.x or v22.x+
- **npm** or **bun** / **yarn**

### 2. Installation
```bash
git clone <repository-url>
cd tourist-management-system
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and configure your environment variables:
```bash
cp .env.example .env
```
Key configuration parameters:
- `PORT`: HTTP port to bind (default: `3000`)
- `JWT_SECRET`: Secret key for signing authentication tokens
- `GEMINI_API_KEY`: *(Optional)* Google Gemini API key for live AI assistant
- `SUPABASE_URL`: *(Optional)* Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: *(Optional)* Supabase service role key
- `DATABASE_URL`: *(Optional)* PostgreSQL connection string

### 4. Running the Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

---

## Production Build & Deployment

### Build Command
```bash
npm run build
```
This bundles `server.ts` into `dist/server.cjs` with external package resolution and source maps via `esbuild`.

### Start Command
```bash
npm start
```
Runs `node server.ts` directly on Node.js.

### Automated Testing & Linting
Run the comprehensive verification suite:
```bash
# Run 39 automated unit & integration tests
npm test

# Run TypeScript type validation
npm run lint
```

---

## Deploying to Cloud Platforms

### Deploying to Google Cloud Run / Container Platforms
Create a `Dockerfile` (or use cloud buildpack):
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
```

### Deploying to Render / Railway / Heroku
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check Endpoint**: `/api/system/db-status`

---

## Supabase PostgreSQL Schema Migration

To apply the database schema to your Supabase project:
1. Run the SQL script located at `supabase/schema.sql` in the Supabase SQL Editor.
2. Verify table connectivity:
```bash
npm run migrate:supabase
```

---

## License
MIT License. Created for the Tourist Management System Platform.
