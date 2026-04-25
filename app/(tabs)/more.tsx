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
import GlassCard from '@/src/components/shared/GlassCard'
import PersonaSwitcher from '@/src/components/home/PersonaSwitcher'
import SectionLabel from '@/src/components/shared/SectionLabel'
import HistoryBriefCard from '@/src/components/more/HistoryBriefCard'
import ActivityWeekOutlook from '@/src/components/more/ActivityWeekOutlook'
import AIFeaturesCard from '@/src/components/more/AIFeaturesCard'
import AIChatSheet from '@/src/components/more/AIChatSheet'
import WardrobeAdvisorCard from '@/src/components/more/WardrobeAdvisorCard'
import TripBriefingCard from '@/src/components/more/TripBriefingCard'
import PremiumGate from '@/src/components/shared/PremiumGate'
import PaywallModal from '@/src/components/shared/PaywallModal'
import { usePremiumStore } from '@/src/store/premiumStore'
import { usePersonaStore } from '@/src/store/personaStore'
import { useAuthStore } from '@/src/store/authStore'
import { useRouter } from 'expo-router'
import { supabase } from '@/src/api/supabase'
import { logoutUser } from '@/src/api/purchases'
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
  maxPollenLevelAtHour,
} from '@/src/utils/healthInsights'
import { usePressureAlert } from '@/src/hooks/usePressureAlert'
import HealthInsightsCard from '@/src/components/more/HealthInsightsCard'
import { describeAQI, describeUV } from '@/src/utils/weatherDescriptions'
import type { ActivityScore } from '@/src/types/weather'
import { useAICoachStore } from '@/src/store/aiCoachStore'
import {
  buildActivityWindowInsights,
  buildPhase2Insights,
  buildPhase3Insights,
  buildSmartNotifications,
  buildTomorrowHeadsUp,
} from '@/src/utils/aiInsights'
import {
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  SECONDARY,
  ON_PRIMARY,
  ON_SURFACE_VARIANT,
  SURFACE_CONTAINER,
  DANGER,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

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
  { key: 'rain' as const, label: 'Rain & Storms', icon: 'rainy-outline' as const, thresholdKey: 'rain' as const },
  { key: 'uv' as const, label: 'UV Index Peak', icon: 'sunny-outline' as const, thresholdKey: 'uv' as const },
  { key: 'wind' as const, label: 'High Wind', icon: 'speedometer-outline' as const, thresholdKey: 'wind' as const },
  { key: 'pollen' as const, label: 'Pollen', icon: 'flower-outline' as const, thresholdKey: 'pollen' as const },
  { key: 'severe' as const, label: 'Severe Weather', icon: 'thunderstorm-outline' as const, thresholdKey: 'severe' as const },
]

interface HealthTile {
  title: string
  icon: IoniconName
  headline: string
  sub: string
}

export default function MoreScreen() {
  const router = useRouter()
  const { lat, lon, cityName } = useLocationStore()
  const { data: weather, isLoading: weatherLoading } = useWeather(lat, lon)
  const { data: airQuality } = useAirQuality(lat, lon)
  const pressureAlert = usePressureAlert(weather?.hourly)
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
  const routine = useAICoachStore((s) => s.routine)
  const persona = usePersonaStore((s) => s.persona)
  const { loadQueryCount, isPremium, isDevUnlocked, toggleDevUnlock, setPremium } = usePremiumStore()
  const { user, setSession } = useAuthStore()
  const [devTapCount, setDevTapCount] = React.useState(0)
  const [signingOut, setSigningOut] = React.useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await logoutUser()
    await supabase.auth.signOut()
    setSession(null)
    await setPremium(false)
    setSigningOut(false)
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  const healthTiles = useMemo((): HealthTile[] => {
    if (!weather) return []
    const tiles: HealthTile[] = []
    if (airQuality) {
      const d = describeAQI(airQuality.current.usAqi)
      tiles.push({
        title: 'Air Quality',
        icon: 'leaf-outline',
        headline: `${d.label} (${airQuality.current.usAqi})`,
        sub: d.advice,
      })
    }
    const hourIdx = airQuality ? airQualityHourIndex(airQuality.hourly.time) : 0
    const pollen = airQuality ? maxPollenLevelAtHour(airQuality.hourly, hourIdx) : 'unavailable'
    if (pollen !== 'unavailable') {
      tiles.push({
        title: 'Pollen',
        icon: 'flower-outline',
        headline: `${pollen} pollen`,
        sub:
          pollen === 'None' || pollen === 'Low'
            ? 'Levels look manageable for most people today.'
            : 'Sensitive individuals may want to limit long outdoor blocks when counts peak.',
      })
    } else {
      tiles.push({
        title: 'Pollen',
        icon: 'flower-outline',
        headline: 'No data',
        sub: 'Pollen model coverage varies by region.',
      })
    }
    tiles.push({
      title: 'UV Exposure',
      icon: 'sunny-outline',
      headline: `UV ${Math.round(weather.current.uvIndex)}`,
      sub: describeUV(weather.current.uvIndex),
    })
    return tiles
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

  const colA = ACTIVITIES.slice(0, 5)
  const colB = ACTIVITIES.slice(5, 10)

  const aiInputs = useMemo(() => {
    if (!weather) return null
    return {
      hourly: weather.hourly,
      daily: weather.daily,
      airQuality: airQuality ?? undefined,
      alertsEnabled,
      thresholds: {
        rain: rainThreshold,
        uv: uvThreshold,
        wind: windThreshold,
      },
      routine,
      now: new Date(),
    }
  }, [weather, airQuality, alertsEnabled, rainThreshold, uvThreshold, windThreshold, routine])

  const phase1Insights = useMemo(() => {
    if (!aiInputs) return []
    const windows = buildActivityWindowInsights(aiInputs)
    const tomorrow = buildTomorrowHeadsUp(aiInputs)
    return tomorrow ? [...windows, tomorrow] : windows
  }, [aiInputs])

  const smartNotifications = useMemo(
    () => (aiInputs ? buildSmartNotifications(aiInputs) : []),
    [aiInputs],
  )
  const phase2Insights = useMemo(() => (aiInputs ? buildPhase2Insights(aiInputs) : []), [aiInputs])
  const phase3Insights = useMemo(() => (aiInputs ? buildPhase3Insights(aiInputs) : []), [aiInputs])

  const weatherCtx = useMemo(() => {
    if (!weather) return null
    return {
      current: weather.current,
      hourly: weather.hourly,
      daily: weather.daily,
      airQuality: airQuality ?? undefined,
      routine,
      persona,
      unit,
    }
  }, [weather, airQuality, routine, persona, unit])

  React.useEffect(() => {
    loadQueryCount()
  }, [loadQueryCount])

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="location-sharp" size={20} color={ACCENT} />
            <Text style={styles.cityName}>{cityName || 'Your Location'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.unitHint}>°{unit}</Text>
            <Ionicons name="moon-outline" size={22} color={TEXT_SECONDARY} />
          </View>
        </View>

        {/* ── Persona ─────────────────────────────────────────────── */}
        <GlassCard style={styles.personaCard}>
          <View style={styles.personaHeader}>
            <Ionicons name="person-circle-outline" size={20} color={ACCENT} />
            <Text style={styles.personaTitle}>Your Profile</Text>
          </View>
          <Text style={styles.personaHint}>
            Choose your focus so Skycast can tailor insights, activity scores, and AI advice to you.
          </Text>
          <PersonaSwitcher />
        </GlassCard>

        <View style={styles.sectionHead}>
          <SectionLabel text="Health & comfort" accent />
          <Text style={styles.liveTag}>Live insights</Text>
        </View>
        {weatherLoading || !weather ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Loading conditions…</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.healthScroll}
          >
            {healthTiles.map((t) => (
              <GlassCard key={t.title} style={styles.healthCard}>
                <View style={styles.healthTop}>
                  <Ionicons name={t.icon} size={22} color={ACCENT} />
                  <Text style={styles.healthKicker}>{t.title}</Text>
                </View>
                <Text style={styles.healthHeadline}>{t.headline}</Text>
                <Text style={styles.healthSub}>{t.sub}</Text>
              </GlassCard>
            ))}
          </ScrollView>
        )}

        {pressureAlert?.alert && (
          <HealthInsightsCard
            lines={[
              pressureAlert.direction === 'falling'
                ? `Pressure dropping fast (${Math.abs(Math.round(pressureAlert.delta))} hPa) — headache or migraine risk elevated.`
                : `Pressure rising sharply (${Math.round(pressureAlert.delta)} hPa) — some people may feel sinus pressure.`,
            ]}
          />
        )}

        <View style={styles.spacer} />

        <SectionLabel text="Today's Activity Scores" accent />
        {weatherLoading || !weather ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Computing activity scores…</Text>
          </View>
        ) : (
          <View style={styles.bentoRow}>
            <GlassCard style={styles.bentoCol}>
              {colA.map((activity, i) => {
                const score = activity.scorer(weather.hourly, weather.daily, today)
                const isLast = i === colA.length - 1
                return (
                  <View
                    key={activity.key}
                    style={[styles.bentoLine, !isLast && styles.bentoLineBorder]}
                  >
                    <View style={styles.bentoIconGold}>
                      <Ionicons name={activity.icon} size={15} color={ACCENT} />
                    </View>
                    <View style={styles.bentoTextWrap}>
                      <Text style={styles.bentoName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                    </View>
                    <Text style={styles.bentoScoreGold}>{score.score.toFixed(1)}</Text>
                  </View>
                )
              })}
            </GlassCard>
            <GlassCard style={styles.bentoCol}>
              {colB.map((activity, i) => {
                const score = activity.scorer(weather.hourly, weather.daily, today)
                const isLast = i === colB.length - 1
                return (
                  <View
                    key={activity.key}
                    style={[styles.bentoLine, !isLast && styles.bentoLineBorder]}
                  >
                    <View style={styles.bentoIconBlue}>
                      <Ionicons name={activity.icon} size={15} color={SECONDARY} />
                    </View>
                    <View style={styles.bentoTextWrap}>
                      <Text style={styles.bentoName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                    </View>
                    <Text style={styles.bentoScoreBlue}>{score.score.toFixed(1)}</Text>
                  </View>
                )
              })}
            </GlassCard>
          </View>
        )}

        <View style={styles.spacer} />

        <View style={styles.sectionHead}>
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

        <SectionLabel text="AI weather intelligence" accent />
        {weatherLoading || !weather ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Preparing AI insights…</Text>
          </View>
        ) : (
          <AIFeaturesCard
            phase1={phase1Insights}
            phase2={phase2Insights}
            phase3={phase3Insights}
            notifications={smartNotifications}
          />
        )}

        <View style={styles.spacer} />

        <SectionLabel text="Premium AI Features" accent />
        {weatherLoading || !weather || !weatherCtx ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <>
            <PremiumGate featureName="AI Chat Assistant">
              <AIChatSheet weatherCtx={weatherCtx} />
            </PremiumGate>
            <View style={styles.spacer} />
            <PremiumGate featureName="AI Wardrobe Advisor">
              <WardrobeAdvisorCard weatherCtx={weatherCtx} />
            </PremiumGate>
            <View style={styles.spacer} />
            <PremiumGate featureName="Trip Weather Briefing">
              <TripBriefingCard weatherCtx={weatherCtx} />
            </PremiumGate>
          </>
        )}
        <PaywallModal />

        <View style={styles.spacer} />

        {/* ── Account ─────────────────────────────────────────────── */}
        <SectionLabel text="Account" accent />
        <GlassCard style={styles.settingsCard}>
          {user ? (
            <>
              <View style={styles.accountRow}>
                <View style={styles.accountIcon}>
                  <Ionicons name="person-circle-outline" size={22} color={ACCENT} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountEmail} numberOfLines={1}>{user.email}</Text>
                  <Text style={styles.accountSub}>
                    {isPremium ? 'Premium member' : 'Free plan'}
                  </Text>
                </View>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>★ Premium</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut
                  ? <ActivityIndicator size="small" color={DANGER} />
                  : (
                    <>
                      <Ionicons name="log-out-outline" size={16} color={DANGER} />
                      <Text style={styles.signOutText}>Sign Out</Text>
                    </>
                  )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.accountHint}>
                Sign in to sync your premium status across all your devices.
              </Text>
              <View style={styles.authBtnRow}>
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Ionicons name="log-in-outline" size={16} color={ACCENT} />
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => router.push('/(auth)/signup')}
                >
                  <Text style={styles.createText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </GlassCard>

        <View style={styles.spacer} />

        <SectionLabel text="Display units" accent />
        <GlassCard style={styles.settingsCard}>
          <Text style={styles.settingsHint}>Temperature</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pillBtn, unit === 'C' && styles.pillBtnOn]}
              onPress={() => setUnit('C')}
            >
              <Text style={[styles.pillTxt, unit === 'C' && styles.pillTxtOn]}>Celsius</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pillBtn, unit === 'F' && styles.pillBtnOn]}
              onPress={() => setUnit('F')}
            >
              <Text style={[styles.pillTxt, unit === 'F' && styles.pillTxtOn]}>Fahrenheit</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <View style={styles.spacer} />

        <SectionLabel text="Alert subscriptions" accent />
        <GlassCard style={styles.settingsCard}>
          {ALERT_ROWS.map(({ key, label, icon, thresholdKey }, i, arr) => (
            <View key={key} style={[styles.alertRow, i < arr.length - 1 && styles.alertRowBorder]}>
              <Ionicons name={icon} size={20} color={SECONDARY} />
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
                trackColor={{ false: 'rgba(255,255,255,0.12)', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </GlassCard>

        <View style={styles.aboutRow}>
          <Ionicons name="information-circle-outline" size={14} color={TEXT_TERTIARY} />
          <Text style={styles.aboutText}>Powered by Open-Meteo · Free &amp; open data</Text>
        </View>

        {/* ── Version label — tap 7× to toggle dev unlock ─────────── */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            const next = devTapCount + 1
            setDevTapCount(next)
            if (next >= 7) {
              setDevTapCount(0)
              toggleDevUnlock()
            }
          }}
          style={styles.versionRow}
        >
          <Text style={styles.versionText}>
            Skycast v1.0.0
            {isDevUnlocked ? '  🔓 Dev Mode ON' : isPremium ? '  ★ Premium' : ''}
            {devTapCount > 0 && devTapCount < 7 ? `  (${7 - devTapCount} more)` : ''}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  personaCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personaTitle: {
    fontSize: 15,
    color: TEXT_PRIMARY,
    ...FONT_BOLD,
  },
  personaHint: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityName: {
    ...FONT_BOLD,
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  unitHint: {
    ...FONT_BOLD,
    fontSize: 16,
    color: ACCENT,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  liveTag: {
    ...FONT_BOLD,
    fontSize: 10,
    letterSpacing: 0.5,
    color: `${SECONDARY}80`,
  },
  healthScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  healthCard: {
    width: 280,
    padding: 20,
    marginRight: 4,
  },
  healthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  healthKicker: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 0.5,
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
  },
  healthHeadline: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  healthSub: {
    fontSize: 13,
    lineHeight: 18,
    color: ON_SURFACE_VARIANT,
  },
  bentoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  bentoCol: {
    flex: 1,
    minWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  bentoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  bentoLineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  bentoIconGold: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoIconBlue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 147, 243, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoName: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  bentoTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  bentoScoreGold: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    width: 26,
    textAlign: 'right',
  },
  bentoScoreBlue: {
    fontSize: 14,
    fontWeight: '700',
    color: SECONDARY,
    width: 26,
    textAlign: 'right',
  },
  spacer: {
    height: 20,
  },
  bottomPad: {
    height: 24,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  settingsCard: {
    marginHorizontal: 16,
    padding: 12,
  },
  settingsHint: {
    ...FONT_BOLD,
    fontSize: 11,
    color: TEXT_TERTIARY,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pillRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE_CONTAINER,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillBtnOn: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pillTxt: {
    ...FONT_BOLD,
    fontSize: 13,
    color: TEXT_TERTIARY,
  },
  pillTxtOn: {
    color: BG,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  alertRowBorder: {
    borderBottomColor: 'rgba(255,255,255,0.06)',
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
  versionRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  versionText: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,193,7,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: { flex: 1 },
  accountEmail: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '500' },
  accountSub: { fontSize: 11, color: TEXT_TERTIARY, marginTop: 2 },
  premiumBadge: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
  },
  premiumBadgeText: { fontSize: 11, color: ACCENT, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  signOutText: { fontSize: 14, color: DANGER, fontWeight: '500' },
  accountHint: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  authBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  signInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 11,
  },
  signInText: { fontSize: 14, color: ACCENT, fontWeight: '600' },
  createBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 11,
  },
  createText: { fontSize: 14, color: '#1a0d00', fontWeight: '700' },
})
