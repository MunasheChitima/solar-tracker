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
let errorContainer;

// Error handling and user feedback system
function createErrorContainer() {
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.className = 'error-container';
    errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 400px;
    `;
    document.body.appendChild(errorContainer);
  }
  return errorContainer;
}

function showError(message, duration = 5000) {
  const container = createErrorContainer();
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    float: right;
    margin-left: 8px;
  `;
  closeBtn.onclick = () => errorDiv.remove();
  
  errorDiv.appendChild(document.createTextNode(message));
  errorDiv.appendChild(closeBtn);
  container.appendChild(errorDiv);
  
  if (duration > 0) {
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, duration);
  }
}

function showSuccess(message, duration = 3000) {
  const container = createErrorContainer();
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.style.cssText = `
    background: #d1fae5;
    border: 1px solid #a7f3d0;
    color: #065f46;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  successDiv.textContent = message;
  container.appendChild(successDiv);
  
  if (duration > 0) {
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, duration);
  }
}

function showLoading(element, message = 'Loading...') {
  if (element) {
    element.innerHTML = `<div class="loading-spinner">${message}</div>`;
    element.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #6b7280;
    `;
  }
}

// Input validation
function validateInputs() {
  const errors = [];
  
  const tilt = parseFloat(els.tilt?.value);
  if (isNaN(tilt) || tilt < 0 || tilt > 90) {
    errors.push('Panel tilt must be between 0 and 90 degrees');
  }
  
  const panelWatt = parseFloat(els.panelWatt?.value);
  if (isNaN(panelWatt) || panelWatt <= 0 || panelWatt > 10000) {
    errors.push('Panel wattage must be between 1 and 10,000 watts');
  }
  
  const panelCount = parseFloat(els.panelCount?.value);
  if (isNaN(panelCount) || panelCount <= 0 || panelCount > 1000) {
    errors.push('Panel count must be between 1 and 1,000');
  }
  
  const lat = parseFloat(els.lat?.value);
  const lon = parseFloat(els.lon?.value);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    errors.push('Invalid location coordinates');
  }
  
  if (errors.length > 0) {
    showError(errors.join('. '));
    return false;
  }
  
  return true;
}

// Safe DOM manipulation (prevents XSS)
function safeSetTextContent(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function safeCreateElement(tag, className, textContent) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

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
          const opacity = Math.max(0.4, 1 - cloudPct/150);
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
  if (!els.tableBody) return;
  
  // Clear existing content safely
  while (els.tableBody.firstChild) {
    els.tableBody.removeChild(els.tableBody.firstChild);
  }
  
  hours.forEach((h, i) => {
    const tr = safeCreateElement('tr');
    
    // Create cells safely
    const hourCell = safeCreateElement('td', '', formatHour(h));
    const irrCell = safeCreateElement('td', '', values[i].toFixed(3));
    const tempCell = safeCreateElement('td', '', typeof temps[i] === 'number' ? temps[i].toFixed(1) : '—');
    const precipCell = safeCreateElement('td', '', typeof precip[i] === 'number' ? `${Math.round(precip[i])}%` : '—');
    const windCell = safeCreateElement('td', '', typeof wind[i] === 'number' ? `${Math.round(wind[i])}` : '—');
    
    const cloudPct = clouds[i] || 0;
    const cloudIcon = cloudPct > 70 ? '☁️' : cloudPct > 30 ? '⛅' : '☀️';
    const cloudCell = safeCreateElement('td', '', `${cloudIcon} ${cloudPct}%`);
    
    tr.appendChild(hourCell);
    tr.appendChild(irrCell);
    tr.appendChild(tempCell);
    tr.appendChild(precipCell);
    tr.appendChild(windCell);
    tr.appendChild(cloudCell);
    
    els.tableBody.appendChild(tr);
  });
}

// Debounced function for API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function geocodeAddress(addr) {
  if (!addr || addr.trim().length < 3) return null;
  
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(addr)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (data && Array.isArray(data.results) && data.results.length) {
      const r = data.results[0];
      const display = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      return { lat: r.latitude, lon: r.longitude, display };
    }
  } catch (e) {
    console.warn('Open-Meteo geocoding failed:', e.message);
  }
  
  // Fallback: Nominatim
  try {
    const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`;
    const res2 = await fetch(url2);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    
    const data2 = await res2.json();
    if (Array.isArray(data2) && data2.length) {
      const b = data2[0];
      return { lat: parseFloat(b.lat), lon: parseFloat(b.lon), display: b.display_name };
    }
  } catch (e) {
    console.warn('Nominatim geocoding failed:', e.message);
  }
  
  return null;
}

async function currentParams() {
  const elevRaw = parseFloat(els.elev?.value);
  const tzRaw = parseFloat(els.tz?.value);
  const tiltRaw = parseFloat(els.tilt?.value);
  const azRaw = parseFloat(els.az?.value);
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
    if (g) { 
      lat = g.lat; 
      lon = g.lon; 
      display = g.display; 
    }
  }
  
  // Timezone: automatic from selected coordinates
  let tzOffset = tz;
  try {
    const tzRes = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
    if (tzRes.ok) {
      const tzJson = await tzRes.json();
      const rawOff = tzJson.rawOffset || 0;
      const dstOff = tzJson.dstOffset || 0;
      const total = rawOff + dstOff;
      tzOffset = Math.round(total / 3600);
    } else {
      // Fallback when service responds with an error (e.g., missing API key)
      tzOffset = Math.round(lon / 15);
    }
  } catch (e) {
    console.warn('Timezone API failed:', e.message);
    tzOffset = Math.round(lon / 15); // rough estimate
  }
  
  if (els.tz) els.tz.value = tzOffset;
  if (els.lat) els.lat.value = String(lat);
  if (els.lon) els.lon.value = String(lon);
  
  return { lat, lon, elev, tz: tzOffset, tilt, az, date, display, panelWatt, panelCount };
}

async function run() {
  if (!validateInputs()) {
    return;
  }
  
  document.body.classList.add('loading');
  let p;
  
  try {
    p = await currentParams();
    
    // Fetch weather from Open‑Meteo
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
      
      if (!resWx.ok) {
        throw new Error(`Weather API failed: ${resWx.status}`);
      }
      
      const j = await resWx.json();
      
      if (j.error) {
        throw new Error(j.error);
      }
      
      const provider = j?.provider || 'open-meteo';
      let hh = {};
      
      if (provider === 'google') {
        const hours = j.hourly?.forecast?.intervals || [];
        hourlyTemps = hours.map(h => (h?.temperature?.value ?? null));
        hourlyCloudCover = hours.map(h => (h?.cloudCover?.value ?? 0));
        hourlyPrecipProb = hours.map(h => (h?.precipitationChance?.value ?? 0));
        hourlyWindKmh = hours.map(h => {
          const v = h?.windSpeed?.value ?? 0;
          return Math.round(v);
        });
        
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
    } catch (e) {
      console.error('Weather data fetch failed:', e);
      showError('Unable to load weather data. Using clear sky calculations only.');
    }

    // Weekly solar forecast (next 7 days)
    try {
      const grid = document.getElementById('weeklyGrid');
      if (grid) {
        showLoading(grid, 'Loading weekly forecast...');
        
        // Clear existing content safely
        while (grid.firstChild) {
          grid.removeChild(grid.firstChild);
        }
        
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
            if (resWx.ok) {
              const j = await resWx.json();
              const hh = j?.hourly || {};
              hhCloud = (hh.cloud_cover || []).map(v => (typeof v === 'number' ? Math.round(v) : 0));
            }
          } catch (e) {
            console.warn(`Weather fetch failed for ${dStr}:`, e.message);
          }
          
          const dayRes = computeDay({ lat: p.lat, lon: p.lon, elev: p.elev, tz: p.tz, tilt: p.tilt, az: p.az, date: day, hourlyCloudCover: hhCloud });
          const kwhm2 = dayRes.total;
          const panelKwh = kwhm2 * systemKw * performanceRatio;
          
          const div = safeCreateElement('div', 'day');
          const label = day.toLocaleDateString(undefined, { weekday: 'short' });
          
          const labelDiv = safeCreateElement('div', 'label', label);
          const kwhm2Div = safeCreateElement('div', 'kwhm2', kwhm2.toFixed(2) + ' kWh/m²');
          const panelDiv = safeCreateElement('div', 'label', `Panel: ${panelKwh.toFixed(2)} kWh`);
          
          div.appendChild(labelDiv);
          div.appendChild(kwhm2Div);
          div.appendChild(panelDiv);
          grid.appendChild(div);
        }
      }
    } catch (e) {
      console.error('Weekly forecast failed:', e);
      showError('Unable to load weekly forecast.');
    }
    
    const res = computeDay({ ...p, hourlyCloudCover: Array.isArray(hourlyCloudCover) ? hourlyCloudCover : [] });

    safeSetTextContent(els.dateLabel, p.date.toISOString().slice(0, 10));
    
    const nowCondition = (() => {
      if (weatherSummary && currentTempStr !== '—') return `Now: ${currentTempStr} — ${weatherSummary}`;
      return weatherSummary || 'Weather data unavailable';
    })();
    
    safeSetTextContent(document.getElementById('weatherSummary'), nowCondition);
    safeSetTextContent(document.getElementById('currentTemp'), currentTempStr);
    safeSetTextContent(document.getElementById('precipNow'), kpis.precip);
    safeSetTextContent(document.getElementById('humidityNow'), kpis.humidity);
    safeSetTextContent(document.getElementById('windNow'), kpis.wind);
    safeSetTextContent(els.dailyTotal, `${res.total.toFixed(2)} kWh/m²`);
    
    const systemKw = Math.max(0, (p.panelWatt * p.panelCount) / 1000);
    const performanceRatio = 0.8;
    const panelEnergy = res.total * systemKw * performanceRatio;
    safeSetTextContent(document.getElementById('panelTotal'), `${panelEnergy.toFixed(2)} kWh`);
    safeSetTextContent(els.sunrise, res.sunrise >= 0 ? formatHour(Math.round(res.sunrise)) : '—');
    safeSetTextContent(els.sunset, res.sunset >= 0 ? formatHour(Math.round(res.sunset)) : '—');

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
      
      if (res2.ok) {
        const j2 = await res2.json();
        const grid = document.getElementById('outlookGrid');
        if (grid && j2?.daily?.time) {
          // Clear existing content safely
          while (grid.firstChild) {
            grid.removeChild(grid.firstChild);
          }
          
          const days = j2.daily.time.length;
          for (let i = 0; i < Math.min(7, days); i++) {
            const div = safeCreateElement('div', 'day');
            const dateStr = j2.daily.time[i];
            const dt = new Date(dateStr);
            const dayLabel = dt.toLocaleDateString(undefined, { weekday: 'short' });
            const wc = j2.daily.weather_code[i];
            const emoji = wmoToEmoji(wc);
            const tmax = Math.round(j2.daily.temperature_2m_max[i]);
            const tmin = Math.round(j2.daily.temperature_2m_min[i]);
            
            const labelDiv = safeCreateElement('div', 'label', dayLabel);
            const emojiDiv = safeCreateElement('div', '', emoji);
            emojiDiv.style.fontSize = '28px';
            const tempDiv = safeCreateElement('div', 'temp', tmax + '°');
            const minTempDiv = safeCreateElement('div', 'label', tmin + '°');
            
            div.appendChild(labelDiv);
            div.appendChild(emojiDiv);
            div.appendChild(tempDiv);
            div.appendChild(minTempDiv);
            grid.appendChild(div);
          }
        }
      }
    } catch (e) {
      console.error('7-day outlook failed:', e);
      showError('Unable to load 7-day weather outlook.');
    }

    // Equivalences based on kWh per m2 and a 1 m2 reference panel
    const kwh = panelEnergy;
    const equiv = [
      { label: 'Phone charges', perItemKWh: 0.005 },
      { label: 'LED bulb (10W) for 1 hour', perItemKWh: 0.01 },
      { label: 'Laptop (50W) for 1 hour', perItemKWh: 0.05 },
      { label: 'TV (100W) for 1 hour', perItemKWh: 0.1 }
    ];
    
    const list = document.getElementById('equivList');
    if (list) {
      // Clear existing content safely
      while (list.firstChild) {
        list.removeChild(list.firstChild);
      }
      
      equiv.forEach(e => {
        const count = Math.floor(kwh / e.perItemKWh);
        const li = safeCreateElement('li', '', `${e.label}: ${count.toLocaleString()}`);
        list.appendChild(li);
      });
    }
    
    showSuccess('Solar calculations completed successfully!');
    
  } catch (e) {
    console.error('Run function failed:', e);
    showError('An error occurred while calculating solar data. Please try again.');
  } finally {
    document.body.classList.remove('loading');
  }
}

// Event listeners
if (els.runBtn) {
  els.runBtn.addEventListener('click', run);
}

window.addEventListener('load', () => {
  // Set date input to today by default
  const today = new Date();
  const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    .toISOString().slice(0,10);
  if (els.date && !els.date.value) els.date.value = iso;
  
  // Restore settings from localStorage
  restoreSettings();
  
  // Only auto-run if we have confirmed coordinates (not just geolocation)
  if (els.lat?.value && els.lon?.value && els.addrConfirm?.textContent) {
    // Only run if address is confirmed or we have saved settings
    const hasConfirmedAddress = els.addrConfirm.textContent.includes('Using:');
    const hasSavedSettings = localStorage.getItem('solargain_settings');
    
    if (hasConfirmedAddress || hasSavedSettings) {
      run();
    }
  }
  
  // Wire auto-run listeners
  wireAutoRun();
});

// CSV export
async function exportCSV() {
  if (!validateInputs()) {
    return;
  }
  
  try {
    const p = await currentParams();
    
    // Fetch hourly weather via proxy for CSV
    let hourlyCloudCover = [];
    let hourlyTemps = [];
    let hourlyPrecipProb = [];
    let hourlyWindKmh = [];
    
    try {
      const dStr = p.date.toISOString().slice(0,10);
      const resWx = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}&date=${dStr}`);
      
      if (resWx.ok) {
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
      }
    } catch (e) {
      console.warn('Weather data fetch failed for CSV:', e.message);
    }
    
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
    
    showSuccess('CSV file downloaded successfully!');
  } catch (e) {
    console.error('CSV export failed:', e);
    showError('Failed to export CSV file. Please try again.');
  }
}

if (els.csvBtn) {
  els.csvBtn.addEventListener('click', exportCSV);
}

// Share link (query params)
async function shareLink() {
  try {
    const p = await currentParams();
    const q = new URLSearchParams({
      lat: p.lat, lon: p.lon, elev: p.elev, tz: p.tz, tilt: p.tilt, az: p.az,
      date: p.date.toISOString().slice(0,10)
    });
    const url = `${location.origin}${location.pathname}?${q.toString()}`;
    await navigator.clipboard.writeText(url);
    showSuccess('Link copied to clipboard!');
    
    if (els.shareBtn) {
      els.shareBtn.textContent = 'Copied!';
      setTimeout(() => (els.shareBtn.textContent = 'Share Link'), 1200);
    }
  } catch (e) {
    console.error('Share link failed:', e);
    showError('Failed to copy link. Please try again.');
  }
}

if (els.shareBtn) {
  els.shareBtn.addEventListener('click', shareLink);
}

// Load from query params
function initFromQuery() {
  const qp = new URLSearchParams(location.search);
  const get = (k, def) => qp.get(k) ?? def;
  if (els.lat) els.lat.value = get('lat', els.lat.value);
  if (els.lon) els.lon.value = get('lon', els.lon.value);
  if (els.elev) els.elev.value = get('elev', els.elev.value);
  if (els.tz) els.tz.value = get('tz', els.tz.value);
  if (els.tilt) els.tilt.value = get('tilt', els.tilt.value);
  if (els.az) els.az.value = get('az', els.az.value);
  const d = get('date', '');
  if (d && els.date) els.date.value = d;
}
initFromQuery();

// Address suggestions (debounced)
let addrTimer;
if (els.address) {
  const debouncedAddressSearch = debounce(async (query) => {
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      if (els.addrSuggest) {
        // Clear existing content safely
        while (els.addrSuggest.firstChild) {
          els.addrSuggest.removeChild(els.addrSuggest.firstChild);
        }
        
        const preds = Array.isArray(data.predictions) ? data.predictions : [];
        preds.forEach(item => {
          const b = safeCreateElement('button', '', item.description);
          b.type = 'button';
          b.addEventListener('click', async () => {
            if (els.address) els.address.value = item.description;
            if (els.addrConfirm) els.addrConfirm.textContent = `Using: ${item.description}`;
            
            // If item already contains lat/lon (fallback mode), use it directly; otherwise fetch details
            if (typeof item.lat === 'number' && typeof item.lon === 'number') {
              if (els.lat) els.lat.value = item.lat;
              if (els.lon) els.lon.value = item.lon;
            } else {
              try {
                const det = await fetch(`/api/places/details?placeId=${encodeURIComponent(item.place_id)}`);
                if (det.ok) {
                  const dj = await det.json();
                  const loc = dj?.result?.geometry?.location;
                  if (loc) {
                    if (els.lat) els.lat.value = loc.lat;
                    if (els.lon) els.lon.value = loc.lng;
                  }
                }
              } catch (e) {
                console.warn('Place details failed:', e.message);
              }
            }
            
            if (els.addrSuggest) els.addrSuggest.style.display = 'none';
            // Only run after address is confirmed
            saveSettings();
            run();
          });
          els.addrSuggest.appendChild(b);
        });
        if (els.addrSuggest) els.addrSuggest.style.display = preds.length ? 'block' : 'none';
      }
    } catch (e) {
      console.warn('Address autocomplete failed:', e.message);
      if (els.addrSuggest) els.addrSuggest.style.display = 'none';
    }
  }, 300);

  async function resolveAndRunFromAddress() {
    const q = (els.address.value || '').trim();
    if (q.length < 3) { return; }
    
    try {
      // Try Google Places autocomplete -> details
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const preds = Array.isArray(data.predictions) ? data.predictions : [];
      if (preds.length > 0) {
        const first = preds[0];
        // If we already have lat/lon (fallback mode), use them directly
        if (typeof first.lat === 'number' && typeof first.lon === 'number') {
          if (els.lat) els.lat.value = first.lat;
          if (els.lon) els.lon.value = first.lon;
          if (els.addrConfirm) els.addrConfirm.textContent = `Using: ${first.description}`;
          saveSettings();
          run();
          return;
        }
        // Else, fetch Google place details
        try {
          const det = await fetch(`/api/places/details?placeId=${encodeURIComponent(first.place_id)}`);
          if (det.ok) {
            const dj = await det.json();
            const loc = dj?.result?.geometry?.location;
            if (loc) {
              if (els.lat) els.lat.value = loc.lat;
              if (els.lon) els.lon.value = loc.lng;
              if (els.addrConfirm) els.addrConfirm.textContent = `Using: ${first.description}`;
              // Only run after address is confirmed
              saveSettings();
              run();
              return;
            }
          }
        } catch (e) {
          console.warn('Place details failed:', e.message);
        }
      }
    } catch (e) {
      console.warn('Google Places failed:', e.message);
    }
    
    // Fallback: Open‑Meteo geocoding single
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        if (j && Array.isArray(j.results) && j.results.length) {
          const r0 = j.results[0];
          if (els.lat) els.lat.value = r0.latitude;
          if (els.lon) els.lon.value = r0.longitude;
          const label = [r0.name, r0.admin1, r0.country].filter(Boolean).join(', ');
          if (els.addrConfirm) els.addrConfirm.textContent = `Using: ${label}`;
          // Only run after address is confirmed
          saveSettings();
          run();
        }
      }
    } catch (e) {
      console.warn('Open-Meteo geocoding failed:', e.message);
    }
  }
  
  els.address.addEventListener('input', () => {
    clearTimeout(addrTimer);
    const q = els.address.value.trim();
    if (q.length < 3) { 
      if (els.addrSuggest) els.addrSuggest.style.display = 'none'; 
      return; 
    }
    addrTimer = setTimeout(() => debouncedAddressSearch(q), 300);
  });
  
  document.addEventListener('click', (e) => {
    if (els.addrSuggest && !els.addrSuggest.contains(e.target) && e.target !== els.address) {
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
      if (els.az) els.az.value = btn.dataset.az;
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
    panelW: els.panelWatt?.value,
    panelH: els.panelCount?.value,
    date: els.date?.value,
    table: document.getElementById('tableToggle')?.checked ? 1 : 0
  };
  try { 
    localStorage.setItem('solargain_settings', JSON.stringify(data)); 
  } catch (e) {
    console.warn('Failed to save settings:', e.message);
  }
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
    if (d.panelW && els.panelWatt) els.panelWatt.value = d.panelW;
    if (d.panelH && els.panelCount) els.panelCount.value = d.panelH;
    if (d.date && els.date) els.date.value = d.date;
    const tt = document.getElementById('tableToggle');
    const tableWrap = document.getElementById('hourlyTable');
    if (tt) tt.checked = !!d.table;
    if (tt && tableWrap) tableWrap.style.display = tt.checked ? 'block' : 'none';
  } catch (e) {
    console.warn('Failed to restore settings:', e.message);
  }
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
  if (!navigator.geolocation) { 
    showError('Geolocation not supported. Please enter your location manually.');
    return; 
  }
  
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    if (els.lat) els.lat.value = lat;
    if (els.lon) els.lon.value = lon;
    
    // Auto elevation
    try {
      const r = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
      if (r.ok) {
        const j = await r.json();
        const e = j?.results?.[0]?.elevation;
        if (typeof e === 'number') {
          if (els.elev) els.elev.value = Math.round(e);
        }
      }
    } catch (e) {
      console.warn('Elevation API failed:', e.message);
    }
    
    // Reverse geocode label (Open‑Meteo geocoding)
    try {
      const rg = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`);
      if (rg.ok) {
        const gj = await rg.json();
        const r = gj?.results?.[0];
        if (r && els.address) {
          const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
          els.address.value = label;
          if (els.addrConfirm) els.addrConfirm.textContent = `Using: ${label}`;
          // Now that we have confirmed the address, we can run
          saveSettings();
          run();
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e.message);
    }
    
    saveSettings();
  }, (error) => {
    console.warn('Geolocation failed:', error.message);
    showError('Unable to get your location. Please enter your address manually.');
  }, { enableHighAccuracy: true, timeout: 8000 });
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);