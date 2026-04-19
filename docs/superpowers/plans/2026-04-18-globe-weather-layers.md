# Globe Weather Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four interactive weather data layers to the 3D globe view in the Radar screen — animated precipitation, wind particles, temperature heatmap, and air quality overlay.

**Architecture:** Each layer enhances `buildGlobeHTML.ts` (the WebView HTML string) by adding a custom Three.js overlay sphere or particle system on top of the existing globe.gl scene. Precipitation uses RainViewer's free PNG tiles at zoom=0 (one image per globe frame, standard Web Mercator, animated). Wind uses a Three.js particle system on the sphere surface driven by `D.wind`/`D.windDir` from the existing injected data. Temperature and air quality use globe.gl's built-in `heatmapsData` API with colored radial spreads at the user's location. All layers are fully self-contained in the WebView HTML string — no extra native modules needed.

**Tech Stack:** globe.gl v2.27.1, Three.js v0.170.0, RainViewer public API (free, attribution-required), globe.gl `heatmapsData` API, Open-Meteo data already available in props

---

## Context: Existing Code

The globe WebView lives in two files:

- `src/components/radar/buildGlobeHTML.ts` — generates the HTML string sent to WebView. Already injects: `lat`, `lon`, `layer`, `temp`, `precip`, `wind`, `windDir`, `aqi`, `cond`. Layer is one of `'precipitation' | 'temperature' | 'wind' | 'air'`.
- `src/components/radar/GlobeView.tsx` — React Native component that renders the WebView and passes props in.
- `app/(tabs)/radar.tsx` — Radar screen that controls `activeLayer` and constructs `globeWeather` from fetched data.

The globe currently shows: blue marble earth, topology bump, night sky background, rotating cloud shell, pulsing ring at user location, floating data label.

**The OOM errors** seen in the system logs (`RuntimeError: Aborted(OOM). Build with -sASSERTIONS`) come from the **map WebView** (`WeatherMapView.tsx`), not the globe. They are from the `@openmeteo/mapbox-layer` WASM tile decoder which crashes when too many frames decode simultaneously. The cloud layer is already disabled (`cloudActiveOpacity = 0`). The OOM is from the radar tile WASM decoder loading 4+ frames in parallel. The fix is to reduce `MAX_MAP_FRAMES` from 8 to 4, which halves WASM heap usage. This is addressed in Task 1 before any globe changes.

---

## File Map

| File | Change |
|------|--------|
| `src/components/radar/WeatherMapView.tsx` | Fix OOM: reduce `MAX_MAP_FRAMES` from 8 → 4 |
| `src/components/radar/buildGlobeHTML.ts` | Add 4 weather layers; add RainViewer fetch; particle system; heatmap |
| `src/components/radar/GlobeView.tsx` | No change needed (all data already passed via `weather` prop) |
| `app/(tabs)/radar.tsx` | No change needed |

---

## Task 1: Fix Map WASM OOM (Precondition)

**Files:**
- Modify: `src/components/radar/WeatherMapView.tsx:690`

The WASM heap in `@openmeteo/mapbox-layer` is fixed at build time. Loading 8 concurrent radar tile decoders overflows it. Reducing to 4 frames keeps memory within safe bounds while still showing 4×1200ms = ~5 seconds of animation.

- [ ] **Step 1: Open WeatherMapView.tsx and find MAX_MAP_FRAMES**

Read `src/components/radar/WeatherMapView.tsx`. The constant is at line ~690:
```typescript
const MAX_MAP_FRAMES = 8
```

- [ ] **Step 2: Change MAX_MAP_FRAMES to 4**

In `src/components/radar/WeatherMapView.tsx`, change:
```typescript
const MAX_MAP_FRAMES = 8
```
to:
```typescript
const MAX_MAP_FRAMES = 4
```

- [ ] **Step 3: Verify TypeScript still compiles clean**

Run:
```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
git add src/components/radar/WeatherMapView.tsx
git commit -m "fix: reduce map WASM frame budget from 8 to 4 to prevent OOM"
```

---

## Task 2: Animated Precipitation Layer (RainViewer)

**Files:**
- Modify: `src/components/radar/buildGlobeHTML.ts`

When `layer === 'precipitation'`, fetch the RainViewer public API, load past radar frames as PNG tiles at zoom=0 (one 512×512 image covers the entire globe), apply them as a Three.js sphere overlay, and animate at ~600ms per frame.

RainViewer API: `https://api.rainviewer.com/public/weather-maps.json`
Response shape:
```json
{
  "generated": 1234567890,
  "host": "https://tilecache.rainviewer.com",
  "radar": {
    "past": [{ "time": 1234567890, "path": "/v2/radar/1234567890" }, ...],
    "nowcast": [...]
  }
}
```

Tile URL pattern (zoom=0 covers entire globe):
`{host}{frame.path}/512/0/0/0/2/1_1.png`

- [ ] **Step 1: Read the current buildGlobeHTML.ts**

Read `src/components/radar/buildGlobeHTML.ts` in full to understand the current structure. Note that the injected data is the `const injected = JSON.stringify({...})` block, and all JS is inside an IIFE `(function() { ... })()` using `var D = ${injected};`.

- [ ] **Step 2: Add precipitation layer function inside the globe HTML**

In `buildGlobeHTML.ts`, find the `globe.onGlobeReady(function() {` block. After the cloud shell `try { ... } catch (_) { }` block and before `try { window.ReactNativeWebView.postMessage(...) } catch (_) {}`, add the following layer-specific setup:

```javascript
    // ── Layer-specific overlays ────────────────────────────────────────────────
    try {
      var SCENE = globe.scene();
      var GLOBE_R = globe.getGlobeRadius ? globe.getGlobeRadius() : 100;

      if (D.layer === 'precipitation') {
        // Fetch RainViewer animation frames — zoom=0 tile covers entire globe (Web Mercator)
        fetch('https://api.rainviewer.com/public/weather-maps.json')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var host = data.host;
            var frames = (data.radar && data.radar.past ? data.radar.past : []).slice(-6);
            if (frames.length === 0) return;
            var loader = new THREE.TextureLoader();
            loader.crossOrigin = 'anonymous';
            var textures = [];
            var loaded = 0;
            var geo = new THREE.SphereGeometry(GLOBE_R * 1.009, 64, 64);
            var mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
            var precipMesh = new THREE.Mesh(geo, mat);
            SCENE.add(precipMesh);
            frames.forEach(function(f, i) {
              var url = host + f.path + '/512/0/0/0/2/1_1.png';
              loader.load(url, function(tex) {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                textures[i] = tex;
                loaded++;
                if (loaded === frames.length) {
                  // All loaded — start animation
                  mat.opacity = 0.75;
                  var fi = 0;
                  function nextPrecipFrame() {
                    if (textures[fi]) {
                      mat.map = textures[fi];
                      mat.needsUpdate = true;
                    }
                    fi = (fi + 1) % frames.length;
                    setTimeout(nextPrecipFrame, 700);
                  }
                  nextPrecipFrame();
                }
              }, undefined, function() { loaded++; });
            });
          })
          .catch(function() {});
      }
    } catch (_) {}
```

Place this block immediately after the cloud shell try/catch and before the `window.ReactNativeWebView.postMessage({type:'ready'})` line.

The full placement context in the file (what to find and replace):

```javascript
    // existing cloud shell code ...
    } catch (_) {
      // Cloud shell failed — globe still renders without it
    }

    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })); } catch (_) {}
```

Becomes:

```javascript
    // existing cloud shell code ...
    } catch (_) {
      // Cloud shell failed — globe still renders without it
    }

    // ── Layer-specific overlays ────────────────────────────────────────────────
    try {
      var SCENE = globe.scene();
      var GLOBE_R = globe.getGlobeRadius ? globe.getGlobeRadius() : 100;

      if (D.layer === 'precipitation') {
        fetch('https://api.rainviewer.com/public/weather-maps.json')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var host = data.host;
            var frames = (data.radar && data.radar.past ? data.radar.past : []).slice(-6);
            if (frames.length === 0) return;
            var loader = new THREE.TextureLoader();
            loader.crossOrigin = 'anonymous';
            var textures = [];
            var loaded = 0;
            var geo = new THREE.SphereGeometry(GLOBE_R * 1.009, 64, 64);
            var mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
            var precipMesh = new THREE.Mesh(geo, mat);
            SCENE.add(precipMesh);
            frames.forEach(function(f, i) {
              var url = host + f.path + '/512/0/0/0/2/1_1.png';
              loader.load(url, function(tex) {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                textures[i] = tex;
                loaded++;
                if (loaded === frames.length) {
                  mat.opacity = 0.75;
                  var fi = 0;
                  function nextPrecipFrame() {
                    if (textures[fi]) { mat.map = textures[fi]; mat.needsUpdate = true; }
                    fi = (fi + 1) % frames.length;
                    setTimeout(nextPrecipFrame, 700);
                  }
                  nextPrecipFrame();
                }
              }, undefined, function() { loaded++; });
            });
          })
          .catch(function() {});
      }
    } catch (_) {}

    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })); } catch (_) {}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/radar/buildGlobeHTML.ts
git commit -m "feat: add RainViewer animated precipitation overlay to globe"
```

---

## Task 3: Wind Particle Animation Layer

**Files:**
- Modify: `src/components/radar/buildGlobeHTML.ts`

When `layer === 'wind'`, render an animated particle system on the globe surface. Particles move in the direction of `D.windDir` at a speed proportional to `D.wind`. This gives a visually compelling regional wind flow visualization using only the user's current wind data (no extra API calls needed).

- [ ] **Step 1: Add wind particle layer inside the globe HTML**

In `buildGlobeHTML.ts`, inside the layer-specific overlays `try { }` block added in Task 2, after the `precipitation` block, add:

```javascript
      if (D.layer === 'wind') {
        // Wind particle system — particles on sphere surface, moving in wind direction
        var PARTICLE_COUNT = 3500;
        var WIND_SPEED_NORM = Math.min(Math.max(D.wind / 100, 0.005), 0.04); // 0.005–0.04 arc per frame
        var WIND_RAD = D.windDir * Math.PI / 180; // degrees → radians

        // Convert wind direction to a surface tangent vector
        // Wind direction is "FROM" bearing, so particles move TO that bearing
        var windLat = Math.sin(-WIND_RAD) * WIND_SPEED_NORM * 0.6;
        var windLon = Math.cos(-WIND_RAD) * WIND_SPEED_NORM;

        var positions = new Float32Array(PARTICLE_COUNT * 3);
        var alphas = new Float32Array(PARTICLE_COUNT);
        var phases = new Float32Array(PARTICLE_COUNT); // lifecycle 0..1
        var lats = new Float32Array(PARTICLE_COUNT);
        var lons = new Float32Array(PARTICLE_COUNT);
        var PR = GLOBE_R * 1.013;

        function initParticle(i) {
          // Random starting point on globe surface near user location (within ±45 degrees)
          lats[i] = (D.lat + (Math.random() - 0.5) * 80) * Math.PI / 180;
          lons[i] = (D.lon + (Math.random() - 0.5) * 80) * Math.PI / 180;
          phases[i] = Math.random(); // stagger lifecycle
        }
        function latlonToXYZ(latR, lonR) {
          return {
            x: PR * Math.cos(latR) * Math.cos(lonR),
            y: PR * Math.sin(latR),
            z: PR * Math.cos(latR) * Math.sin(-lonR)
          };
        }

        for (var i = 0; i < PARTICLE_COUNT; i++) initParticle(i);

        var pgeo = new THREE.BufferGeometry();
        pgeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var pmat = new THREE.PointsMaterial({ size: 0.55, color: 0x23b9a1, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending });
        var particles = new THREE.Points(pgeo, pmat);
        SCENE.add(particles);

        (function animateWind() {
          requestAnimationFrame(animateWind);
          for (var pi = 0; pi < PARTICLE_COUNT; pi++) {
            phases[pi] += 0.004;
            if (phases[pi] > 1) { phases[pi] = 0; initParticle(pi); }
            lats[pi] += windLat * 0.3;
            lons[pi] += windLon * 0.3;
            var pos = latlonToXYZ(lats[pi], lons[pi]);
            positions[pi * 3]     = pos.x;
            positions[pi * 3 + 1] = pos.y;
            positions[pi * 3 + 2] = pos.z;
          }
          pgeo.attributes.position.needsUpdate = true;
        })();
      }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/radar/buildGlobeHTML.ts
git commit -m "feat: add animated wind particle system to globe layer"
```

---

## Task 4: Temperature Heatmap Layer

**Files:**
- Modify: `src/components/radar/buildGlobeHTML.ts`

When `layer === 'temperature'`, use globe.gl's `heatmapsData()` API to display a colored thermal heatmap centered on the user's location. The heatmap weight is `D.temp` (current temperature), generating a vivid radial heat bloom.

- [ ] **Step 1: Understand globe.gl heatmapsData API**

globe.gl v2.27.1 supports `heatmapsData`, `heatmapPointLat`, `heatmapPointLng`, `heatmapPointWeight`, `heatmapBandwidth`, `heatmapColorFn`. The API:
```javascript
globe
  .heatmapsData([[{ lat, lng, weight }]])  // outer array = one heatmap per entry
  .heatmapPointLat(d => d.lat)
  .heatmapPointLng(d => d.lng)
  .heatmapPointWeight(d => d.weight)
  .heatmapBandwidth(0.9)                   // spread radius
  .heatmapColorFn(t => `rgba(255,${Math.round(255*(1-t))},0,${t*0.9})`) // t=0..1
```

- [ ] **Step 2: Add temperature heatmap setup to the globe onGlobeReady block**

In `buildGlobeHTML.ts`, the `globe.onGlobeReady` callback currently sets up rings and labels. The heatmap setup needs to happen before `onGlobeReady` fires (globe API calls outside the callback). Find the section after `globe.labelResolution(3);` and before `globe.onGlobeReady(function() {`, and add the temperature layer setup:

```javascript
  // ── Temperature heatmap (configured on globe before onGlobeReady) ─────────
  if (D.layer === 'temperature') {
    // Build a radial grid of points with temperature falloff for visual bloom
    var tempPoints = [];
    var tempC = D.temp;
    // Normalize: -20°C = cool blue, 0 = neutral, 40°C = hot red
    var tempNorm = Math.min(Math.max((tempC + 20) / 60, 0), 1);
    var rLat = 0, rLon = 0;
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
        // Cold: blue (#4a9eff), warm: amber (#f5a623), hot: red (#ff6b6b)
        var r, g, b;
        var combined = t * tempNorm; // 0..1 scaled by how warm it actually is
        if (combined < 0.33) {
          // cool blue-green
          r = Math.round(74 + combined * 3 * 181);
          g = Math.round(158 + combined * 3 * -58);
          b = 255;
        } else if (combined < 0.66) {
          var frac = (combined - 0.33) / 0.33;
          r = Math.round(255);
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
```

Place this block between `globe.labelResolution(3);` and `globe.onGlobeReady(function() {`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/radar/buildGlobeHTML.ts
git commit -m "feat: add temperature heatmap bloom to globe layer"
```

---

## Task 5: Air Quality Heatmap Layer

**Files:**
- Modify: `src/components/radar/buildGlobeHTML.ts`

When `layer === 'air'`, use globe.gl `heatmapsData()` to show an AQI-colored heatmap. AQI > 200 = deep red, AQI 100–200 = orange, AQI ≤ 50 = green. Same radial bloom pattern as temperature.

- [ ] **Step 1: Add air quality heatmap setup**

In `buildGlobeHTML.ts`, immediately after the temperature heatmap block (which ends with `}` before `globe.onGlobeReady`), add:

```javascript
  // ── Air quality heatmap ────────────────────────────────────────────────────
  if (D.layer === 'air') {
    var aqiPoints = [];
    var aqi = D.aqi;
    // AQI 0=good, 50=moderate threshold, 100=unhealthy for sensitive, 150=unhealthy, 200+=very unhealthy
    var aqiNorm = Math.min(aqi / 200, 1); // 0..1
    var aLat = 0, aLon = 0;
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
        // Good: green (#06d6a0) → Moderate: amber (#ffd166) → Unhealthy: red (#ff6b6b)
        var combined = t * aqiNorm;
        var r, g, b;
        if (combined < 0.25) { r = 6; g = 214; b = 160; }         // good: teal
        else if (combined < 0.5) { r = 255; g = 209; b = 102; }   // moderate: amber
        else if (combined < 0.75) { r = 255; g = 149; b = 0; }    // unhealthy: orange
        else { r = 255; g = 107; b = 107; }                        // very unhealthy: red
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (t * 0.82) + ')';
      });
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/radar/buildGlobeHTML.ts
git commit -m "feat: add AQI heatmap bloom to globe air quality layer"
```

---

## Task 6: Memory Guard — Dispose Textures on Layer Change

**Files:**
- Modify: `src/components/radar/GlobeView.tsx`

The GlobeView already re-mounts the WebView when `layer` changes (the `key` prop includes `layer`). This destroys and recreates the WebView, which frees WebGL context + all textures. No additional Three.js dispose calls are needed. However, we should add `allowsInlineMediaPlayback` and `allowsAirPlayForMediaPlayback` on iOS to prevent GPU context sharing issues.

- [ ] **Step 1: Read GlobeView.tsx**

Read `src/components/radar/GlobeView.tsx`. Confirm the `key` prop includes `layer`:
```tsx
key={`globe-${lat}-${lon}-${layer}`}
```
This means each layer change recreates the WebView → full GPU context teardown → no texture leak.

- [ ] **Step 2: Add iOS WebGL memory props to the WebView**

In `GlobeView.tsx`, in the `<WebView ... />` component, add these props after `allowUniversalAccessFromFileURLs`:
```tsx
allowsInlineMediaPlayback
mediaPlaybackRequiresUserAction={false}
```

This prevents iOS WKWebView from suspending the WebGL context on certain device states, which can cause spurious OOM-like crashes.

Full diff in `GlobeView.tsx`:
```tsx
// BEFORE:
        allowFileAccess
        allowUniversalAccessFromFileURLs
        scrollEnabled={false}

// AFTER:
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/radar/GlobeView.tsx
git commit -m "fix: add iOS WebGL context stability props to GlobeView"
```

---

## Task 7: Layer-Aware Globe Atmosphere and Camera

**Files:**
- Modify: `src/components/radar/buildGlobeHTML.ts`

Each layer should have a distinct atmosphere color and altitude to make the globe feel tuned to the active layer — matching the accent colors used in the radar screen's layer config.

- [ ] **Step 1: Update atmosphere color for each layer**

In `buildGlobeHTML.ts`, find the `var accent = ...` block:
```javascript
  var accent =
    D.layer === 'wind'          ? '#7bbfff' :
    D.layer === 'air'           ? '#06D6A0' :
    D.layer === 'precipitation' ? '#a8d8ff' :
    tempAccent(D.temp);
```

Replace with:
```javascript
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
```

Then find `.atmosphereAltitude(0.18)` and change it to `.atmosphereAltitude(atmosphereAlt)`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/Public/Documents/Learning/Skycast/skycast
npx tsc --noEmit --skipLibCheck
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/radar/buildGlobeHTML.ts
git commit -m "feat: layer-aware atmosphere color and altitude on globe"
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|-------------|------|
| Cloud/precipitation movement on globe | Task 2 (RainViewer animated tiles) |
| Wind movement on globe | Task 3 (particle system) |
| Temperature heatmap on globe | Task 4 (heatmapsData) |
| Air quality on globe | Task 5 (heatmapsData) |
| OOM fix | Task 1 (MAX_MAP_FRAMES 8→4) |
| Memory guard on layer change | Task 6 (iOS props) |
| Visual consistency | Task 7 (atmosphere per layer) |

### No placeholders: all code is complete

### Type consistency check
- `D.wind`, `D.windDir`, `D.temp`, `D.aqi`, `D.lat`, `D.lon`, `D.layer` — all defined in the `injected` JSON in `buildGlobeHTML.ts` and used consistently
- `THREE.SphereGeometry`, `THREE.MeshBasicMaterial`, `THREE.Points`, etc. — all from `window.THREE` loaded via CDN before the script runs
- `globe.heatmapsData()` — part of globe.gl v2.27.1 public API

### Known limitations
- Precipitation: RainViewer tiles are in Web Mercator projection, which distorts near the poles. This is acceptable for a weather overview globe.
- Wind: Uses only the user's current wind data (single point), not a global wind field. Wind particles flow from the user's region outward. Global wind (earth.nullschool.net style) would require GRIB2→JSON conversion which is a server-side dependency.
- Temperature/AQ: Radial bloom only shows conditions at user's location, not global. A global temperature field would require fetching ~500 grid points (too many API calls for a mobile client).

---

## Execution Notes

**After completing all tasks, test by:**
1. Running the app with `npx expo start`
2. Opening the Radar tab → switching to Globe view (earth icon)
3. Cycling through all 4 layers (Radar, Temp, Wind, Air) and confirming:
   - Precipitation: animated blue/teal overlay appears on globe, changes every ~700ms
   - Wind: cyan particles flowing in wind direction across globe surface
   - Temperature: colored heatmap bloom centered on your city (red=hot, blue=cold)
   - Air: AQI-colored heatmap bloom (green=good, red=unhealthy)
4. Confirm no new OOM logs in terminal after switching map layers 3+ times
