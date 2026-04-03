# Stardrift

A persistent space MMO played entirely through Discord. Mine ore, trade resources, upgrade your ship, and travel between star systems — all without leaving your server.

> **Status:** Shelved. This was an active project but is currently on hold. The codebase is functional and the core gameplay loop works, but development has paused. Feel free to look around.

> **Disclaimer:** This entire project was vibe-coded with [Claude Code](https://claude.ai/claude-code). Every line — game logic, UI, database schema, deployment scripts, documentation — was written by Claude with human direction. No hand-written code.

## The Idea

Each Discord server is a **solar system** in a shared, procedurally-generated galaxy of 100,000 stars. Your server claims a system, and your members mine its planets and asteroid belts. But the galaxy is connected — players can travel between servers, trade in different markets, and explore what other communities have built.

The core social hook: **your server's economy is real**. If everyone mines iron, the price crashes. Rare ores on volcanic planets are worth travelling for. Players carry their progress across every server running Stardrift.

Inspired by EVE Online's player-driven economy crossed with the accessibility of Discord idle games like Virtual Fisher.

## Features

### Mining & Resources
- `/mine` in planet and asteroid belt channels to extract ore
- 10 resource types across 8 planet types — volcanic worlds yield dark matter and platinum, while temperate planets offer common ores
- Rare events during mining: ancient relics, crystal geodes, abandoned cargo, dark matter pockets
- Cooldown-based with equipment modifiers

### Ships & Equipment
- 5 ship classes from the free Starter Ship to the Heavy Miner and Freighter
- 9 module types: lasers (yield), scanners (rare finds), cargo expanders, cooldown reducers
- Modules stack multiplicatively — fitting three Mk2 Lasers compounds their yield bonus
- `/loadout` to fit and swap modules in real-time

### Economy
- Dynamic NPC pricing — supply and demand per system, per resource
- Prices recover over time (demand decay), so crashed markets bounce back
- Proxy systems let you mirror another server's system in yours, but with reduced yields and sell prices — incentivising actual travel

### Systems & Servers
- `/claim-system` assigns a named star system to your Discord server
- The bot auto-creates channels for each planet and asteroid belt
- Sol Nexus hub at the galaxy center — every new player starts here
- `/prospect` surveys a system's resources with estimated credit values

### Player Progression
- Cross-server identity tied to your Discord user ID
- Ship upgrades, module fitting, cargo management
- `/stats` shows your pilot profile and active bonuses
- Station storage per system, with load/store transfers

### Admin Tools
- TOTP 2FA for elevated admin actions
- Player bans, system management, stats dashboard

## Roadmap

The next major feature was **travelling** — real-time jumps between star systems with fuel costs and travel delays. The system is partially implemented (fuel, distance calculations, travel state in Redis) but wasn't shipped before the project was shelved.

Beyond that, the design document outlines:
- Player-to-player markets
- Skills and progression trees
- Corporations / guilds
- System discovery and exploration
- PvP combat
- System ownership and taxation

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 22 + TypeScript |
| Discord | discord.js v14 (Components V2) |
| Database | PostgreSQL 16 (Drizzle ORM) |
| Cache | Redis 7 (ioredis) |
| AI Q&A | Vercel AI Gateway + Gemini (optional) |
| Docs | Docusaurus |
| Package Manager | pnpm |

## Project Structure

```
src/
  commands/       Slash command handlers
  events/         Discord event handlers and button interactions
  db/
    schema/       Drizzle table definitions
    queries/      Database query functions
  redis/          Cooldowns, travel state, admin sessions
  systems/        Core game logic (mining, economy, travel, galaxy gen)
  ui/             Discord UI builders (containers, buttons, selects)
  admin/          Admin tools and TOTP verification
  scripts/        Galaxy seed, equipment seed
docs/             Player-facing documentation site
drizzle/          SQL migration files
```

## License

**All Rights Reserved.** See [LICENSE](LICENSE).

This code is published for reference and portfolio purposes only. You may not copy, modify, distribute, or run this software without explicit written permission.
