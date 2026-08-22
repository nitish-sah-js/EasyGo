# Shared image for @nexttour/api and @nexttour/worker.
#
# Both processes execute apps/api's TypeScript source directly under `tsx`
# (the worker imports it via the `@nexttour/api` workspace package), and both
# end up driving Playwright/Chromium for the redBus scraping provider — so
# both need the browser + its OS deps installed, not just the API service.
#
# Deploy this same image as two Railway services and override the start
# command per service:
#   api    -> npm run start -w @nexttour/api
#   worker -> npm run start -w @nexttour/worker
FROM node:22-bookworm-slim

WORKDIR /app

# NOT setting NODE_ENV=production here: both services run straight off
# `tsx` (no compile step — see the module comment above), and `tsx` is a
# root devDependency. `npm install` treats NODE_ENV=production as "skip
# devDependencies", which would leave `tsx` missing and both start scripts
# failing with "tsx: not found". Railway supplies NODE_ENV=production as a
# service variable at runtime instead, which the app itself reads.
#
# Install with every workspace's package.json present, including web's, so
# npm can resolve the full workspace tree the lockfile describes.
#
# Deliberately `npm install`, not `npm ci`: the committed package-lock.json
# was generated on macOS and is missing Linux-only optional-dependency
# entries (e.g. @emnapi/core/runtime, pulled in by a native/napi package used
# transitively). `npm ci` fails hard on that mismatch; `npm install`
# reconciles it. Vercel's build (installCommand: npm install) hits the same
# lockfile and already works for this reason.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

# Now bring in the rest of the source.
COPY apps/api apps/api
COPY apps/worker apps/worker
COPY packages/shared packages/shared
COPY prisma prisma
COPY tsconfig.base.json ./

RUN npx prisma generate --schema prisma/schema.prisma

# Installs the exact Chromium build matching the resolved `playwright`
# version from package-lock.json, plus its system libraries.
RUN npx playwright install --with-deps chromium

EXPOSE 4000

# Overridden per-service on Railway (see comment above); this default runs
# the API.
CMD ["npm", "run", "start", "-w", "@nexttour/api"]
