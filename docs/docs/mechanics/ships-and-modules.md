---
id: ships-and-modules
title: Ships & Modules
sidebar_position: 5
---

# Ships & Modules

Every pilot starts with a basic ship. As you earn credits, you can upgrade to specialized vessels and fit them with modules to improve your mining performance, cargo capacity, and more.

---

## Ships

Ships are your hull — they determine your base capabilities and how many modules you can fit. Use `/shop` and switch to the **Ships** tab to browse available vessels.

| Ship | Price | Slots | Strengths |
|------|-------|-------|-----------|
| **Starter Ship** | Free | 3 | Basic vessel, no bonuses |
| **Mining Barge** | 50,000¢ | 4 | Higher ore yield, faster recharge |
| **Heavy Miner** | 150,000¢ | 5 | Maximum yield, faster recharge, extra cargo |
| **Explorer Vessel** | 40,000¢ | 3 | Better chance of rare discoveries, larger fuel tank |
| **Freighter** | 60,000¢ | 4 | Massive cargo hold, slightly reduced yield |

### One Ship at a Time

You can only fly one ship. Buying a new ship replaces your current one — any fitted modules are automatically returned to your inventory. Choose your ship based on what kind of pilot you want to be.

### Module Slots

Each ship has a number of **universal module slots**. Any module can go in any slot, and you can fit the same module multiple times for compounding effects. More slots means more room to customize.

---

## Modules

Modules are equipment you fit into your ship's slots. Each module provides specific bonuses when fitted. Buy them from the **Modules** tab in `/shop`, then fit them using `/loadout`.

### Lasers

Improve your mining output.

| Module | Price | Effect |
|--------|-------|--------|
| **Mk1 Laser** | 2,000¢ | +8% ore yield |
| **Mk2 Laser** | 8,000¢ | +15% ore yield |
| **Mk3 Laser** | 30,000¢ | +25% ore yield, +3% chance of hitting multiple veins |

### Scanners

Improve your chances of finding rare ore and triggering anomalous discoveries.

| Module | Price | Effect |
|--------|-------|--------|
| **Survey Scanner** | 3,000¢ | Better rare ore detection, +3% anomaly chance |
| **Deep Scanner** | 15,000¢ | Much better rare ore detection, +7% anomaly chance |

### Cargo Modules

Expand your ship's hold.

| Module | Price | Effect |
|--------|-------|--------|
| **Cargo Expander** | 3,000¢ | +300 cargo capacity |
| **Cargo Expander Mk2** | 12,000¢ | +800 cargo capacity |

### Utility

General-purpose enhancements.

| Module | Price | Effect |
|--------|-------|--------|
| **Rapid Cycle** | 5,000¢ | -8% laser recharge time |
| **Rapid Cycle Mk2** | 20,000¢ | -15% laser recharge time |

---

## Stacking

Fitting multiple copies of the same module **compounds** their effects. For example:

- 1× Mk2 Laser → +15% yield
- 2× Mk2 Laser → +32% yield (1.15 × 1.15)
- 3× Mk2 Laser → +52% yield (1.15 × 1.15 × 1.15)

Each copy must be purchased separately — this makes stacking a significant credit investment with meaningful returns.

---

## The Shop

Run `/shop` at any station to browse ships and modules.

- **Ships tab** — compare hulls, slot counts, and base stats
- **Modules tab** — browse by category (lasers, scanners, cargo, utility)
- Use the dropdown menu to select what you want to buy
- Your current credits and ship info are shown at the top

---

## The Loadout

Run `/loadout` to view and manage your current fit.

- See your ship, all module slots, and what's fitted in each
- **Combined stats** are shown at the top — your total yield multiplier, recharge time, and other bonuses
- **Fit** modules from your inventory into empty slots
- **Swap** or **unfit** modules already in a slot
- Your unfitted module inventory is shown at the bottom

You can also access your loadout from the main menu via the **🔧 Loadout** button.

---

## Rare Discoveries

When mining with a scanner fitted, there's a chance of triggering a **rare discovery** — a bonus event on top of your normal ore yield. These appear as a highlighted section in your mining results.

Possible discoveries include:

| Discovery | Reward |
|-----------|--------|
| **Dark Matter Pocket** | 1–3 Dark Matter |
| **Anomaly Fragment** | 1–2 Anomaly Fragments |
| **Abandoned Cargo** | 50–200 credits |
| **Fuel Leak Recovery** | 10–30 fuel |
| **Crystal Geode** | 2–5 Crystal Ore |
| **Ancient Relic** | 1 Ancient Relic (very valuable) |

Better scanners increase the chance of triggering these events. Without a scanner, rare discoveries cannot occur.

---

## Stat Reference

| Stat | What It Does |
|------|-------------|
| **Yield** | How much ore your lasers extract per mining cycle |
| **Cooldown** | Laser recharge time between mining cycles |
| **Rare Events** | Chance of discovering anomalies, relics, or hidden deposits |
| **Rare Ore** | Sensor sensitivity to valuable mineral signatures |
| **Cargo** | Additional hold space beyond your base capacity |
| **Drops** | Chance of hitting multiple ore veins in a single cycle |
| **Fuel** | Additional fuel tank capacity |

Ship base stats and module bonuses all stack together into your combined stats, visible in `/loadout`.
