# Next.js standalone image. Built on the droplet by `docker compose up --build`.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, which needs the schema copied above.
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be passed as build args (see docker-compose.yml), not only at runtime.
ARG NEXT_PUBLIC_PEER_HOST
ARG NEXT_PUBLIC_PEER_PORT
ARG NEXT_PUBLIC_PEER_PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
