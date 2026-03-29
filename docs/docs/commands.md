---
id: commands
title: Commands Reference
sidebar_position: 6
---

# Commands Reference

All Stellar Drift interactions use Discord slash commands. Type `/` in any channel to see available commands.

---

## Gameplay Commands

### `/mine`
Mine ore from your current location.

- Use in a **planet channel** or **asteroid belt channel**
- 30-second cooldown between mines
- Adds ore directly to your cargo hold
- Blocked if your cargo is full or you're in transit

---

### `/inventory`
View your current cargo and station storage.

- Shows cargo hold (used / capacity)
- Shows station storage at your current system
- Shows current fuel level

---

### `/sell`
Open the NPC market and sell cargo.

- Use in `#station-market`
- Shows current prices per ore type
- **Sell All** button dumps your entire cargo
- Individual item buttons let you sell specific stacks
- Prices shown reflect any proxy tax if applicable

---

### `/travel`
View nearby systems and initiate a jump.

- Use in `#travel-hub`
- Lists nearby enrolled systems sorted by distance
- Shows fuel cost and travel time for each destination
- **Confirm** button starts the jump
- You're locked out of game actions while in transit

---

### `/map`
Display a star map of systems near your current location.

- Shows up to 15 systems within 50 light-years
- Lists coordinates, star type, resource rating, and distance
- Useful for planning travel routes

---

### `/menu`
Open the main navigation menu.

- Shows your current status (location, fuel, credits)
- Buttons to quickly access cargo, map, mining, selling, and travel sections
- Available from any channel

---

## Admin Commands

These commands require **Administrator** permission in the Discord server.

### `/enroll`
Claim an unenrolled system for your server.

- Registers the system in the galaxy database
- Creates all gameplay channels automatically
- Links the server's guild ID to the system's galactic coordinates

---

### `/setup-hub`
Register Sol Nexus (the central hub) as a proxy in your server.

- Gives your server access to Sol Nexus channels
- Proxy penalties apply (70% mining yield, 80% sell rate)
- Useful for servers that want a gateway to the hub without full enrollment

---

### `/add-proxy`
Mirror another enrolled system into your server.

- Creates proxy channels for a system your server doesn't own
- Players access the system with proxy penalties
- Useful for multi-system server setups

---

### `/systems`
List all systems registered on the current Discord server.

- Shows home systems and proxy systems
- Includes resource ratings and enrollment dates

---

## Button Actions

Many commands produce interactive buttons. The common ones:

| Button | Context | Action |
|--------|---------|--------|
| **Mine Again** | After mining | Re-runs `/mine` immediately |
| **Sell All** | `/sell` | Sells your entire cargo hold |
| **Sell [Item]** | `/sell` | Sells a specific item stack |
| **Confirm Departure** | `/travel` | Starts a jump to the selected system |
| Menu buttons | `/menu` | Navigate to game sections |
