# Vedic Climate Scope v1.5

Static HTML/CSS/JavaScript. No Vite.

## New in v1.5
- Nakshatra names now run radially inward toward the center of the wheel.
- Planet glyphs now inherit the color of the nakshatra they are currently transiting.
- Added physical scale presets with radius values for World, Country, State, City, Neighborhood, and Street.
- Added a visible map radius circle so the active wheel span corresponds to a real geographic distance.
- Clicked map points now show distance from the epicenter and whether they fall inside the active wheel radius.
- Center text remains removed.
- Swiss Ephemeris WebAssembly and Lahiri sidereal calculations remain in the browser.
- Address search still uses MapTiler and the base map remains Leaflet + OpenStreetMap.

## Deployment
Replace the existing repository files with the files from this version and commit. Vercel should redeploy automatically.

## Notes
This version keeps the project build-free. No Vite is required. The MapTiler key is entered in the browser and saved locally there.
