---
id: trading
title: Trading & Economy
sidebar_position: 4
---

# Trading & Economy

Credits are the universal currency of the Stellar Drift galaxy. Every transaction uses credits, regardless of which system you're in.

## Selling to the NPC Market

The quickest way to turn ore into credits is selling to the NPC market in any station.

1. Go to `#station-market` in your current system
2. Run `/sell`
3. Review current prices for each ore type in your cargo
4. Hit **Sell All** to liquidate everything, or select individual items to sell specific stacks

---

## Price Mechanics

NPC prices are **dynamic** — they decay as more of the same item gets sold into a market.

- Every sale pushes the price of that item down (decay factor: 0.95 per sale event)
- Prices **recover over time** when no one is selling
- A fresh market (or one that hasn't been sold into recently) offers better rates

This creates natural **arbitrage opportunities**: mine in one system, haul to an underserved market across the galaxy, and sell for a premium.

---

## Proxy System Tax

Selling in a **proxy system** (📡) incurs a **20% tax** — you receive only 80% of the listed price. Always prefer selling at the system's home server for full value.

---

## Reading Market Prices

The `/sell` interface shows:

| Column | Meaning |
|--------|---------|
| Item | Ore/resource type |
| Price | Current NPC buy price per unit |
| You Have | Quantity in your cargo |
| Total | Credits you'd receive for selling all |

Prices shown already account for the proxy tax if applicable.

---

## Economy Strategy

**Early game:**
- Sell locally to build initial capital
- Reinvest in fuel for longer haul runs

**Mid game:**
- Scout multiple systems with `/map`
- Identify markets with high prices (low recent supply)
- Haul high-value ores (Platinum, Crystal, Dark Matter) to those markets

**Future (planned):**
- Player-driven buy/sell orders — post orders and let others fill them
- System-owner market taxes — system owners will be able to set custom tax rates
- Corporate treasury sharing — pooled credits for fleet operations

---

## Price Volatility by Ore

| Ore | Base Price | Volatility |
|-----|-----------|-----------|
| Iron Ore | Low | High (floods fast) |
| Copper Ore | Low-Mid | Medium |
| Silicon Ore | Low-Mid | Medium |
| Titanium Ore | Mid | Medium |
| Platinum Ore | High | Low (rare supply) |
| Crystal Ore | High | Low |
| Dark Matter | Very High | Very Low |
| Ice Crystal | Mid | Medium |
| Helium Gas | Mid | Medium |
| Hydrogen Gas | Low-Mid | Medium |

Exotic ores (Crystal, Dark Matter) are rare enough that markets rarely saturate — they tend to hold value well.
