import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import GlassCard from '@/src/components/shared/GlassCard'
import type { HourlyWeather, DailyWeather, AirQualityData } from '@/src/types/weather'
import { describeAQI, describeUV, describeWind } from '@/src/utils/weatherDescriptions'
import { formatTemp } from '@/src/utils/formatTemp'
import {
  ACCENT,
  ACCENT_SOFT,
  SECONDARY,
  GOOD,
  WARNING,
  DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ON_SURFACE_VARIANT,
  GHOST_BORDER,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM, FONT_SEMIBOLD, FONT_REGULAR } from '@/src/theme/typography'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_H_PAD = 16
const CARD_GAP = 10
const CARD_W = SCREEN_W - CARD_H_PAD * 2

interface InsightCard {
  id: string
  icon: IoniconName
  iconColor: string
  label: string
  headline: string
  value: string
  valueColor: string
  sub: string
}

interface Props {
  hourly: HourlyWeather
  daily: DailyWeather
  airQuality?: AirQualityData
  unit: 'C' | 'F'
  today: string
}

function peakPrecipWindow(hourly: HourlyWeather, today: string): { pct: number; timeLabel: string } {
  let maxPct = 0
  let maxHour = -1
  hourly.time.forEach((iso, i) => {
    if (!iso.startsWith(today)) return
    const p = hourly.precipitationProbability[i] ?? 0
    if (p > maxPct) { maxPct = p; maxHour = i }
  })
  if (maxHour < 0 || maxPct < 10) return { pct: maxPct, timeLabel: 'No rain expected' }
  const match = (hourly.time[maxHour] ?? '').match(/T(\d{2}):/)
  const h = match ? parseInt(match[1] ?? '0', 10) : 0
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { pct: maxPct, timeLabel: `Peak ${h12}${suffix}` }
}

function peakUVWindow(hourly: HourlyWeather, today: string): { uv: number; timeLabel: string } {
  let maxUV = 0
  let maxHour = -1
  hourly.time.forEach((iso, i) => {
    if (!iso.startsWith(today)) return
    const u = hourly.uvIndex[i] ?? 0
    if (u > maxUV) { maxUV = u; maxHour = i }
  })
  if (maxHour < 0) return { uv: maxUV, timeLabel: '' }
  const match = (hourly.time[maxHour] ?? '').match(/T(\d{2}):/)
  const h = match ? parseInt(match[1] ?? '0', 10) : 0
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { uv: maxUV, timeLabel: `Peak ${h12}${suffix}` }
}

function peakGust(hourly: HourlyWeather, today: string): number {
  return hourly.time.reduce((max, iso, i) => {
    if (!iso.startsWith(today)) return max
    return Math.max(max, hourly.windGusts[i] ?? 0)
  }, 0)
}

function uvColor(uv: number): string {
  if (uv <= 2) return GOOD
  if (uv <= 5) return WARNING
  if (uv <= 7) return '#FFA500'
  return DANGER
}

function precipColor(pct: number): string {
  if (pct < 30) return GOOD
  if (pct < 60) return WARNING
  return SECONDARY
}

export default function DailyInsightsCarousel({ hourly, daily, airQuality, unit, today }: Props) {
  const scrollRef = useRef<ScrollView>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const todayIdx = daily.time.findIndex((d) => d === today)
  const tempMax = todayIdx >= 0 ? (daily.tempMax[todayIdx] ?? 0) : 0
  const tempMin = todayIdx >= 0 ? (daily.tempMin[todayIdx] ?? 0) : 0

  const rainData = peakPrecipWindow(hourly, today)
  const uvData = peakUVWindow(hourly, today)
  const maxGust = peakGust(hourly, today)

  const maxWindSpeed = hourly.time.reduce((max, iso, i) => {
    if (!iso.startsWith(today)) return max
    return Math.max(max, hourly.windSpeed[i] ?? 0)
  }, 0)

  const aqi = airQuality?.current.usAqi ?? null
  const aqiInfo = aqi !== null ? describeAQI(aqi) : null

  const cards: InsightCard[] = [
    {
      id: 'summary',
      icon: 'partly-sunny-outline',
      iconColor: ACCENT,
      label: "Today's Range",
      headline: `${formatTemp(tempMax, unit)} / ${formatTemp(tempMin, unit)}`,
      value: `${formatTemp(tempMax, unit)}`,
      valueColor: ACCENT_SOFT,
      sub: `High of ${formatTemp(tempMax, unit)}, low of ${formatTemp(tempMin, unit)} expected today.`,
    },
    {
      id: 'rain',
      icon: 'rainy-outline',
      iconColor: SECONDARY,
      label: 'Rain Risk',
      headline: rainData.pct < 10 ? 'Dry conditions' : `${rainData.pct}% chance`,
      value: `${rainData.pct}%`,
      valueColor: precipColor(rainData.pct),
      sub: rainData.pct < 10
        ? 'No significant rain expected today. Enjoy the dry spell.'
        : `${rainData.timeLabel} — consider carrying an umbrella.`,
    },
    {
      id: 'uv',
      icon: 'sunny-outline',
      iconColor: uvColor(uvData.uv),
      label: 'UV Exposure',
      headline: `UV ${Math.round(uvData.uv)}`,
      value: `${Math.round(uvData.uv)}`,
      valueColor: uvColor(uvData.uv),
      sub: `${describeUV(uvData.uv)}${uvData.timeLabel ? ` ${uvData.timeLabel}.` : ''}`,
    },
    {
      id: 'wind',
      icon: 'speedometer-outline',
      iconColor: ON_SURFACE_VARIANT,
      label: 'Wind',
      headline: `${Math.round(maxWindSpeed)} km/h`,
      value: `${Math.round(maxGust)}`,
      valueColor: maxGust > 50 ? DANGER : maxGust > 30 ? WARNING : GOOD,
      sub: `${describeWind(maxWindSpeed)} Gusts up to ${Math.round(maxGust)} km/h today.`,
    },
    ...(aqiInfo
      ? [{
          id: 'aqi',
          icon: 'leaf-outline' as IoniconName,
          iconColor: aqiInfo.color,
          label: 'Air Quality',
          headline: `${aqiInfo.label} (${aqi})`,
          value: `${aqi}`,
          valueColor: aqiInfo.color,
          sub: aqiInfo.advice,
        }]
      : []),
  ]

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W)
    setActiveIdx(Math.max(0, Math.min(idx, cards.length - 1)))
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionLabel}>DAILY ANALYTICS</Text>
        <Text style={styles.swipeHint}>swipe for more</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        snapToInterval={CARD_W + CARD_GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {cards.map((card) => (
          <GlassCard key={card.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.iconBadge, { backgroundColor: card.iconColor + '1A' }]}>
                <Ionicons name={card.icon} size={20} color={card.iconColor} />
              </View>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </View>

            <View style={styles.valueRow}>
              <Text style={[styles.bigValue, { color: card.valueColor }]}>{card.value}</Text>
              <Text style={styles.headline}>{card.headline}</Text>
            </View>

            <Text style={styles.subText} numberOfLines={3}>{card.sub}</Text>
          </GlassCard>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {cards.map((card, i) => (
          <View
            key={card.id}
            style={[styles.dot, i === activeIdx && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: CARD_H_PAD,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: TEXT_TERTIARY,
    ...FONT_BOLD,
  },
  swipeHint: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    ...FONT_REGULAR,
  },
  scroll: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: CARD_H_PAD,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_W,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    ...FONT_SEMIBOLD,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  bigValue: {
    fontSize: 38,
    ...FONT_BOLD,
    lineHeight: 44,
  },
  headline: {
    fontSize: 15,
    color: TEXT_PRIMARY,
    ...FONT_MEDIUM,
    flexShrink: 1,
  },
  subText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    ...FONT_REGULAR,
    lineHeight: 19,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GHOST_BORDER,
  },
  dotActive: {
    backgroundColor: ACCENT,
    width: 16,
  },
})
