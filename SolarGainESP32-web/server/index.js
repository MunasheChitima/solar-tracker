// Minimal proxy server for Google APIs and weather
// Keeps API keys in env and serves the static web app
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8787;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// --- Google Places Autocomplete ---
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!GOOGLE_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=geocode&language=en&key=${GOOGLE_KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: 'autocomplete_failed', details: String(e) });
  }
});

// --- Google Places Details ---
app.get('/api/places/details', async (req, res) => {
  try {
    const placeId = req.query.placeId || '';
    if (!GOOGLE_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,formatted_address&key=${GOOGLE_KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: 'details_failed', details: String(e) });
  }
});

// --- Google Time Zone API ---
app.get('/api/timezone', async (req, res) => {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    const timestamp = Math.floor(Date.now() / 1000);
    if (!GOOGLE_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${timestamp}&key=${GOOGLE_KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: 'timezone_failed', details: String(e) });
  }
});

// (Removed) Google Solar API endpoint

// --- Weather proxy: Open-Meteo only (stable)
app.get('/api/weather', async (req, res) => {
  const lat = req.query.lat;
  const lon = req.query.lon;
  const date = req.query.date; // YYYY-MM-DD
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,cloud_cover,precipitation_probability,wind_speed_10m&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${date}&end_date=${date}&timezone=auto`;
    const r = await fetch(url);
    const j = await r.json();
    res.json({ provider: 'open-meteo', ...j });
  } catch (e2) {
    res.status(500).json({ error: 'weather_failed', details: String(e2) });
  }
});

// Serve static app
const publicDir = path.resolve(__dirname, '../public');
app.use('/', express.static(publicDir));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


