# aretichatzi.com

Single-page site for Areti Chatzi's holistic treatment studio in Skala, Patmos.
Hand-written HTML and CSS, no framework, served by GitHub Pages from `master`.

## Layout

- `index.html`, `privacy.html` (English and Greek), `404.html`
- `css/site.css`: all styles. Colours are taken from the studio facade.
- `fonts/`: Source Sans 3, hosted on the site (no Google Fonts, for GDPR)
- `img/`: generated files. Don't edit them by hand.
- `_sources/`: original photos and the rendered map. GitHub Pages' Jekyll build skips folders that start with `_`, so these are never published.
- `_tools/build-assets.mjs`: builds `img/`, `fonts/` and the favicons from `_sources/`

## Rebuilding images

```sh
cd _tools && npm install
node build-assets.mjs          # responsive AVIF/WebP/JPEG, favicons, fonts
node build-assets.mjs --map    # also re-downloads the OpenStreetMap tiles (only if the location changes)
```

To replace a photo, overwrite the file in `_sources/` and run the build.

## Privacy rules

The site sets no cookies and makes no requests to other domains, so it needs no cookie banner.
Keep it that way: no Google Fonts, Maps embeds, social widgets or analytics scripts.
Anything that adds one also needs consent handling and an update to `privacy.html`.
