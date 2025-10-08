// Port of the simplified clear-sky model from firmware to JS

const DEG2RAD = Math.PI / 180;

function julianDay(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function declination(jd) {
  const g = 2 * Math.PI * (jd - 1) / 365.25;
  return 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
       - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
       - 0.002697 * Math.cos(3 * g) + 0.00148  * Math.sin(3 * g);
}

function equationOfTime(jd) {
  const B = 2 * Math.PI * (jd - 81) / 365.0;
  return 229.2 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
          - 0.014615 * Math.cos(2 * B) - 0.04089 * Math.sin(2 * B));
}

function hourAngle(localSolarTime) {
  return 15 * (localSolarTime - 12) * DEG2RAD;
}

function solarElevation(latRad, dec, ha) {
  const sinEl = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinEl)));
}

function solarAzimuth(latRad, dec, ha, el) {
  const cosAz = (Math.sin(dec) * Math.cos(latRad) - Math.cos(dec) * Math.sin(latRad) * Math.cos(ha)) / Math.cos(el);
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (ha > 0) az = 2 * Math.PI - az;
  return az;
}

function airMass(el, elevation) {
  if (el <= 0) return 40;
  const elDeg = el / DEG2RAD;
  const am = 1.0 / (Math.sin(el) + 0.50572 * Math.pow(elDeg + 6.07995, -1.6364));
  const pressureRatio = Math.exp(-elevation / 8000.0);
  return am * pressureRatio;
}

function dniFromAirMass(am, elevation) {
  if (am > 40) return 0;
  const solarConstant = 1367.0; // W/m2
  const k = 0.75 + 2e-5 * elevation;
  return Math.max(0, solarConstant * Math.exp(-k * am));
}

function dhiFromDni(dni) { return 0.1 * dni; }

function ghi(dni, dhi, el) { return el <= 0 ? 0 : dni * Math.sin(el) + dhi; }

function tiltedIrradiance(dni, dhi, el, az, tiltDeg, azDeg, elevation) {
  if (el <= 0) return 0;
  const tilt = tiltDeg * DEG2RAD;
  const saz = azDeg * DEG2RAD;
  const cosInc = Math.sin(el) * Math.cos(tilt) + Math.cos(el) * Math.sin(tilt) * Math.cos(az - saz);
  const directTilt = dni * Math.max(0, cosInc);
  const diffuseTilt = dhi * (1 + Math.cos(tilt)) / 2.0;
  const g = ghi(dni, dhi, el);
  const groundRef = 0.2 * g * (1 - Math.cos(tilt)) / 2.0;
  return directTilt + diffuseTilt + groundRef;
}

export function computeDay({ lat, lon, elev, tz, tilt, az, date }) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const jd = julianDay(y, m, d);
  const dec = declination(jd);
  const eot = equationOfTime(jd);
  const latRad = lat * DEG2RAD;

  let total = 0;
  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const local = h + 0.5; // mid hour
    const solarTime = local + eot / 60 + lon / 15 - tz; // adjust to true solar time
    const ha = hourAngle(solarTime);
    const el = solarElevation(latRad, dec, ha);
    let irrKwh = 0;
    if (el > 0) {
      const azSun = solarAzimuth(latRad, dec, ha, el);
      const am = airMass(el, elev);
      const dni = dniFromAirMass(am, elev);
      const dhi = dhiFromDni(dni);
      const tiltWm2 = tiltedIrradiance(dni, dhi, el, azSun, tilt, az, elev);
      irrKwh = tiltWm2 / 1000.0; // one hour bucket
    }
    hourly.push({ hour: h, irr: irrKwh });
    total += irrKwh;
  }

  // Sunrise / sunset approximation from zero-crossing
  const first = hourly.findIndex(h => h.irr > 0);
  const last = hourly.reduce((acc, it, i) => (it.irr > 0 ? i : acc), -1);
  const sunrise = first >= 0 ? first : -1;
  const sunset = last >= 0 ? last : -1;

  return { total, hourly, sunrise, sunset };
}


