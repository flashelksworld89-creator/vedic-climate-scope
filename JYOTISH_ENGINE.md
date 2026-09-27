# Deep Vedic Horoscope — Jyotish Engine V1

Development branch: `vedic-horoscope-engine-v1`

This branch is an isolated rewrite for a traditional sidereal Jyotish horoscope engine.

## V1 calculation policy
- Lahiri sidereal zodiac
- Swiss Ephemeris browser/WASM calculation layer
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
- True Rahu and derived opposite Ketu
- Exact sidereal longitude
- Nakshatra and pada
- Whole-sign house assignment
- Explicit latitude, longitude and UTC offset
- Auditable interpretation evidence

## Why the inputs are explicit
The first diagnostic version intentionally does not guess coordinates or historical time zones. The user supplies coordinates and UTC offset so errors in geocoding or timezone conversion cannot be mistaken for an astrology-calculation error.

## Interpretation roadmap
The current rule layer is intentionally conservative. Planned layers:
1. Classical graha drishti and conjunction logic
2. House lords, dispositors and functional benefic/malefic rules
3. Vimshottari mahadasha / antardasha / pratyantardasha
4. D9 and D10, followed by broader Shodashavarga support
5. Shadbala and dignity states
6. Ashtakavarga
7. Classical yogas with cancellation and strength conditions
8. Arudha, Upapada and Jaimini modules
9. Transit activation against natal promise
10. Evidence-weighted synthesis instead of one-factor predictions

## Local run
```
npm install
npm run dev
```

## Important
Astrology is a traditional interpretive system and is not scientifically established as a reliable method for predicting future events.
