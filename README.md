# Vedic Climate Scope v1.2

Static HTML/CSS/JavaScript. No Vite and no paid API key.

## New in v1.2
- Center wording removed from the wheel.
- Swiss Ephemeris WebAssembly loaded directly in the browser.
- Lahiri sidereal planetary longitudes.
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu, Uranus, Neptune and Pluto.
- Mean node for Rahu; Ketu calculated 180 degrees opposite.
- Live Ascendant from UTC time + latitude + longitude, converted to Lahiri sidereal longitude.
- Whole Sign house framework.
- Manual Ascendant remains available and can be selected instead of live ASC.
- 27 curved nakshatra wedges and 108 pada divisions remain.
- Device geolocation button uses browser geolocation and requires no API key.

## Deployment
Upload all files to the existing GitHub repository and commit. Vercel should redeploy automatically. Framework preset remains Other; no build command and no environment variables are required.

## Important
This version takes date/time in UTC. Address search, city centroid calculation, automatic time-zone resolution and the real geographic map overlay are planned for the next stage.


## v1.3 Geographic layer

- Added a real Leaflet/OpenStreetMap base map with no API key.
- Click the map to move the Personal Climate epicenter.
- Device geolocation and manual latitude/longitude remain available.
- Scale presets now change map zoom from World through Street.
- The translucent 27-nakshatra wheel remains fixed over the map with ASC East and DSC West.
- Address search is intentionally not connected to the public Nominatim endpoint; a self-hosted geocoder is planned to keep the app key-free and respect public-service usage rules.
