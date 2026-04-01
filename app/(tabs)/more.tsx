import React, { useMemo } from 'react'
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
import { useAirQuality } from '@/src/hooks/useAirQuality'
import { useEra5History } from '@/src/hooks/useEra5History'
import { useLocation } from '@/src/hooks/useLocation'
import GlassCard from '@/src/components/shared/GlassCard'
import ActivityScoreRow from '@/src/components/activities/ActivityScoreRow'
import SectionLabel from '@/src/components/shared/SectionLabel'
import HealthInsightsCard from '@/src/components/more/HealthInsightsCard'
import HistoryBriefCard from '@/src/components/more/HistoryBriefCard'
import ActivityWeekOutlook from '@/src/components/more/ActivityWeekOutlook'
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
import { buildSevenDayActivityOutlook } from '@/src/utils/activityWeekOutlook'
import { buildHistoryBrief } from '@/src/utils/historyBrief'
import {
  airQualityHourIndex,
  buildHealthInsights,
  maxPollenLevelAtHour,
} from '@/src/utils/healthInsights'
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

const ALERT_ROWS = [
  { key: 'rain' as const, label: 'Rain Alert', icon: 'rainy-outline' as const, thresholdKey: 'rain' as const },
  { key: 'uv' as const, label: 'UV Alert', icon: 'sunny-outline' as const, thresholdKey: 'uv' as const },
  { key: 'wind' as const, label: 'Wind Alert', icon: 'speedometer-outline' as const, thresholdKey: 'wind' as const },
  { key: 'pollen' as const, label: 'Pollen Alert', icon: 'flower-outline' as const, thresholdKey: 'pollen' as const },
  { key: 'severe' as const, label: 'Severe Weather', icon: 'thunderstorm-outline' as const, thresholdKey: 'severe' as const },
]

export default function MoreScreen() {
  useLocation()
  const { lat, lon } = useLocationStore()
  const { data: weather, isLoading: weatherLoading } = useWeather(lat, lon)
  const { data: airQuality } = useAirQuality(lat, lon)
  const {
    data: era5,
    isLoading: eraLoading,
    error: era5Error,
  } = useEra5History(lat, lon)

  const unit = usePrefsStore((s) => s.unit)
  const setUnit = usePrefsStore((s) => s.setUnit)
  const rainThreshold = usePrefsStore((s) => s.rainThreshold)
  const uvThreshold = usePrefsStore((s) => s.uvThreshold)
  const windThreshold = usePrefsStore((s) => s.windThreshold)
  const alertsEnabled = usePrefsStore((s) => s.alertsEnabled)
  const toggleAlert = usePrefsStore((s) => s.toggleAlert)

  const today = format(new Date(), 'yyyy-MM-dd')

  const healthLines = useMemo(() => {
    if (!weather) return []
    const hourIdx = airQuality ? airQualityHourIndex(airQuality.hourly.time) : 0
    const pollen = airQuality ? maxPollenLevelAtHour(airQuality.hourly, hourIdx) : 'unavailable'
    return buildHealthInsights(weather.current, airQuality?.current ?? null, pollen)
  }, [weather, airQuality])

  const activityWeek = useMemo(
    () => (weather ? buildSevenDayActivityOutlook(weather.hourly, weather.daily) : []),
    [weather],
  )

  const historyBrief = useMemo(() => {
    if (!era5 || !weather) return null
    return buildHistoryBrief(era5, weather.daily, unit)
  }, [era5, weather, unit])

  const era5ErrorMessage =
    era5Error instanceof Error ? era5Error.message : era5Error != null ? 'Could not load history.' : null

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

        {/* Health correlations */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Health & comfort" />
        </View>
        {weatherLoading || !weather ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Loading conditions…</Text>
          </View>
        ) : (
          <HealthInsightsCard lines={healthLines} />
        )}

        <View style={styles.spacer} />

        {/* 7-day activity outlook */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="7-Day Activity Outlook" />
        </View>
        {weatherLoading || !weather ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Loading forecast…</Text>
          </View>
        ) : (
          <ActivityWeekOutlook days={activityWeek} />
        )}

        <View style={styles.spacer} />

        <HistoryBriefCard
          isLoading={eraLoading}
          errorMessage={era5ErrorMessage}
          brief={historyBrief}
        />

        <View style={styles.spacer} />

        {/* Today's activities */}
        <View style={styles.sectionHeader}>
          <SectionLabel text="Today's Activities" />
        </View>
        <GlassCard style={styles.activitiesCard}>
          {weatherLoading || !weather ? (
            <View style={styles.loadingRowInset}>
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
          {ALERT_ROWS.map(({ key, label, icon, thresholdKey }, i, arr) => (
            <View key={key} style={[styles.alertRow, i < arr.length - 1 && styles.alertRowBorder]}>
              <Ionicons name={icon} size={18} color={TEXT_SECONDARY} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertLabel}>{label}</Text>
                <Text style={styles.alertDesc}>
                  {thresholdKey === 'rain' && `>${rainThreshold}% probability`}
                  {thresholdKey === 'uv' && `UV index >${uvThreshold}`}
                  {thresholdKey === 'wind' && `>${windThreshold} km/h gusts`}
                  {thresholdKey === 'pollen' && 'Moderate or higher pollen in forecast'}
                  {thresholdKey === 'severe' && 'Thunderstorms & extreme events'}
                </Text>
              </View>
              <Switch
                value={alertsEnabled[key]}
                onValueChange={() => toggleAlert(key)}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </GlassCard>

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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loadingRowInset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
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
