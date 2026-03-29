FROM node:22-alpine AS builder

# Enable corepack so pnpm is available
RUN corepack enable

WORKDIR /app

# Install ALL deps (including dev) for the build step
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS runner

RUN corepack enable

WORKDIR /app

# Install prod deps + drizzle-kit (needed at runtime to run migrations)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm add drizzle-kit

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy migrations and config directly from source — never regenerate at build
# time, as that would produce a different hash than what's recorded in the DB.
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# Entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
