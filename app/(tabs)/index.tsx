import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { useWeather } from '@/src/hooks/useWeather'
import DailyBriefCard from '@/src/components/home/DailyBriefCard'
import WeatherAmbientBackground from '@/src/components/home/WeatherAmbientBackground'
import HourlyStrip from '@/src/components/home/HourlyStrip'
import ForecastList from '@/src/components/home/ForecastList'
import MetricTilesGrid from '@/src/components/home/MetricTilesGrid'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'
import SectionLabel from '@/src/components/shared/SectionLabel'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import { formatTemp } from '@/src/utils/formatTemp'
import {
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  ACCENT_SOFT,
  DANGER,
  ON_PRIMARY,
  ON_SURFACE_VARIANT,
  SECONDARY,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_EXTRABOLD, FONT_MEDIUM, FONT_REGULAR } from '@/src/theme/typography'
import { getAmbientVisualKind, hasRainishHourlyInNextHours, isDaytimeFromSun } from '@/src/utils/ambientWeatherKind'
import { homeScrimGradient } from '@/src/utils/homeAmbientOverlay'
import { maxPrecipitationProbabilityNextHours } from '@/src/utils/hourlyPrecipMax'

function tempNumber(value: number, unit: 'C' | 'F'): string {
  if (unit === 'F') return String(Math.round(value * (9 / 5) + 32))
  return String(Math.round(value))
}

function windDirShort(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
  return dirs[Math.round(deg / 45) % 8] ?? 'N'
}

export default function HomeScreen() {
  const { lat, lon, cityName, deviceCityName, savedLocations, recentLocationIds } =
    useLocationStore()
  const selectManualLocation = useLocationStore((s) => s.selectManualLocation)
  const useDeviceLocation = useLocationStore((s) => s.useDeviceLocation)
  const toggleFavorite = useLocationStore((s) => s.toggleFavorite)
  const locationLoading = useLocationStore((s) => s.locationLoading)
  const locationError = useLocationStore((s) => s.locationError)
  const permissionDenied = useLocationStore((s) => s.locationPermissionDenied)
  const unit = usePrefsStore((s) => s.unit)
  const setUnit = usePrefsStore((s) => s.setUnit)
  const [isPickerOpen, setPickerOpen] = useState(false)

  const { data: weather, isLoading: weatherLoading, error: weatherError, refetch } = useWeather(
    lat,
    lon,
  )

  const isLoading = locationLoading || weatherLoading

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="location-outline" size={48} color={TEXT_TERTIARY} />
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorSubtitle}>
          Please enable location access in Settings to use Skycast.
        </Text>
      </SafeAreaView>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>
          {locationLoading ? 'Getting your location…' : 'Loading weather…'}
        </Text>
      </SafeAreaView>
    )
  }

  if (weatherError || locationError) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="cloud-offline-outline" size={48} color={DANGER} />
        <Text style={styles.errorTitle}>Couldn't Load Weather</Text>
        <Text style={styles.errorSubtitle}>
          {weatherError?.message ?? locationError ?? 'Please check your connection.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (!weather) return null

  const { current, hourly, daily } = weather
  const { label: conditionLabel } = getWeatherCodeInfo(current.weatherCode)
  const num = tempNumber(current.temperature, unit)
  const feelsNum = tempNumber(current.apparentTemperature, unit)
  const sunrise = daily.sunrise[0] ?? ''
  const sunset = daily.sunset[0] ?? ''
  const isDay = isDaytimeFromSun(sunrise, sunset)
  const ambientKind = getAmbientVisualKind(current.weatherCode, isDay, current.precipitationProbability)
  const scrim = homeScrimGradient(ambientKind)
  const hourlyPrecipMax12h = maxPrecipitationProbabilityNextHours(hourly, 12)
  const hourlyForecastHasRainish = hasRainishHourlyInNextHours(hourly, 12)
  const windDir = windDirShort(current.windDirection)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <WeatherAmbientBackground
        weatherCode={current.weatherCode}
        isDay={isDay}
        precipitationProbability={current.precipitationProbability}
        hourlyPrecipitationMax={hourlyPrecipMax12h}
        hourlyForecastHasRainish={hourlyForecastHasRainish}
        sunrise={sunrise}
        sunset={sunset}
      />
      <LinearGradient
        colors={scrim.colors}
        locations={scrim.locations}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Minimal header ──────────────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity
              testID="home-location-trigger"
              style={styles.locationBtn}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="location-sharp" size={14} color={ACCENT} />
              <Text style={styles.locationText} numberOfLines={1}>{cityName || 'Your Location'}</Text>
              <Ionicons name="chevron-down" size={13} color={TEXT_TERTIARY} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="home-unit-toggle"
              onPress={() => setUnit(unit === 'C' ? 'F' : 'C')}
              style={styles.unitPill}
              activeOpacity={0.8}
            >
              <Text style={styles.unitText}>°{unit}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Hero temperature block ───────────────────────────────── */}
          <View style={styles.heroBlock}>
            {/* Large temperature */}
            <View style={styles.tempRow}>
              <Text style={styles.heroNum}>{num}</Text>
              <Text style={styles.heroDeg}>°</Text>
            </View>

            {/* Unit + city */}
            <Text style={styles.heroUnitCity}>
              {unit === 'C' ? 'celsius' : 'fahrenheit'}{' '}
              <Text style={styles.heroCityDot}>·</Text>{' '}
              <Text style={styles.heroCityName}>{cityName || 'Your Location'}</Text>
            </Text>

            {/* Condition in italic */}
            <Text style={styles.conditionLabel}>It's {conditionLabel.toLowerCase()}</Text>

            {/* Compact meta rows */}
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <View style={[styles.metaDot, { backgroundColor: ACCENT }]} />
                <Text style={styles.metaLabel}>Feels like</Text>
                <Text style={styles.metaValue}>{feelsNum}°</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="navigate-outline" size={12} color={SECONDARY} />
                <Text style={styles.metaLabel}>{windDir}</Text>
                <Text style={styles.metaValue}>{Math.round(current.windSpeed)} km/h</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="sunny-outline" size={12} color={ACCENT} />
                <Text style={styles.metaLabel}>UV</Text>
                <Text style={styles.metaValue}>{Math.round(current.uvIndex)}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="water-outline" size={12} color={SECONDARY} />
                <Text style={styles.metaValue}>{current.precipitationProbability}%</Text>
              </View>
            </View>
          </View>

          {/* ── Daily brief ─────────────────────────────────────────── */}
          <DailyBriefCard current={current} hourly={hourly} />

          <View style={styles.spacer} />

          {/* ── Hourly forecast ─────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <SectionLabel text="Hourly Forecast" />
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <HourlyStrip hourly={hourly} daily={daily} unit={unit} />

          <View style={styles.spacer} />

          {/* ── 14-day forecast ─────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <SectionLabel text="14-Day Forecast" />
          </View>
          <ForecastList daily={daily} unit={unit} days={14} />

          <View style={styles.spacer} />

          {/* ── Atmospheric conditions ──────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <SectionLabel text="Conditions" />
          </View>
          <MetricTilesGrid current={current} />

          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>

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
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 130,
  },
  centered: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    ...FONT_MEDIUM,
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 8,
  },
  errorTitle: {
    ...FONT_BOLD,
    fontSize: 18,
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtitle: {
    ...FONT_REGULAR,
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: ACCENT,
  },
  retryText: {
    ...FONT_BOLD,
    color: ON_PRIMARY,
    fontSize: 14,
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 17, 9, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 60, 0.2)',
  },
  locationText: {
    ...FONT_BOLD,
    fontSize: 13,
    color: TEXT_PRIMARY,
    maxWidth: 160,
  },
  unitPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 17, 9, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 60, 0.2)',
  },
  unitText: {
    ...FONT_BOLD,
    fontSize: 13,
    color: ACCENT_SOFT,
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroBlock: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroNum: {
    ...FONT_EXTRABOLD,
    fontSize: 108,
    lineHeight: 112,
    color: TEXT_PRIMARY,
    letterSpacing: -5,
  },
  heroDeg: {
    ...FONT_BOLD,
    fontSize: 44,
    color: ACCENT,
    marginTop: 8,
    letterSpacing: 0,
  },
  heroUnitCity: {
    ...FONT_MEDIUM,
    fontSize: 15,
    color: ON_SURFACE_VARIANT,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  heroCityDot: {
    color: TEXT_TERTIARY,
  },
  heroCityName: {
    ...FONT_BOLD,
    color: ACCENT_SOFT,
  },
  conditionLabel: {
    ...FONT_REGULAR,
    fontSize: 22,
    color: TEXT_PRIMARY,
    marginTop: 8,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },

  // ── Meta grid ────────────────────────────────────────────────
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 2,
    flexWrap: 'nowrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  metaLabel: {
    ...FONT_MEDIUM,
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  metaValue: {
    ...FONT_BOLD,
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(220, 165, 60, 0.2)',
    marginHorizontal: 8,
  },

  // ── Section header ───────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.25)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  liveText: {
    ...FONT_BOLD,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  spacer: {
    height: 28,
  },
  bottomPad: {
    height: 24,
  },
})
