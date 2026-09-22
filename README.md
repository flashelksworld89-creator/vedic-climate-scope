# Vedic Climate Scope v3.3 — Dual Ascendant + Moon Climate Charts

Static HTML/CSS/JavaScript. No Vite.

## Two independent climate pages

### Ascendant Climate
- The city is read as a 12-house geographic chart anchored to the live sidereal Ascendant.
- The page is intended to describe external/environmental conditions and visible activity.
- A new forecast cycle begins when the sidereal Ascendant changes zodiac signs.
- The app calculates the next Ascendant-sign ingress and displays **Valid until**.

### Moon Climate
- Uses the same city epicenter, map, transit wheel, street network, and planetary transits.
- House 1 is anchored to the Moon's current sidereal zodiac sign (Chandra Lagna / whole-sign Moon chart).
- The interpretation emphasizes mental processing, mood, perception, receptivity, emotional response, memory, and public feeling.
- A new forecast cycle begins whenever the Moon enters a new nakshatra, even when the Moon remains in the same zodiac sign.
- The app calculates the next Moon-nakshatra ingress and displays **Valid until**.

## Forecast behavior
- Each page has House 1–12 forecasts.
- The Ascendant page uses external city-house meanings.
- The Moon page uses a separate Moon-house interpretation library for psychological/mental processing.
- Planetary occupants, house lords, classical Vedic aspects, Moon condition, nakshatra context, Bhavat Bhavam, dignity, and Gandanta remain part of the analysis.
- In live-now mode, the app checks for a forecast-cycle boundary every 30 seconds and recalculates after an ingress.
- If the user manually enters a historical/future time, automatic live-time rollover is suspended until **Now** is selected again.

## Street network
The same cached OpenStreetMap road geometry is reused on both pages. Switching between Ascendant Climate and Moon Climate reclassifies the cached streets under that chart's house/zodiac/nakshatra frame; it does not redownload the roads.

## Deployment
Replace the existing repository files with this version and commit. Vercel should redeploy automatically.
