import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocationStore } from '@/src/store/locationStore'
import { useAirQuality } from '@/src/hooks/useAirQuality'
import { useLocation } from '@/src/hooks/useLocation'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'
import AQIGauge from '@/src/components/air/AQIGauge'
import PollenBars from '@/src/components/air/PollenBars'
import PollutantList from '@/src/components/air/PollutantList'
import SectionLabel from '@/src/components/shared/SectionLabel'
import { describeAQI } from '@/src/utils/weatherDescriptions'
import { BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT } from '@/src/theme/colors'

function getCurrentHourIdx(times: string[]): number {
  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:`
  const idx = times.findIndex((t) => t >= nowStr)
  return idx === -1 ? 0 : idx
}

export default function AirScreen() {
  useLocation()
  const { lat, lon, cityName, savedLocations, recentLocationIds } = useLocationStore()
  const selectManualLocation = useLocationStore((s) => s.selectManualLocation)
  const useDeviceLocation = useLocationStore((s) => s.useDeviceLocation)
  const toggleFavorite = useLocationStore((s) => s.toggleFavorite)
  const [isPickerOpen, setPickerOpen] = useState(false)
  const { data: airQuality, isLoading } = useAirQuality(lat, lon)

  if (isLoading || !airQuality) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={ACCENT} />
      </SafeAreaView>
    )
  }

  const { current, hourly } = airQuality
  const currentHourIdx = getCurrentHourIdx(hourly.time)
  const { label: aqiLabel, color: aqiColor } = describeAQI(current.usAqi)

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
          <Text style={styles.title}>Air Quality</Text>
          <Pressable style={styles.locationRow} onPress={() => setPickerOpen(true)}>
            <Ionicons name="location-sharp" size={13} color={ACCENT} />
            <Text style={styles.locationText}>{cityName || 'Your Location'}</Text>
            <Ionicons name="chevron-down" size={12} color={TEXT_TERTIARY} />
          </Pressable>
        </View>

        {/* AQI badge */}
        <View style={styles.aqiBadge}>
          <Text style={[styles.aqiBadgeText, { color: aqiColor }]}>
            Air quality is currently {aqiLabel.toLowerCase()}
          </Text>
        </View>

        {/* AQI Gauge */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="US Air Quality Index" />
        </View>
        <AQIGauge aqi={current.usAqi} />

        <View style={styles.spacer} />

        {/* European AQI note */}
        <View style={styles.euroRow}>
          <Text style={styles.euroLabel}>European AQI</Text>
          <Text style={styles.euroValue}>{current.europeanAqi}</Text>
        </View>

        <View style={styles.spacer} />

        {/* Pollutants */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Pollutants" />
        </View>
        <PollutantList current={current} />

        <View style={styles.spacer} />

        {/* Pollen */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Pollen" />
        </View>
        <PollenBars hourly={hourly} currentHourIdx={currentHourIdx} />

        <View style={styles.bottomPad} />
      </ScrollView>

      <LocationPickerModal
        visible={isPickerOpen}
        currentCityName={cityName}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  aqiBadge: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  aqiBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  spacer: {
    height: 20,
  },
  euroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  euroLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  euroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  bottomPad: {
    height: 32,
  },
})
