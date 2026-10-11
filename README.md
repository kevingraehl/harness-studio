# Harness Studio

A browser-based wiring-harness diagram designer: connectors, pins, device blocks, individual conductors and looms. No server, no build step, no dependencies. Open `index.html` through any static web server.

Live: https://harness-studio.kevingraehl.workers.dev/ (also linked from [electricmotogarage.com](https://electricmotogarage.com)).

## Features

- Connector and device blocks with named, coloured pins and tracer stripes
- Orthogonal wire routing with crossing, overlap and bend scoring (`routing.js`, `auto-layout.js`)
- Loom grouping and bundle view
- JSON export/import, SVG export; projects autosave in your browser only
- Interface languages: English, Русский, 简体中文, Español (bundled dictionary in `i18n.js`, no network calls)
- Starter map: 2023 Light Bee X, derived from the publicly archived Canada X / Light Bee L1E diagrams. It is provisional: verify every pin and colour against your own bike before wiring.

## Run locally

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

## Tests

```sh
node routing.test.cjs
node auto-layout.test.cjs
node i18n.test.cjs   # needs: npm i jsdom
```

## Deploy (Cloudflare static assets)

Copy `index.html`, `app.js`, `styles.css`, `routing.js`, `auto-layout.js`, `i18n.js` and `_headers` into an assets directory and deploy with Wrangler. Static asset requests are free on Cloudflare Workers.

## Not included

No reference photographs or wiring data for any other model are published here.

## Disclaimer

Community documentation tool, not a verified service schematic. Wiring on a high-voltage vehicle can be dangerous; work at your own risk.

## License

Copyright © Kevin Graehl / Electric Moto Garage. All rights reserved. The source is published for viewing. Contact kevingraehl@gmail.com about reuse or licensing.
