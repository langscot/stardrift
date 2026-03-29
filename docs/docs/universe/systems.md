---
id: systems
title: Star Systems
sidebar_position: 2
---

# Star Systems

Each star system in Stellar Drift is a fully realized location with its own star, planets, asteroid belts, and economy.

## System Channels

When a system is enrolled, the bot automatically creates a set of Discord channels organized under a category:

| Channel | Purpose |
|---------|---------|
| `#system-overview` | Star map, system stats, and info |
| `#station-market` | NPC market — buy and sell |
| `#travel-hub` | Initiate jumps to other systems |
| `#planet-N-<name>` | One per planet — mining and interaction |
| `#asteroid-belt` | Asteroid mining (if the system has a belt) |
| `#system-log` | Activity feed — arrivals, large trades, events |

## Resource Rating

Every system has a **resource rating from 1–10** based on its star type, planet diversity, and the presence of valuable planet types (Volcanic, Scorched) and asteroid belts. Higher-rated systems yield more valuable resources but are typically farther from Sol Nexus.

## Enrolling a System

Server administrators can claim an unenrolled system for their Discord server:

```
/enroll
```

This registers the system, creates all the gameplay channels, and links the server to its galactic coordinates. The server becomes a live node in the shared galaxy — other players can warp in and interact.

:::note
Enrollment requires **Administrator** permission in the Discord server.
:::

## Proxy Systems

A system can be **proxied** — mirrored into an additional Discord server beyond its home guild. Proxy access is useful for players who want to participate in a system without leaving their home server, but it comes with penalties:

- **Mining yield:** 70% of normal
- **Sell credits:** 80% of normal (20% tax)

Proxy system channels are marked with a 📡 prefix. For full rates, visit the system's home guild directly.

```
/setup-hub   — Register Sol Nexus as a proxy in your server
/add-proxy   — Mirror another enrolled system into your server (admin only)
```

## Listing Systems

```
/systems
```

Lists all systems registered on the current Discord server, including whether each is a home system or a proxy.
