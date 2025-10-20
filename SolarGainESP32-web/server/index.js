// Minimal proxy server for Google APIs and weather
// Keeps API keys in env and serves the static web app
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org https://api.open-elevation.com https://maps.googleapis.com;");
  next();
});

app.use(cors());

const PORT = process.env.PORT || 8787;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Simple rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimit.get(ip);
  if (now > limit.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
  }
  
  limit.count++;
  next();
}

// Input validation helpers
function validateCoordinates(lat, lon) {
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  return !isNaN(latNum) && !isNaN(lonNum) && 
         latNum >= -90 && latNum <= 90 && 
         lonNum >= -180 && lonNum <= 180;
}

function validateDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>\"'&]/g, '').trim().substring(0, 100);
}

app.use(rateLimitMiddleware);

// --- Google Places Autocomplete ---
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    const q = sanitizeInput(req.query.q || '');
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }

    // Try Google Places first when key is present
    if (GOOGLE_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=geocode&language=en&key=${GOOGLE_KEY}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Google API returned ${r.status}`);
        const j = await r.json();
        // Return as-is for existing frontend compatibility
        return res.json(j);
      } catch (err) {
        console.warn('Google autocomplete failed, falling back to Nominatim:', err.message);
      }
    }

    // Fallback: Nominatim search -> map to Google-like predictions shape
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`;
    const nr = await fetch(nomUrl, { headers: { 'User-Agent': 'SolarGainDashboard/1.0 (contact: support@example.com)' } });
    if (!nr.ok) throw new Error(`Nominatim returned ${nr.status}`);
    const nj = await nr.json();
    const predictions = Array.isArray(nj) ? nj.map((it) => ({
      description: it.display_name,
      place_id: `nominatim:${it.place_id}`,
      lat: parseFloat(it.lat),
      lon: parseFloat(it.lon)
    })) : [];
    return res.json({ predictions });
  } catch (e) {
    console.error('Places autocomplete error:', e);
    res.status(500).json({ error: 'autocomplete_failed', details: 'Unable to fetch place suggestions' });
  }
});

// --- Google Places Details ---
app.get('/api/places/details', async (req, res) => {
  try {
    const placeId = sanitizeInput(req.query.placeId || '');
    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }
    if (!GOOGLE_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,formatted_address&key=${GOOGLE_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Google API returned ${r.status}`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    console.error('Places details error:', e);
    res.status(500).json({ error: 'details_failed', details: 'Unable to fetch place details' });
  }
});

// --- Google Time Zone API ---
app.get('/api/timezone', async (req, res) => {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    
    if (!validateCoordinates(lat, lon)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    if (!GOOGLE_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${timestamp}&key=${GOOGLE_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Google API returned ${r.status}`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    console.error('Timezone API error:', e);
    res.status(500).json({ error: 'timezone_failed', details: 'Unable to fetch timezone information' });
  }
});

// (Removed) Google Solar API endpoint

// --- Weather proxy: Open-Meteo only (stable)
app.get('/api/weather', async (req, res) => {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    let date = req.query.date; // YYYY-MM-DD
    
    if (!validateCoordinates(lat, lon)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }
    
    // Default to today (UTC) if date missing or invalid
    if (!validateDate(date)) {
      const d = new Date();
      const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      date = utc.toISOString().slice(0,10);
    }
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,cloud_cover,precipitation_probability,wind_speed_10m&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${date}&end_date=${date}&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Open-Meteo API returned ${r.status}`);
    const j = await r.json();
    return res.json({ provider: 'open-meteo', ...j });
  } catch (e) {
    console.error('Weather API error:', e);
    // Return safe empty payload so UI can continue with clear-sky computation
    return res.status(200).json({ provider: 'open-meteo', hourly: {}, daily: {}, current: {} });
  }
});

// Serve static app
const publicDir = path.resolve(__dirname, '../public');
app.use('/', express.static(publicDir));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


