# Solar Tracker Application - Improvement Roadmap

**Last Updated:** 2026-01-24
**Current Version:** 1.0.0
**Overall Assessment:** 6.5/10 - Solid MVP, needs polish before monetization

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues (Fix Before Launch)](#critical-issues-fix-before-launch)
3. [High Priority UX Improvements](#high-priority-ux-improvements)
4. [Code Quality & Maintainability](#code-quality--maintainability)
5. [Missing Production Features](#missing-production-features)
6. [Performance Optimizations](#performance-optimizations)
7. [Accessibility & Browser Compatibility](#accessibility--browser-compatibility)
8. [Pre-Monetization Requirements](#pre-monetization-requirements)
9. [Implementation Timeline](#implementation-timeline)

---

## Executive Summary

### Current State Scoring

| Category | Score | Notes |
|----------|-------|-------|
| **Functionality** | 8/10 | Core features work well, but edge cases not handled |
| **Code Quality** | 6/10 | Works but hard to maintain, no tests |
| **UI/UX** | 7/10 | Clean design but confusing interactions |
| **Accessibility** | 7/10 | Good ARIA labels, but color contrast issues |
| **Security** | 8/10 | Good basics (CORS, CSP, rate limiting, XSS prevention) |
| **Performance** | 6/10 | Works but redundant API calls, no caching |
| **Mobile** | 6/10 | Responsive but cramped on small screens |
| **Reliability** | 5/10 | No tests, no error monitoring, CDN dependency |
| **Production Ready** | 5/10 | Works but needs fixes before charging users |

### Strengths
- ✅ Strong technical foundation with clean architecture
- ✅ Solid physics-based solar calculations
- ✅ Good security practices (CORS, CSP, input validation)
- ✅ Responsive design with professional UI
- ✅ Working API fallbacks (Google → Open-Meteo → Nominatim)

### Critical Gaps
- ❌ No automated testing (0% coverage)
- ❌ No error monitoring or analytics
- ❌ Race condition bugs in concurrent operations
- ❌ Missing input validation for edge cases
- ❌ 1,140-line monolithic file (app.js)
- ❌ CDN dependency risk (Chart.js)

---

## Critical Issues (Fix Before Launch)

### 🔴 Priority 1: Bugs & Stability

#### 1. Race Condition in Concurrent Runs
**File:** `SolarGainESP32-web/public/app.js:481-483`

**Problem:**
```javascript
// Abort if a newer run started while we were fetching
if (myRun !== runSeq) {
  return;  // ⚠️ BUG: Silently fails, leaves loading state active
}
```

When user clicks "Compute" multiple times quickly:
- First request aborts silently
- Loading spinner gets stuck
- User sees frozen UI with no feedback

**Fix:**
```javascript
if (myRun !== runSeq) {
  document.body.classList.remove('loading');
  showSuccess('Calculation cancelled (newer request started)', 2000);
  return;
}
```

**Effort:** 15 minutes
**Impact:** HIGH - Prevents UI freeze

---

#### 2. LocalStorage Failures Not Reported to User
**File:** `SolarGainESP32-web/public/app.js:1015-1019`

**Problem:**
```javascript
try {
  localStorage.setItem('solargain_settings', JSON.stringify(data));
} catch (e) {
  console.warn('Failed to save settings:', e.message);  // ⚠️ User not notified
}
```

In private browsing or when storage is full, settings silently fail to save.

**Fix:**
```javascript
try {
  localStorage.setItem('solargain_settings', JSON.stringify(data));
} catch (e) {
  console.warn('Failed to save settings:', e.message);
  showError('Unable to save settings. Check browser storage permissions or disable private browsing.');
}
```

**Effort:** 10 minutes
**Impact:** MEDIUM - User awareness

---

#### 3. Chart.js CDN Dependency Risk
**File:** `SolarGainESP32-web/public/index.html:11`

**Problem:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

- If CDN is down, entire app breaks
- No version pinning (can break unexpectedly)
- Performance: extra DNS lookup and download

**Fix Option 1 (Quick):**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
```

**Fix Option 2 (Better):**
```bash
npm install chart.js@4.4.1
# Bundle with a build tool (Vite, esbuild)
```

**Effort:** 30 min (Option 1) / 3 hours (Option 2)
**Impact:** HIGH - Reliability

---

#### 4. Weak Input Validation for Battery Values
**File:** `SolarGainESP32-web/public/app.js:134-164`

**Problem:**
- Battery capacity allows 0.1 Ah (unrealistic)
- Battery voltage allows 1V (unrealistic)
- No validation for extreme latitudes (polar regions)
- No validation for dates far in future/past

**Fix:**
```javascript
// Add to validation function
const batteryAh = parseFloat(els.batteryAh?.value);
if (batteryAh && (isNaN(batteryAh) || batteryAh < 10 || batteryAh > 10000)) {
  errors.push('Battery capacity must be between 10 and 10,000 Ah');
}

const batteryV = parseFloat(els.batteryV?.value);
if (batteryV && (isNaN(batteryV) || batteryV < 12 || batteryV > 600)) {
  errors.push('Battery voltage must be between 12 and 600 V');
}

// Date validation
const selectedDate = new Date(els.date.value);
const today = new Date();
const maxFuture = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
if (selectedDate > maxFuture) {
  errors.push('Date cannot be more than 1 year in the future');
}
```

**Effort:** 1 hour
**Impact:** MEDIUM - Data quality

---

#### 5. No Loading Progress for Weekly Forecast
**File:** `SolarGainESP32-web/public/app.js:457-510`

**Problem:**
Weekly forecast makes 7 API calls sequentially with generic "Loading..." text. User doesn't know progress or if it's stuck.

**Fix:**
```javascript
// Before loop
showLoading(grid, `Loading weekly forecast... (0/7)`);

// Inside loop
for (let i = 0; i < 7; i++) {
  showLoading(grid, `Loading weekly forecast... (${i}/7)`);
  // ... fetch logic
  showLoading(grid, `Loading weekly forecast... (${i + 1}/7)`);
}
```

**Effort:** 30 minutes
**Impact:** MEDIUM - User experience

---

### 🔴 Priority 2: Testing & Validation

#### 6. Zero Test Coverage
**Current State:** No test files exist

**Problem:**
- Can't verify solar calculations are correct
- No regression testing
- Edge cases unknown (polar regions, equinoxes, leap years)
- Can't confidently refactor

**Required Tests:**

**Unit Tests (solar.js):**
```javascript
// Example test structure
describe('Solar Calculations', () => {
  test('Summer solstice at equator', () => {
    const result = computeDay({
      lat: 0, lon: 0, elev: 0, tz: 0,
      tilt: 0, az: 180,
      date: new Date('2026-06-21'),
      hourlyCloudCover: Array(24).fill(0)
    });
    expect(result.total).toBeGreaterThan(5);
    expect(result.total).toBeLessThan(7);
  });

  test('Winter at North Pole - 24hr night', () => {
    const result = computeDay({
      lat: 90, lon: 0, elev: 0, tz: 0,
      tilt: 0, az: 180,
      date: new Date('2026-12-21'),
      hourlyCloudCover: Array(24).fill(0)
    });
    expect(result.total).toBe(0); // No sun at North Pole in winter
  });
});
```

**Integration Tests:**
- API endpoint responses
- Error handling paths
- Rate limiting behavior

**E2E Tests:**
- Full user flow: location → compute → export CSV
- Share link functionality
- Settings persistence

**Setup:**
```bash
npm install --save-dev vitest @testing-library/dom
# Add to package.json:
"scripts": {
  "test": "vitest",
  "test:coverage": "vitest --coverage"
}
```

**Effort:** 2-3 days
**Impact:** CRITICAL - Quality assurance

---

#### 7. Validate Solar Physics Against Known-Good Calculators
**File:** `SolarGainESP32-web/public/solar.js`

**Problem:**
```javascript
// Line 85: Questionable calculation
const solarTime = local + eot / 60 + lon / 15; // parity with firmware: no timezone subtraction
```

Comment suggests this might be propagating a firmware bug. Need expert validation.

**Action Items:**
1. Compare outputs against NREL SOLPOS algorithm
2. Test against pvlib-python for same inputs
3. Verify edge cases:
   - Polar regions (midnight sun, polar night)
   - Equinoxes (day/night equal)
   - Leap years
   - DST transitions
4. Document any known limitations

**Resources:**
- [NREL SPA](https://www.nrel.gov/grid/solar-resource/spa.html)
- [pvlib-python](https://pvlib-python.readthedocs.io/)

**Effort:** 1-2 days (requires domain expertise)
**Impact:** CRITICAL - Accuracy is core value proposition

---

### 🔴 Priority 3: Error Monitoring

#### 8. No Production Error Tracking
**Current State:** Errors only logged to console

**Problem:**
- Can't see user-facing errors
- No crash reports
- Can't measure error rates
- Unknown issues pile up silently

**Solution: Add Sentry**

```bash
npm install @sentry/browser
```

```javascript
// app.js (top of file)
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: location.hostname === 'localhost' ? 'development' : 'production',
  tracesSampleRate: 0.1, // 10% performance monitoring
  beforeSend(event) {
    // Filter out expected errors
    if (event.message?.includes('Rate limit exceeded')) {
      return null;
    }
    return event;
  }
});

// Wrap critical functions
function run() {
  try {
    // existing code
  } catch (error) {
    Sentry.captureException(error);
    showError('An unexpected error occurred. Our team has been notified.');
    throw error;
  }
}
```

**Alternative (Free):** LogRocket, Rollbar

**Cost:** Free tier: 5,000 errors/month
**Effort:** 2-3 hours
**Impact:** HIGH - Visibility into production issues

---

## High Priority UX Improvements

### 🟡 Priority 4: User Experience

#### 9. Confusing Address Field Behavior
**File:** `SolarGainESP32-web/public/app.js:250-350`

**Problems:**
- Auto-runs on blur even if user didn't select suggestion
- No clear indication when address is "locked in"
- "Using: ..." text is small and easy to miss

**Improvements:**

**Visual confirmation component:**
```html
<!-- Add to index.html -->
<div id="addrConfirm" class="address-confirmed" style="display:none;">
  <span class="check-icon" style="color: #10b981; font-weight: bold;">✓</span>
  Using: <strong id="confirmedAddress"></strong>
  <button class="btn-link" onclick="clearAddress()">Change</button>
</div>
```

```css
/* Add to styles.css */
.address-confirmed {
  background: #d1fae5;
  border: 1px solid #10b981;
  border-radius: 4px;
  padding: 8px 12px;
  margin-top: 8px;
  font-size: 14px;
}

.btn-link {
  background: none;
  border: none;
  color: #059669;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 8px;
}
```

**Effort:** 1-2 hours
**Impact:** MEDIUM - Clarity

---

#### 10. No Empty State / First-Time User Experience
**File:** `SolarGainESP32-web/public/index.html:100-120`

**Problem:**
App shows blank KPIs on first load. No guidance for new users.

**Fix: Add welcome screen**
```html
<!-- Add before results section -->
<section class="card empty-state" id="emptyState" style="display:none;">
  <div style="text-align: center; padding: 40px 20px;">
    <div style="font-size: 48px; margin-bottom: 16px;">☀️</div>
    <h2>Welcome to SolarGain Dashboard</h2>
    <p class="muted" style="margin: 16px 0; font-size: 16px;">
      Calculate hourly solar irradiance and forecast your solar panel output
    </p>
    <div style="margin-top: 24px;">
      <button onclick="tryGeolocate()" class="btn-primary" style="margin-right: 8px;">
        📍 Use My Location
      </button>
      <button onclick="scrollToForm()" class="btn-secondary">
        Enter Location Manually
      </button>
    </div>
  </div>
</section>
```

```javascript
// app.js - Show empty state on first load
function init() {
  const hasRun = localStorage.getItem('solargain_has_run');
  if (!hasRun) {
    document.getElementById('emptyState').style.display = 'block';
    document.querySelector('.results').style.display = 'none';
  }
  loadSettings();
}

function run() {
  // Hide empty state after first run
  document.getElementById('emptyState').style.display = 'none';
  document.querySelector('.results').style.display = 'block';
  localStorage.setItem('solargain_has_run', 'true');
  // ... existing run logic
}
```

**Effort:** 2 hours
**Impact:** HIGH - First impressions

---

#### 11. Mobile Optimization Issues
**File:** `SolarGainESP32-web/public/styles.css`

**Problems:**
- KPI grid: 3 columns on mobile is cramped
- Weekly forecast: 7 columns too narrow
- Chart not optimized for touch
- Table horizontal scroll works but not ideal

**Fix: Better responsive breakpoints**
```css
/* Improve mobile layout */
@media (max-width: 768px) {
  .kpi {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .kpi-card {
    padding: 12px;
  }

  .kpi-card h3 {
    font-size: 12px;
  }

  .kpi-card .value {
    font-size: 20px;
  }
}

@media (max-width: 600px) {
  .kpi {
    grid-template-columns: 1fr;
  }

  .weekly-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .outlook-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .day-card h4 {
    font-size: 14px;
  }

  /* Stack form inputs on very small screens */
  .form-group {
    grid-template-columns: 1fr;
  }
}

/* Make chart touch-friendly */
canvas {
  touch-action: pan-y;
  max-width: 100%;
}
```

**Effort:** 2-3 hours
**Impact:** HIGH - 50%+ users are mobile

---

#### 12. No Visual Feedback on Auto-Run
**File:** `SolarGainESP32-web/public/app.js:1028-1035`

**Problem:**
When user changes tilt/azimuth, app silently re-runs. User doesn't know if change was applied.

**Fix:**
```javascript
function wireAutoRun() {
  const ids = ['tilt', 'az', 'panelWatt', 'panelCount', 'batteryAh', 'batteryV'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        showSuccess('Recalculating with updated values...', 1500);
        saveSettings();
        run();
      });
    }
  });
}
```

**Effort:** 15 minutes
**Impact:** MEDIUM - User confidence

---

#### 13. Misleading "What can this power?" Section
**File:** `SolarGainESP32-web/public/index.html:169-173`

**Problem:**
Calculations assume 100% efficiency. Real-world losses:
- Battery charging: 10-20% loss
- Inverter: 5-15% loss
- Cables: 2-5% loss
- **Total system loss: 20-35%**

**Fix: Add disclaimer**
```html
<div class="card">
  <h3>⚡ What can this power?</h3>
  <div id="usageEstimates"></div>

  <!-- ADD THIS -->
  <div class="disclaimer" style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 14px;">
    <strong>⚠️ Important:</strong> These estimates assume ideal conditions.
    Actual usable power may be <strong>20-35% lower</strong> due to:
    <ul style="margin: 8px 0 0 20px; line-height: 1.6;">
      <li>Battery charging efficiency (10-20% loss)</li>
      <li>Inverter conversion (5-15% loss)</li>
      <li>Cable resistance (2-5% loss)</li>
      <li>Temperature effects and dust accumulation</li>
    </ul>
  </div>
</div>
```

**Effort:** 30 minutes
**Impact:** HIGH - Honesty builds trust

---

#### 14. Poor Color Accessibility
**File:** `SolarGainESP32-web/public/styles.css`

**Problem:**
```css
--muted: #6b7280;  /* Might not meet WCAG AA contrast (4.5:1) */
```

**Action:**
1. Test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
2. Ensure all text meets WCAG AA standard

**Fix (if needed):**
```css
:root {
  --muted: #4b5563;  /* Darker gray for better contrast */
  --border: #d1d5db;
  --success: #059669; /* Ensure green has good contrast */
  --error: #dc2626;   /* Ensure red has good contrast */
}
```

**Effort:** 1 hour
**Impact:** MEDIUM - Accessibility compliance

---

#### 15. Chart Legend Clarity
**File:** `SolarGainESP32-web/public/app.js:550-620`

**Problem:**
Dual-axis chart (irradiance + temperature) isn't clearly labeled.

**Fix:**
```javascript
const chartConfig = {
  // ... existing config
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Hourly Solar Irradiance and Temperature',
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              // Add units to tooltip
              label += context.dataset.yAxisID === 'temp'
                ? context.parsed.y.toFixed(1) + '°C'
                : context.parsed.y.toFixed(3) + ' kWh/m²';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Irradiance (kWh/m²)',
          font: { weight: 'bold' }
        }
      },
      temp: {
        title: {
          display: true,
          text: 'Temperature (°C)',
          font: { weight: 'bold' }
        }
      }
    }
  }
};
```

**Effort:** 30 minutes
**Impact:** LOW - Polish

---

## Code Quality & Maintainability

### 🟠 Priority 5: Refactoring

#### 16. Massive Monolithic File (1,140 Lines)
**File:** `SolarGainESP32-web/public/app.js`

**Problem:**
- Hard to find functions
- Can't reuse code elsewhere
- Testing requires loading entire file
- Merge conflicts in team environment

**Solution: Modularize**

**New structure:**
```
/public/
├── modules/
│   ├── api.js          # All fetch calls
│   ├── ui.js           # DOM manipulation, showError, showSuccess
│   ├── charts.js       # Chart.js configuration and updates
│   ├── tables.js       # Table rendering
│   ├── validation.js   # Input validation
│   ├── storage.js      # localStorage helpers
│   └── utils.js        # formatHour, debounce, etc.
├── solar.js            # Keep as-is (pure calculations)
├── app.js              # Orchestration only (~200 lines)
└── index.html
```

**Example refactor:**

**modules/api.js:**
```javascript
export async function fetchWeather(lat, lon, date) {
  const url = `/api/weather?lat=${lat}&lon=${lon}&date=${date}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather fetch failed');
  return response.json();
}

export async function fetchTimezone(lat, lon, date) {
  const url = `/api/timezone?lat=${lat}&lon=${lon}&date=${date}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Timezone fetch failed');
  return response.json();
}

// ... other API functions
```

**modules/validation.js:**
```javascript
export function validateInputs(els) {
  const errors = [];

  const lat = parseFloat(els.lat.value);
  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90');
  }

  // ... all validation logic

  return errors;
}
```

**Updated app.js:**
```javascript
import { computeDay } from './solar.js';
import { fetchWeather, fetchTimezone } from './modules/api.js';
import { validateInputs } from './modules/validation.js';
import { showError, showSuccess, showLoading } from './modules/ui.js';
import { updateChart } from './modules/charts.js';
import { saveSettings, loadSettings } from './modules/storage.js';

// Now just orchestration (~200 lines)
async function run() {
  const errors = validateInputs(els);
  if (errors.length > 0) {
    showError(errors.join('<br>'));
    return;
  }

  const weather = await fetchWeather(lat, lon, date);
  const result = computeDay({...params});
  updateChart(result);
}
```

**Effort:** 1 week
**Impact:** HIGH - Long-term maintainability

---

#### 17. No Type Safety (No TypeScript/JSDoc)
**All files**

**Problem:**
No way to know parameter types, return values, or valid ranges.

**Quick Fix: Add JSDoc**
```javascript
/**
 * Computes hourly solar irradiance for a single day
 * @param {Object} params - Calculation parameters
 * @param {number} params.lat - Latitude in degrees (-90 to 90)
 * @param {number} params.lon - Longitude in degrees (-180 to 180)
 * @param {number} params.elev - Elevation in meters above sea level
 * @param {number} params.tz - Timezone offset in seconds from UTC
 * @param {number} params.tilt - Panel tilt angle in degrees (0-90)
 * @param {number} params.az - Panel azimuth in degrees (0-360, 0=North, 180=South)
 * @param {Date} params.date - Date to calculate for
 * @param {number[]} params.hourlyCloudCover - Cloud cover % for each hour (0-100)
 * @returns {{
 *   total: number,           // Total daily irradiance in kWh/m²
 *   hourly: Array<{hour: number, irr: number, temp: number}>,
 *   sunrise: number,         // Sunrise hour (0-24)
 *   sunset: number,          // Sunset hour (0-24)
 *   peakHour: number,        // Hour with maximum irradiance
 *   peakIrradiance: number   // Maximum hourly irradiance
 * }}
 */
export function computeDay({ lat, lon, elev, tz, tilt, az, date, hourlyCloudCover = [] }) {
  // ... implementation
}
```

**Better: Migrate to TypeScript**
- Catch errors at compile time
- Better IDE autocomplete
- Self-documenting code

**Effort:** 1-2 days (JSDoc) / 1 week (TypeScript)
**Impact:** MEDIUM - Developer experience

---

#### 18. Magic Numbers Throughout Code
**Files:** `app.js`, `solar.js`

**Problem:**
```javascript
const opacity = Math.max(0.4, 1 - cloudPct/150);  // Why 150?
const performanceRatio = 0.8;  // Why 0.8?
const cloudFactor = Math.max(0.2, Math.min(1, Math.pow(1 - cloudCover/100, 1.2)));  // Why 1.2?
```

**Fix: Extract to named constants**
```javascript
// Add to top of solar.js
const SOLAR_CONSTANTS = {
  // Industry standard system losses (wiring, inverter, soiling, etc.)
  PERFORMANCE_RATIO: 0.8,

  // Cloud transmission: 100% cloud cover still allows 20% light through
  MIN_CLOUD_TRANSMITTANCE: 0.2,

  // Empirical non-linear cloud attenuation exponent
  CLOUD_ATTENUATION_EXPONENT: 1.2,

  // Solar constant: energy from sun at top of atmosphere (W/m²)
  SOLAR_IRRADIANCE_CONSTANT: 1361,

  // Minimum opacity for chart visualization
  MIN_CHART_OPACITY: 0.4,
  MAX_CLOUD_PCT_FOR_OPACITY: 150
};

// Use in code
const opacity = Math.max(
  SOLAR_CONSTANTS.MIN_CHART_OPACITY,
  1 - cloudPct / SOLAR_CONSTANTS.MAX_CLOUD_PCT_FOR_OPACITY
);

const cloudFactor = Math.max(
  SOLAR_CONSTANTS.MIN_CLOUD_TRANSMITTANCE,
  Math.min(1, Math.pow(
    1 - cloudCover / 100,
    SOLAR_CONSTANTS.CLOUD_ATTENUATION_EXPONENT
  ))
);
```

**Effort:** 2-3 hours
**Impact:** MEDIUM - Code readability

---

#### 19. Inconsistent Error Messages
**File:** `app.js`

**Problem:**
- Mix of technical and user-friendly messages
- Some API errors leak through to user
- No standardization

**Examples:**
- "HTTP 404" (technical)
- "Weather data unavailable" (user-friendly)
- "autocomplete_failed" (API response)

**Fix: Centralize error handling**
```javascript
// modules/errors.js
export const ERROR_MESSAGES = {
  WEATHER_FAILED: 'Unable to load weather data. Please try again in a moment.',
  LOCATION_FAILED: 'Could not find that location. Try a different address or check your spelling.',
  NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
  RATE_LIMIT: 'Too many requests. Please wait a minute and try again.',
  INVALID_DATE: 'Please enter a valid date.',
  INVALID_COORDINATES: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.',
  STORAGE_FAILED: 'Unable to save settings. Check browser storage permissions.',
  TIMEZONE_FAILED: 'Unable to determine timezone. Using UTC.',
  ELEVATION_FAILED: 'Unable to fetch elevation. Using sea level (0m).',
  CALCULATION_ERROR: 'Error calculating solar data. Please check your inputs and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please refresh the page and try again.'
};

export function mapErrorToMessage(error) {
  if (error.message?.includes('Rate limit')) return ERROR_MESSAGES.RATE_LIMIT;
  if (error.message?.includes('Network')) return ERROR_MESSAGES.NETWORK_ERROR;
  if (error.status === 404) return ERROR_MESSAGES.LOCATION_FAILED;
  if (error.status === 502) return ERROR_MESSAGES.WEATHER_FAILED;
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
```

**Usage:**
```javascript
try {
  const weather = await fetchWeather(lat, lon, date);
} catch (error) {
  showError(mapErrorToMessage(error));
  Sentry.captureException(error); // Still log for debugging
}
```

**Effort:** 2-3 hours
**Impact:** MEDIUM - Consistent UX

---

#### 20. Duplicate Code / DRY Violations
**File:** `app.js`

**Problem:**
Weather parsing logic appears in multiple places (lines 400-450, 682-696).

**Fix: Extract to reusable function**
```javascript
// modules/weather.js
export function parseWeatherData(weatherData, provider = 'open-meteo') {
  if (provider === 'google') {
    return parseGoogleWeather(weatherData);
  }

  // Open-Meteo format
  const hourly = weatherData.hourly || {};
  return {
    temperature: hourly.temperature_2m || [],
    cloudCover: hourly.cloud_cover || [],
    precipitation: hourly.precipitation_probability || [],
    windSpeed: hourly.wind_speed_10m || [],
    timezone: weatherData.timezone || 'UTC'
  };
}

function parseGoogleWeather(data) {
  // Google-specific parsing
}
```

**Other duplications to fix:**
- Loading spinner show/hide
- Error toast creation
- Table row generation
- Date formatting

**Effort:** 3-4 hours
**Impact:** MEDIUM - Maintainability

---

## Missing Production Features

### 🟣 Priority 6: Infrastructure

#### 21. No Analytics Tracking
**Current State:** Zero user tracking

**Problem:**
- Can't measure user engagement
- Don't know which features are used
- Can't track conversion funnel
- No data for optimization

**Solution: Add PostHog (Privacy-friendly)**

```bash
npm install posthog-js
```

```javascript
// app.js (top)
import posthog from 'posthog-js';

if (location.hostname !== 'localhost') {
  posthog.init('YOUR_PROJECT_API_KEY', {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true
  });
}

// Track key events
function run() {
  posthog.capture('calculation_run', {
    location: `${lat},${lon}`,
    tilt: tilt,
    azimuth: az,
    panel_watt: panelWatt,
    panel_count: panelCount
  });
  // ... existing code
}

function exportCSV() {
  posthog.capture('csv_export');
  // ... existing code
}

function shareLink() {
  posthog.capture('share_link');
  // ... existing code
}
```

**Track these metrics:**
- Page views
- Calculations run
- CSV exports
- Share link clicks
- Geolocation usage
- Average session duration
- Bounce rate
- Feature usage (battery calculator, weekly forecast)

**Cost:** Free tier: 1M events/month
**Effort:** 2-3 hours
**Impact:** HIGH - Data-driven decisions

---

#### 22. No Offline Support / PWA
**Current State:** App breaks without internet

**Problem:**
- Can't use on poor connections
- Can't install as app
- No home screen icon
- Lost sessions if connection drops

**Solution: Add PWA support**

**Step 1: Create manifest.json**
```json
{
  "name": "SolarGain Dashboard",
  "short_name": "SolarGain",
  "description": "Solar irradiance forecasting and panel output calculator",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Add service worker (sw.js)**
```javascript
const CACHE_NAME = 'solargain-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/solar.js',
  '/styles.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Step 3: Register in app.js**
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW registration failed', err));
  });
}
```

**Effort:** 1 day
**Impact:** HIGH - User retention, mobile experience

---

#### 23. No Performance Monitoring
**Current State:** No visibility into load times, API latency

**Solution: Add Web Vitals tracking**

```bash
npm install web-vitals
```

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({name, value, id}) {
  posthog.capture('web_vital', {
    metric_name: name,
    metric_value: value,
    metric_id: id
  });
}

getCLS(sendToAnalytics);  // Cumulative Layout Shift
getFID(sendToAnalytics);  // First Input Delay
getFCP(sendToAnalytics);  // First Contentful Paint
getLCP(sendToAnalytics);  // Largest Contentful Paint
getTTFB(sendToAnalytics); // Time to First Byte
```

**Track custom metrics:**
```javascript
// API latency
const startTime = performance.now();
const weather = await fetchWeather(lat, lon, date);
const duration = performance.now() - startTime;
posthog.capture('api_latency', { endpoint: 'weather', duration });
```

**Effort:** 2 hours
**Impact:** MEDIUM - Optimization insights

---

#### 24. No Browser Compatibility Testing
**Current State:** Unknown if app works on all browsers

**Action Items:**
1. Test on Safari (macOS & iOS)
2. Test on Firefox
3. Test on Chrome
4. Test on Edge
5. Test on mobile browsers

**Common issues to check:**
- ES6 module imports (Safari 10.1+)
- Fetch API (IE11 doesn't support)
- localStorage in private browsing (Safari blocks)
- CSS Grid (IE11 doesn't support)
- Chart.js rendering

**Add browser support notice:**
```html
<!-- Add to index.html -->
<noscript>
  <div class="browser-warning">
    This application requires JavaScript to run. Please enable JavaScript in your browser.
  </div>
</noscript>

<script>
  // Detect unsupported browsers
  if (!window.fetch || !window.Promise || !window.localStorage) {
    document.body.innerHTML = `
      <div class="browser-warning">
        Your browser is not supported. Please use Chrome, Firefox, Safari, or Edge.
      </div>
    `;
  }
</script>
```

**Minimum supported versions:**
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

**Effort:** 1 day
**Impact:** MEDIUM - Reach more users

---

#### 25. No Internationalization (i18n)
**Current State:** Hardcoded English only

**Problem:**
- Can't serve global markets
- Limited monetization potential
- Excludes non-English speakers

**Solution: i18n framework**

```bash
npm install i18next i18next-browser-languagedetector
```

**Priority languages for solar:**
1. English (default)
2. Spanish (Latin America has high solar potential)
3. German (strong solar market)
4. Chinese (largest solar market)
5. French
6. Portuguese (Brazil)

**Effort:** 1-2 weeks
**Impact:** HIGH for global monetization, LOW for MVP

---

## Performance Optimizations

### 🔵 Priority 7: Speed & Efficiency

#### 26. Redundant API Calls
**File:** `app.js:457-510`

**Problem:**
Weekly forecast re-fetches same weather data that main forecast already loaded.

**Fix: Implement caching**
```javascript
// modules/cache.js
class APICache {
  constructor(ttl = 3600000) { // 1 hour default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

export const weatherCache = new APICache(3600000); // 1 hour
export const timezoneCache = new APICache(86400000); // 24 hours
```

**Usage:**
```javascript
async function fetchWeather(lat, lon, date) {
  const cacheKey = `weather:${lat}:${lon}:${date}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return cached;

  const data = await fetch(`/api/weather?lat=${lat}&lon=${lon}&date=${date}`)
    .then(r => r.json());

  weatherCache.set(cacheKey, data);
  return data;
}
```

**Impact:**
- Reduce API calls by 70-90%
- Faster response times
- Lower costs

**Effort:** 2-3 hours
**Impact:** HIGH - User experience & costs

---

#### 27. Unoptimized Chart Rendering
**File:** `app.js:550-620`

**Problem:**
Chart destroys and recreates on every update (expensive).

**Fix: Update instead of recreate**
```javascript
let chart = null;

function updateChart(hourly, sunrise, sunset) {
  const ctx = document.getElementById('chart').getContext('2d');

  // Update existing chart if it exists
  if (chart) {
    chart.data.labels = hourly.map(h => formatHour(h.hour));
    chart.data.datasets[0].data = hourly.map(h => h.irr);
    chart.data.datasets[1].data = hourly.map(h => h.temp);
    chart.update('none'); // Skip animation for performance
    return;
  }

  // Create new chart only first time
  chart = new Chart(ctx, chartConfig);
}
```

**Effort:** 30 minutes
**Impact:** MEDIUM - Smoother UX

---

#### 28. No Image Optimization
**Future consideration when adding images**

**Best practices:**
- Use WebP format with fallbacks
- Responsive images with srcset
- Lazy loading for below-fold images
- Compress all images (TinyPNG, ImageOptim)

**Example:**
```html
<picture>
  <source srcset="logo.webp" type="image/webp">
  <img src="logo.png" alt="SolarGain" width="200" height="50" loading="lazy">
</picture>
```

**Effort:** 1 hour per image set
**Impact:** LOW (no images currently)

---

#### 29. Bundle Size Optimization
**Current:** No bundling, all files loaded separately

**Problems:**
- Multiple HTTP requests
- No tree-shaking
- No minification

**Solution: Add build step with Vite**

```bash
npm install --save-dev vite
```

**vite.config.js:**
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './public/index.html'
      }
    },
    minify: 'terser',
    sourcemap: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
});
```

**Update package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Benefits:**
- Minification: 30-40% smaller files
- Tree-shaking: Remove unused code
- Code splitting: Lazy load modules
- Fast HMR during development

**Effort:** 4-6 hours
**Impact:** MEDIUM - Page load speed

---

#### 30. Font Loading Optimization
**File:** `index.html:10`

**Current:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
```

**Better: Preload critical fonts**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
```

**Even better: Self-host fonts**
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

**Effort:** 1-2 hours
**Impact:** LOW - Marginal speed improvement

---

## Pre-Monetization Requirements

### 🟢 Priority 8: Ready for Launch

#### 31. User Authentication System
**Required for:** All monetization strategies

**Options:**

**Option A: Supabase (Recommended)**
```bash
npm install @supabase/supabase-js
```

Pros:
- Database included
- Real-time subscriptions
- Row-level security
- Free tier: 50,000 monthly active users

**Option B: Clerk**
- Beautiful pre-built UI
- Social login out of the box
- User management dashboard
- More expensive

**Option C: Auth0**
- Enterprise-grade
- Very expensive
- Overkill for MVP

**Implementation (Supabase):**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Sign up
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const user = supabase.auth.user();
```

**Database schema:**
```sql
-- Users table (Supabase auth handles this)

-- Configurations table
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(100),
  lat DECIMAL(9,6),
  lon DECIMAL(9,6),
  tilt INTEGER,
  azimuth INTEGER,
  panel_watt INTEGER,
  panel_count INTEGER,
  battery_ah DECIMAL(10,2),
  battery_v DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own configs
CREATE POLICY "Users can view own configs" ON configurations
  FOR SELECT USING (auth.uid() = user_id);
```

**Effort:** 1 week
**Impact:** CRITICAL - Enables monetization

---

#### 32. Payment Integration (Stripe)
**Required for:** Subscription revenue

**Setup:**
```bash
npm install stripe @stripe/stripe-js
```

**Backend (server/index.js):**
```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId, // e.g., 'price_xxxxx' for $15/month plan
      quantity: 1
    }],
    success_url: `${YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/pricing`,
    client_reference_id: userId,
    metadata: { userId }
  });

  res.json({ sessionId: session.id });
});

// Webhook to handle subscription events
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed':
      // Update user subscription status in database
      break;
    case 'customer.subscription.deleted':
      // Downgrade user to free tier
      break;
  }

  res.json({received: true});
});
```

**Frontend:**
```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_live_xxxxx');

async function checkout(priceId) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId: currentUser.id })
  });

  const { sessionId } = await response.json();
  await stripe.redirectToCheckout({ sessionId });
}
```

**Effort:** 3-4 days
**Cost:** 2.9% + $0.30 per transaction
**Impact:** CRITICAL - Revenue generation

---

#### 33. Usage Metering & Tier Enforcement
**Required for:** Freemium model

**Track usage:**
```javascript
// After each calculation
await supabase.from('usage_logs').insert({
  user_id: user.id,
  action: 'calculation',
  timestamp: new Date(),
  metadata: { lat, lon, date }
});

// Check if user has exceeded limit
const { count } = await supabase
  .from('usage_logs')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('action', 'calculation')
  .gte('timestamp', new Date(Date.now() - 24*60*60*1000)); // Last 24h

if (count >= getTierLimit(user.subscription_tier)) {
  showError('Daily limit reached. Upgrade to Premium for unlimited calculations.');
  return;
}
```

**Tier limits:**
```javascript
const TIER_LIMITS = {
  free: {
    calculations_per_day: 3,
    saved_locations: 1,
    api_calls_per_month: 0,
    features: ['basic_forecast', 'csv_export']
  },
  premium: {
    calculations_per_day: Infinity,
    saved_locations: 10,
    api_calls_per_month: 100,
    features: ['basic_forecast', 'csv_export', 'pdf_reports', 'notifications', 'api_access']
  },
  professional: {
    calculations_per_day: Infinity,
    saved_locations: Infinity,
    api_calls_per_month: 1000,
    features: ['all']
  }
};
```

**Effort:** 2-3 days
**Impact:** HIGH - Enforce business model

---

#### 34. Email Marketing Integration
**Required for:** User acquisition & retention

**Options:**
- **Resend** (developer-friendly, $20/month for 50k emails)
- **ConvertKit** (creator-focused, $29/month)
- **Mailchimp** (free tier available, expensive at scale)

**Setup (Resend):**
```bash
npm install resend
```

```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Welcome email on signup
async function sendWelcomeEmail(userEmail, userName) {
  await resend.emails.send({
    from: 'SolarGain <hello@solargain.app>',
    to: userEmail,
    subject: 'Welcome to SolarGain! ☀️',
    html: `
      <h1>Welcome ${userName}!</h1>
      <p>Get started by calculating your first solar forecast...</p>
      <a href="https://solargain.app/dashboard">Go to Dashboard</a>
    `
  });
}

// Weekly digest for engaged users
async function sendWeeklyDigest(userEmail, stats) {
  await resend.emails.send({
    from: 'SolarGain <weekly@solargain.app>',
    to: userEmail,
    subject: 'Your weekly solar summary',
    html: `
      <h2>This week's highlights</h2>
      <p>Total energy forecasted: ${stats.totalEnergy} kWh</p>
      <p>Best solar day: ${stats.bestDay}</p>
      <a href="https://solargain.app">See full report</a>
    `
  });
}
```

**Email campaigns:**
1. Welcome sequence (Days 0, 3, 7)
2. Feature education (Days 14, 21)
3. Upgrade prompts for free users (Days 30, 60)
4. Re-engagement for inactive users (Days 90)

**Effort:** 2-3 days
**Impact:** HIGH - User retention & conversion

---

#### 35. Admin Dashboard
**Required for:** Managing users, monitoring health

**Features needed:**
- User list with subscription status
- Revenue metrics (MRR, churn rate)
- Usage statistics
- Error logs
- Feature flags

**Quick solution: Retool or Forest Admin**
- Connect to your database
- Pre-built admin UI components
- $0-50/month for small teams

**Custom solution:**
```javascript
// Protected admin route
app.get('/admin/dashboard', requireAdmin, async (req, res) => {
  const stats = {
    totalUsers: await getUserCount(),
    activeSubscriptions: await getActiveSubscriptions(),
    mrr: await calculateMRR(),
    churnRate: await calculateChurn()
  };
  res.json(stats);
});
```

**Effort:** 1 week (custom) / 1 day (Retool)
**Impact:** MEDIUM - Operational efficiency

---

## Implementation Timeline

### 🗓️ 4-Week Pre-Launch Plan

#### **Week 1: Critical Fixes & Stability** (5-7 days)
**Goal:** Make app production-ready

- [x] Fix race condition loading state bug (15 min)
- [x] Add localStorage error handling (10 min)
- [x] Pin or bundle Chart.js (30 min - 3 hours)
- [x] Improve input validation (battery, dates) (1 hour)
- [x] Add weekly forecast progress indicator (30 min)
- [x] Add error monitoring (Sentry) (2-3 hours)
- [x] Cross-browser testing (Safari, Firefox) (4-6 hours)
- [x] Create comprehensive test suite (2-3 days)

**Deliverable:** Stable, tested application

---

#### **Week 2: UX Polish** (3-5 days)
**Goal:** Professional user experience

- [x] Improve mobile responsiveness (2-3 hours)
- [x] Add empty state / first-time UX (2 hours)
- [x] Better address confirmation UI (1-2 hours)
- [x] Add disclaimer to "What can this power?" (30 min)
- [x] Fix color accessibility issues (1 hour)
- [x] Add visual feedback for auto-run (15 min)
- [x] Improve chart legend and labels (30 min)
- [x] Add analytics (PostHog) (2-3 hours)

**Deliverable:** Polished, user-friendly interface

---

#### **Week 3: Code Quality & Performance** (4-6 days)
**Goal:** Maintainable, fast codebase

- [x] Refactor app.js into modules (1 week)
- [x] Add JSDoc comments (1-2 days)
- [x] Extract magic numbers to constants (2-3 hours)
- [x] Centralize error messages (2-3 hours)
- [x] Implement API response caching (2-3 hours)
- [x] Optimize chart updates (30 min)
- [x] Add PWA support (manifest + service worker) (1 day)

**Deliverable:** Clean, performant codebase

---

#### **Week 4: Monetization Foundation** (5-7 days)
**Goal:** Ready to accept payments

- [x] Implement authentication (Supabase) (2-3 days)
- [x] Create database schema (1 day)
- [x] Integrate Stripe (2-3 days)
- [x] Build pricing page (1 day)
- [x] Add usage metering (1 day)
- [x] Set up email marketing (Resend) (1 day)
- [x] Create admin dashboard (1 day)

**Deliverable:** Fully functional paid product

---

### 🚀 Post-Launch Roadmap (Months 2-6)

#### **Month 2: Growth**
- Content marketing (blog posts)
- SEO optimization
- Reddit/community engagement
- Referral program

#### **Month 3: Premium Features**
- Historical data analysis
- PDF report generation
- Multi-site management
- Email/SMS notifications

#### **Month 4: Mobile**
- PWA optimization
- Native mobile app (React Native)
- Push notifications

#### **Month 5: API & Integrations**
- RESTful API for developers
- Zapier integration
- Webhook support
- White-label options

#### **Month 6: Scale**
- International expansion (i18n)
- B2B features
- Team collaboration
- Enterprise tier

---

## Appendix: Resources & Tools

### Testing
- **Unit Tests:** Vitest
- **E2E Tests:** Playwright
- **Visual Testing:** Percy

### Monitoring
- **Errors:** Sentry
- **Analytics:** PostHog
- **Performance:** Web Vitals
- **Uptime:** UptimeRobot

### Development
- **Bundler:** Vite
- **Formatter:** Prettier
- **Linter:** ESLint
- **CI/CD:** GitHub Actions

### External Validation
- **Solar Calculations:** NREL SOLPOS, pvlib-python
- **Accessibility:** WAVE, axe DevTools
- **Performance:** Lighthouse, WebPageTest
- **Security:** Snyk, npm audit

---

## Summary

**Total Estimated Effort:** 4-6 weeks for full implementation

**Minimum Viable Launch:** Week 1-2 (fixes + UX) = 2 weeks

**Recommended Launch:** Week 1-4 (full pre-monetization) = 4 weeks

**Current Risk Level:** MEDIUM-HIGH
- Code works but has bugs
- No tests means unknown unknowns
- User experience needs polish

**Post-Improvement Risk Level:** LOW
- Tested, monitored, production-ready
- Professional UX
- Ready to scale

---

**Next Steps:**
1. Review this document with team
2. Prioritize based on timeline constraints
3. Begin Week 1 critical fixes immediately
4. Set up monitoring before any code changes
5. Create test suite to prevent regressions
6. Iterate based on user feedback

**Questions to answer:**
- What's your target launch date?
- What's your budget for tools/services?
- Do you have design resources for PWA icons, landing page?
- What's your pricing strategy (freemium vs. paid only)?
- What's your target market (consumers, installers, developers)?
