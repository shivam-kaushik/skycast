import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native'
import WebView from 'react-native-webview'
import type { WeatherData } from '@/src/hooks/useWeather'
import type { AirQualityData } from '@/src/types/weather'
import { useOmeteoMapTileMetadata } from '@/src/hooks/useOmeteoMapTileMetadata'
import { type MapLayer } from '@/src/components/radar/mapLayerConfig'
import {
  buildCloudFrameIndicesForAnimation,
  buildDisplayFrameApiIndices,
  buildRadarDisplayFrameIndexes,
  indexOfFrameNearestToNow,
  sanitizeOmFrameIndices,
  singleApiIndexNearestInTimeline,
} from '@/src/utils/radarFrameIndexes'

/** No timeline UI — one map frame nearest to now (see radar screen). */
const STATIC_MAP_LAYERS: MapLayer[] = ['temperature', 'air']
export type { MapLayer } from '@/src/components/radar/mapLayerConfig'

export interface WeatherMapHandle {
  play: () => void
  pause: () => void
  /** Jump map animation to frame index (0-based). */
  seekToFrame: (index: number) => void
}

interface WeatherMapViewProps {
  lat: number
  lon: number
  layer: MapLayer
  weather: WeatherData
  airQuality: AirQualityData | undefined
  onFrameUpdate: (current: number, total: number, timeISO: string | null) => void
  onTimelineReady?: (times: string[]) => void
}

interface OverlayData {
  temperature: number
  windSpeed: number
  windDirection: number
  windGusts: number
  usAqi: number
  feelsLike: number
}

export function buildMapHTML(
  lat: number,
  lon: number,
  layer: MapLayer,
  overlay: OverlayData,
  params: {
    tileSourceUrl: string
    tileValidTimesLength: number
    cloudSourceUrl: string
    cloudValidTimesLength: number
    windVectorSourceUrl?: string
    windVectorValidTimesLength?: number
    /** Open-Meteo `valid_times_*` indices (chronological order), already subsampled. */
    frameIndices: number[]
    /** Per-animation-frame indices into the cloud layer’s `valid_times` (aligned by timestamp). */
    cloudFrameIndices: number[]
    /** Start animation on the frame whose valid time is nearest to load time (usually “now”). */
    initialFrameIndex: number
    /**
     * Pre-resolved `.om` tile file URLs (one per animation frame). When provided these are passed
     * directly to `createTileLayer` instead of `tileSourceUrl + &time_step=valid_times_N`, which
     * prevents the library from embedding z/x/y coords into the time_step query param and generating
     * NaN tile coordinates.
     */
    tileOmUrls?: string[]
    /** Pre-resolved `.om` tile file URLs for the cloud overlay (one per animation frame). */
    cloudOmUrls?: string[]
    /** Pre-resolved `.om` tile file URLs for wind vector overlay (one per animation frame). */
    windOmUrls?: string[]
  },
  /** ISO time for each animation frame (same length as subsampled frames in the map) */
  frameTimeLabels: string[],
): string {
  // Inject data as JSON — all JS inside uses var/concat to avoid TypeScript template literal conflicts
  const overlayJSON = JSON.stringify(overlay)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0A0F1E; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-zoom { display: none !important; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-bar { display: none !important; }
    /*
     * Smooth crossfade between animation frames — each weather/cloud layer fades in/out
     * rather than snapping. 500ms crossfade inside a 1200ms frame interval means frames
     * are fully visible for ~700ms before the next blend begins (cinema-style dissolve).
     */
    .leaflet-layer {
      transition: opacity 500ms ease-in-out;
    }
    .pulse-ring {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: rgba(74,158,255,0.4);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 0.8; }
      50%  { transform: scale(2.2); opacity: 0;   }
      100% { transform: scale(1);   opacity: 0.8; }
    }
    .wind-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: sway 3s ease-in-out infinite;
    }
    @keyframes sway {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(5deg); }
    }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@openmeteo/mapbox-layer@0.0.16/dist/index.js"></script>
<script>
// Intercept fetch to log all non-ok .om or cloud requests
(function() {
  var _orig = window.fetch;
  window.fetch = function(url, opts) {
    var urlStr = typeof url === 'string' ? url : (url && url.url) || String(url);
    var method = (opts && opts.method) || 'GET';
    var p = _orig.apply(this, arguments);
    p.then(function(r) {
      if (!r.ok) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'nlog', status: r.status, method: method, url: urlStr })); } catch(_) {}
      }
    }).catch(function(e) {
      // AbortError = Leaflet cancelled the request (tile out of viewport / layer hidden) — not a real failure
      if (String(e).indexOf('AbortError') >= 0) return;
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'nlog', status: 0, method: method, url: urlStr, err: String(e) })); } catch(_) {}
    });
    return p;
  };
})();
(function skycastMapBoot() {
  function reportError(m) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: String(m) }));
    } catch (_) {}
  }
  var libRetries = 0;
  function waitLibs(cb) {
    var OM = window.OpenMeteoMapboxLayer;
    if (
      typeof L !== 'undefined' &&
      OM &&
      typeof OM.addLeafletProtocolSupport === 'function' &&
      OM.omProtocol
    ) {
      cb();
      return;
    }
    libRetries++;
    if (libRetries > 240) {
      reportError('Leaflet or Open-Meteo library did not load in time');
      return;
    }
    setTimeout(function () {
      waitLibs(cb);
    }, 50);
  }
  waitLibs(function () {
    try {
  var LAT = ${lat};
  var LON = ${lon};
  var LAYER = '${layer}';
  var OV = ${overlayJSON};
  var TILE_SOURCE_URL = '${params.tileSourceUrl}';
  var TILE_VALID_TIMES_COUNT = ${params.tileValidTimesLength};
  var CLOUD_SOURCE_URL = '${params.cloudSourceUrl}';
  var CLOUD_VALID_TIMES_COUNT = ${params.cloudValidTimesLength};
  var WIND_VECTOR_SOURCE_URL = ${params.windVectorSourceUrl ? `'${params.windVectorSourceUrl}'` : 'null'};
  var WIND_VECTOR_VALID_TIMES_COUNT = ${params.windVectorValidTimesLength ?? params.tileValidTimesLength};
  var MAX_FRAMES = 4;
  var OM_MAX_NATIVE_ZOOM = 12;
  var FRAME_INDICES = ${JSON.stringify(params.frameIndices)};
  var CLOUD_FRAME_INDICES = ${JSON.stringify(params.cloudFrameIndices)};
  var FRAME_TIME_LABELS = ${JSON.stringify(frameTimeLabels)};
  var INITIAL_FRAME_INDEX = ${params.initialFrameIndex};
  // Pre-resolved .om tile file URLs — avoids the time_step+tile-coord NaN bug in the OM library.
  var TILE_OM_URLS = ${JSON.stringify(params.tileOmUrls ?? [])};
  var CLOUD_OM_URLS = ${JSON.stringify(params.cloudOmUrls ?? [])};
  var WIND_OM_URLS = ${JSON.stringify(params.windOmUrls ?? [])};

  // Register om:// before map init (Open-Meteo adapter expects this order)
  var omMod = window.OpenMeteoMapboxLayer || window.OMWeatherMapLayer;
  if (!omMod || !omMod.addLeafletProtocolSupport || !omMod.omProtocol) {
    throw new Error('Open-Meteo map layer runtime missing');
  }
  var omAdapter = omMod.addLeafletProtocolSupport(L);
  omAdapter.addProtocol('om', omMod.omProtocol);

  var map = L.map('map', {
    center: [LAT, LON],
    zoom: 9,
    maxZoom: 19,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: false,
  });

  // Panes: labels sit *below* weather so Carto label tiles do not paint over precip/clouds
  map.createPane('basePane');
  map.getPane('basePane').style.zIndex = 200;
  map.createPane('labelPane');
  map.getPane('labelPane').style.zIndex = 300;
  map.createPane('cloudPane');
  map.getPane('cloudPane').style.zIndex = 415;
  map.createPane('dataPane');
  map.getPane('dataPane').style.zIndex = 410;
  map.createPane('vectorPane');
  map.getPane('vectorPane').style.zIndex = 420;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    pane: 'basePane'
  }).addTo(map);
  // Keep place names and boundaries visible regardless of weather overlay.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    opacity: 0.88,
    pane: 'labelPane',
  }).addTo(map);

  // Pulsing location dot
  var pulseIcon = L.divIcon({
    className: '',
    html: '<div style="position:relative;width:20px;height:20px;"><div class="pulse-ring" style="position:absolute;top:0;left:0;"></div><div style="position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#4A9EFF;border:2px solid #fff;"></div></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  L.marker([LAT, LON], { icon: pulseIcon }).addTo(map);

  function setupAnimatedOverlay() {
    var isPlaying = true;
    var radarFrames = [];
    var windVectorFrames = [];
    var cloudFrames = [];
    var currentFrame = 0;
    var animTimer = null;
    // Preload tracking: count tiles loaded per frame so we can defer animation start
    // until the initial frame has rendered. tilesLoaded[i] = count of tiles loaded for frame i.
    var animationStarted = false;
    // Cloud WASM overlay is disabled: the @openmeteo/mapbox-layer WASM heap is global and
    // non-reclaimable. Even 4 radar frames fill the heap; any cloud tile triggers OOM which
    // aborts the entire WASM runtime — killing radar animation too. Cloud is disabled until
    // a non-WASM (PNG tile) cloud source is available.
    var cloudActiveOpacity = 0;

    /**
     * Open-Meteo tiles often render into canvas or img nodes. In RN WebView, Leaflet setOpacity alone
     * is not always enough — also set opacity on the container and descendant img/canvas (never return
     * early after setOpacity).
     */
    function setLayerOpacity(layer, opacity) {
      if (!layer) return;
      try {
        if (typeof layer.setOpacity === 'function') layer.setOpacity(opacity);
      } catch (_) {}
      try {
        if (layer._container && layer._container.style) {
          layer._container.style.opacity = String(opacity);
        }
      } catch (_) {}
      try {
        if (layer._canvas && layer._canvas.style) {
          layer._canvas.style.opacity = String(opacity);
        }
      } catch (_) {}
      try {
        if (layer._container) {
          // img/canvas opacity must be 0 to hide (belt-and-suspenders for RN WebView canvas) or 1 to
          // show — the container already carries the visual opacity level; setting children to the same
          // value would compound (multiply) and make active layers appear at opacity².
          var childOpacity = opacity === 0 ? '0' : '1';
          var imgs = layer._container.getElementsByTagName('img');
          for (var ii = 0; ii < imgs.length; ii++) {
            imgs[ii].style.opacity = childOpacity;
          }
          var cvs = layer._container.querySelectorAll('canvas');
          for (var ci = 0; ci < cvs.length; ci++) {
            cvs[ci].style.opacity = childOpacity;
          }
        }
      } catch (_) {}
    }

    function showFrame(idx) {
      var activeOpacity =
        LAYER === 'wind' ? 0.56 : LAYER === 'temperature' ? 0.86 : LAYER === 'precipitation' ? 0.82 : 0.66;
      for (var i = 0; i < frameCount; i++) {
        if (radarFrames[i]) setLayerOpacity(radarFrames[i].layer, i === idx ? activeOpacity : 0);
        if (windVectorFrames[i]) setLayerOpacity(windVectorFrames[i].layer, i === idx ? 0.9 : 0);
      }
      // Cloud on-demand pool: show active frame's cloud, hide others.
      // loadNextCloud is defined below — var-hoisted so safe to call here.
      Object.keys(cloudPool).forEach(function(key) {
        var k = parseInt(key);
        setLayerOpacity(cloudPool[k].layer, k === idx ? cloudActiveOpacity : 0);
      });
      if (CLOUD_VALID_TIMES_COUNT > 0 && cloudActiveOpacity > 0) loadNextCloud(idx);
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'frame',
          current: idx,
          total: frameCount,
          timeISO: FRAME_TIME_LABELS[idx] || null
        }));
      } catch(e) {}
    }

    function startAnimation() {
      if (animTimer) clearInterval(animTimer);
      animTimer = setInterval(function() {
        if (!isPlaying || frameCount === 0) return;
        currentFrame = (currentFrame + 1) % frameCount;
        showFrame(currentFrame);
      }, 1200);
    }

    function buildFrameIndexes(totalCount, frameCount) {
      if (totalCount <= 0 || frameCount <= 0) return [];
      if (totalCount <= frameCount) {
        var dense = [];
        for (var i = 0; i < totalCount; i++) dense.push(i);
        return dense;
      }
      var indexes = [];
      var step = (totalCount - 1) / (frameCount - 1);
      for (var j = 0; j < frameCount; j++) {
        var idx = Math.round(j * step);
        if (indexes.length === 0 || indexes[indexes.length - 1] !== idx) {
          indexes.push(idx);
        }
      }
      return indexes;
    }

    var adapter = omAdapter;
    if (!adapter) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: 'Open-Meteo adapter not registered' }));
      } catch (_) {}
      return;
    }

    if (TILE_VALID_TIMES_COUNT <= 0) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: 'No tile frames available' }));
      } catch (_) {}
      return;
    }

    if (!FRAME_INDICES || FRAME_INDICES.length === 0) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: 'No tile frames available' }));
      } catch (_) {}
      return;
    }

    var frameIndexes = FRAME_INDICES.slice();
    var frameCount = frameIndexes.length;

    var startIdx = typeof INITIAL_FRAME_INDEX === 'number' ? Math.floor(INITIAL_FRAME_INDEX) : 0;
    if (startIdx < 0 || startIdx >= frameCount) startIdx = 0;
    currentFrame = startIdx;

    // ── Serial radar queue ────────────────────────────────────────────────────
    // Load radar (and wind vector) frames one at a time to avoid concurrent WASM
    // decompression. Cloud is handled by the on-demand pool below — old cloud frames
    // are evicted from the map (releasing WASM heap) so only 2 cloud layers are ever
    // resident at once: 4 radar + 2 cloud = 6 total, safely under the OOM limit.
    var loadQueue = [];
    for (var qi = 0; qi < frameIndexes.length; qi++) {
      loadQueue.push({ kind: 'radar', idx: qi });
      if (LAYER === 'wind' && WIND_VECTOR_SOURCE_URL && WIND_VECTOR_VALID_TIMES_COUNT > 0) {
        loadQueue.push({ kind: 'wind', idx: qi });
      }
    }
    var qPos = 0;
    function nextLoad() {
      if (qPos >= loadQueue.length) return;
      var qItem = loadQueue[qPos++];
      var qRawTi = frameIndexes[qItem.idx];
      var qLayer;
      if (qItem.kind === 'radar') {
        var qTi = Math.max(0, Math.min(Math.floor(Number(qRawTi)), TILE_VALID_TIMES_COUNT - 1));
        var qUrl = (TILE_OM_URLS && TILE_OM_URLS.length > qItem.idx && TILE_OM_URLS[qItem.idx])
          ? TILE_OM_URLS[qItem.idx]
          : TILE_SOURCE_URL + '&time_step=valid_times_' + qTi;
        qLayer = adapter.createTileLayer('om://' + qUrl, {
          opacity: 0, maxNativeZoom: OM_MAX_NATIVE_ZOOM, maxZoom: 19, pane: 'dataPane',
        });
        qLayer.addTo(map);
        try { if (typeof qLayer.setZIndex === 'function') qLayer.setZIndex(410); } catch (_) {}
        radarFrames[qItem.idx] = { layer: qLayer };
        (function(l, fi) {
          l.on('tileload', function() {
            if (animationStarted) {
              var aop = LAYER === 'wind' ? 0.56 : LAYER === 'temperature' ? 0.86 : LAYER === 'precipitation' ? 0.82 : 0.66;
              setLayerOpacity(l, fi === currentFrame ? aop : 0);
            }
          });
        })(qLayer, qItem.idx);
      } else if (qItem.kind === 'wind') {
        var qVTi = Math.max(0, Math.min(Math.floor(Number(qRawTi)), WIND_VECTOR_VALID_TIMES_COUNT - 1));
        var qVUrl = (WIND_OM_URLS && WIND_OM_URLS.length > qItem.idx && WIND_OM_URLS[qItem.idx])
          ? WIND_OM_URLS[qItem.idx]
          : WIND_VECTOR_SOURCE_URL + '&time_step=valid_times_' + qVTi;
        qLayer = adapter.createVectorTileLayer('om://' + qVUrl, {
          opacity: 0, maxNativeZoom: OM_MAX_NATIVE_ZOOM, maxZoom: 19, pane: 'vectorPane',
          style: function(properties, layerName) {
            var ln = String(layerName || '').toLowerCase();
            if (ln.indexOf('wind') < 0 && ln.indexOf('arrow') < 0 && ln.indexOf('vector') < 0) return null;
            var raw = properties && properties.value !== undefined ? properties.value : 0;
            var val = Number(raw); if (!isFinite(val)) val = 0;
            var alpha = val > 5 ? 0.92 : val > 4 ? 0.84 : val > 3 ? 0.76 : val > 2 ? 0.66 : 0.54;
            return { strokeStyle: 'rgba(35,185,161,' + alpha + ')', lineWidth: 2.4, lineCap: 'round', globalAlpha: 1 };
          }
        });
        qLayer.addTo(map);
        try { if (typeof qLayer.setZIndex === 'function') qLayer.setZIndex(420); } catch (_) {}
        windVectorFrames[qItem.idx] = { layer: qLayer };
        (function(l, fi) {
          l.on('tileload', function() {
            if (animationStarted) setLayerOpacity(l, fi === currentFrame ? 0.9 : 0);
          });
        })(qLayer, qItem.idx);
      }
      // Advance to next queue item after this layer's tiles are done.
      var qDone = false;
      function onQueueItemDone() {
        if (qDone) return; qDone = true;
        // Start animation as soon as the first radar frame is ready — clouds load async.
        if (!animationStarted && radarFrames[currentFrame]) {
          animationStarted = true;
          showFrame(currentFrame);
          startAnimation();
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'timeline', times: FRAME_TIME_LABELS })); } catch(e) {}
        }
        nextLoad();
      }
      qLayer.on('load', onQueueItemDone);
      setTimeout(onQueueItemDone, 8000);
    }
    nextLoad();

    // ── Cloud on-demand pool ──────────────────────────────────────────────────
    // Load cloud tile layers one at a time. When cloud[N] finishes loading, cloud[N+1]
    // starts and any frame older than N-1 is evicted from the map (map.removeLayer
    // releases its WASM heap allocation). This rolling 2-layer window (current + next)
    // keeps the total WASM budget to 4 radar + 2 cloud = 6 layers — no OOM.
    var cloudPool = {};       // frameIdx → { layer }
    var cloudLoadingIdx = -1; // which frame is currently being fetched (-1 = idle)

    function buildCloudUrl(fi) {
      var cRaw = (CLOUD_FRAME_INDICES && CLOUD_FRAME_INDICES.length > fi) ? CLOUD_FRAME_INDICES[fi] : frameIndexes[fi];
      var cTi = Math.max(0, Math.min(Math.floor(Number(cRaw)), CLOUD_VALID_TIMES_COUNT - 1));
      return (CLOUD_OM_URLS && CLOUD_OM_URLS.length > fi && CLOUD_OM_URLS[fi])
        ? CLOUD_OM_URLS[fi]
        : CLOUD_SOURCE_URL + '&time_step=valid_times_' + cTi;
    }

    function evictCloud(keepA, keepB) {
      Object.keys(cloudPool).forEach(function(key) {
        var k = parseInt(key);
        if (k !== keepA && k !== keepB) {
          try { map.removeLayer(cloudPool[k].layer); } catch(_) {}
          delete cloudPool[k];
        }
      });
    }

    function loadNextCloud(fi) {
      if (CLOUD_VALID_TIMES_COUNT === 0 || cloudActiveOpacity === 0) return;
      // Frame already in pool — just make sure it's visible if it's the active frame.
      if (cloudPool[fi]) {
        if (currentFrame === fi) setLayerOpacity(cloudPool[fi].layer, cloudActiveOpacity);
        return;
      }
      // Only one cloud layer loads at a time; the chain self-advances on 'load'.
      if (cloudLoadingIdx !== -1) return;
      cloudLoadingIdx = fi;
      var nextFi = (fi + 1) % frameCount;
      var cl = adapter.createTileLayer('om://' + buildCloudUrl(fi), {
        opacity: 0, maxNativeZoom: OM_MAX_NATIVE_ZOOM, maxZoom: 19, pane: 'cloudPane',
      });
      cl.addTo(map);
      try { if (typeof cl.setZIndex === 'function') cl.setZIndex(415); } catch(_) {}
      cloudPool[fi] = { layer: cl };
      (function(l, cfi, nfi) {
        l.on('load', function() {
          cloudLoadingIdx = -1;
          if (currentFrame === cfi) setLayerOpacity(l, cloudActiveOpacity);
          // Keep current + next in heap; evict everything else to free WASM memory.
          evictCloud(cfi, nfi);
          loadNextCloud(nfi);
        });
        l.on('tileerror', function(e) {
          cloudLoadingIdx = -1;
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cdbg', ev: 'err', fi: cfi, msg: String(e && e.error ? e.error : e) })); } catch(_) {}
        });
      })(cl, fi, nextFi);
    }

    // Fallback: if no tileload events fire within 4 s (e.g. static temp/air layers that load
    // synchronously), start animation anyway so the UI doesn't stay blank indefinitely.
    setTimeout(function() {
      if (!animationStarted) {
        animationStarted = true;
        showFrame(currentFrame);
        startAnimation();
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'timeline', times: FRAME_TIME_LABELS }));
        } catch (e) {}
      }
    }, 4000);

    function handleRnMessage(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'play') { isPlaying = true; }
        if (msg.type === 'pause') { isPlaying = false; }
        if (msg.type === 'seek' && typeof msg.index === 'number') {
          var si = Math.floor(msg.index);
          if (si >= 0 && si < frameCount) {
            currentFrame = si;
            showFrame(currentFrame);
          }
        }
      } catch(_) {}
    }
    document.addEventListener('message', handleRnMessage);
    window.addEventListener('message', handleRnMessage);
  }

  // ── ANIMATED WEATHER LAYERS ────────────────────────────────────
  if (LAYER === 'temperature' || LAYER === 'wind' || LAYER === 'air' || LAYER === 'precipitation') {
    setupAnimatedOverlay();
  }

  window.onerror = function (message, source, lineno, colno, error) {
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'error',
          msg: String(message || (error && error.message) || 'Unknown WebView error'),
        }),
      );
    } catch (_) {}
    return false;
  };

  // ── TEMPERATURE ────────────────────────────────────────────────
  if (LAYER === 'temperature') {
    var temp = OV.temperature;
    var color = temp > 38 ? '#FF3B30' : temp > 30 ? '#FF6B6B' : temp > 22 ? '#FFD166' : temp > 12 ? '#06D6A0' : temp > 2 ? '#4A9EFF' : '#A78BFA';

    var tempLabel = L.divIcon({
      className: '',
      html: '<div style="background:rgba(10,15,30,0.88);border:2px solid ' + color + ';border-radius:10px;padding:6px 14px;color:' + color + ';font-size:22px;font-weight:700;font-family:-apple-system,system-ui,sans-serif;white-space:nowrap;text-shadow:0 0 12px ' + color + ';">' + Math.round(temp) + '&#176;</div>',
      iconSize: [80, 44],
      iconAnchor: [40, 60]
    });
    L.marker([LAT, LON], { icon: tempLabel }).addTo(map);

    var feelsLabel = L.divIcon({
      className: '',
      html: '<div style="background:rgba(10,15,30,0.7);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:3px 10px;color:rgba(255,255,255,0.55);font-size:12px;font-family:-apple-system,system-ui,sans-serif;white-space:nowrap;">Feels ' + Math.round(OV.feelsLike) + '&#176;</div>',
      iconSize: [100, 28],
      iconAnchor: [50, -20]
    });
    L.marker([LAT, LON], { icon: feelsLabel }).addTo(map);
  }

  // ── WIND ───────────────────────────────────────────────────────
  if (LAYER === 'wind') {
    var spd = OV.windSpeed;
    var dir = OV.windDirection;
    var gust = OV.windGusts;
    var wcolor = spd > 55 ? '#FF6B6B' : spd > 35 ? '#FFD166' : spd > 15 ? '#4A9EFF' : '#06D6A0';

    // Flow circles
    L.circle([LAT, LON], { radius: 45000, fillColor: wcolor, fillOpacity: 0.06, color: wcolor, weight: 1, opacity: 0.2 }).addTo(map);
    L.circle([LAT, LON], { radius: 12000, fillColor: wcolor, fillOpacity: 0.12, color: wcolor, weight: 1, opacity: 0.4 }).addTo(map);

    // Wind arrow marker — CSS rotated arrow pointing in wind direction
    var arrowHTML = '<div class="wind-arrow" style="transform:rotate(' + dir + 'deg);display:flex;flex-direction:column;align-items:center;">'
      + '<div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:22px solid ' + wcolor + ';filter:drop-shadow(0 0 6px ' + wcolor + ');"></div>'
      + '<div style="width:3px;height:34px;background:' + wcolor + ';opacity:0.7;border-radius:2px;"></div>'
      + '</div>';
    var arrowIcon = L.divIcon({ className: '', html: arrowHTML, iconSize: [20, 58], iconAnchor: [10, 29] });
    L.marker([LAT, LON], { icon: arrowIcon }).addTo(map);

    // Speed label
    var speedHTML = '<div style="background:rgba(10,15,30,0.88);border:2px solid ' + wcolor + ';border-radius:10px;padding:6px 14px;text-align:center;font-family:-apple-system,system-ui,sans-serif;">'
      + '<span style="color:' + wcolor + ';font-size:20px;font-weight:700;">' + Math.round(spd) + '</span>'
      + '<span style="color:rgba(255,255,255,0.45);font-size:11px;"> km/h</span>'
      + '</div>';
    var speedIcon = L.divIcon({ className: '', html: speedHTML, iconSize: [100, 44], iconAnchor: [50, -30] });
    L.marker([LAT, LON], { icon: speedIcon }).addTo(map);

    // Gust label
    var gustHTML = '<div style="background:rgba(10,15,30,0.7);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:3px 10px;color:rgba(255,255,255,0.5);font-size:12px;font-family:-apple-system,system-ui,sans-serif;white-space:nowrap;">Gusts ' + Math.round(gust) + ' km/h</div>';
    var gustIcon = L.divIcon({ className: '', html: gustHTML, iconSize: [110, 26], iconAnchor: [55, -80] });
    L.marker([LAT, LON], { icon: gustIcon }).addTo(map);
  }

  // ── AIR QUALITY ────────────────────────────────────────────────
  if (LAYER === 'air') {
    var aqi = OV.usAqi;
    var acolor = aqi <= 50 ? '#06D6A0' : aqi <= 100 ? '#FFD166' : aqi <= 150 ? '#FF9500' : aqi <= 200 ? '#FF6B6B' : '#C0392B';
    var alabel = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Sensitive Groups' : aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy';

    L.circle([LAT, LON], { radius: 90000, fillColor: acolor, fillOpacity: 0.06, color: acolor, weight: 0 }).addTo(map);
    L.circle([LAT, LON], { radius: 30000, fillColor: acolor, fillOpacity: 0.12, color: acolor, weight: 0 }).addTo(map);
    L.circle([LAT, LON], { radius: 8000,  fillColor: acolor, fillOpacity: 0.22, color: acolor, weight: 1, opacity: 0.5 }).addTo(map);

    var aqiHTML = '<div style="background:rgba(10,15,30,0.9);border:2px solid ' + acolor + ';border-radius:14px;padding:8px 16px;text-align:center;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 0 20px ' + acolor + '40;">'
      + '<div style="color:' + acolor + ';font-size:26px;font-weight:700;text-shadow:0 0 10px ' + acolor + ';">' + aqi + '</div>'
      + '<div style="color:' + acolor + ';font-size:10px;font-weight:600;letter-spacing:0.5px;opacity:0.85;margin-top:1px;">' + alabel.toUpperCase() + '</div>'
      + '</div>';
    var aqiIcon = L.divIcon({ className: '', html: aqiHTML, iconSize: [100, 66], iconAnchor: [50, 80] });
    L.marker([LAT, LON], { icon: aqiIcon }).addTo(map);
  }
    } catch (skycastInitErr) {
      reportError(skycastInitErr && skycastInitErr.message ? skycastInitErr.message : String(skycastInitErr));
    }
  });
})();
</script>
</body>
</html>`
}

/** Precipitation uses the same Open-Meteo map tiles as other layers (see `buildMapHTML`). */

/**
 * Convert a `latest.json?variable=X` metadata URL + run/valid times into the direct `.om` tile
 * data file URL. Passing this to `createTileLayer` instead of the `latest.json?time_step=N` form
 * avoids a bug in @openmeteo/mapbox-layer ≤0.0.16 where Leaflet z/x/y tile coords get embedded
 * into the `time_step` query param value, making `Number("N/z/x/y") = NaN` and producing
 * `NaN-aN-aNTaN00.om` tile paths that always 404.
 */
function buildOmFileUrl(
  metadataUrl: string,
  referenceTimeIso: string,
  validTimeIso: string,
): string {
  const pad2 = (n: number): string => ('0' + n).slice(-2)
  const P = new Date(referenceTimeIso)
  const A = new Date(validTimeIso)
  if (!Number.isFinite(P.getTime()) || !Number.isFinite(A.getTime())) return ''
  const run = `${P.getUTCFullYear()}/${pad2(P.getUTCMonth() + 1)}/${pad2(P.getUTCDate())}/${pad2(P.getUTCHours())}00Z`
  const valid = `${A.getUTCFullYear()}-${pad2(A.getUTCMonth() + 1)}-${pad2(A.getUTCDate())}T${pad2(A.getUTCHours())}00.om`
  const qIdx = metadataUrl.indexOf('?')
  const base = qIdx >= 0 ? metadataUrl.slice(0, qIdx) : metadataUrl
  const query = qIdx >= 0 ? metadataUrl.slice(qIdx + 1) : ''
  const params = new URLSearchParams(query)
  params.delete('time_step')
  const queryStr = params.toString()
  const resolvedBase = base.replace('latest.json', `${run}/${valid}`)
  return queryStr ? `${resolvedBase}?${queryStr}` : resolvedBase
}

/**
 * Total animated tile layers budget.
 * WASM heap OOM observed at 10+ concurrent layers. Keep to 4 max total:
 * With cloud overlay: 2 precip + 2 cloud = 4 layers (safe margin below OOM threshold).
 * Without cloud overlay: up to 4 precipitation frames for the 12-hour window.
 */
const MAX_MAP_FRAMES = 4

function injectSeekScript(index: number): string {
  const payload = JSON.stringify({ type: 'seek', index })
  return `document.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`
}

const WeatherMapView = forwardRef<WeatherMapHandle, WeatherMapViewProps>((props, ref) => {
  const {
    lat,
    lon,
    layer,
    weather,
    airQuality,
    onFrameUpdate,
    onTimelineReady,
  } = props
  const webViewRef = useRef<WebView>(null)
  const [mapError, setMapError] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)

  const {
    data: tileMeta,
    isLoading: tileMetaLoading,
    isError: tileMetaError,
  } = useOmeteoMapTileMetadata(layer)

  useEffect(() => {
    setMapError(false)
    setMapLoading(true)
  }, [lat, lon, layer])

  useImperativeHandle(ref, () => ({
    play() {
      webViewRef.current?.injectJavaScript(
        'document.dispatchEvent(new MessageEvent("message", { data: \'{"type":"play"}\' })); true;'
      )
    },
    pause() {
      webViewRef.current?.injectJavaScript(
        'document.dispatchEvent(new MessageEvent("message", { data: \'{"type":"pause"}\' })); true;'
      )
    },
    seekToFrame(index: number) {
      if (!Number.isFinite(index) || index < 0) return
      webViewRef.current?.injectJavaScript(injectSeekScript(Math.floor(index)))
    },
  }))

  const overlay: OverlayData = {
    temperature: weather.current.temperature,
    windSpeed: weather.current.windSpeed,
    windDirection: weather.current.windDirection,
    windGusts: weather.current.windGusts,
    usAqi: airQuality?.current.usAqi ?? 0,
    feelsLike: weather.current.apparentTemperature,
  }

  if (tileMetaLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#4A9EFF" size="large" />
          <Text style={styles.loadingLabel}>Loading map…</Text>
        </View>
      </View>
    )
  }

  if (tileMetaError || !tileMeta) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <Text style={styles.errorLabel}>Map unavailable</Text>
          <Text style={styles.errorSub}>Check internet connection</Text>
        </View>
      </View>
    )
  }

  const nowMs = Date.now()
  const useStaticSingleFrame = STATIC_MAP_LAYERS.includes(layer)
  const displayIndexes = (() => {
    const tl = tileMeta.tileValidTimesLength
    const finalize = (raw: number[]): number[] => {
      const cleaned = sanitizeOmFrameIndices(raw, tl)
      if (cleaned.length > 0) return cleaned
      const fallback = buildRadarDisplayFrameIndexes(tl, MAX_MAP_FRAMES)
      return sanitizeOmFrameIndices(fallback, tl)
    }

    if (useStaticSingleFrame) {
      const one = singleApiIndexNearestInTimeline(tileMeta.validTimes, nowMs)
      if (one !== null) return finalize([one])
      return finalize([0])
    }
    // Use the full frame budget for radar — cloud WASM overlay is disabled (OOM risk).
    const frameCount = MAX_MAP_FRAMES
    // Show only the next 12 hours from now — not the full model run which spans days.
    return finalize(buildDisplayFrameApiIndices(tileMeta.validTimes, 12, frameCount, nowMs))
  })()
  const frameTimeLabels = displayIndexes.map((i) => tileMeta.validTimes[i] ?? '')
  const initialFrameIndex = useStaticSingleFrame ? 0 : indexOfFrameNearestToNow(frameTimeLabels, nowMs)
  const cloudFrameIndices = buildCloudFrameIndicesForAnimation(
    displayIndexes,
    frameTimeLabels,
    tileMeta.tileValidTimesLength,
    tileMeta.cloudValidTimes ?? [],
    tileMeta.cloudValidTimesLength,
    tileMeta.tileSourceUrl,
    tileMeta.cloudSourceUrl,
  )

  // Pre-resolve .om tile file URLs for each frame to work around OM library bug (≤0.0.16):
  // Leaflet embeds z/x/y coords into the time_step query param → Number("N/z/x/y") = NaN.
  const tileOmUrls = displayIndexes.map((i) =>
    buildOmFileUrl(tileMeta.tileSourceUrl, tileMeta.referenceTime, tileMeta.validTimes[i] ?? ''),
  ).filter(Boolean) as string[]

  const cloudOmUrls = cloudFrameIndices.map((i) => {
    const cloudTime = (tileMeta.cloudValidTimes ?? [])[i] ?? tileMeta.validTimes[i] ?? ''
    return buildOmFileUrl(tileMeta.cloudSourceUrl, tileMeta.cloudReferenceTime, cloudTime)
  }).filter(Boolean) as string[]

  const windOmUrls = (layer === 'wind' && tileMeta.windVectorSourceUrl)
    ? displayIndexes.map((i) =>
        buildOmFileUrl(
          tileMeta.windVectorSourceUrl!,
          tileMeta.referenceTime,
          tileMeta.validTimes[i] ?? '',
        ),
      ).filter(Boolean) as string[]
    : []

  const html = buildMapHTML(lat, lon, layer, overlay, {
    ...tileMeta,
    frameIndices: displayIndexes,
    cloudFrameIndices,
    initialFrameIndex,
    tileOmUrls: tileOmUrls.length === displayIndexes.length ? tileOmUrls : undefined,
    cloudOmUrls: cloudOmUrls.length === cloudFrameIndices.length ? cloudOmUrls : undefined,
    windOmUrls: windOmUrls.length > 0 ? windOmUrls : undefined,
  }, frameTimeLabels)

  // baseUrl must be a real HTTPS origin so Android WebView allows CDN requests
  const baseUrl = Platform.OS === 'android'
    ? 'https://cdn.jsdelivr.net'
    : undefined

  return (
    <View style={styles.container}>
      {mapLoading && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#4A9EFF" size="large" />
          <Text style={styles.loadingLabel}>Loading map…</Text>
        </View>
      )}
      {mapError && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.errorLabel}>Map unavailable</Text>
          <Text style={styles.errorSub}>Check internet connection</Text>
        </View>
      )}
      <WebView
        key={`${layer}-${lat}-${lon}`}
        ref={webViewRef}
        source={{ html, baseUrl }}
        style={styles.webview}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowFileAccess
        allowUniversalAccessFromFileURLs
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        startInLoadingState={false}
        onLoadEnd={() => {
          setMapLoading(false)
        }}
        onError={() => { setMapLoading(false); setMapError(true) }}
        onHttpError={() => { setMapLoading(false); setMapError(true) }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as {
              type: string
              current?: number
              total?: number
              timeISO?: string | null
              times?: string[]
            }
            if (msg.type === 'frame' && msg.current !== undefined && msg.total !== undefined) {
              onFrameUpdate(msg.current, msg.total, msg.timeISO ?? null)
            }
            if (msg.type === 'timeline' && Array.isArray(msg.times)) {
              onTimelineReady?.(msg.times)
            }
            if (msg.type === 'cdbg') {
              console.log('[cloud]', JSON.stringify(msg))
            }
            if (msg.type === 'nlog') {
              console.log('[net404]', JSON.stringify(msg))
            }
            if (msg.type === 'error') {
              setMapLoading(false)
              setMapError(true)
              onFrameUpdate(0, 0, null)
            }
          } catch (_) {
            // ignore
          }
        }}
      />
    </View>
  )
})

WeatherMapView.displayName = 'WeatherMapView'
export default WeatherMapView

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0F1E',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  errorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  errorSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
})
