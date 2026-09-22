# Vedic Climate Scope v2.8 — Confirmation-Gated Forecast Prototype

Static HTML/CSS/JavaScript. No Vite.

## What changed
- Replaced the visible location-horoscope generator with a confirmation-gated evidence engine.
- A forecast theme is allowed only when at least two independent factor types support it.
- Independent factor types currently include Climate House, zodiac, nakshatra, sign lord, nakshatra lord, transit governor, Moon, aspects, Gandanta, and Bhavat Bhavam.
- Mixed or weak evidence is explicitly withheld instead of padded into a generic prediction.
- The forecast shows a Confirmed/Withheld badge and an expandable Evidence Ledger.
- Personal roles remain excluded from the city-climate prediction path.

## Design references
This version adopts the structural idea of an evidence/confirmation gate used by KOSMA, while retaining the existing Vedic Climate Scope map and sidereal calculations. The broader calculation surface was also reviewed against open-source Jyotish projects such as Jyotish Dashboard and astrology-insights. No Vite migration is required.

## Deployment
Replace the current repository files with this version and commit. Vercel should redeploy automatically.
