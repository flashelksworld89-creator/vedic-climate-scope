# Vedic Climate Scope v1.9 — Verified corrective build

Static HTML/CSS/JavaScript. No Vite.

## Verified fixes
- Climate Scope no longer contains the MapTiler key input. Key management is only under Settings.
- Settings includes a live key test for both forward search and reverse street lookup on the current deployed hostname.
- Wheel size is bound directly to width percentages for each scale: World 42%, Country 52%, State 64%, City 76%, Neighborhood 88%, Street 98%.
- Nakshatra labels no longer use SVG textPath arcs. Each full nakshatra name begins near the outside of its wedge and runs inward toward the wheel center along the wedge centerline.
- Planet glyph fill and outline are calculated from the planet's current nakshatra color.
- Street lookup uses MapTiler reverse geocoding with `types=road`, which MapTiler currently documents as a valid reverse-geocoding type.

## MapTiler 403
A 403 means the key is missing, invalid, or restricted. In Settings, use **Test key on this deployment**. If it reports 403, add the exact displayed hostname to MapTiler **Allowed HTTP Origins**, or use a stable production domain and allow that hostname.

## Deploy
Replace the existing repository files with this build and commit. Vercel will redeploy without Vite or a build step.
