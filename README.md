# Stardrift

A persistent space MMO played entirely through Discord. Each Discord server is a solar system in a procedurally-generated galaxy of 100,000 stars. Players mine ore, trade resources, and travel between servers to explore the universe.

Inspired by EVE Online meets idle games like Virtual Fisher.

## Tech Stack

- **Runtime:** Node.js 22 + TypeScript
- **Discord:** discord.js v14
- **Database:** PostgreSQL 16 (Drizzle ORM)
- **Cache:** Redis 7 (ioredis)
- **AI Q&A:** Vercel AI Gateway + Gemini (optional)
- **Package Manager:** pnpm

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env with your DISCORD_TOKEN and DISCORD_CLIENT_ID

docker-compose up -d
```

The entrypoint automatically runs migrations, seeds the galaxy, and starts the bot.

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 10.28+
- PostgreSQL and Redis (or use Docker for just those)

### Setup

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env

# Start Postgres + Redis via Docker
docker-compose up postgres redis -d

# Run database migrations
pnpm db:migrate

# Seed the galaxy (100k systems, idempotent)
pnpm db:seed

# Register slash commands with Discord
pnpm deploy-commands

# Start the bot in watch mode
pnpm dev
```

### Environment Variables

See [`.env.example`](.env.example) for the full list. The required ones are:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_ID` | Application client ID |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

Optional: `DISCORD_DEV_GUILD_ID` (instant command registration during dev), `AI_GATEWAY_API_KEY` (enables Aria Q&A), `OPENAI_API_KEY` (content moderation), `ADMIN_USER_IDS`.

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start bot in watch mode |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run compiled bot |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed galaxy (idempotent) |
| `pnpm db:studio` | Open Drizzle Studio DB GUI |
| `pnpm deploy-commands` | Register slash commands |
| `pnpm docs:dev` | Start docs site locally |

## Project Structure

```
src/
  commands/       Slash command definitions and handlers
  events/         Discord event handlers (interactions, messages, ready)
  db/
    schema/       Drizzle table definitions
    queries/      Database query functions
  redis/          Redis clients (cooldowns, travel timers)
  systems/        Core game logic (mining, economy, travel, galaxy gen)
  ui/             Discord UI builders (embeds, buttons, selects)
  admin/          Admin tools and TOTP verification
  ai/             AI Q&A feature
  scripts/        Galaxy seed script
docs/             Docusaurus documentation site
drizzle/          SQL migration files
```

## Game Concepts

- **1 Discord server = 1 solar system** -- servers claim a system via `/claim-system`
- **Mining** -- `/mine` in planet channels to extract ore
- **Trading** -- `/sell` to NPC markets with dynamic pricing
- **Travel** -- `/travel` between systems (real-time delays, fuel costs)
- **Inventory** -- cargo hold (travels with you) + station storage (per-system)
- **Cross-server progress** -- player state follows your Discord user ID everywhere

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for the full design document.

## Documentation

The player-facing docs site lives in `docs/` and is built with Docusaurus. Run `pnpm docs:dev` to preview locally.
