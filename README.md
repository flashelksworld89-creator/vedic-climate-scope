# Vedic Climate Scope v2.4 — Geographic Forecast Engine

Static HTML/CSS/JavaScript. No Vite.

## New in v2.4
- Location forecasts no longer use personal planet/house roles.
- Added traditional sign-lord logic for all 12 sidereal signs.
- The forecast engine now evaluates:
  - Climate House
  - zodiac sign and sign lord
  - nakshatra and nakshatra lord
  - current transit governor(s)
  - current sign/nakshatra/Climate House of those key planets
  - Vedic graha drishti cast by and received by key planets
  - current Moon sign, nakshatra, and Climate House
  - Bhavat Bhavam derived house
  - strongest relevant angular transit modifier
- Compact forecasts remain limited to Theme / What may show up / Best use / Watch for.
- Technical factors are placed behind "Why this forecast?" so visible predictions stay short.
- Selected Point now shows both Sign Lord and Nakshatra Lord.

## Forecast hierarchy
1. Nakshatra lord — local timing and expression
2. Current transit governor — immediate activation
3. Zodiac sign lord — underlying geographic field
4. Vedic aspects cast/received by those planets
5. Climate House
6. Current Moon and Moon nakshatra
7. Bhavat Bhavam

Personal natal roles remain stored in the Profile page for later use, but are intentionally excluded from geographic city forecasts in this version.

## Deployment
Replace the current repository files with these files and commit. Vercel should redeploy automatically.
