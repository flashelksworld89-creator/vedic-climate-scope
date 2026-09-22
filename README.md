# Vedic Climate Scope v2.0 failsafe startup

Static HTML/CSS/JavaScript. No Vite.

## Startup fix
- The page renders before Swiss Ephemeris is loaded.
- Swiss Ephemeris now loads with a dynamic import inside a try/catch.
- A CDN failure no longer leaves a blank page; manual profile mode remains usable and a visible engine error is shown.
- localStorage access is guarded so browser privacy/storage restrictions cannot stop initial rendering.
- Leaflet and timezone helper scripts are deferred so they do not block the first interface paint.
- A visible startup-error fallback is included if an unexpected render error occurs.

## Existing v1.9 features retained
- Fullscreen map and nakshatra street index.
- API key management only in Settings.
- Radial inward nakshatra labels.
- Planet glyph colors follow current nakshatra colors.
- Visible World-to-Street wheel sizing.
