import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native'
import WebView from 'react-native-webview'
import type { WeatherData } from '@/src/hooks/useWeather'
import type { AirQualityData } from '@/src/types/weather'

export type MapLayer = 'precipitation' | 'temperature' | 'wind' | 'air'

export interface WeatherMapHandle {
  play: () => void
  pause: () => void
}

interface WeatherMapViewProps {
  lat: number
  lon: number
  layer: MapLayer
  weather: WeatherData
  airQuality: AirQualityData | undefined
  onFrameUpdate: (current: number, total: number) => void
}

interface OverlayData {
  temperature: number
  windSpeed: number
  windDirection: number
  windGusts: number
  usAqi: number
  feelsLike: number
}

function buildMapHTML(
  lat: number,
  lon: number,
  layer: MapLayer,
  overlay: OverlayData,
): string {
  // Inject data as JSON — all JS inside uses var/concat to avoid TypeScript template literal conflicts
  const overlayJSON = JSON.stringify(overlay)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0A0F1E; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-zoom { display: none !important; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-bar { display: none !important; }
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
<script>
  var LAT = ${lat};
  var LON = ${lon};
  var LAYER = '${layer}';
  var OV = ${overlayJSON};

  var map = L.map('map', {
    center: [LAT, LON],
    zoom: 9,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Pulsing location dot
  var pulseIcon = L.divIcon({
    className: '',
    html: '<div style="position:relative;width:20px;height:20px;"><div class="pulse-ring" style="position:absolute;top:0;left:0;"></div><div style="position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#4A9EFF;border:2px solid #fff;"></div></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  L.marker([LAT, LON], { icon: pulseIcon }).addTo(map);

  // ── PRECIPITATION ──────────────────────────────────────────────
  if (LAYER === 'precipitation') {
    var radarFrames = [];
    var currentFrame = 0;
    var isPlaying = true;
    var animTimer = null;

    function showFrame(idx) {
      for (var i = 0; i < radarFrames.length; i++) {
        radarFrames[i].layer.setOpacity(i === idx ? 0.72 : 0);
      }
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'frame', current: idx, total: radarFrames.length }));
      } catch(e) {}
    }

    function startAnimation() {
      if (animTimer) clearInterval(animTimer);
      animTimer = setInterval(function() {
        if (!isPlaying || radarFrames.length === 0) return;
        currentFrame = (currentFrame + 1) % radarFrames.length;
        showFrame(currentFrame);
      }, 650);
    }

    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var host = data.host;
        var past = data.radar && data.radar.past ? data.radar.past : [];
        var nowcast = data.radar && data.radar.nowcast ? data.radar.nowcast.slice(0, 2) : [];
        var allFrames = past.concat(nowcast);

        for (var i = 0; i < allFrames.length; i++) {
          var f = allFrames[i];
          var tileLayer = L.tileLayer(host + f.path + '/256/{z}/{x}/{y}/4/1_1.png', {
            opacity: 0,
            tileSize: 256,
            zIndex: 10,
            updateWhenIdle: false,
            updateWhenZooming: false
          });
          tileLayer.addTo(map);
          radarFrames.push({ time: f.time, layer: tileLayer });
        }

        if (radarFrames.length > 0) {
          showFrame(0);
          startAnimation();
        }
      })
      .catch(function(e) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: String(e) })); } catch(_) {}
      });

    document.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'play') { isPlaying = true; }
        if (msg.type === 'pause') { isPlaying = false; }
      } catch(_) {}
    });
    window.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'play') { isPlaying = true; }
        if (msg.type === 'pause') { isPlaying = false; }
      } catch(_) {}
    });
  }

  // ── TEMPERATURE ────────────────────────────────────────────────
  if (LAYER === 'temperature') {
    var temp = OV.temperature;
    var color = temp > 38 ? '#FF3B30' : temp > 30 ? '#FF6B6B' : temp > 22 ? '#FFD166' : temp > 12 ? '#06D6A0' : temp > 2 ? '#4A9EFF' : '#A78BFA';

    // Outer glow
    L.circle([LAT, LON], { radius: 60000, fillColor: color, fillOpacity: 0.07, color: color, weight: 0 }).addTo(map);
    L.circle([LAT, LON], { radius: 25000, fillColor: color, fillOpacity: 0.14, color: color, weight: 0 }).addTo(map);
    L.circle([LAT, LON], { radius: 6000,  fillColor: color, fillOpacity: 0.28, color: color, weight: 1, opacity: 0.5 }).addTo(map);

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
</script>
</body>
</html>`
}

const WeatherMapView = forwardRef<WeatherMapHandle, WeatherMapViewProps>((props, ref) => {
  const { lat, lon, layer, weather, airQuality, onFrameUpdate } = props
  const webViewRef = useRef<WebView>(null)
  const [mapError, setMapError] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)

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
  }))

  const overlay: OverlayData = {
    temperature: weather.current.temperature,
    windSpeed: weather.current.windSpeed,
    windDirection: weather.current.windDirection,
    windGusts: weather.current.windGusts,
    usAqi: airQuality?.current.usAqi ?? 0,
    feelsLike: weather.current.apparentTemperature,
  }

  const html = buildMapHTML(lat, lon, layer, overlay)

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
        onLoadEnd={() => setMapLoading(false)}
        onError={() => { setMapLoading(false); setMapError(true) }}
        onHttpError={() => { setMapLoading(false); setMapError(true) }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as {
              type: string
              current?: number
              total?: number
            }
            if (msg.type === 'frame' && msg.current !== undefined && msg.total !== undefined) {
              onFrameUpdate(msg.current, msg.total)
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
