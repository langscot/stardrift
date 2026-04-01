---
id: inventory
title: Inventory
sidebar_position: 2
---

# Inventory

Run `/inventory` at any time to see everything your pilot is carrying.

## Two Storage Types

### Cargo Hold
Your ship's on-board storage. Ore mined goes here directly. Cargo travels with your ship — when you jump to another system, your cargo comes with you.

- Base capacity: **1,000 units**
- When full, `/mine` is blocked until you make room
- Capacity can be increased with **Cargo Expander modules** and certain ships (e.g. the Freighter adds +2,000). See [Ships & Modules](./ships-and-modules.md)

### Station Storage
Permanent storage at a specific station. When you sell cargo or dock items, they may be held at the station where the transaction occurred. Station storage is per-system — items left at Sol Nexus stay at Sol Nexus.

- Unlimited capacity
- Does **not** travel with you
- Access it from the station in the system where you stored it

---

## Reading the Inventory Display

`/inventory` shows two sections:

1. **Cargo** — everything in your hold, total units used vs. capacity
2. **Station Storage** — items stored at your current system's station

Each entry shows the item name, quantity, and (where applicable) the estimated market value.

---

## Fuel

Fuel is tracked separately from cargo. It's stored in your ship's fuel tank:

- Default capacity: **100 units**
- Consumed during travel (1 unit per light-year by default)
- Current fuel is shown in the inventory view and in travel menus

Running out of fuel strands your ship. Always check fuel before initiating a long jump.
