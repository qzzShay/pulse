# Multi-stage build: deps -> build -> small runtime image with Next.js standalone output.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/app/data/pulse.db
RUN groupadd --system --gid 1001 pulse && useradd --system --uid 1001 --gid pulse pulse \
 && mkdir -p /app/data /app/backups && chown -R pulse:pulse /app/data /app/backups
COPY --from=build --chown=pulse:pulse /app/.next/standalone ./
COPY --from=build --chown=pulse:pulse /app/.next/static ./.next/static
# libsql's native binary is loaded at runtime and is not always traced into standalone output.
COPY --from=build --chown=pulse:pulse /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=build --chown=pulse:pulse /app/node_modules/libsql ./node_modules/libsql
COPY --chown=pulse:pulse scripts ./scripts
USER pulse
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
