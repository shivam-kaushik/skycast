import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Switch,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { format } from 'date-fns'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useLocation } from '@/src/hooks/useLocation'
import GlassCard from '@/src/components/shared/GlassCard'
import ActivityScoreRow from '@/src/components/activities/ActivityScoreRow'
import SectionLabel from '@/src/components/shared/SectionLabel'
import {
  scoreRunning,
  scoreCycling,
  scoreHiking,
  scorePhotography,
  scoreOutdoorDining,
  scoreGardening,
  scoreBeach,
  scoreStargazing,
  scoreBBQ,
  scoreDogWalking,
} from '@/src/utils/activityScores'
import type { ActivityScore } from '@/src/types/weather'
import {
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  GLASS_BORDER,
} from '@/src/theme/colors'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface ActivityConfig {
  key: string
  name: string
  icon: IoniconName
  scorer: (h: Parameters<typeof scoreRunning>[0], d: Parameters<typeof scoreRunning>[1], t: string) => ActivityScore
}

const ACTIVITIES: ActivityConfig[] = [
  { key: 'running', name: 'Running', icon: 'walk-outline', scorer: scoreRunning },
  { key: 'cycling', name: 'Cycling', icon: 'bicycle-outline', scorer: scoreCycling },
  { key: 'hiking', name: 'Hiking', icon: 'trail-sign-outline', scorer: scoreHiking },
  { key: 'photography', name: 'Photography', icon: 'camera-outline', scorer: scorePhotography },
  { key: 'outdoorDining', name: 'Outdoor Dining', icon: 'restaurant-outline', scorer: scoreOutdoorDining },
  { key: 'gardening', name: 'Gardening', icon: 'flower-outline', scorer: scoreGardening },
  { key: 'beach', name: 'Beach', icon: 'umbrella-outline', scorer: scoreBeach },
  { key: 'stargazing', name: 'Stargazing', icon: 'star-outline', scorer: scoreStargazing },
  { key: 'bbq', name: 'BBQ', icon: 'flame-outline', scorer: scoreBBQ },
  { key: 'dogWalking', name: 'Dog Walking', icon: 'paw-outline', scorer: scoreDogWalking },
]

export default function MoreScreen() {
  useLocation()
  const { lat, lon } = useLocationStore()
  const { data: weather, isLoading } = useWeather(lat, lon)
  const unit = usePrefsStore((s) => s.unit)
  const setUnit = usePrefsStore((s) => s.setUnit)
  const rainThreshold = usePrefsStore((s) => s.rainThreshold)
  const uvThreshold = usePrefsStore((s) => s.uvThreshold)
  const windThreshold = usePrefsStore((s) => s.windThreshold)
  const alertsEnabled = usePrefsStore((s) => s.alertsEnabled)
  const toggleAlert = usePrefsStore((s) => s.toggleAlert)

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>More</Text>
        </View>

        {/* Activities */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Today's Activities" />
        </View>
        <GlassCard style={styles.activitiesCard}>
          {isLoading || !weather ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={styles.loadingText}>Computing activity scores…</Text>
            </View>
          ) : (
            ACTIVITIES.map((activity, i) => {
              const score = activity.scorer(weather.hourly, weather.daily, today)
              const isLast = i === ACTIVITIES.length - 1
              return (
                <View key={activity.key} style={isLast && styles.lastRow}>
                  <ActivityScoreRow
                    name={activity.name}
                    icon={activity.icon}
                    score={score}
                  />
                </View>
              )
            })
          )}
        </GlassCard>

        <View style={styles.spacer} />

        {/* Settings */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Settings" />
        </View>
        <GlassCard style={styles.settingsCard}>
          {/* Unit toggle */}
          <View style={styles.settingRow}>
            <Ionicons name="thermometer-outline" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.settingLabel}>Temperature Unit</Text>
            <View style={styles.unitButtons}>
              <TouchableOpacity
                style={[styles.unitBtn, unit === 'C' && styles.unitBtnActive]}
                onPress={() => setUnit('C')}
              >
                <Text style={[styles.unitBtnText, unit === 'C' && styles.unitBtnTextActive]}>°C</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, unit === 'F' && styles.unitBtnActive]}
                onPress={() => setUnit('F')}
              >
                <Text style={[styles.unitBtnText, unit === 'F' && styles.unitBtnTextActive]}>°F</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        <View style={styles.spacer} />

        {/* Alerts */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Alerts" />
        </View>
        <GlassCard style={styles.settingsCard}>
          {(
            [
              { key: 'rain', label: 'Rain Alert', icon: 'rainy-outline', desc: `>${rainThreshold}% probability` },
              { key: 'uv', label: 'UV Alert', icon: 'sunny-outline', desc: `UV index >${uvThreshold}` },
              { key: 'wind', label: 'Wind Alert', icon: 'speedometer-outline', desc: `>${windThreshold} km/h` },
              { key: 'severe', label: 'Severe Weather', icon: 'thunderstorm-outline', desc: 'Thunderstorms & extreme events' },
            ] as const
          ).map(({ key, label, icon, desc }, i, arr) => (
            <View key={key} style={[styles.alertRow, i < arr.length - 1 && styles.alertRowBorder]}>
              <Ionicons name={icon as IoniconName} size={18} color={TEXT_SECONDARY} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertLabel}>{label}</Text>
                <Text style={styles.alertDesc}>{desc}</Text>
              </View>
              <Switch
                value={alertsEnabled[key === 'wind' ? 'rain' : key] ?? false}
                onValueChange={() => toggleAlert(key === 'wind' ? 'rain' : key)}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </GlassCard>

        {/* About */}
        <View style={styles.aboutRow}>
          <Ionicons name="information-circle-outline" size={14} color={TEXT_TERTIARY} />
          <Text style={styles.aboutText}>
            Powered by Open-Meteo · Free &amp; open source
          </Text>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
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
  activitiesCard: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  settingsCard: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  unitBtnActive: {
    backgroundColor: ACCENT,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_TERTIARY,
  },
  unitBtnTextActive: {
    color: '#fff',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  alertRowBorder: {
    borderBottomColor: GLASS_BORDER,
    borderBottomWidth: 1,
  },
  alertInfo: {
    flex: 1,
    gap: 2,
  },
  alertLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  alertDesc: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  aboutText: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
})
