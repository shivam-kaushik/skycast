import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { format } from 'date-fns'
import { parseTimelineInstant } from '@/src/utils/timelineInstant'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import { useLocationStore } from '@/src/store/locationStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useAirQuality } from '@/src/hooks/useAirQuality'
import { useLocation } from '@/src/hooks/useLocation'
import WeatherMapView from '@/src/components/radar/WeatherMapView'
import type { MapLayer, WeatherMapHandle } from '@/src/components/radar/WeatherMapView'
import GlobeView from '@/src/components/radar/GlobeView'
import RadarLegend from '@/src/components/radar/RadarLegend'
import RadarTimeScrubber from '@/src/components/radar/RadarTimeScrubber'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'
import {
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  ACCENT_SOFT,
  SECONDARY,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM } from '@/src/theme/typography'

type IoniconName = ComponentProps<typeof Ionicons>['name']

/** Space above the floating tab bar so layer + timeline are not obscured */
const TAB_BAR_CLEARANCE = 92

/** Warm dark glass floater — consistent with app GLASS_BG surface */
const RADAR_FLOAT_SURFACE = 'rgba(18, 13, 6, 0.90)'
const RADAR_FLOAT_BORDER = 'rgba(220, 165, 60, 0.18)'

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
    color: SECONDARY,
    description: 'Model precipitation (timeline loop)',
  },
  {
    key: 'temperature',
    label: 'Temp',
    icon: 'thermometer-outline',
    color: ACCENT_SOFT,
    description: 'Model temperature (nearest time)',
  },
  {
    key: 'wind',
    label: 'Wind',
    icon: 'navigate-outline',
    color: '#06D6A0',
    description: 'Model wind & gusts (timeline loop)',
  },
  {
    key: 'air',
    label: 'Air',
    icon: 'leaf-outline',
    color: '#FFD166',
    description: 'Model air quality (nearest time)',
  },
]

function formatHeroTime(iso: string | null): string {
  if (!iso) return '—'
  const d = parseTimelineInstant(iso)
  if (!d) return '—'
  return format(d, 'EEE h:mm a')
}

export default function RadarScreen() {
  useLocation()
  const insets = useSafeAreaInsets()
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
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [isLayerMenuOpen, setLayerMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'globe'>('map')
  const [frameTimes, setFrameTimes] = useState<string[]>([])
  const [currentTimeIso, setCurrentTimeIso] = useState<string | null>(null)
  /** True once the WebView signals the initial tiles have loaded and the animation has started. */
  const [tilesReady, setTilesReady] = useState(false)

  const mapRef = useRef<WeatherMapHandle>(null)

  const handleFrameUpdate = useCallback(
    (current: number, total: number, timeISO: string | null) => {
      setFrameIndex(current)
      setTotalFrames(total)
      setCurrentTimeIso(timeISO)
    },
    [],
  )

  const handleTimelineReady = useCallback((times: string[]) => {
    setFrameTimes(times)
    setTilesReady(true)
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

  const onSelectFrame = (index: number) => {
    mapRef.current?.seekToFrame(index)
    mapRef.current?.pause()
    setIsPlaying(false)
  }

  const isLoading = weatherLoading || aqLoading

  useEffect(() => {
    setFrameIndex(0)
    setTotalFrames(0)
    setFrameTimes([])
    setCurrentTimeIso(null)
    setIsPlaying(true)
    setTilesReady(false)
  }, [activeLayer, lat, lon])

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
  const bottomPad = insets.bottom + TAB_BAR_CLEARANCE
  const { label: conditionLabel } = getWeatherCodeInfo(weather.current.weatherCode)
  const globeWeather = {
    temperature: weather.current.temperature,
    precipitationProbability: weather.current.precipitationProbability,
    windSpeed: weather.current.windSpeed,
    windDirection: weather.current.windDirection,
    usAqi: airQuality?.current.usAqi ?? 0,
    conditionLabel,
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {viewMode === 'map' ? (
        <WeatherMapView
          ref={mapRef}
          lat={lat}
          lon={lon}
          layer={activeLayer}
          weather={weather}
          airQuality={airQuality}
          onFrameUpdate={handleFrameUpdate}
          onTimelineReady={handleTimelineReady}
        />
      ) : (
        <GlobeView
          lat={lat}
          lon={lon}
          layer={activeLayer as 'precipitation' | 'temperature' | 'wind' | 'air'}
          weather={globeWeather}
        />
      )}

      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topColumn} pointerEvents="box-none">
          <View style={styles.topRow} pointerEvents="auto">
            <TouchableOpacity style={styles.topPill} onPress={() => setPickerOpen(true)} activeOpacity={0.9}>
              <Ionicons name="location-sharp" size={18} color={ACCENT} />
              <Text style={styles.cityName} numberOfLines={1}>
                {cityName || 'Your Location'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={TEXT_TERTIARY} />
            </TouchableOpacity>
            {/* Map / Globe toggle */}
            <TouchableOpacity
              style={styles.viewToggle}
              onPress={() => {
                setViewMode(viewMode === 'map' ? 'globe' : 'map')
                setLayerMenuOpen(false)
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={viewMode === 'map' ? 'earth' : 'map-outline'}
                size={18}
                color={viewMode === 'globe' ? ACCENT : TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>
          {viewMode === 'map' && (
            <View style={styles.legendSlot} pointerEvents="none">
              <RadarLegend layer={activeLayer} />
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Dismiss dropdown when tapping the map */}
      {isLayerMenuOpen && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setLayerMenuOpen(false)}
        />
      )}

      <View style={[styles.bottomOverlay, { paddingBottom: bottomPad }]} pointerEvents="box-none">
        {/* ── Floating layer selector ───────────────────────────── */}
        <View style={styles.layerRow} pointerEvents="auto">
          <View style={styles.layerDropdownContainer}>
            {isLayerMenuOpen && (
              <View style={styles.layerMenu}>
                {LAYERS.map((layer) => {
                  const isActive = layer.key === activeLayer
                  return (
                    <Pressable
                      key={layer.key}
                      style={[styles.layerMenuItem, isActive && styles.layerMenuItemActive]}
                      onPress={() => {
                        setActiveLayer(layer.key)
                        setLayerMenuOpen(false)
                        setIsPlaying(true)
                        setFrameIndex(0)
                        setTotalFrames(0)
                      }}
                    >
                      <Ionicons
                        name={layer.icon}
                        size={18}
                        color={isActive ? layer.color : TEXT_SECONDARY}
                      />
                      <Text style={[styles.layerMenuLabel, isActive && { color: layer.color }]}>
                        {layer.label}
                      </Text>
                      <View style={styles.layerMenuCheck}>
                        {isActive && <Ionicons name="checkmark" size={16} color={layer.color} />}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}
            <TouchableOpacity
              style={styles.layerTrigger}
              onPress={() => setLayerMenuOpen(!isLayerMenuOpen)}
              activeOpacity={0.85}
            >
              <Ionicons name={activeConfig.icon} size={16} color={activeConfig.color} />
              <Text style={[styles.layerTriggerLabel, { color: activeConfig.color }]}>
                {activeConfig.label}
              </Text>
              <Ionicons
                name={isLayerMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={TEXT_TERTIARY}
              />
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'map' && activeLayer !== 'temperature' && activeLayer !== 'air' && (
          <View style={styles.timelineCard} pointerEvents="auto">
            <View style={styles.timelineTopRow}>
              <TouchableOpacity
                style={[styles.playButton, !tilesReady && styles.playButtonDisabled]}
                onPress={tilesReady ? togglePlayPause : undefined}
                activeOpacity={tilesReady ? 0.75 : 1}
              >
                {tilesReady ? (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={ACCENT_SOFT} />
                ) : (
                  <ActivityIndicator size="small" color={ACCENT_SOFT} />
                )}
              </TouchableOpacity>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>
                  {tilesReady ? 'Map time' : 'Syncing radar…'}
                </Text>
                <Text style={styles.timeHero} numberOfLines={1}>
                  {tilesReady ? formatHeroTime(currentTimeIso) : '—'}
                </Text>
              </View>
            </View>
            {tilesReady && totalFrames > 0 ? (
              <RadarTimeScrubber
                key={`${activeLayer}-${totalFrames}`}
                times={Array.from({ length: totalFrames }, (_, i) => frameTimes[i] ?? '')}
                selectedIndex={Math.min(frameIndex, Math.max(0, totalFrames - 1))}
                isPlaying={isPlaying}
                frameIntervalMs={1200}
                onSelectIndex={onSelectFrame}
                onInteractionStart={() => {
                  mapRef.current?.pause()
                  setIsPlaying(false)
                }}
              />
            ) : (
              <View style={styles.timelineSkeleton} />
            )}
          </View>
        )}
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
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topColumn: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: 10,
    alignSelf: 'stretch',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RADAR_FLOAT_BORDER,
    flex: 1,
  },
  viewToggle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderWidth: 1,
    borderColor: RADAR_FLOAT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: {
    ...FONT_BOLD,
    fontSize: 17,
    color: TEXT_PRIMARY,
    flex: 1,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  layerBadge: {
    maxWidth: '38%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(220, 165, 60, 0.1)',
  },
  layerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  legendSlot: {
    alignSelf: 'flex-start',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 12,
  },
  timelineCard: {
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RADAR_FLOAT_BORDER,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 193, 7, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
  timeBlock: {
    flex: 1,
    minWidth: 0,
  },
  timeLabel: {
    ...FONT_MEDIUM,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TEXT_TERTIARY,
    marginBottom: 2,
  },
  timeHero: {
    ...FONT_BOLD,
    fontSize: 16,
    color: ACCENT_SOFT,
  },
  layerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  layerDropdownContainer: {
    alignItems: 'flex-end',
  },
  layerMenu: {
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RADAR_FLOAT_BORDER,
    overflow: 'hidden',
    marginBottom: 8,
    minWidth: 180,
  },
  layerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220, 165, 60, 0.08)',
  },
  layerMenuItemActive: {
    backgroundColor: 'rgba(220, 165, 60, 0.08)',
  },
  layerMenuLabel: {
    ...FONT_BOLD,
    fontSize: 14,
    color: TEXT_SECONDARY,
    flex: 1,
  },
  layerMenuCheck: {
    width: 20,
    alignItems: 'center',
  },
  layerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RADAR_FLOAT_BORDER,
  },
  layerTriggerLabel: {
    ...FONT_BOLD,
    fontSize: 13,
  },
  playButtonDisabled: {
    opacity: 0.55,
  },
  timelineSkeleton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 4,
  },
})
