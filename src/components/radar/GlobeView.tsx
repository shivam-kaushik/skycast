import React, { useRef, useState } from 'react'
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import WebView from 'react-native-webview'
import { buildGlobeHTML } from './buildGlobeHTML'
import type { GlobeLayer, GlobeWeatherData } from './buildGlobeHTML'
import { ACCENT, BG } from '@/src/theme/colors'

interface GlobeViewProps {
  lat: number
  lon: number
  layer: GlobeLayer
  weather: GlobeWeatherData
}

export default function GlobeView({ lat, lon, layer, weather }: GlobeViewProps) {
  const [isReady, setReady] = useState(false)
  const webViewRef = useRef<WebView>(null)

  const html = buildGlobeHTML(lat, lon, layer, weather)
  // baseUrl required on Android so CDN requests resolve from the correct origin
  const baseUrl = Platform.OS === 'android' ? 'https://cdn.jsdelivr.net' : undefined

  return (
    <View style={styles.container}>
      <WebView
        key={`globe-${lat}-${lon}-${layer}`}
        ref={webViewRef}
        source={{ html, baseUrl }}
        style={styles.webview}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        startInLoadingState={false}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as { type: string; msg?: string }
            if (msg.type === 'ready') setReady(true)
          } catch (_) {}
        }}
        onLoadEnd={() => {
          // Fallback: mark ready after a timeout in case onGlobeReady doesn't fire
          setTimeout(() => setReady(true), 8000)
        }}
      />

      {/* Native loading overlay — fades once globe signals ready */}
      {!isReady && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04030a',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
