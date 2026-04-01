# Stardrift — Discord-Driven Space MMO

## Concept

An EVE Online-inspired MMO where the entire game is played through Discord interactions (buttons, select menus, modals, Components V2). Each Discord server represents a solar system in a shared persistent galaxy. Players mine, craft, trade, explore, and fight — all through Discord bot interactions.

Inspired by Virtual Fisher's model (cross-server progress, slash commands, idle/cooldown loops) but scaled up to a full player-driven economy and persistent universe.

---

## Core Principle

**1 Discord Server = 1 Solar System**

- The game's own Discord server is the **central hub system** ("Sol Nexus") at galactic coordinates (0, 0)
- All new players spawn at the hub automatically on first interaction
- Players do NOT get a free system — they must explore to discover and claim new systems
- To claim a system: discover it via exploration, then create a Discord server and run `/claim-system` to link it
- The bot auto-creates channels for each location (station, planets, asteroid belts, etc.)
- Player progress is tied to their Discord user ID — works across all servers

---

## The Galaxy

### Pre-Generated Universe

The galaxy is pre-generated with ~100,000 hidden systems at fixed coordinates. They exist whether or not anyone has found them. Explorers are genuinely discovering what's already there.

### Coordinate System

Each system has (x, y) coordinates. Distance between systems = Euclidean distance. This creates natural geography:
- Core systems (near center) — close together, easy travel, competitive
- Frontier systems (far out) — isolated, rare resources, hard to reach
- Trade routes emerge organically between clusters

### System Generation

Each system is procedurally generated with:
- **Star type:** Yellow Dwarf (common), Red Giant, Blue Giant (rare), Neutron Star (very rare), Black Hole adjacent (legendary)
- **Planets (2-8):** Each with traits
  - Rocky/Scorched — rare metals, dangerous mining
  - Temperate — habitable, farming, population bonus
  - Gas Giant — fuel harvesting
  - Ice World — water, cryo-compounds
  - Barren — cheap to build on, few resources
  - Volcanic — exotic minerals, high risk/reward
- **Asteroid Belt(s):** Common ore mining, relatively safe
- **Resource Rating:** Overall score 1-10 for how resource-rich the system is
- **Rarer stars = rarer/better planet compositions**

---

## Server/Channel Structure

When a system is enrolled, the bot creates:

```
#system-overview     — Star map, system stats, population count
#station-market      — Buy/sell orders (local economy only)
#station-hangar      — View/manage your ships and cargo
#station-workshop    — Crafting interface
#planet-1-<name>     — Mining/interaction for planet 1
#planet-2-<name>     — Mining/interaction for planet 2
... (one per planet)
#asteroid-belt       — Asteroid mining
#travel-hub          — Depart to other systems, view routes
#system-log          — Activity feed (arrivals, departures, market trades)
```

---

## Player State

Each player has a single persistent state across all servers:

- **Location:** Which system + where in that system (docked at station, at a planet, in transit)
- **Ship:** Currently active ship with modules, cargo, fuel
- **Inventory:** Items in station storage (per-system) + items in ship cargo
- **Credits:** Universal currency
- **Level/XP:** Overall progression
- **Skills:** Trained skills that unlock/improve abilities
- **Banked Discoveries:** Systems found but not yet claimed (max 3)

**Critical rule:** You can only interact with game mechanics in the system you are physically located in. You can browse Discord servers freely, but `/mine`, `/sell`, `/buy` etc. only work if your character is actually there.

---

## Core Mechanics

### Mining

- Go to a planet channel or asteroid belt channel
- `/mine` — starts a mining cycle (cooldown-based, like Virtual Fisher's `/fish`)
- What you mine depends on the planet type and your mining modules
- Ore goes into your ship's cargo hold
- Ore must be refined at a station before selling (or sell raw at lower price)

### Crafting / Manufacturing

- At a station's workshop, combine raw materials into items
- Recipes for: ship modules, fuel, refined materials, ammunition, tools
- Higher-tier items require materials from different planet types (encourages trade)
- Crafting takes real time (minutes to hours depending on complexity)

### Trading / Economy

- **Local only:** You can only buy/sell at the station you're docked at
- **Player-driven:** All market orders are placed by players. No NPC vendors.
- **Buy orders:** "I want to buy 100 iron ore at 5 credits each" — sits on the market until someone fills it
- **Sell orders:** "I'm selling 50 fuel cells at 12 credits each" — sits until someone buys
- **Regional price differences emerge naturally:** A system with rich iron deposits has cheap iron. A system with none has expensive iron.
- **Arbitrage/hauling:** Buy cheap in system A, haul to system B, sell high. This is a core gameplay loop.
- **Market tax:** System owners can set a tax rate (0-10%) on all transactions in their system. This is how system ownership generates passive income.

### Travel

- From `#travel-hub`, run `/travel <system-name>` or pick from nearby systems via select menu
- Travel takes **real time** based on: distance (in LY) + ship speed
- Travel consumes **fuel** based on: distance + ship fuel efficiency
- While in transit, all game actions are locked (no mining, trading, etc.)
- You CAN still chat in any Discord server
- Transit shows: ETA, fuel remaining, route on map
- Arrival triggers a notification

**Travel time guidelines:**
- Nearby system (5 LY): 5-15 minutes
- Medium distance (20 LY): 30-60 minutes
- Cross-galaxy (100+ LY): Several hours (freighters) to 1-2 hours (fast ships)

### Fuel

- Ships have fuel tanks (capacity varies by ship class)
- Fuel consumed per LY traveled
- Fuel is refined from gas giant harvesting or purchased on the market
- Running out mid-travel = stranded (need rescue from another player, or pay emergency fee)
- Creates an entire fuel economy — gas-giant-rich systems become "fuel stations"

### Ships

| Class | Speed | Fuel Tank | Cargo | Special | Playstyle |
|-------|-------|-----------|-------|---------|-----------|
| Shuttle | Fast | Tiny | Minimal | Cheap, starter ship | Getting around |
| Mining Barge | Slow | Medium | Large + mining bonus | Mining laser slots | Resource extraction |
| Freighter | Slow | Huge | Massive | — | Hauling/trading |
| Explorer | Fast | Large | Small | Scanner bonus | Exploration |
| Corvette | Medium | Medium | Small | Weapon slots | Combat |
| Cruiser | Medium | Large | Medium | Weapon + defense slots | Fleet warfare |

Players can own multiple ships but only fly one at a time. Other ships stay docked at whatever station they're parked at.

### Exploration

- From `#travel-hub`, run `/explore` and choose a direction + scan range
- Ship physically travels to the scan zone (costs time + fuel)
- Once there, periodic scan ticks check for undiscovered systems
- Discovery chance varies by range, ship modules, and area density

**Scan ranges and discovery chance:**
| Range | Distance | Base % per tick | With Scanner Module |
|-------|----------|-----------------|---------------------|
| Short | 5-10 LY | 15% | 25% |
| Medium | 10-25 LY | 10% | 18% |
| Long | 25-50 LY | 5% | 12% |
| Deep | 50-100 LY | 2% | 7% |

**Discovery flow:**
1. Player's scan detects a system → shown a preview (star type, planet count, resource rating)
2. Player chooses to **Bank** or **Pass** (max 3 banked at a time)
3. Banked systems have a **72-hour claim window** — only the discoverer can claim
4. To claim: create a Discord server, run `/claim-system`, select the banked discovery
5. If claim window expires → system becomes public knowledge, anyone can claim it

**Deep space = rarer finds.** Systems far from the galactic core have higher chance of rare star types, exotic resources, and unique planet compositions.

### Population Buffs

More active players docked in a system = bonuses for everyone there:

| Players Active | Mining Buff | XP Buff | Special |
|---------------|-------------|---------|---------|
| 1-5 | — | — | — |
| 6-15 | +10% yield | +5% XP | — |
| 16-30 | +20% yield | +10% XP | Rare ore spawns |
| 30+ | +30% yield | +15% XP | Reduced market tax, unique events |

This incentivizes visiting other systems and creates natural hub cities.

---

## Social Systems

### Corporations (Guilds)

- Players form corps with shared treasury, member roles
- Corps can collectively own systems (corp member claims it, assigns to corp)
- Corp buffs: shared research, group mining bonuses, fleet coordination
- Corp wars: formalized PvP between corps (future feature)

### System Ownership & Governance

- System owner (server creator) can set:
  - Market tax rate (0-10%)
  - Docking permissions (open, allies only, closed)
  - Mining permissions per planet
- Owner earns passive income from market taxes
- Ownership can potentially be transferred or contested (future)

---

## Monetization Ideas (Non-P2W)

- Cosmetic ship skins
- System visual themes (nebula backgrounds, custom channel icons)
- Expanded system customization (rename planets, custom descriptions)
- Premium cosmetic titles/badges
- Increased banked discovery slots (3 → 5)
- **NOT:** stat boosts, faster mining, more resources, better ships

---

## Technical Notes

### Interaction Model

All gameplay happens through Discord's interaction system:
- **Slash commands:** `/mine`, `/travel`, `/sell`, `/explore`, `/inventory`, etc.
- **Buttons:** Quick actions, confirmations, navigation between views
- **Select menus:** Choose destinations, items, ships, modules
- **Modals:** Set prices, name systems, configure settings
- **Components V2:** Rich UI for market interfaces, ship fitting screens, system maps (containers, sections, thumbnails)

### Key Technical Constraints

- Discord rate limits: ~50 interactions/sec globally, need to design around this
- Message component timeout: 15 minutes, need to handle stale interactions
- Max 25 buttons per message, 5 rows of 5
- Select menus take a full row, max 25 options each
- Components V2: containers, sections, text displays, media galleries, separators

### Suggested Stack

- **Runtime:** Node.js + TypeScript
- **Bot framework:** Discord.js (best Components V2 support)
- **Database:** PostgreSQL (relational data: players, systems, items, markets)
- **Cache:** Redis (cooldowns, active sessions, travel timers, real-time state)
- **Hosting:** Dedicated server or cloud VM (not serverless — need persistent state)

### Data Architecture (High Level)

- **Players:** user_id, location, active_ship, credits, xp, level, skills
- **Systems:** system_id, server_id (nullable if unclaimed), coordinates, star_type, enrolled, discovered_by, claim_expires_at
- **Planets:** planet_id, system_id, type, name, resources, traits
- **Ships:** ship_id, owner_id, class, modules, fuel, cargo, docked_at_system
- **Items:** item_id, type, metadata (ore type, refined?, module stats, etc.)
- **Inventories:** player_id, system_id, items (station storage is per-system)
- **Market Orders:** order_id, system_id, player_id, item_type, quantity, price, buy/sell, created_at
- **Travel:** player_id, from_system, to_system, departure_time, arrival_time
- **Discoveries:** player_id, system_id, discovered_at, claim_expires_at, claimed

---

## MVP Scope (Build First)

Focus on the tightest possible loop before adding complexity:

1. **System claiming** — Create server, `/claim-system`, get a generated system with channels
2. **Mining** — `/mine` in planet/belt channels, get ore, cooldown-based
3. **Inventory** — `/inventory` to see what you have
4. **Selling** — `/sell` to sell ore for credits at the station (NPC buyer for MVP, player market later)
5. **Basic travel** — `/travel` between systems with real-time delay + fuel cost
6. **Player location tracking** — You must be in a system to interact with it
7. **Star map** — `/map` shows known systems and distances

### Then Layer On (Phase 2+):
- Player-driven market (buy/sell orders)
- ~~Ship classes and upgrades~~ ✅ Implemented (5 ships, 9 modules, universal slots, rare events)
- Crafting
- Exploration and discovery
- Corporations
- Population buffs
- Combat
- Components V2 rich UI

---

## Inspiration

- **Virtual Fisher:** Proved the Discord idle game model works at scale. Cross-server progress, simple loop, prestige system.
- **EVE Online:** Player-driven economy, regional markets, meaningful travel, ship fitting, corporations, territorial control.
- **Elite Dangerous:** Exploration, fuel mechanics, ship variety, galactic scale.
- **No Man's Sky:** Procedural generation, discovery/naming systems, resource variety.
