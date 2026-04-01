import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { useLocationStore } from '@/src/store/locationStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useAirQuality } from '@/src/hooks/useAirQuality'
import { useLocation } from '@/src/hooks/useLocation'
import WeatherMapView from '@/src/components/radar/WeatherMapView'
import type { MapLayer, WeatherMapHandle } from '@/src/components/radar/WeatherMapView'
import RadarLegend from '@/src/components/radar/RadarLegend'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'
import {
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  GLASS_BG,
  GLASS_BORDER,
} from '@/src/theme/colors'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface LayerConfig {
  key: MapLayer
  label: string
  icon: IoniconName
  color: string
  description: string
}

const LAYERS: LayerConfig[] = [
  {
    key: 'precipitation',
    label: 'Radar',
    icon: 'rainy-outline',
    color: '#4A9EFF',
    description: 'Live animated radar',
  },
  {
    key: 'temperature',
    label: 'Temp',
    icon: 'thermometer-outline',
    color: '#FF6B6B',
    description: 'Current temperature',
  },
  {
    key: 'wind',
    label: 'Wind',
    icon: 'navigate-outline',
    color: '#06D6A0',
    description: 'Wind speed & direction',
  },
  {
    key: 'air',
    label: 'Air',
    icon: 'leaf-outline',
    color: '#FFD166',
    description: 'Air quality index',
  },
]

export default function RadarScreen() {
  useLocation()
  const { lat, lon, cityName, deviceCityName, savedLocations, recentLocationIds } =
    useLocationStore()
  const selectManualLocation = useLocationStore((s) => s.selectManualLocation)
  const useDeviceLocation = useLocationStore((s) => s.useDeviceLocation)
  const toggleFavorite = useLocationStore((s) => s.toggleFavorite)
  const { data: weather, isLoading: weatherLoading } = useWeather(lat, lon)
  const { data: airQuality, isLoading: aqLoading } = useAirQuality(lat, lon)

  const [activeLayer, setActiveLayer] = useState<MapLayer>('precipitation')
  const [isPlaying, setIsPlaying] = useState(true)
  const [frameIndex, setFrameIndex] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [range, setRange] = useState<'1h' | '12h'>('12h')
  const [isPickerOpen, setPickerOpen] = useState(false)

  const mapRef = useRef<WeatherMapHandle>(null)

  const handleFrameUpdate = useCallback((current: number, total: number) => {
    setFrameIndex(current)
    setTotalFrames(total)
  }, [])

  const togglePlayPause = () => {
    if (isPlaying) {
      mapRef.current?.pause()
      setIsPlaying(false)
    } else {
      mapRef.current?.play()
      setIsPlaying(true)
    }
  }

  const isLoading = weatherLoading || aqLoading

  useEffect(() => {
    setFrameIndex(0)
    setTotalFrames(0)
    setIsPlaying(true)
  }, [activeLayer, lat, lon])

  const currentOffsetHours =
    totalFrames > 1 ? Math.round((frameIndex / (totalFrames - 1)) * (range === '1h' ? 1 : 12)) : 0

  if (isLoading || !weather) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading map…</Text>
      </SafeAreaView>
    )
  }

  if (lat === null || lon === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="location-outline" size={40} color={TEXT_TERTIARY} />
        <Text style={styles.errorText}>Location unavailable</Text>
      </SafeAreaView>
    )
  }

  const activeConfig = LAYERS.find((l) => l.key === activeLayer) ?? LAYERS[0]!

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Map — full screen */}
      <WeatherMapView
        ref={mapRef}
        lat={lat}
        lon={lon}
        layer={activeLayer}
        weather={weather}
        airQuality={airQuality}
        onFrameUpdate={handleFrameUpdate}
      />

      {/* Top overlay: location + layer info */}
      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <TouchableOpacity style={styles.topPill} onPress={() => setPickerOpen(true)} activeOpacity={0.9}>
          <Ionicons name="location-sharp" size={14} color={activeConfig.color} />
          <Text style={styles.cityName}>{cityName || 'Your Location'}</Text>
          <Ionicons name="chevron-down" size={14} color={TEXT_TERTIARY} />
          <View style={[styles.layerBadge, { borderColor: activeConfig.color }]}>
            <Text style={[styles.layerBadgeText, { color: activeConfig.color }]}>
              {activeConfig.description}
            </Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.legendOverlay} pointerEvents="none">
        <RadarLegend layer={activeLayer} />
      </View>

      {/* Bottom overlay: layer selector + animation controls */}
      <View style={styles.bottomOverlay} pointerEvents="box-none">
        {/* Animation controls */}
        {totalFrames > 0 && (
          <View style={styles.animationPill} pointerEvents="auto">
            <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={ACCENT}
              />
            </TouchableOpacity>
            <View style={styles.timeline}>
              {Array.from({ length: totalFrames }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.timelineDot,
                    i === frameIndex && styles.timelineDotActive,
                    i < frameIndex && styles.timelineDotPast,
                  ]}
                />
              ))}
            </View>
            <View style={styles.timelineMeta}>
              <View style={styles.rangeToggle}>
                <Pressable
                  style={[
                    styles.rangeChip,
                    range === '1h' && styles.rangeChipActive,
                  ]}
                  onPress={() => setRange('1h')}
                >
                  <Text
                    style={[
                      styles.rangeChipLabel,
                      range === '1h' && styles.rangeChipLabelActive,
                    ]}
                  >
                    1h
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.rangeChip,
                    range === '12h' && styles.rangeChipActive,
                  ]}
                  onPress={() => setRange('12h')}
                >
                  <Text
                    style={[
                      styles.rangeChipLabel,
                      range === '12h' && styles.rangeChipLabelActive,
                    ]}
                  >
                    12h
                  </Text>
                </Pressable>
              </View>
              <View style={styles.forecastBadge}>
                <Text style={styles.forecastText}>
                  {currentOffsetHours === 0 ? 'Now' : `+${currentOffsetHours}h`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Layer selector */}
        <View style={styles.layerPill} pointerEvents="auto">
          {LAYERS.map((layer) => {
            const isActive = layer.key === activeLayer
            return (
              <Pressable
                key={layer.key}
                style={[styles.layerBtn, isActive && { borderColor: layer.color, borderWidth: 1.5 }]}
                onPress={() => {
                  setActiveLayer(layer.key)
                  setIsPlaying(true)
                  setFrameIndex(0)
                  setTotalFrames(0)
                }}
              >
                <Ionicons
                  name={layer.icon}
                  size={20}
                  color={isActive ? layer.color : TEXT_TERTIARY}
                />
                <Text style={[styles.layerBtnLabel, isActive && { color: layer.color }]}>
                  {layer.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <LocationPickerModal
        visible={isPickerOpen}
        deviceCityName={deviceCityName}
        savedLocations={savedLocations}
        recentLocationIds={recentLocationIds}
        onClose={() => setPickerOpen(false)}
        onUseDeviceLocation={useDeviceLocation}
        onToggleFavorite={toggleFavorite}
        onSelectLocation={(location) => {
          selectManualLocation(location)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  errorText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(20,26,40,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignSelf: 'stretch',
  },
  cityName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  layerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  layerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Bottom overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    gap: 10,
  },
  legendOverlay: {
    position: 'absolute',
    left: 16,
    top: 96,
  },
  // Animation bar
  animationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(20,26,40,0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 12,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(74,158,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  timelineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  timelineDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  timelineDotPast: {
    backgroundColor: 'rgba(74,158,255,0.45)',
  },
  forecastBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(74,158,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.28)',
  },
  forecastText: {
    fontSize: 10,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.14)',
    borderRadius: 999,
    padding: 2,
  },
  rangeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rangeChipActive: {
    backgroundColor: 'rgba(74,158,255,0.26)',
  },
  rangeChipLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },
  rangeChipLabelActive: {
    color: ACCENT,
  },
  // Layer selector
  layerPill: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 8,
    backgroundColor: 'rgba(20,26,40,0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 4,
  },
  layerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderColor: 'transparent',
    borderWidth: 1.5,
  },
  layerBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    letterSpacing: 0.3,
  },
})
