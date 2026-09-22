# Vedic Climate Scope v1.7

Static HTML/CSS/JavaScript. No Vite.

## New in v1.7
- Added a native fullscreen Personal Climate map mode.
- Fullscreen mode displays a left-side Nakshatra Street Index.
- The index lists the zodiac sign, nakshatra name, and sampled nearby named roads for all 27 nakshatra wedge centerlines.
- Street lookup uses the same MapTiler key already saved in the browser.
- Street lookup runs only in fullscreen and only at City, Neighborhood, or Street scale to reduce unnecessary geocoding calls.
- Added a refresh button to rebuild the street index after changing location, scale, or transit.
- Fullscreen map preserves the live wheel, planetary glyph colors, compass orientation, and epicenter.

## Street lookup method
For each nakshatra, the app calculates the geographic bearing of the center of that nakshatra sector from the current Ascendant. It samples two points along that radial centerline inside the active geographic radius, reverse-geocodes those coordinates with MapTiler, and shows unique nearby named roads when available. The labels are geographic lookup results; they are not claims that the streets have an astronomical physical property.

## Deployment
Replace the existing repository files with this version and commit. Vercel should redeploy automatically. No Vite or build command is required.
