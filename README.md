# Vedic Climate Scope v2.1 — Fixed City Wheel

Plain HTML/CSS/JavaScript. No Vite.

## Fixed-city model
- Choosing a city sets a permanent geographic epicenter for the Personal Climate wheel.
- The city wheel radius is derived from the geocoder bounding box when available, with margin; otherwise a safe city-wide fallback radius is used.
- City / Neighborhood / Street are now view modes only. They change map zoom, not the physical astrology wheel.
- The wheel is a Leaflet geographic layer anchored to the city center. Zooming naturally magnifies or crops the same fixed wheel.
- A gold marker identifies the city epicenter.
- A separate blue marker represents the current or selected location and moves independently.
- Clicking the map moves the blue dot without moving the city wheel.

## Climate sectors
- 12 climate houses are drawn inside the wheel.
- Blue-dot analysis reports climate house, bearing, zodiac, degree, nakshatra, pada, traditional nakshatra lord, current transit governor(s), and nearest planet.
- Nakshatra wedges with transiting planets are emphasized and show small planet glyphs inside the wedge.
- Major transit aspect lines (conjunction, sextile, square, trine, opposition) are drawn across the wheel with a 4° display orb.
- Planet glyph colors continue to match their current nakshatra color.

## Street index
- Fullscreen street index is still based on reverse-geocoded road samples along each nakshatra centerline.
- Any clicked map point can be classified immediately, but this version does not yet download and pre-index every road geometry in an entire city. That requires a dedicated road-vector/OSM ingestion layer rather than reverse geocoding.

## Deployment
Replace the files in the existing GitHub repository and commit. Vercel should redeploy automatically. Framework remains Other; there is no Vite build step.
