import { computeDay } from './solar.js';

// Weather provider: Open‑Meteo (free, no key)
// Note: We keep the OpenWeather key around for future use, but the app now uses Open‑Meteo for reliability.
const OPENWEATHER_KEY = '67cb63777fedba30497503a6f8d4ceed';

const els = {
  address: document.getElementById('address'),
  addrSuggest: document.getElementById('addrSuggest'),
  addrConfirm: document.getElementById('addrConfirm'),
  lat: document.getElementById('lat'),
  lon: document.getElementById('lon'),
  panelWatt: document.getElementById('panelWatt'),
  panelCount: document.getElementById('panelCount'),
  elev: document.getElementById('elev'),
  tz: document.getElementById('tz'),
  tilt: document.getElementById('tilt'),
  az: document.getElementById('az'),
  runBtn: document.getElementById('runBtn'),
  csvBtn: document.getElementById('csvBtn'),
  shareBtn: document.getElementById('shareBtn'),
  date: document.getElementById('date'),
  dateLabel: document.getElementById('dateLabel'),
  dailyTotal: document.getElementById('dailyTotal'),
  sunrise: document.getElementById('sunrise'),
  sunset: document.getElementById('sunset'),
  tableBody: document.getElementById('tableBody')
};

let chart;

function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

function renderChart(hours, values, clouds = [], temps = []) {
  const ctx = document.getElementById('irrChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours.map(formatHour),
      datasets: [{
        label: 'Irradiance (kWh/m²)',
        data: values,
        backgroundColor: values.map((v, i) => {
          const cloudPct = clouds[i] || 0;
          const opacity = Math.max(0.4, 1 - cloudPct/150); // More subtle cloud effect
          if (v > 0.8) return `rgba(239, 68, 68, ${opacity})`;
          if (v > 0.6) return `rgba(249, 115, 22, ${opacity})`;
          if (v > 0.4) return `rgba(245, 158, 11, ${opacity})`;
          if (v > 0.2) return `rgba(132, 204, 22, ${opacity})`;
          return `rgba(34, 197, 94, ${opacity})`;
        })
      }, {
        type: 'line',
        label: 'Temperature (°C)',
        yAxisID: 'y1',
        data: temps,
        borderColor: 'rgba(37, 99, 235, 0.9)',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        pointRadius: 2,
        tension: 0.3,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'kWh/m²' } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '°C' } },
        x: { title: { display: true, text: 'Hour' } }
      }
    }
  });
}

function renderTable(hours, values, clouds = [], temps = [], precip = [], wind = []) {
  els.tableBody.innerHTML = '';
  hours.forEach((h, i) => {
    const tr = document.createElement('tr');
    const cloudPct = clouds[i] || 0;
    const cloudIcon = cloudPct > 70 ? '☁️' : cloudPct > 30 ? '⛅' : '☀️';
    const t = typeof temps[i] === 'number' ? temps[i].toFixed(1) : '—';
    const p = typeof precip[i] === 'number' ? `${Math.round(precip[i])}%` : '—';
    const w = typeof wind[i] === 'number' ? `${Math.round(wind[i])}` : '—';
    tr.innerHTML = `<td>${formatHour(h)}</td><td>${values[i].toFixed(3)}</td><td>${t}</td><td>${p}</td><td>${w}</td><td>${cloudIcon} ${cloudPct}%</td>`;
    els.tableBody.appendChild(tr);
  });
}

async function geocodeAddress(addr) {
  if (!addr || addr.trim().length < 3) return null;
  // Open‑Meteo Geocoding API (free, no key)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(addr)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && Array.isArray(data.results) && data.results.length) {
      const r = data.results[0];
      const display = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      return { lat: r.latitude, lon: r.longitude, display };
    }
  } catch (e) {}
  // Fallback: Nominatim single
  try {
    const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`;
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    if (Array.isArray(data2) && data2.length) {
      const b = data2[0];
      return { lat: parseFloat(b.lat), lon: parseFloat(b.lon), display: b.display_name };
    }
  } catch (e) {}
  return null;
}

async function currentParams() {
  const elevRaw = parseFloat(els.elev.value);
  const tzRaw = parseFloat(els.tz.value);
  const tiltRaw = parseFloat(els.tilt.value);
  const azRaw = parseFloat(els.az.value);
  const date = els.date && els.date.value ? new Date(els.date.value) : new Date();
  const panelWatt = Number.isFinite(parseFloat(els.panelWatt?.value)) ? parseFloat(els.panelWatt.value) : 400;
  const panelCount = Number.isFinite(parseFloat(els.panelCount?.value)) ? parseFloat(els.panelCount.value) : 1;
  const elev = Number.isFinite(elevRaw) ? elevRaw : 0;
  const tilt = Number.isFinite(tiltRaw) ? tiltRaw : 30;
  const az = Number.isFinite(azRaw) ? azRaw : 0;
  const tz = Number.isFinite(tzRaw) ? tzRaw : 0;

  let lat = parseFloat(els.lat?.value || '-17.7831');
  let lon = parseFloat(els.lon?.value || '31.0909');
  let display = 'Your location';
  if (els.address && els.address.value) {
    const g = await geocodeAddress(els.address.value);
    if (g) { lat = g.lat; lon = g.lon; display = g.display; }
  }
  // Timezone: automatic from selected coordinates
  let tzOffset = tz;
  try {
    const tzRes = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
    if (tzRes.ok) {
      const tzJson = await tzRes.json();
      const rawOff = tzJson.rawOffset || 0; // seconds
      const dstOff = tzJson.dstOffset || 0; // seconds
      const total = rawOff + dstOff;
      tzOffset = Math.round(total / 3600);
    }
  } catch (e) {
    tzOffset = Math.round(lon / 15); // rough
  }
  document.getElementById('tz').value = tzOffset;
  if (els.lat) els.lat.value = String(lat);
  if (els.lon) els.lon.value = String(lon);
  return { lat, lon, elev, tz: tzOffset, tilt, az, date, display, panelWatt, panelCount };
}

async function run() {
  document.body.classList.add('loading');
  let p;
  try {
    p = await currentParams();
  // Fetch weather from Open‑Meteo (reliable current/hourly/daily, no key)
  let hourlyCloudCover = [];
  let hourlyTemps = [];
  let hourlyPrecipProb = [];
  let hourlyWindKmh = [];
  let weatherSummary = '';
  let currentTempStr = '—';
  let kpis = { precip: '—', humidity: '—', wind: '—' };
  try {
    const dStr = p.date.toISOString().slice(0,10);
    const resWx = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}&date=${dStr}`);
    const j = await resWx.json();
    const provider = j?.provider || 'open-meteo';
    let hh = {};
    if (provider === 'google') {
      const hours = j.hourly?.forecast?.intervals || [];
      hourlyTemps = hours.map(h => (h?.temperature?.value ?? null));
      hourlyCloudCover = hours.map(h => (h?.cloudCover?.value ?? 0));
      hourlyPrecipProb = hours.map(h => (h?.precipitationChance?.value ?? 0));
      hourlyWindKmh = hours.map(h => {
        const v = h?.windSpeed?.value ?? 0; // m/s or km/h? Google returns km/h per docs
        return Math.round(v);
      });
      // Daily summary and current
      const dayMin = Math.min(...hourlyTemps.filter(x => typeof x === 'number'));
      const dayMax = Math.max(...hourlyTemps.filter(x => typeof x === 'number'));
      const avgCloud = hourlyCloudCover.length ? Math.round(hourlyCloudCover.reduce((a,b)=>a+b,0) / hourlyCloudCover.length) : 0;
      weatherSummary = `${Math.round(dayMin)}°-${Math.round(dayMax)}°C today, Avg clouds ${avgCloud}%`;
      const curTemp = j.current?.current?.temperature?.value;
      if (typeof curTemp === 'number') currentTempStr = `${curTemp.toFixed(1)}°C`;
      const curHum = j.current?.current?.humidity?.value;
      if (typeof curHum === 'number') kpis.humidity = `${Math.round(curHum)}%`;
      const curPrecipMm = j.current?.current?.precipitationAmount?.value;
      if (typeof curPrecipMm === 'number') kpis.precip = `${Math.round(curPrecipMm * 10) / 10} mm`;
      const curWind = j.current?.current?.windSpeed?.value;
      if (typeof curWind === 'number') kpis.wind = `${Math.round(curWind)} km/h`;
    } else {
      hh = j?.hourly || {};
    hourlyTemps = (hh.temperature_2m || []).map(v => (typeof v === 'number' ? v : null));
    hourlyCloudCover = (hh.cloud_cover || []).map(v => (typeof v === 'number' ? Math.round(v) : 0));
    hourlyPrecipProb = (hh.precipitation_probability || []).map(v => (typeof v === 'number' ? v : 0));
    const windMs = (hh.wind_speed_10m || []).map(v => (typeof v === 'number' ? v : 0));
    hourlyWindKmh = windMs.map(v => Math.round(v * 3.6));

      if (Array.isArray(j?.daily?.temperature_2m_min) && Array.isArray(j?.daily?.temperature_2m_max)) {
        const minT = Math.round(j.daily.temperature_2m_min[0]);
        const maxT = Math.round(j.daily.temperature_2m_max[0]);
        const avgCloud = hourlyCloudCover.length ? Math.round(hourlyCloudCover.reduce((a,b)=>a+b,0) / hourlyCloudCover.length) : 0;
        const wc = Array.isArray(j.daily.weather_code) ? j.daily.weather_code[0] : undefined;
        const condition = wc !== undefined ? wmoToDescription(wc) : '';
        weatherSummary = `${condition ? condition + ', ' : ''}${minT}°-${maxT}°C today, Avg clouds ${avgCloud}%`;
      }
      if (j?.current) {
        const c = j.current;
        if (typeof c.temperature_2m === 'number') currentTempStr = `${c.temperature_2m.toFixed(1)}°C`;
        if (typeof c.precipitation === 'number') kpis.precip = `${Math.round(c.precipitation * 10) / 10} mm`;
        if (typeof c.relative_humidity_2m === 'number') kpis.humidity = `${Math.round(c.relative_humidity_2m)}%`;
        if (typeof c.wind_speed_10m === 'number') kpis.wind = `${Math.round(c.wind_speed_10m * 3.6)} km/h`;
      }
    }
  } catch (e) {}

  // Weekly solar forecast (next 7 days)
  try {
    const grid = document.getElementById('weeklyGrid');
    if (grid) {
      grid.innerHTML = '';
      const baseDate = new Date(Date.UTC(p.date.getUTCFullYear(), p.date.getUTCMonth(), p.date.getUTCDate()));
      const systemKw = Math.max(0, (p.panelWatt * p.panelCount) / 1000);
      const performanceRatio = 0.8;
      for (let i = 0; i < 7; i++) {
        const day = new Date(baseDate);
        day.setUTCDate(baseDate.getUTCDate() + i);
        const dStr = day.toISOString().slice(0,10);
        let hhCloud = [];
        try {
          const resWx = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}&date=${dStr}`);
          const j = await resWx.json();
          const hh = j?.hourly || {};
          hhCloud = (hh.cloud_cover || []).map(v => (typeof v === 'number' ? Math.round(v) : 0));
        } catch (_) {}
        const dayRes = computeDay({ lat: p.lat, lon: p.lon, elev: p.elev, tz: p.tz, tilt: p.tilt, az: p.az, date: day, hourlyCloudCover: hhCloud });
        const kwhm2 = dayRes.total;
        const panelKwh = kwhm2 * systemKw * performanceRatio;
        const div = document.createElement('div');
        div.className = 'day';
        const label = day.toLocaleDateString(undefined, { weekday: 'short' });
        div.innerHTML = `
          <div class="label">${label}</div>
          <div class="kwhm2">${kwhm2.toFixed(2)} kWh/m²</div>
          <div class="label">Panel: ${panelKwh.toFixed(2)} kWh</div>
        `;
        grid.appendChild(div);
      }
    }
  } catch (e) {}
  const res = computeDay({ ...p, hourlyCloudCover: Array.isArray(hourlyCloudCover) ? hourlyCloudCover : [] });

  els.dateLabel.textContent = p.date.toISOString().slice(0, 10);
  const nowCondition = (() => {
    // Prefer immediate current cloud/condition description
    if (weatherSummary && currentTempStr !== '—') return `Now: ${currentTempStr} — ${weatherSummary}`;
    return weatherSummary || 'Weather data unavailable';
  })();
  document.getElementById('weatherSummary').textContent = nowCondition;
  const currentTempEl = document.getElementById('currentTemp');
  if (currentTempEl) currentTempEl.textContent = currentTempStr;
  const precipNow = document.getElementById('precipNow');
  const humidityNow = document.getElementById('humidityNow');
  const windNow = document.getElementById('windNow');
  if (precipNow) precipNow.textContent = kpis.precip;
  if (humidityNow) humidityNow.textContent = kpis.humidity;
  if (windNow) windNow.textContent = kpis.wind;
  els.dailyTotal.textContent = `${res.total.toFixed(2)} kWh/m²`;
  
  const systemKw = Math.max(0, (p.panelWatt * p.panelCount) / 1000);
  const performanceRatio = 0.8;
  const panelEnergy = res.total * systemKw * performanceRatio; // kWh for today
  document.getElementById('panelTotal').textContent = `${panelEnergy.toFixed(2)} kWh`;
  els.sunrise.textContent = res.sunrise >= 0 ? formatHour(Math.round(res.sunrise)) : '—';
  els.sunset.textContent = res.sunset >= 0 ? formatHour(Math.round(res.sunset)) : '—';
  

  const hours = res.hourly.map(h => h.hour);
  const values = res.hourly.map(h => h.irr);
  const clouds = res.hourly.map(h => h.cloudCover || 0);
  renderChart(hours, values, clouds, hourlyTemps);
  renderTable(hours, values, clouds, hourlyTemps, hourlyPrecipProb, hourlyWindKmh);
  // Toggle table visibility
  const tableWrap = document.getElementById('hourlyTable');
  const tableToggle = document.getElementById('tableToggle');
  if (tableWrap && tableToggle) tableWrap.style.display = tableToggle.checked ? 'block' : 'none';

  // 7-day outlook via Open‑Meteo
  try {
    const url2 = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
    const res2 = await fetch(url2);
    const j2 = await res2.json();
    const grid = document.getElementById('outlookGrid');
    if (grid && j2?.daily?.time) {
      grid.innerHTML = '';
      const days = j2.daily.time.length;
      for (let i = 0; i < Math.min(7, days); i++) {
        const div = document.createElement('div');
        div.className = 'day';
        const dateStr = j2.daily.time[i];
        const dt = new Date(dateStr);
        const dayLabel = dt.toLocaleDateString(undefined, { weekday: 'short' });
        const wc = j2.daily.weather_code[i];
        const emoji = wmoToEmoji(wc);
        const tmax = Math.round(j2.daily.temperature_2m_max[i]);
        const tmin = Math.round(j2.daily.temperature_2m_min[i]);
        div.innerHTML = `
          <div class="label">${dayLabel}</div>
          <div style="font-size:28px;">${emoji}</div>
          <div class="temp">${tmax}°</div>
          <div class="label">${tmin}°</div>
        `;
        grid.appendChild(div);
      }
    }
  } catch (e) {}

  // (Removed) Google Solar card population

  // Equivalences based on kWh per m2 and a 1 m2 reference panel
  const kwh = panelEnergy; // use actual panel output for equivalences
  const equiv = [
    { label: 'Phone charges', perItemKWh: 0.005 }, // 5 Wh per full charge
    { label: 'LED bulb (10W) for 1 hour', perItemKWh: 0.01 },
    { label: 'Laptop (50W) for 1 hour', perItemKWh: 0.05 },
    { label: 'TV (100W) for 1 hour', perItemKWh: 0.1 }
  ];
  const list = document.getElementById('equivList');
  list.innerHTML = '';
  equiv.forEach(e => {
    const count = Math.floor(kwh / e.perItemKWh);
    const li = document.createElement('li');
    li.textContent = `${e.label}: ${count.toLocaleString()}`;
    list.appendChild(li);
  });
  } finally {
    document.body.classList.remove('loading');
  }
}

els.runBtn.addEventListener('click', run);
window.addEventListener('load', () => {
  // Set date input to today by default
  const today = new Date();
  const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    .toISOString().slice(0,10);
  if (els.date && !els.date.value) els.date.value = iso;
  // Restore settings from localStorage
  restoreSettings();
  // Attempt geolocation if no saved lat/lon
  if (!els.lat.value || !els.lon.value) {
    tryGeolocate();
  } else {
    run();
  }
  // Wire auto-run listeners
  wireAutoRun();
});

// CSV export
async function exportCSV() {
  const p = await currentParams();
  // Fetch hourly weather via proxy for CSV (Google Weather first, fallback Open‑Meteo)
  let hourlyCloudCover = [];
  let hourlyTemps = [];
  let hourlyPrecipProb = [];
  let hourlyWindKmh = [];
  try {
    const dStr = p.date.toISOString().slice(0,10);
    const resWx = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}&date=${dStr}`);
    const j = await resWx.json();
    if (j?.provider === 'google') {
      const hours = j.hourly?.forecast?.intervals || [];
      hourlyTemps = hours.map(h => (h?.temperature?.value ?? null));
      hourlyCloudCover = hours.map(h => (h?.cloudCover?.value ?? 0));
      hourlyPrecipProb = hours.map(h => (h?.precipitationChance?.value ?? 0));
      hourlyWindKmh = hours.map(h => Math.round((h?.windSpeed?.value ?? 0)));
    } else {
      const hh = j?.hourly || {};
      hourlyTemps = (hh.temperature_2m || []).map(v => (typeof v === 'number' ? v : null));
      hourlyCloudCover = (hh.cloud_cover || []).map(v => (typeof v === 'number' ? Math.round(v) : 0));
      hourlyPrecipProb = (hh.precipitation_probability || []).map(v => (typeof v === 'number' ? v : 0));
      const windMs = (hh.wind_speed_10m || []).map(v => (typeof v === 'number' ? v : 0));
      hourlyWindKmh = windMs.map(v => Math.round(v * 3.6));
    }
  } catch (e) {}
  const res = computeDay({ ...p, hourlyCloudCover });
  const rows = [['Hour', 'Irradiance_kWhm2', 'Temp_C', 'Precip_%', 'Wind_kmh', 'CloudCover_%']];
  res.hourly.forEach((h, i) => rows.push([h.hour, h.irr.toFixed(5), hourlyTemps[i] ?? '', hourlyPrecipProb[i] ?? '', hourlyWindKmh[i] ?? '', h.cloudCover]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solargain_${p.date.toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
els.csvBtn.addEventListener('click', exportCSV);

// Share link (query params)
async function shareLink() {
  const p = await currentParams();
  const q = new URLSearchParams({
    lat: p.lat, lon: p.lon, elev: p.elev, tz: p.tz, tilt: p.tilt, az: p.az,
    date: p.date.toISOString().slice(0,10)
  });
  const url = `${location.origin}${location.pathname}?${q.toString()}`;
  navigator.clipboard.writeText(url);
  els.shareBtn.textContent = 'Copied!';
  setTimeout(() => (els.shareBtn.textContent = 'Share Link'), 1200);
}
els.shareBtn.addEventListener('click', shareLink);

// Load from query params
function initFromQuery() {
  const qp = new URLSearchParams(location.search);
  const get = (k, def) => qp.get(k) ?? def;
  if (els.lat) els.lat.value = get('lat', els.lat.value);
  if (els.lon) els.lon.value = get('lon', els.lon.value);
  els.elev.value = get('elev', els.elev.value);
  els.tz.value = get('tz', els.tz.value);
  els.tilt.value = get('tilt', els.tilt.value);
  els.az.value = get('az', els.az.value);
  const d = get('date', '');
  if (d) els.date.value = d;
}
initFromQuery();

// Address suggestions (debounced)
let addrTimer;
if (els.address) {
  async function resolveAndRunFromAddress() {
    const q = (els.address.value || '').trim();
    if (q.length < 3) { run(); return; }
    try {
      // Try Google Places autocomplete -> details
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const preds = Array.isArray(data.predictions) ? data.predictions : [];
      if (preds.length > 0) {
        const first = preds[0];
        try {
          const det = await fetch(`/api/places/details?placeId=${encodeURIComponent(first.place_id)}`);
          const dj = await det.json();
          const loc = dj?.result?.geometry?.location;
          if (loc) {
            els.lat.value = loc.lat;
            els.lon.value = loc.lng;
            els.addrConfirm.textContent = `Using: ${first.description}`;
            run();
            return;
          }
        } catch (_) {}
      }
    } catch (_) {}
    // Fallback: Open‑Meteo geocoding single
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
      const r = await fetch(url);
      const j = await r.json();
      if (j && Array.isArray(j.results) && j.results.length) {
        const r0 = j.results[0];
        els.lat.value = r0.latitude;
        els.lon.value = r0.longitude;
        const label = [r0.name, r0.admin1, r0.country].filter(Boolean).join(', ');
        els.addrConfirm.textContent = `Using: ${label}`;
      }
    } catch (_) {}
    run();
  }
  els.address.addEventListener('input', () => {
    clearTimeout(addrTimer);
    const q = els.address.value.trim();
    if (q.length < 3) { els.addrSuggest.style.display = 'none'; return; }
    addrTimer = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      els.addrSuggest.innerHTML = '';
      const preds = Array.isArray(data.predictions) ? data.predictions : [];
      preds.forEach(item => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = item.description;
        b.addEventListener('click', async () => {
          els.address.value = item.description;
          els.addrConfirm.textContent = `Using: ${item.description}`;
          try {
            const det = await fetch(`/api/places/details?placeId=${encodeURIComponent(item.place_id)}`);
            const dj = await det.json();
            const loc = dj?.result?.geometry?.location;
            if (loc) {
              els.lat.value = loc.lat;
              els.lon.value = loc.lng;
            }
          } catch (e) {}
          els.addrSuggest.style.display = 'none';
          run();
        });
        els.addrSuggest.appendChild(b);
      });
      els.addrSuggest.style.display = preds.length ? 'block' : 'none';
    }, 300);
  });
  document.addEventListener('click', (e) => {
    if (!els.addrSuggest.contains(e.target) && e.target !== els.address) {
      els.addrSuggest.style.display = 'none';
    }
  });
  // Auto-run on Enter and on blur (if value changed)
  els.address.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      resolveAndRunFromAddress();
    }
  });
  els.address.addEventListener('blur', () => {
    if (els.address.value.trim().length >= 3) resolveAndRunFromAddress();
  });
}

// Azimuth quick buttons
const azBtns = document.getElementById('azBtns');
if (azBtns) {
  azBtns.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      azBtns.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('az').value = btn.dataset.az;
      run();
    });
  });
}


function getWeatherCondition(code) {
  if (code <= 3) return 'Clear';
  if (code <= 48) return 'Cloudy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Thunderstorms';
  return 'Unknown';
}

// Map WMO code to simple description and emoji for Open‑Meteo
function wmoToDescription(code) {
  const m = {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
    85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail'
  };
  return m[code] || '—';
}

function wmoToEmoji(code) {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '▫️';
}

// Persist & auto-run utilities
function saveSettings() {
  const data = {
    lat: els.lat?.value,
    lon: els.lon?.value,
    elev: els.elev?.value,
    tilt: els.tilt?.value,
    az: els.az?.value,
    panelW: els.panelW?.value,
    panelH: els.panelH?.value,
    date: els.date?.value,
    table: document.getElementById('tableToggle')?.checked ? 1 : 0
  };
  try { localStorage.setItem('solargain_settings', JSON.stringify(data)); } catch (_) {}
}

function restoreSettings() {
  try {
    const raw = localStorage.getItem('solargain_settings');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.lat && els.lat) els.lat.value = d.lat;
    if (d.lon && els.lon) els.lon.value = d.lon;
    if (d.elev && els.elev) els.elev.value = d.elev;
    if (d.tilt && els.tilt) els.tilt.value = d.tilt;
    if (d.az && els.az) els.az.value = d.az;
    if (d.panelW && els.panelW) els.panelW.value = d.panelW;
    if (d.panelH && els.panelH) els.panelH.value = d.panelH;
    if (d.date && els.date) els.date.value = d.date;
    const tt = document.getElementById('tableToggle');
    const tableWrap = document.getElementById('hourlyTable');
    if (tt) tt.checked = !!d.table;
    if (tt && tableWrap) tableWrap.style.display = tt.checked ? 'block' : 'none';
  } catch (_) {}
}

function wireAutoRun() {
  const ids = ['date','tilt','az','panelWatt','panelCount'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { saveSettings(); run(); });
  });
  const tableToggle = document.getElementById('tableToggle');
  if (tableToggle) tableToggle.addEventListener('change', () => {
    const tableWrap = document.getElementById('hourlyTable');
    if (tableWrap) tableWrap.style.display = tableToggle.checked ? 'block' : 'none';
    saveSettings();
  });
}

async function tryGeolocate() {
  if (!navigator.geolocation) { run(); return; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    if (els.lat) els.lat.value = lat;
    if (els.lon) els.lon.value = lon;
    // Auto elevation
    try {
      const r = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
      const j = await r.json();
      const e = j?.results?.[0]?.elevation;
      if (typeof e === 'number') els.elev.value = Math.round(e);
    } catch (_) {}
    // Reverse geocode label (Open‑Meteo geocoding)
    try {
      const rg = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`);
      const gj = await rg.json();
      const r = gj?.results?.[0];
      if (r && els.address) {
        const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
        els.address.value = label;
        els.addrConfirm.textContent = `Using: ${label}`;
      }
    } catch (_) {}
    saveSettings();
    run();
  }, () => { run(); }, { enableHighAccuracy: true, timeout: 8000 });
}
