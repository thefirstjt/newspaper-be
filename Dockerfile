# syntax=docker/dockerfile:1

# The newspaper backend is an AdonisJS app. `node ace build` compiles it into a
# self-contained ./build directory, which is what actually ships. The stages
# below keep the build toolchain (needed to compile the native better-sqlite3
# module) out of the final image.

# Shared base — pin the Node version the app is developed and tested against.
FROM node:24-bookworm-slim AS base
WORKDIR /app

# All dependencies, including dev ones, so the app can be compiled. python3/make/
# g++ are here for native modules (better-sqlite3) that may need to build from
# source when no prebuilt binary matches the platform.
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Production-only dependencies — these are what the final image runs with.
FROM base AS production-deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# Compile the TypeScript app into ./build.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ace build

# Final runtime image: just the production deps and the compiled app.
FROM base AS production
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    LOG_LEVEL=info \
    SESSION_DRIVER=cookie
COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/build ./
# tmp/ holds the SQLite file when running on SQLite; context/ holds the reader's
# living markdown documents. Both must be writable by the unprivileged user.
RUN mkdir -p tmp context && chown -R node:node /app
USER node
EXPOSE 3333
# Migrations are run separately (a one-shot step in docker-compose, or
# `node ace migration:run --force` on other platforms) so replicas don't race.
CMD ["node", "bin/server.js"]
