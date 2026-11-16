# Spot On

Upload an image, get its main colours and their nearest Pantone references.

Static site, no build step. Hosted on Cloudflare Pages (build command `exit 0`, output directory `/`).

- `index.html` – page
- `style.css` – styles
- `app.js` – colour extraction (k-means in CIELAB) and ΔE 2000 matching
- `data.js` – Pantone approximations (PANTONE+ Solid Coated/Uncoated from the `color2library` npm package, TCX from `nearest-pantone`, both MIT). Not official Pantone data.
- CMYK values: sRGB → FOGRA39L Coated ICC profile (relative colorimetric, black point compensation), precomputed as a 25³ lookup table in `data.js` with a gamut flag
- `fonts/cubic22.woff2` – Cubic 22 (variable)
