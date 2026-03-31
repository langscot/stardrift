---
id: galaxy
title: The Galaxy
sidebar_position: 1
---

# The Galaxy

The Stardrift universe is a pre-generated galaxy of over **100,000 star systems** laid out across a 2D coordinate plane. All systems exist from the moment the game launched — they're waiting to be discovered and claimed.

## Scale & Layout

The galaxy follows a realistic distribution:

- **Galactic core** — densely packed systems clustered near (0, 0)
- **Spiral arms** — 8 distinct clusters of 800–2,000 systems each, spread outward in a Gaussian distribution
- **Outer rim** — sparse systems at greater distances; rarer star types appear more frequently here

Distance between any two systems is measured in **light-years** using standard Euclidean distance from their coordinates.

## Sol Nexus

**Sol Nexus** sits at the galactic origin **(0, 0)** — the center of the universe. It's the game's official hub, pre-configured with:

- A Yellow Dwarf star
- 5 curated planets (Scorched, Rocky, Temperate, Gas Giant, Ice World)
- 1 asteroid belt
- Resource rating: 6/10

All new players spawn here. Think of it as the main trade hub and social center of the galaxy.

## Naming Convention

Systems in Stardrift follow a **catalog designation** scheme inspired by real-world astronomical surveys. Every system is assigned an identifier from the **Stardrift Catalog (SD)** — a sequential-style number that represents its entry in the galactic survey.

**Format:** `SD {number}` (e.g., `SD 84712`, `SD 4019`, `SD 531046`)

Planets and asteroid belts within a system inherit the system name and append a Roman numeral:

| Object | Format | Example |
|--------|--------|---------|
| System | `SD {number}` | SD 84712 |
| Planet | `SD {number} {roman}` | SD 84712 III |
| Asteroid belt | `SD {number} Belt` | SD 84712 Belt |
| Multiple belts | `SD {number} Belt {roman}` | SD 84712 Belt II |

The hub system **Sol Nexus** is the one exception — it keeps its proper name as the galactic origin point.

:::tip Renaming
Players can rename systems, planets, and belts they control. The SD designation serves as the default "survey name" for unclaimed or newly discovered space.
:::

## Discovering the Galaxy

Systems appear in `/map` once they're within range of your current location. The map shows up to 15 systems within 50 light-years. Enrolled systems show their name, star type, resource rating, and owning guild. Unenrolled systems show up as unclaimed space — they're real systems with real coordinates waiting for someone to claim them.

## Coordinates & Navigation

Every system has a fixed `(x, y)` coordinate in light-year units. These coordinates determine:

- Distance (and therefore travel time and fuel cost) between systems
- What appears on your local star map
- Relative position in the galactic geography

Galactic "north," "south," etc. have no in-game meaning — navigation is purely by coordinates and distance.
