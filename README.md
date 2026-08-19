# NextTour — AI-Powered Unified Travel Planner

An end-to-end MVP that turns a single prompt — *"Plan a trip from Patna to Goa for 5 days with a budget of ₹30,000"* — into a complete, personalized travel plan: multimodal transport routes, hotels, attractions, restaurants, weather, a day-wise AI-generated itinerary, and a budget breakdown.

**No real travel APIs are required.** All travel data comes from deterministic mock providers, while itinerary generation is powered by **real Groq AI** (with automatic fallback), so the whole app runs locally with zero external travel integrations.

---

## Features

### Core workflow
- **Trip planning form** — multi-step wizard (destination → dates → travelers → budget → preferences → review) with per-step validation via React Hook Form + Zod
- **Async planning pipeline** — trip creation returns instantly; a BullMQ job (Redis) processes planning in the background
- **Live planning progress** — the planning screen polls trip status and shows an animated step checklist
- **Rich result dashboard** — recommended + alternative routes, hotel, day-wise itinerary timeline, attractions, restaurants, weather, budget breakdown (progress bar), and a map visualization with mock coordinates and route lines
- **Trip management** — list your trips with pagination, view details, re-run planning on failures, delete trips
- **Auth** — register / login / logout / current-user with bcrypt password hashing, JWT in an httpOnly cookie, protected routes, and a client-side auth guard

### Real AI itinerary generation (Groq)
- **`AI_PROVIDER=GROQ`** uses the real Groq API (`openai/gpt-oss-120b`) with a structured JSON schema, strict zod validation, and itinerary repair/sanitization (normalized times, empty-field fallbacks)
- Context is **trimmed to fit token limits**: top 5 attractions, top 4 restaurants, compact route segments — keeps the request under Groq's 8,000 tokens/min rate limit
- **Automatic fallback chain**: Groq failure → `MockAIProvider` → minimal valid itinerary. Planning never fails; the reason is recorded in `providerNotes` and the trip is marked `PARTIAL_SUCCESS`
- Model selection via `AI_MODEL` env var; request timeout 60s; JSON response mode

### Provider-agnostic architecture
All external data flows through interfaces (`TransportProvider`, `PlacesProvider`, `WeatherProvider`, `MapProvider`, `AIProvider`). Mock data is deterministic (same input → same output) for testing/demo. Real providers (Amadeus, Google Places, OpenWeather, Gemini/Groq…) can be swapped in later without touching the optimizer, budget engine, or frontend.

### Mock data coverage
8 supported cities — **Goa, Delhi, Mumbai, Jaipur, Varanasi, Bengaluru, Patna, Kolkata**:
- 40 hotels, 60 attractions, 40 restaurants
- 15+ flights, 15+ trains, 15+ buses with realistic Indian routes (PAT→GOI, DEL→GOI, BOM→GOI, BLR→GOI, CCU→GOI, …)
- **Multimodal route builder** — chains train+flight / bus+train+flight segments only when arrival time + `MIN_TRANSFER_MINUTES` (90) ≤ next departure
- Deterministic weather per city/date, Haversine map distances, route optimizer with configurable scoring weights (price/duration/comfort/transfers) producing Cheapest / Fastest / Balanced / Comfortable rankings

### Reliability & fixes applied
- All workspaces pass strict TypeScript (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), ESLint, and a clean production build
- Fixed planning-job retry bug (BullMQ ignored retries for jobs re-enqueued with the same `jobId`)
- Fixed DB transaction timeouts against hosted Postgres (Supabase pool) by increasing the pool timeout
- Lenient AI-output validation: empty optional strings from the model no longer reject the whole itinerary — they're sanitized in `repairItinerary`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript, Zod validation, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Queue | Redis (Upstash), BullMQ |
| AI | Groq API (`openai/gpt-oss-120b`), mock fallback provider |
| Runtime | npm workspaces monorepo, tsx, concurrently |

---

## Monorepo Structure

```
NextTour/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/             # pages: /, /login, /register, /plan, /trips, /trips/[id], /trips/[id]/planning, /trips/[id]/result
│   │   ├── components/      # auth-guard, error-boundary, shared UI
│   │   ├── hooks/           # use-auth
│   │   ├── services/        # API client (trips.ts, etc.)
│   │   ├── types/           # shared frontend types
│   │   └── lib/             # utils (date/status formatting)
│   ├── api/                 # Express REST API (:4000)
│   │   └── src/
│   │       ├── modules/     # auth, users, trips, travel-route, transport, places, weather, maps, budget, itinerary, ai, planning
│   │       ├── config/      # env, db, redis
│   │       ├── middleware/  # auth, error-handling
│   │       └── queues/      # BullMQ definitions
│   └── worker/              # BullMQ planning worker (tsx, independent process)
├── packages/
│   └── shared/              # shared types, zod schemas, mock data
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── start.bat                # one-click startup (API + worker + web, visible windows)
├── .env                     # local configuration (see .env.example)
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A PostgreSQL database (local, Docker, or free Supabase instance)
- A Redis instance (local, Docker, or free Upstash instance) — required for BullMQ
- (Optional) A Groq API key for real AI itineraries — falls back to mock AI without one

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:5432/nexttour
REDIS_URL=redis://default:pass@host:6379
JWT_SECRET=some-long-random-secret
TRAVEL_DATA_MODE=MOCK
AI_PROVIDER=GROQ
AI_MODEL=openai/gpt-oss-120b
GROQ_API_KEY=gsk_...            # only needed when AI_PROVIDER=GROQ
API_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
MIN_TRANSFER_MINUTES=90
```

### 3. Database migration + seed

```bash
npm run db:migrate   # prisma migrate dev
npm run db:seed      # demo user + deterministic mock data
```

### 4. Run everything

**Recommended (Windows):** double-click `start.bat` — opens three visible windows for API, worker, and web.

**Or from the terminal:**

```bash
npm run dev          # API + worker + web concurrently
```

Then open **http://localhost:3000**.

### Demo account

```
Email:    demo@nexttour.local
Password: password123
```

---

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Run API, worker, and web concurrently |
| `npm run dev:api` / `dev:worker` / `dev:web` | Run a single app |
| `npm run build` | Typecheck shared/api/worker + production-build web |
| `npm run typecheck` | TypeScript check for all workspaces |
| `npm run lint` | ESLint (zero-warning mode) |
| `npm run test` | Vitest |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo user + mock data |
| `npm run db:studio` | Prisma Studio |
| `npm run format` | Prettier |

---

## API Reference

Base URL: `http://localhost:4000/api` — all routes except `auth` require the auth cookie.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (name, email, password) |
| POST | `/api/auth/login` | Login — sets httpOnly JWT cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user |

### Trips
| Method | Route | Description |
|---|---|---|
| POST | `/api/trips` | Create trip + enqueue planning job |
| GET | `/api/trips?page=&pageSize=` | Paginated trip list |
| GET | `/api/trips/:id` | Trip details + preferences |
| DELETE | `/api/trips/:id` | Delete trip |
| POST | `/api/trips/:id/plan` | (Re)start planning (used by retry) |
| GET | `/api/trips/:id/status` | `PENDING` / `PROCESSING` / `COMPLETED` / `PARTIAL_SUCCESS` / `FAILED` |
| GET | `/api/trips/:id/result` | Full result: route, hotel, itinerary, weather, budget, map |
| GET | `/api/trips/:id/routes` | Ranked route options |
| GET | `/api/trips/:id/hotels` | Ranked hotels |
| GET | `/api/trips/:id/attractions` | Attractions |
| GET | `/api/trips/:id/restaurants` | Restaurants |
| GET | `/api/trips/:id/budget` | Budget breakdown |

### Reference (independent of trips)
| Method | Route | Description |
|---|---|---|
| GET | `/api/places/cities` | Supported cities |
| GET | `/api/places/hotels?city=` | Hotels for a city |
| GET | `/api/places/attractions?city=` | Attractions for a city |
| GET | `/api/places/restaurants?city=` | Restaurants for a city |
| GET | `/api/weather?city=&date=` | Deterministic weather |
| GET | `/api/maps/distance?from=&to=` | Haversine distance |
| GET | `/api/travel-route?origin=&destination=&date=` | Flight/train/bus options |
| GET | `/api/budget/estimate` | Estimate cost for a route/hotel |

### Health
| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | `{ status, mode, ai }` — e.g. `{"status":"ok","mode":"MOCK","ai":"GROQ"}` |

---

## How the AI Pipeline Works

1. **Collect** — worker gathers transport, hotels, attractions, restaurants, weather from mock providers in parallel
2. **Optimize** — route optimizer ranks 5 routes (Cheapest / Fastest / Balanced / Comfortable); hotels, attractions, and restaurants are ranked against budget, interests, and food preferences
3. **Budget** — budget engine computes transport + accommodation + food + activities + local transport + misc vs. the user budget
4. **Personalize** — `AIProvider.generateItinerary(context)` receives a trimmed context (route, hotel, top venues, weather, preferences, budget)

```ts
// apps/api/src/modules/ai/ai.service.ts
export function createAIProvider(): AIProvider {
  if (env.AI_PROVIDER === 'GROQ' && env.GROQ_API_KEY) return new FallbackAIProvider(new GroqAIProvider(), new MockAIProvider());
  return new MockAIProvider();
}
```

5. **Fallback** — if Groq fails (timeout, rate limit, invalid output), the mock AI provider produces a deterministic itinerary from the same data. The trip ends as `COMPLETED` (AI) or `PARTIAL_SUCCESS` (fallback), with the reason in `providerNotes` — surfaced on the result page

### Groq specifics
- Model: `openai/gpt-oss-120b` (set via `AI_MODEL`)
- `max_tokens: 5000`, 60-second timeout, JSON output mode, strict zod validation
- Request size is trimmed to stay under the org's **8,000 tokens/minute** limit — every request is ~2,000 tokens of context
- If you hit 413/rate limits under concurrent planning, the fallback keeps trips working

---

## Swapping Mock Providers for Real Ones

Every provider implements a small interface — replace the implementation, keep the module boundary:

| Interface | Mock implementation | Real replacement |
|---|---|---|
| `TransportProvider` (flights/trains/buses) | `MockFlightProvider`, `MockTrainProvider`, `MockBusProvider` | Amadeus / Skyscanner / IRCTC APIs |
| `PlacesProvider` | `MockHotelProvider`, `MockAttractionProvider`, `MockRestaurantProvider` | Google Places / OTA feeds |
| `WeatherProvider` | `MockWeatherProvider` (deterministic per city+date) | OpenWeatherMap |
| `MapProvider` | `MockMapProvider` (Haversine) | Google Maps / OSRM |
| `AIProvider` | `MockAIProvider` | `GroqAIProvider` (live), Gemini |

Set `TRAVEL_DATA_MODE=REAL` and select providers in the factory; nothing downstream changes because data is normalized to internal domain models (`Place`, `TransportOption`, `RouteOption`, `WeatherData`, …) before the optimizer, budget engine, AI, or frontend ever sees it.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| **`Cannot find module './417.js'`** in web | `.next` cache corrupted — `next build` ran while `next dev` was running. Delete `apps/web/.next` and restart the web server. Don't run builds while dev is up. |
| **Planning stuck on `PENDING`** | Worker process isn't running (hidden background windows die easily). Use `start.bat` so all three windows stay visible. |
| **Trips show `PARTIAL_SUCCESS` with an "AI:" note** | Groq failed (rate limit/timeout/validation) and the mock fallback produced the itinerary. Retry planning from the trip page, or check the note text in the result. |
| **Groq 413/429 errors** | Hit the 8,000 tokens/min org rate limit. Wait a minute and retry — the fallback provider prevents hard failures. |
| **Prisma transaction timeouts** | Hosted Postgres pools are slow to allocate. Pool timeout is already raised; keep concurrent loads low. |
| **Retry/Start-planning button does nothing** | Was a BullMQ bug (fixed): re-enqueued jobs must not reuse the old `jobId`. |

---

## Limitations

- Travel data is mock (no real flights/hotels/pricing); the AI can only choose from supplied venues
- Groq output is validated but not fact-checked — treat as a planning suggestion
- Agra and other cities are not in the mock dataset
- Auth is a single-session httpOnly cookie (fine for MVP)#   E a s y G o  
 