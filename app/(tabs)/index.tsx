import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useLocation } from '@/src/hooks/useLocation'
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
import { FONT_BOLD, FONT_EXTRABOLD, FONT_MEDIUM } from '@/src/theme/typography'
import { getAmbientVisualKind, isDaytimeFromSun } from '@/src/utils/ambientWeatherKind'
import { homeScrimGradient } from '@/src/utils/homeAmbientOverlay'
import { maxPrecipitationProbabilityNextHours } from '@/src/utils/hourlyPrecipMax'

function tempNumber(value: number, unit: 'C' | 'F'): string {
  if (unit === 'F') return String(Math.round(value * (9 / 5) + 32))
  return String(Math.round(value))
}

export default function HomeScreen() {
  const { lat, lon, cityName, deviceCityName, savedLocations, recentLocationIds } =
    useLocationStore()
  const selectManualLocation = useLocationStore((s) => s.selectManualLocation)
  const useDeviceLocation = useLocationStore((s) => s.useDeviceLocation)
  const toggleFavorite = useLocationStore((s) => s.toggleFavorite)
  const { loading: locationLoading, error: locationError, permissionDenied } = useLocation()
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
  const sunrise = daily.sunrise[0] ?? ''
  const sunset = daily.sunset[0] ?? ''
  const isDay = isDaytimeFromSun(sunrise, sunset)
  const ambientKind = getAmbientVisualKind(current.weatherCode, isDay)
  const scrim = homeScrimGradient(ambientKind)
  /** Next ~12h window: ambient rain should track “soon” conditions, not tomorrow night’s forecast. */
  const hourlyPrecipMax12h = maxPrecipitationProbabilityNextHours(hourly, 12)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <WeatherAmbientBackground
        weatherCode={current.weatherCode}
        isDay={isDay}
        precipitationProbability={current.precipitationProbability}
        hourlyPrecipitationMax={hourlyPrecipMax12h}
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
          <View style={styles.header}>
            <TouchableOpacity style={styles.locationRow} onPress={() => setPickerOpen(true)}>
              <Ionicons name="location-sharp" size={20} color={ACCENT} />
              <Text style={styles.cityName}>{cityName || 'Your Location'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setUnit(unit === 'C' ? 'F' : 'C')}
              style={styles.headerPill}
              activeOpacity={0.85}
            >
              <Text style={styles.headerPillTemp}>{formatTemp(current.temperature, unit)}</Text>
              <View style={styles.headerDivider} />
              <Ionicons
                name={isDay ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={ACCENT_SOFT}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBlock}>
            <View style={styles.heroLeft}>
              <View style={styles.tempRow}>
                <Text style={styles.heroNum}>{num}</Text>
                <Text style={styles.heroDeg}>°</Text>
              </View>
              <Text style={styles.conditionHeadline}>{conditionLabel}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Feels like {formatTemp(current.apparentTemperature, unit)}
                </Text>
                <View style={styles.metaDot} />
                <View style={styles.rainRow}>
                  <Ionicons name="water-outline" size={14} color={SECONDARY} />
                  <Text style={styles.rainText}>{current.precipitationProbability}% rain</Text>
                </View>
              </View>
            </View>
          </View>

          <DailyBriefCard current={current} hourly={hourly} />

          <View style={styles.spacer} />

          <View style={styles.sectionHeader}>
            <SectionLabel text="Hourly Forecast" />
            <Text style={styles.sectionLink}>Live</Text>
          </View>
          <HourlyStrip hourly={hourly} unit={unit} />

          <View style={styles.spacer} />

          <View style={styles.sectionHeader}>
            <SectionLabel text="14-Day Forecast" />
          </View>
          <ForecastList daily={daily} unit={unit} days={14} />

          <View style={styles.spacer} />

          <View style={styles.sectionHeader}>
            <SectionLabel text="Atmospheric Conditions" />
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
    paddingBottom: 120,
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
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtitle: {
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
    color: ON_PRIMARY,
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityName: {
    ...FONT_BOLD,
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 70, 50, 0.15)',
  },
  headerPillTemp: {
    ...FONT_BOLD,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  headerDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(79, 70, 50, 0.25)',
  },
  heroBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  heroLeft: {
    gap: 6,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroNum: {
    ...FONT_EXTRABOLD,
    fontSize: 112,
    lineHeight: 118,
    color: TEXT_PRIMARY,
    letterSpacing: -4,
  },
  heroDeg: {
    ...FONT_BOLD,
    fontSize: 40,
    color: ACCENT,
    marginTop: 10,
  },
  conditionHeadline: {
    ...FONT_MEDIUM,
    fontSize: 28,
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    ...FONT_MEDIUM,
    fontSize: 15,
    color: ON_SURFACE_VARIANT,
  },
  metaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(79, 70, 50, 0.5)',
  },
  rainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rainText: {
    ...FONT_MEDIUM,
    fontSize: 15,
    color: SECONDARY,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionLink: {
    ...FONT_BOLD,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 1,
  },
  spacer: {
    height: 24,
  },
  bottomPad: {
    height: 24,
  },
})
