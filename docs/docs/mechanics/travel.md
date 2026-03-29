---
id: travel
title: Travel
sidebar_position: 3
---

# Travel

Space is big. Getting between systems takes real time and costs fuel.

## Initiating a Jump

Go to `#travel-hub` in your current system and run:

```
/travel
```

You'll see a list of nearby enrolled systems, sorted by distance. For each destination the display shows:

- Distance in light-years
- Fuel required
- Estimated travel time

Select a system and hit **Confirm Departure** to begin your journey.

---

## Fuel

- **Cost:** 1 fuel unit per light-year (configurable by the server)
- **Capacity:** 100 units default
- Travel is blocked if you don't have enough fuel to reach the destination

Always check your fuel before planning a long-haul run. The travel menu shows your current fuel level before you commit.

---

## Travel Time

- **Base rate:** 60 seconds per light-year
- **Minimum:** 30 seconds even for very short jumps
- Travel time scales with distance — a 10 LY jump takes ~10 minutes

Travel is **real-time**. You must wait for your ship to arrive before you can interact with the destination system. While in transit:

- You **cannot** use game commands (mining, selling, etc.)
- You **can** still chat in any channel
- You'll receive a notification when you arrive

---

## The Star Map

```
/map
```

Shows all enrolled systems within 50 light-years of your current position (up to 15 systems displayed). Each system is listed with its coordinates, star type, resource rating, and distance. Use this to plan travel routes and find rich systems worth visiting.

---

## Tips

- Short hops are cheap and fast — great for early-game market runs
- Higher resource-rating systems are usually farther out; budget your fuel accordingly
- Proxy systems (📡) impose a 20% sell tax — if you're hauling cargo to sell, aim for the system's home server instead
- Plan multi-jump routes using `/map` to avoid getting stranded without fuel
