import { computeDay } from './solar.js';

const els = {
  lat: document.getElementById('lat'),
  lon: document.getElementById('lon'),
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

function renderChart(hours, values) {
  const ctx = document.getElementById('irrChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours.map(formatHour),
      datasets: [{
        label: 'Irradiance (kWh/m²)',
        data: values,
        backgroundColor: values.map(v => {
          if (v > 0.8) return '#ef4444';
          if (v > 0.6) return '#f97316';
          if (v > 0.4) return '#f59e0b';
          if (v > 0.2) return '#84cc16';
          return '#22c55e';
        })
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'kWh/m²' } },
        x: { title: { display: true, text: 'Hour' } }
      }
    }
  });
}

function renderTable(hours, values) {
  els.tableBody.innerHTML = '';
  hours.forEach((h, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatHour(h)}</td><td>${values[i].toFixed(3)}</td>`;
    els.tableBody.appendChild(tr);
  });
}

function currentParams() {
  return {
    lat: parseFloat(els.lat.value),
    lon: parseFloat(els.lon.value),
    elev: parseFloat(els.elev.value),
    tz: parseInt(els.tz.value, 10),
    tilt: parseFloat(els.tilt.value),
    az: parseFloat(els.az.value),
    date: els.date.value ? new Date(els.date.value) : new Date()
  };
}

function run() {
  const p = currentParams();
  const res = computeDay(p);

  els.dateLabel.textContent = p.date.toISOString().slice(0, 10);
  els.dailyTotal.textContent = `${res.total.toFixed(2)} kWh/m²`;
  els.sunrise.textContent = res.sunrise >= 0 ? formatHour(Math.round(res.sunrise)) : '—';
  els.sunset.textContent = res.sunset >= 0 ? formatHour(Math.round(res.sunset)) : '—';

  const hours = res.hourly.map(h => h.hour);
  const values = res.hourly.map(h => h.irr);
  renderChart(hours, values);
  renderTable(hours, values);
}

els.runBtn.addEventListener('click', run);
window.addEventListener('load', run);

// CSV export
function exportCSV() {
  const p = currentParams();
  const res = computeDay(p);
  const rows = [['Hour', 'Irradiance_kWhm2']];
  res.hourly.forEach(h => rows.push([h.hour, h.irr.toFixed(5)]));
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
function shareLink() {
  const p = currentParams();
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
  els.lat.value = get('lat', els.lat.value);
  els.lon.value = get('lon', els.lon.value);
  els.elev.value = get('elev', els.elev.value);
  els.tz.value = get('tz', els.tz.value);
  els.tilt.value = get('tilt', els.tilt.value);
  els.az.value = get('az', els.az.value);
  const d = get('date', '');
  if (d) els.date.value = d;
}
initFromQuery();


