# Vedic Climate Scope v2.7.1

Static HTML/CSS/JavaScript. No Vite.

## Street network repair
- The Nakshatra Street Index now uses smaller 5×5 Overpass sections instead of 3×3 sections.
- Added a third public Overpass fallback server.
- Each request has an abort timeout so a stalled server cannot freeze the build forever.
- The index now shows live progress: sections completed, roads found, and failed sections.
- If every road request fails, the exact network/server error is shown in the sidebar instead of silently leaving the index empty.
- A partial successful build is kept even if some sections fail.
- Long roads are still split by their actual geometry and can belong to multiple nakshatras.

## Deployment
Replace the existing repository files with this version and commit. Vercel should redeploy automatically.
