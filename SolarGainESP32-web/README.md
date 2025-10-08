Local dev
---------

1) Create `.env` alongside `package.json` with:

```
GOOGLE_MAPS_API_KEY=YOUR_KEY
PORT=8787
```

2) Install deps and run the server:

```
npm install
npm run start
```

Server serves the static app from `public/` and proxies:
- `/api/places/*` (Google Places Autocomplete/Details)
- `/api/timezone` (Google Time Zone)
- `/api/weather` (Open‑Meteo)

# SolarGain Web Dashboard

A lightweight web dashboard that computes and visualizes hourly solar irradiance and daily totals in the browser.

## Features
- Hourly irradiance bars (kWh/m²) using Chart.js
- Daily total, sunrise and sunset estimates
- Editable inputs: latitude, longitude, elevation, timezone, panel tilt/azimuth
- Defaults set for Harare: lat −17.7831, lon 31.0909, elevation 650m, UTC+2, tilt 30°, azimuth 180°

## Quick Start (Local)

1. Open `public/index.html` directly in a browser
   - or serve the folder:
   ```bash
   cd "SolarGainESP32-web/public"
   python3 -m http.server 8080
   # visit http://localhost:8080
   ```

2. Adjust inputs and click "Compute Today".

## Deploy to Vercel

This is a static site; deploy the `SolarGainESP32-web` folder.

### Option A: Vercel CLI
```bash
npm i -g vercel
cd "/Users/munashe/Documents/Solar tracker/SolarGainESP32-web"
vercel init  # accept prompts, select static project
# When asked for output directory, enter: public
vercel --prod
```

### Option B: GitHub → Vercel
- Push the `SolarGainESP32-web/` folder to a repo
- In Vercel dashboard: New Project → Import repo
- Framework Preset: "Other"
- Output Directory: `public`
- Deploy

## Structure
```
SolarGainESP32-web/
├── public/
│   ├── index.html
│   └── styles.css
└── src/
    ├── app.js
    └── solar.js
```
