# Vedic Climate Scope — Static Version

This build intentionally avoids Vite, React, npm, bundlers, and front-end API keys.

## Run locally
Open `index.html` directly in a browser.

## Deploy
Upload these three files to GitHub or Vercel as a static site:
- `index.html`
- `styles.css`
- `app.js`

No build command is required.

## Current features
- Personal Climate wheel
- 12 zodiac signs and 27 nakshatras
- ASC fixed to East / DSC to West
- Manual Ascendant sign, degree, minute, second
- Planet role personalization
- House meaning personalization
- Automatic / Manual / Quick Reading profile modes
- Daily horoscope life-area interface
- Scale selector from World to Street
- Browser localStorage profile saving

## Planned calculation architecture
Astronomical calculations should run from a local/server-side Swiss Ephemeris layer rather than a paid external astrology API. Mapping can use open map data so no Google Maps API key is required.


## V1.1 Wheel update
- Nakshatra names are laid along radial wedge arcs rather than straight horizontal labels.
- The zodiac and nakshatra rings are semi-transparent for eventual map overlay.
- Added 108 pada tick marks.
- Added a temporary map-style underlay so wheel translucency can be evaluated before real mapping is connected.
- Live planetary positions are still demo values until the sidereal ephemeris engine is added.
