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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { format } from 'date-fns'
import { parseTimelineInstant } from '@/src/utils/timelineInstant'
import { useLocationStore } from '@/src/store/locationStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useAirQuality } from '@/src/hooks/useAirQuality'
import { useLocation } from '@/src/hooks/useLocation'
import WeatherMapView from '@/src/components/radar/WeatherMapView'
import type { MapLayer, WeatherMapHandle } from '@/src/components/radar/WeatherMapView'
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

/** Navy glass floater: readable on light map basemaps, aligned with Stitch surfaces (#1a1f2f) */
const RADAR_FLOAT_SURFACE = 'rgba(26, 31, 47, 0.93)'
const RADAR_FLOAT_BORDER = 'rgba(222, 225, 247, 0.16)'

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
    description: 'Forecast precipitation (next hours)',
  },
  {
    key: 'temperature',
    label: 'Temp',
    icon: 'thermometer-outline',
    color: ACCENT_SOFT,
    description: 'Forecast temperature (next hours)',
  },
  {
    key: 'wind',
    label: 'Wind',
    icon: 'navigate-outline',
    color: '#06D6A0',
    description: 'Forecast wind & gusts (next hours)',
  },
  {
    key: 'air',
    label: 'Air',
    icon: 'leaf-outline',
    color: '#FFD166',
    description: 'Forecast air quality (next hours)',
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
  const [range, setRange] = useState<'1h' | '12h'>('12h')
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [frameTimes, setFrameTimes] = useState<string[]>([])
  const [currentTimeIso, setCurrentTimeIso] = useState<string | null>(null)

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
  }, [activeLayer, lat, lon, range])

  /** Hours ahead of real “now” for the selected frame (+/-), not slider position. */
  const offsetHoursFromNow = (() => {
    if (!currentTimeIso) return 0
    const d = parseTimelineInstant(currentTimeIso)
    if (!d) return 0
    const dh = (d.getTime() - Date.now()) / (60 * 60 * 1000)
    if (Math.abs(dh) < 0.2) return 0
    return Math.round(dh)
  })()

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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <WeatherMapView
        ref={mapRef}
        lat={lat}
        lon={lon}
        layer={activeLayer}
        weather={weather}
        airQuality={airQuality}
        timelineRange={range}
        onFrameUpdate={handleFrameUpdate}
        onTimelineReady={handleTimelineReady}
      />

      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topColumn} pointerEvents="box-none">
          <TouchableOpacity style={styles.topPill} onPress={() => setPickerOpen(true)} activeOpacity={0.9}>
            <Ionicons name="location-sharp" size={18} color={ACCENT} />
            <Text style={styles.cityName} numberOfLines={1}>
              {cityName || 'Your Location'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={ACCENT_SOFT} />
            <View style={[styles.layerBadge, { borderColor: activeConfig.color }]}>
              <Text
                style={[styles.layerBadgeText, { color: activeConfig.color }]}
                numberOfLines={2}
              >
                {activeConfig.description}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.legendSlot} pointerEvents="none">
            <RadarLegend layer={activeLayer} />
          </View>
        </View>
      </SafeAreaView>

      <View style={[styles.bottomOverlay, { paddingBottom: bottomPad }]} pointerEvents="box-none">
        <View style={styles.layerPill} pointerEvents="auto">
          {LAYERS.map((layer) => {
            const isActive = layer.key === activeLayer
            return (
              <Pressable
                key={layer.key}
                style={[
                  styles.layerBtn,
                  isActive && styles.layerBtnActive,
                  isActive && { borderColor: layer.color },
                ]}
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
                  color={isActive ? layer.color : TEXT_SECONDARY}
                />
                <Text style={[styles.layerBtnLabel, isActive && { color: layer.color }]}>
                  {layer.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {totalFrames > 0 &&
          activeLayer !== 'temperature' &&
          activeLayer !== 'air' && (
          <View style={styles.timelineCard} pointerEvents="auto">
            <View style={styles.timelineTopRow}>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={ACCENT_SOFT} />
              </TouchableOpacity>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Map time</Text>
                <Text style={styles.timeHero} numberOfLines={1}>
                  {formatHeroTime(currentTimeIso)}
                </Text>
              </View>
              <View style={styles.rangeToggle}>
                <Pressable
                  style={[styles.rangeChip, range === '1h' && styles.rangeChipActive]}
                  onPress={() => setRange('1h')}
                >
                  <Text
                    style={[styles.rangeChipLabel, range === '1h' && styles.rangeChipLabelActive]}
                  >
                    1h
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.rangeChip, range === '12h' && styles.rangeChipActive]}
                  onPress={() => setRange('12h')}
                >
                  <Text
                    style={[styles.rangeChipLabel, range === '12h' && styles.rangeChipLabelActive]}
                  >
                    12h
                  </Text>
                </Pressable>
              </View>
              <View style={styles.offsetBadge}>
                <Text style={styles.offsetText}>
                  {offsetHoursFromNow === 0
                    ? 'Now'
                    : offsetHoursFromNow > 0
                      ? `+${offsetHoursFromNow}h`
                      : `${offsetHoursFromNow}h`}
                </Text>
              </View>
            </View>
            <RadarTimeScrubber
              key={`${activeLayer}-${totalFrames}-${range}`}
              times={Array.from({ length: totalFrames }, (_, i) => frameTimes[i] ?? '')}
              selectedIndex={Math.min(frameIndex, Math.max(0, totalFrames - 1))}
              onSelectIndex={onSelectFrame}
              onInteractionStart={() => {
                mapRef.current?.pause()
                setIsPlaying(false)
              }}
            />
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
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: RADAR_FLOAT_BORDER,
    alignSelf: 'stretch',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    borderWidth: 1.5,
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
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(222, 225, 247, 0.1)',
  },
  rangeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rangeChipActive: {
    backgroundColor: 'rgba(255, 193, 7, 0.22)',
  },
  rangeChipLabel: {
    ...FONT_MEDIUM,
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  rangeChipLabelActive: {
    color: ACCENT_SOFT,
  },
  offsetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  offsetText: {
    ...FONT_BOLD,
    fontSize: 10,
    color: ACCENT_SOFT,
    letterSpacing: 0.3,
  },
  layerPill: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 8,
    backgroundColor: RADAR_FLOAT_SURFACE,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: RADAR_FLOAT_BORDER,
    gap: 6,
  },
  layerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(222, 225, 247, 0.2)',
    borderWidth: 1.5,
  },
  layerBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  layerBtnLabel: {
    ...FONT_MEDIUM,
    fontSize: 10,
    color: TEXT_SECONDARY,
    letterSpacing: 0.3,
  },
})
