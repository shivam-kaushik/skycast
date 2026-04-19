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

<!-- Load Three.js globals first so we can access window.THREE for the cloud mesh -->
<script src="https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.min.js"></script>
<!-- globe.gl — tiny (45kB gz), wraps Three.js OrbitControls + sphere rendering -->
<script src="https://cdn.jsdelivr.net/npm/globe.gl@2.27.1/dist/globe.gl.min.js"></script>

<script>
(function() {
  'use strict';
  var D = ${injected};

  // ── Accent colour driven by active layer / temperature ─────────────────────
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

  // ── Build globe ────────────────────────────────────────────────────────────
  var globe = Globe()(document.getElementById('globe'))
    .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor(accent)
    .atmosphereAltitude(atmosphereAlt)
    .showGraticules(false);

  // ── Pulsing ring at user location ──────────────────────────────────────────
  globe
    .ringsData([{ lat: D.lat, lng: D.lon, maxR: 5, speed: 1.5, period: 1400 }])
    .ringColor(function() { return accent; })
    .ringMaxRadius('maxR')
    .ringPropagationSpeed('speed')
    .ringRepeatPeriod('period');

  // ── Data label floating above location ────────────────────────────────────
  globe
    .labelsData([{ lat: D.lat + 4.5, lng: D.lon, text: labelValue }])
    .labelText('text')
    .labelSize(0.85)
    .labelDotRadius(0.4)
    .labelColor(function() { return accent; })
    .labelResolution(3);

  // ── Temperature heatmap (layer === temperature) ────────────────────────────
  if (D.layer === 'temperature') {
    var tempPoints = [];
    var tempC = D.temp;
    var tempNorm = Math.min(Math.max((tempC + 20) / 60, 0), 1);
    var rLat, rLon;
    for (rLat = -35; rLat <= 35; rLat += 5) {
      for (rLon = -35; rLon <= 35; rLon += 5) {
        var dist = Math.sqrt(rLat * rLat + rLon * rLon) / 35;
        var w = Math.max(0, 1 - dist * dist) * 0.8 + 0.2;
        tempPoints.push({ lat: D.lat + rLat, lng: D.lon + rLon, weight: w });
      }
    }
    globe
      .heatmapsData([tempPoints])
      .heatmapPointLat(function(d) { return d.lat; })
      .heatmapPointLng(function(d) { return d.lng; })
      .heatmapPointWeight(function(d) { return d.weight; })
      .heatmapBandwidth(0.92)
      .heatmapColorFn(function(t) {
        var combined = t * tempNorm;
        var r, g, b;
        if (combined < 0.33) {
          r = Math.round(74 + combined * 3 * 181);
          g = Math.round(158 + combined * 3 * -58);
          b = 255;
        } else if (combined < 0.66) {
          var frac = (combined - 0.33) / 0.33;
          r = 255;
          g = Math.round(100 + frac * 66);
          b = Math.round(255 - frac * 220);
        } else {
          var frac2 = (combined - 0.66) / 0.34;
          r = 255;
          g = Math.round(166 - frac2 * 59);
          b = Math.round(35 - frac2 * 35);
        }
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (t * 0.8) + ')';
      });
  }

  // ── Air quality heatmap (layer === air) ────────────────────────────────────
  if (D.layer === 'air') {
    var aqiPoints = [];
    var aqi = D.aqi;
    var aqiNorm = Math.min(aqi / 200, 1);
    var aLat, aLon;
    for (aLat = -30; aLat <= 30; aLat += 5) {
      for (aLon = -30; aLon <= 30; aLon += 5) {
        var aDist = Math.sqrt(aLat * aLat + aLon * aLon) / 30;
        var aW = Math.max(0, 1 - aDist * aDist) * 0.75 + 0.25;
        aqiPoints.push({ lat: D.lat + aLat, lng: D.lon + aLon, weight: aW });
      }
    }
    globe
      .heatmapsData([aqiPoints])
      .heatmapPointLat(function(d) { return d.lat; })
      .heatmapPointLng(function(d) { return d.lng; })
      .heatmapPointWeight(function(d) { return d.weight; })
      .heatmapBandwidth(0.88)
      .heatmapColorFn(function(t) {
        var combined = t * aqiNorm;
        var r, g, b;
        if (combined < 0.25)      { r = 6;   g = 214; b = 160; }
        else if (combined < 0.5)  { r = 255; g = 209; b = 102; }
        else if (combined < 0.75) { r = 255; g = 149; b = 0;   }
        else                      { r = 255; g = 107; b = 107; }
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (t * 0.82) + ')';
      });
  }

  // ── On globe ready: add cloud shell + notify RN ───────────────────────────
  globe.onGlobeReady(function() {
    // Fade out loader
    var loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('fade');
      setTimeout(function() { loader.style.display = 'none'; }, 1100);
    }

    // Cloud sphere — separate slowly-rotating Three.js mesh
    try {
      var scene = globe.scene();
      var RADIUS = (globe.getGlobeRadius ? globe.getGlobeRadius() : 100);
      new THREE.TextureLoader().load(
        'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png',
        function(tex) {
          var cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(RADIUS * 1.006, 64, 64),
            new THREE.MeshPhongMaterial({
              map: tex, transparent: true, opacity: 0.26, depthWrite: false
            })
          );
          scene.add(cloudMesh);
          var cloudAnimating = true;
          window.addEventListener('unload', function() { cloudAnimating = false; });
          var spinCloud = function spinCloud() {
            if (!cloudAnimating) return;
            cloudMesh.rotation.y += 0.00022;
            requestAnimationFrame(spinCloud);
          };
          spinCloud();
        }
      );
    } catch (_) {
      // Cloud shell failed — globe still renders without it
    }

    // ── Layer-specific overlays ────────────────────────────────────────────────
    try {
      var SCENE = globe.scene();
      var GLOBE_R = globe.getGlobeRadius ? globe.getGlobeRadius() : 100;

      if (D.layer === 'precipitation') {
        var rvCtrl = new AbortController();
        setTimeout(function() { rvCtrl.abort(); }, 8000);
        fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: rvCtrl.signal })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var host = data.host;
            var frames = (data.radar && data.radar.past ? data.radar.past : []).slice(-6);
            if (frames.length === 0) return;
            var texLoader = new THREE.TextureLoader();
            texLoader.crossOrigin = 'anonymous';
            var textures = [];
            var loaded = 0;
            var succeeded = 0;
            var animating = true;
            window.addEventListener('unload', function() { animating = false; });
            var geo = new THREE.SphereGeometry(GLOBE_R * 1.009, 64, 64);
            var mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
            var precipMesh = new THREE.Mesh(geo, mat);
            SCENE.add(precipMesh);
            var fi = 0;
            var nextPrecipFrame = function nextPrecipFrame() {
              if (!animating) return;
              if (textures[fi]) { mat.map = textures[fi]; mat.needsUpdate = true; }
              fi = (fi + 1) % frames.length;
              setTimeout(nextPrecipFrame, 700);
            };
            var startAnimation = function() {
              mat.opacity = 0.75;
              nextPrecipFrame();
            };
            frames.forEach(function(f, i) {
              var url = host + f.path + '/512/0/0/0/2/1_1.png';
              texLoader.load(url, function(tex) {
                tex.wrapS = THREE.ClampToEdgeWrapping;
                tex.wrapT = THREE.ClampToEdgeWrapping;
                textures[i] = tex;
                loaded++;
                succeeded++;
                if (loaded === frames.length && succeeded > 0) { startAnimation(); }
              }, undefined, function() {
                loaded++;
                if (loaded === frames.length && succeeded > 0) { startAnimation(); }
              });
            });
          })
          .catch(function() {});
      }

      if (D.layer === 'wind') {
        // Wind particle system — particles on sphere surface, moving in wind direction
        var PARTICLE_COUNT = 3500;
        var WIND_SPEED_NORM = Math.min(Math.max(D.wind / 100, 0.005), 0.04);
        var WIND_RAD = D.windDir * Math.PI / 180;

        // Surface tangent vector from wind direction (bearing = "from" direction)
        var windLat = Math.cos(WIND_RAD) * WIND_SPEED_NORM * 0.6;
        var windLon = Math.sin(WIND_RAD) * WIND_SPEED_NORM;

        var pPositions = new Float32Array(PARTICLE_COUNT * 3);
        var pPhases = new Float32Array(PARTICLE_COUNT);
        var pLats = new Float32Array(PARTICLE_COUNT);
        var pLons = new Float32Array(PARTICLE_COUNT);
        var PR = GLOBE_R * 1.013;

        var initParticle = function initParticle(i) {
          pLats[i] = (D.lat + (Math.random() - 0.5) * 80) * Math.PI / 180;
          pLons[i] = (D.lon + (Math.random() - 0.5) * 80) * Math.PI / 180;
          pPhases[i] = Math.random();
        };
        var latlonToXYZ = function latlonToXYZ(latR, lonR) {
          return {
            x: PR * Math.cos(latR) * Math.cos(lonR),
            y: PR * Math.sin(latR),
            z: PR * Math.cos(latR) * Math.sin(-lonR)
          };
        };

        for (var pi = 0; pi < PARTICLE_COUNT; pi++) initParticle(pi);

        var pgeo = new THREE.BufferGeometry();
        pgeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        var pmat = new THREE.PointsMaterial({
          size: 0.55,
          color: 0x23b9a1,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        var particles = new THREE.Points(pgeo, pmat);
        SCENE.add(particles);

        var windAnimating = true;
        window.addEventListener('unload', function() { windAnimating = false; });

        var animateWind = function animateWind() {
          if (!windAnimating) return;
          requestAnimationFrame(animateWind);
          for (var wi = 0; wi < PARTICLE_COUNT; wi++) {
            pPhases[wi] += 0.004;
            if (pPhases[wi] > 1) { pPhases[wi] = 0; initParticle(wi); }
            pLats[wi] += windLat * 0.3;
            pLons[wi] += windLon * 0.3;
            var pos = latlonToXYZ(pLats[wi], pLons[wi]);
            pPositions[wi * 3]     = pos.x;
            pPositions[wi * 3 + 1] = pos.y;
            pPositions[wi * 3 + 2] = pos.z;
          }
          pgeo.attributes.position.needsUpdate = true;
        };
        animateWind();
      }
    } catch (_) {}

    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })); } catch (_) {}
  });

  // ── Camera setup — cinematic entry pan ────────────────────────────────────
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

  // ── Error relay to React Native ────────────────────────────────────────────
  window.onerror = function(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: String(msg) })); } catch (_) {}
  };
})();
</script>
</body>
</html>`
}
