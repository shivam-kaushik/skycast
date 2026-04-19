/** Builds the self-contained HTML string for the 3D globe WebView. */

export type GlobeLayer = 'precipitation' | 'temperature' | 'wind' | 'air'

export interface GlobeWeatherData {
  temperature: number
  precipitationProbability: number
  windSpeed: number
  windDirection: number
  usAqi: number
  conditionLabel: string
}

export function buildGlobeHTML(
  lat: number,
  lon: number,
  layer: GlobeLayer,
  weather: GlobeWeatherData,
): string {
  // Inject all dynamic values as a single JSON blob — avoids TypeScript template-literal
  // conflicts with JS code that uses ${} inside the HTML string.
  const injected = JSON.stringify({
    lat,
    lon,
    layer,
    temp: Math.round(weather.temperature),
    precip: weather.precipitationProbability,
    wind: Math.round(weather.windSpeed),
    windDir: weather.windDirection,
    aqi: weather.usAqi,
    cond: weather.conditionLabel,
  })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #04030a; overflow: hidden; }
    #globe { width: 100%; height: 100%; }
    #loader {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      background: #04030a;
      pointer-events: none;
      transition: opacity 1s ease;
    }
    #loader.fade { opacity: 0; }
    .spinner {
      width: 38px; height: 38px;
      border: 2px solid rgba(245, 166, 35, 0.12);
      border-top-color: #f5a623;
      border-radius: 50%;
      animation: spin 0.85s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
<div id="globe"></div>
<div id="loader"><div class="spinner"></div></div>

<!-- globe.gl self-contained bundle — uses its own bundled Three.js internally -->
<script src="https://cdn.jsdelivr.net/npm/globe.gl@2.27.1/dist/globe.gl.min.js"></script>

<script>
(function() {
  'use strict';
  var D = ${injected};

  // ── Error relay — at TOP so any crash is forwarded to React Native ──────────
  window.onerror = function(msg, src, line) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error', msg: String(msg) + (line ? ' L' + line : ''),
      }));
    } catch (_) {}
    return false;
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function tempAccent(c) {
    if (c < -10) return '#7bb8ff';
    if (c < 0)   return '#a0c8ff';
    if (c < 10)  return '#c8e4ff';
    if (c < 20)  return '#ffd98a';
    if (c < 28)  return '#f5a623';
    return '#ff6b6b';
  }

  function windDirLabel(deg) {
    var dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8] || 'N';
  }

  var accent =
    D.layer === 'wind'          ? '#23b9a1' :
    D.layer === 'air'           ? '#06D6A0' :
    D.layer === 'precipitation' ? '#4a9eff' :
    tempAccent(D.temp);

  var atmosphereAlt =
    D.layer === 'precipitation' ? 0.22 :
    D.layer === 'wind'          ? 0.14 :
    D.layer === 'air'           ? 0.16 :
    0.18;

  var labelValue =
    D.layer === 'temperature'   ? (D.temp + '\\u00b0') :
    D.layer === 'precipitation' ? (D.precip + '%') :
    D.layer === 'wind'          ? (D.wind + ' km/h ' + windDirLabel(D.windDir)) :
    D.layer === 'air'           ? (D.aqi > 0 ? ('AQI ' + D.aqi) : D.cond) :
    (D.temp + '\\u00b0');

  // ── Build globe ─────────────────────────────────────────────────────────────
  var globe = Globe()(document.getElementById('globe'))
    .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor(accent)
    .atmosphereAltitude(atmosphereAlt)
    .showGraticules(false);

  // ── Pulsing ring at user location ────────────────────────────────────────────
  globe
    .ringsData([{ lat: D.lat, lng: D.lon, maxR: 5, speed: 1.5, period: 1400 }])
    .ringColor(function() { return accent; })
    .ringMaxRadius('maxR')
    .ringPropagationSpeed('speed')
    .ringRepeatPeriod('period');

  // ── Data label ───────────────────────────────────────────────────────────────
  globe
    .labelsData([{ lat: D.lat + 4.5, lng: D.lon, text: labelValue }])
    .labelText('text')
    .labelSize(0.85)
    .labelDotRadius(0.4)
    .labelColor(function() { return accent; })
    .labelResolution(3);

  // ── Layer effects — all use globe.gl's native pointsData API ─────────────────
  // globe.gl renders these via its own internal Three.js renderer, so they
  // are guaranteed to be visible regardless of what Three.js version is loaded.

  // ── PRECIPITATION: animated blue drops falling toward the surface ────────────
  if (D.layer === 'precipitation') {
    var RAIN_N   = Math.round(250 + D.precip * 10); // 250 (0%) → 1250 (100%)
    var RAIN_SPR = 20;  // ±20° spread around user
    var rainPts  = [];

    function initDrop(d) {
      d.lat = D.lat + (Math.random() - 0.5) * RAIN_SPR * 2;
      d.lng = D.lon + (Math.random() - 0.5) * RAIN_SPR * 2;
      d.alt = 0.04 + Math.random() * 0.02;
      d.spd = 0.003 + Math.random() * 0.004;
    }

    for (var ri = 0; ri < RAIN_N; ri++) {
      var rd = { lat: 0, lng: 0, alt: 0, spd: 0 };
      initDrop(rd);
      rd.alt = Math.random() * 0.06; // stagger start heights
      rainPts.push(rd);
    }

    var rainAlpha = Math.min(Math.max(D.precip / 100, 0.15), 1.0);
    globe
      .pointsData(rainPts)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude('alt')
      .pointRadius(0.14)
      .pointColor(function(d) {
        var a = (0.35 + (1 - d.alt / 0.06) * 0.55) * rainAlpha;
        return 'rgba(74,158,255,' + a.toFixed(2) + ')';
      });

    var rainTimer = setInterval(function() {
      for (var i = 0; i < rainPts.length; i++) {
        rainPts[i].alt -= rainPts[i].spd;
        if (rainPts[i].alt < 0) initDrop(rainPts[i]);
      }
      globe.pointsData(rainPts.slice()); // slice() = new array ref → forces re-render
    }, 60);
    window.addEventListener('unload', function() { clearInterval(rainTimer); });
  }

  // ── WIND: particles streaming in wind direction ──────────────────────────────
  if (D.layer === 'wind') {
    var WIND_N   = 700;
    var WIND_SPR = 38; // ±38° spread
    var windNorm = Math.min(Math.max(D.wind / 80, 0.05), 1.0);
    var WIND_R   = D.windDir * Math.PI / 180;
    var dLat     = Math.cos(WIND_R) * windNorm * 0.012; // North component
    var dLng     = Math.sin(WIND_R) * windNorm * 0.012; // East component
    var windPts  = [];

    function initWind(d) {
      d.lat   = D.lat + (Math.random() - 0.5) * WIND_SPR * 2;
      d.lng   = D.lon + (Math.random() - 0.5) * WIND_SPR * 2;
      d.phase = Math.random(); // position in life cycle (drives opacity fade)
      d.lspd  = 0.006 + Math.random() * 0.008;
    }

    for (var wi = 0; wi < WIND_N; wi++) {
      var wd = { lat: 0, lng: 0, phase: 0, lspd: 0 };
      initWind(wd);
      windPts.push(wd);
    }

    globe
      .pointsData(windPts)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(0.006)
      .pointRadius(0.2)
      .pointColor(function(d) {
        // Fade in from 0, peak at 0.5, fade out to 1 → smooth trail effect
        var a = Math.sin(d.phase * Math.PI) * 0.88;
        return 'rgba(35,185,161,' + a.toFixed(2) + ')';
      });

    var windTimer = setInterval(function() {
      for (var i = 0; i < windPts.length; i++) {
        windPts[i].lat   += dLat;
        windPts[i].lng   += dLng;
        windPts[i].phase += windPts[i].lspd;
        if (windPts[i].phase > 1) initWind(windPts[i]);
      }
      globe.pointsData(windPts.slice());
    }, 60);
    window.addEventListener('unload', function() { clearInterval(windTimer); });
  }

  // ── TEMPERATURE: colored dot cloud — warm/cool gradient around user ──────────
  if (D.layer === 'temperature') {
    var tempPts  = [];
    var tempNorm = Math.min(Math.max((D.temp + 20) / 60, 0), 1);

    for (var tLat = -28; tLat <= 28; tLat += 4) {
      for (var tLng = -28; tLng <= 28; tLng += 4) {
        var tDist = Math.sqrt(tLat * tLat + tLng * tLng) / 28;
        if (tDist > 1) continue;
        var tW = Math.max(0, 1 - tDist * tDist);
        tempPts.push({ lat: D.lat + tLat, lng: D.lon + tLng, w: tW });
      }
    }

    globe
      .pointsData(tempPts)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(function(d) { return d.w * 0.015; })
      .pointRadius(function(d) { return 0.22 + d.w * 0.28; })
      .pointColor(function(d) {
        var v = tempNorm * d.w;
        if (v < 0.25) return 'rgba(74,158,255,0.82)';
        if (v < 0.50) return 'rgba(255,200,80,0.82)';
        if (v < 0.75) return 'rgba(245,120,35,0.82)';
        return 'rgba(255,80,80,0.82)';
      });
  }

  // ── AIR QUALITY: color-coded haze — green (clean) → red (hazardous) ─────────
  if (D.layer === 'air') {
    var aqiPts  = [];
    var aqiNorm = Math.min(D.aqi / 200, 1);

    for (var aLat = -24; aLat <= 24; aLat += 4) {
      for (var aLng = -24; aLng <= 24; aLng += 4) {
        var aDist = Math.sqrt(aLat * aLat + aLng * aLng) / 24;
        if (aDist > 1) continue;
        var aW = Math.max(0, 1 - aDist * aDist);
        aqiPts.push({ lat: D.lat + aLat, lng: D.lon + aLng, w: aW });
      }
    }

    globe
      .pointsData(aqiPts)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(function(d) { return d.w * 0.012; })
      .pointRadius(function(d) { return 0.22 + d.w * 0.28; })
      .pointColor(function(d) {
        var v = aqiNorm * d.w;
        if (v < 0.25) return 'rgba(6,214,160,0.82)';
        if (v < 0.50) return 'rgba(255,209,102,0.82)';
        if (v < 0.75) return 'rgba(255,149,0,0.82)';
        return 'rgba(255,107,107,0.82)';
      });
  }

  // ── Globe ready: fade loader + notify React Native ───────────────────────────
  globe.onGlobeReady(function() {
    var loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('fade');
      setTimeout(function() { loader.style.display = 'none'; }, 1100);
    }
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })); } catch (_) {}
  });

  // ── Camera: cinematic zoom-in ─────────────────────────────────────────────────
  globe.pointOfView({ lat: D.lat, lng: D.lon, altitude: 2.5 });
  setTimeout(function() {
    var ctrl = globe.controls();
    ctrl.autoRotate      = true;
    ctrl.autoRotateSpeed = 0.42;
    ctrl.enableZoom      = false;
    ctrl.enablePan       = false;
    ctrl.enableDamping   = true;
    ctrl.dampingFactor   = 0.08;
    globe.pointOfView({ lat: D.lat, lng: D.lon, altitude: 1.9 }, 2800);
  }, 250);

})();
</script>
</body>
</html>`
}
