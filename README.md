# Vedic Climate Scope v3.1 — Automatic Street Index

Static HTML/CSS/JavaScript. No Vite.

## New in v3.1
- Selecting a city automatically starts the city road-network index.
- Raw OpenStreetMap road geometry is cached in IndexedDB by city, center, and radius.
- Reopening the same city reuses the cached road network instead of downloading it again.
- Changing transit time reclassifies cached street segments under the rotating zodiac/nakshatra wheel without redownloading streets.
- Fullscreen street index now has three views: By Nakshatra, By Street, and By Planet.
- Refresh clears the current city cache and rebuilds it from OpenStreetMap.
- Old “Build streets” instructions were removed.

## Street classification
Each named road segment is classified by its midpoint against the fixed city wheel: Climate House, zodiac sign, nakshatra, and current transit governor. Long roads can appear in multiple zones when their geometry crosses sector boundaries.

## Deployment
Replace the existing repository files with this version and commit. Vercel should redeploy automatically.
