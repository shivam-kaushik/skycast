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
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useLocation } from '@/src/hooks/useLocation'
import DailyBriefCard from '@/src/components/home/DailyBriefCard'
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
  DANGER,
} from '@/src/theme/colors'

type IoniconName = ComponentProps<typeof Ionicons>['name']

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

  const { data: weather, isLoading: weatherLoading, error: weatherError, refetch } = useWeather(lat, lon)

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
  const { ionicon, label: conditionLabel } = getWeatherCodeInfo(current.weatherCode)

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationRow} onPress={() => setPickerOpen(true)}>
            <Ionicons name="location-sharp" size={16} color={ACCENT} />
            <Text style={styles.cityName}>{cityName || 'Your Location'}</Text>
            <Ionicons name="chevron-down" size={14} color={TEXT_TERTIARY} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setUnit(unit === 'C' ? 'F' : 'C')}
            style={styles.unitToggle}
          >
            <Text style={styles.unitText}>°{unit === 'C' ? 'F' : 'C'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero — big temperature */}
        <View style={styles.hero}>
          <Text style={styles.temperature}>{formatTemp(current.temperature, unit)}</Text>
          <View style={styles.conditionRow}>
            <Ionicons name={ionicon as IoniconName} size={22} color={TEXT_SECONDARY} />
            <Text style={styles.conditionLabel}>{conditionLabel}</Text>
          </View>
          <Text style={styles.feelsLike}>
            Feels like {formatTemp(current.apparentTemperature, unit)}
          </Text>
          {current.precipitationProbability > 0 && (
            <View style={styles.precipBadge}>
              <Ionicons name="rainy-outline" size={13} color={ACCENT} />
              <Text style={styles.precipBadgeText}>
                {current.precipitationProbability}% chance of rain
              </Text>
            </View>
          )}
        </View>

        {/* Daily brief */}
        <DailyBriefCard current={current} hourly={hourly} />

        <View style={styles.spacer} />

        {/* Hourly strip */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Hourly Forecast" />
        </View>
        <HourlyStrip hourly={hourly} unit={unit} />

        <View style={styles.spacer} />

        {/* 14-day forecast */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="14-Day Forecast" />
        </View>
        <ForecastList daily={daily} unit={unit} days={14} />

        <View style={styles.spacer} />

        {/* Metric tiles */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Conditions" />
        </View>
        <MetricTilesGrid current={current} />

        <View style={styles.bottomPad} />
      </ScrollView>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  unitToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  temperature: {
    fontSize: 72,
    fontWeight: '200',
    color: TEXT_PRIMARY,
    letterSpacing: -2,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionLabel: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    fontWeight: '400',
  },
  feelsLike: {
    fontSize: 14,
    color: TEXT_TERTIARY,
  },
  precipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(74,158,255,0.12)',
  },
  precipBadgeText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  spacer: {
    height: 20,
  },
  bottomPad: {
    height: 32,
  },
})
