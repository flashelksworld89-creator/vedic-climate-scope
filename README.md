# Vedic Climate Scope v2.6 — City Street Network

Static HTML/CSS/JavaScript. No Vite.

## New in v2.6
- Fullscreen can now build a real city street network from OpenStreetMap via Overpass API.
- The loader requests named highway ways with geometry, not sampled reverse-geocoding points.
- Each road geometry is split into contiguous astrological sectors, so a long street may belong to multiple zodiac/nakshatra/Climate House zones.
- The Nakshatra Street Index aggregates all named roads returned for the selected city extent.
- Major loaded road segments are drawn over the map using the color of the nakshatra sector they occupy.
- Changing the transit time reclassifies the already-loaded road geometries against the newly rotated wheel without downloading the street network again.
- Moving the blue dot no longer clears the city street network.
- Choosing a different city clears the old network and requires a new build for that city.

## How to use
1. Search for and select a city.
2. Enter fullscreen map mode.
3. Click **Build streets**.
4. The app queries named OpenStreetMap roads across the fixed city extent, classifies their geometry, and populates the 27-nakshatra street index.
5. Use the refresh button only when you want to redownload the current city road network.

## Important
This indexes named roads returned by OpenStreetMap for the selected city extent. Unnamed service roads, private drives, or roads absent from OpenStreetMap cannot be listed by name.
