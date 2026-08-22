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
ENV NODE_ENV=production

# Install with the full monorepo workspace manifest present so npm can
# resolve/link @nexttour/shared, @nexttour/api and @nexttour/worker.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

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
