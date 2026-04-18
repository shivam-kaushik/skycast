import React, { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { format, parseISO } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Polyline } from 'react-native-svg'
import type { ComponentProps } from 'react'
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  GLASS_BG,
  GHOST_BORDER,
  SECONDARY,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM } from '@/src/theme/typography'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import { formatTemp } from '@/src/utils/formatTemp'
import type { DailyWeather, HourlyWeather } from '@/src/types/weather'
import {
  chartPointsFromSlots,
  mergeHourlyWithSunEvents,
  tempRangeForChart,
  type TimelineSlot,
} from '@/src/utils/hourlyTimeline'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const COL_W = 58
const CHART_H = 44
const PAD = 5

interface HourlyStripProps {
  hourly: HourlyWeather
  daily: DailyWeather
  unit: 'C' | 'F'
}

function formatHourShort(iso: string): string {
  return format(parseISO(iso), 'h a')
}

function formatSunTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a')
}

function tempToY(temp: number, minT: number, maxT: number): number {
  const inner = CHART_H - PAD * 2
  const span = maxT - minT || 1
  const n = (temp - minT) / span
  return PAD + inner * (1 - n)
}

export default function HourlyStrip({ hourly, daily, unit }: HourlyStripProps) {
  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:`

  let startIdx = hourly.time.findIndex((t) => t >= nowStr)
  if (startIdx === -1) startIdx = 0

  const slots = useMemo(
    () => mergeHourlyWithSunEvents(hourly, daily, startIdx, 24),
    [hourly, daily, startIdx],
  )

  const chartPts = useMemo(() => chartPointsFromSlots(slots, hourly), [slots, hourly])
  const { min: minT, max: maxT } = useMemo(() => tempRangeForChart(chartPts), [chartPts])

  const polylinePoints = useMemo(() => {
    if (chartPts.length < 2) return ''
    return chartPts.map((p) => {
      const x = p.colIndex * COL_W + COL_W / 2
      const y = tempToY(p.temp, minT, maxT)
      return `${x},${y}`
    }).join(' ')
  }, [chartPts, minT, maxT])

  const summaryLine = useMemo(() => {
    if (slots.length === 0) return ''
    const endIdx = Math.min(startIdx + 24, hourly.time.length)
    const slice = hourly.temperature.slice(startIdx, endIdx)
    if (slice.length === 0) return ''
    const low = Math.min(...slice)
    const code = hourly.weatherCode[startIdx] ?? 0
    const { label } = getWeatherCodeInfo(code)
    return `${label}. Low ${formatTemp(low, unit)}.`
  }, [hourly, startIdx, slots.length, unit])

  const svgW = slots.length * COL_W

  return (
    <View style={styles.card}>
      {summaryLine.length > 0 ? <Text style={styles.summary}>{summaryLine}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          <View style={styles.row}>
            {slots.map((slot, i) => (
              <TimeColumn
                key={`${slot.kind}-${slot.timeIso}`}
                slot={slot}
                isFirstHourNow={i === 0 && slot.kind === 'hour'}
              />
            ))}
          </View>

          <View style={styles.row}>
            {slots.map((slot) => (
              <IconColumn key={`icon-${slot.kind}-${slot.timeIso}`} slot={slot} hourly={hourly} />
            ))}
          </View>

          <View style={[styles.chartWrap, { width: svgW }]}>
            <Svg width={svgW} height={CHART_H}>
              {chartPts.length >= 2 ? (
                <Polyline
                  points={polylinePoints}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {chartPts.map((p) => {
                const cx = p.colIndex * COL_W + COL_W / 2
                const cy = tempToY(p.temp, minT, maxT)
                return (
                  <Circle
                    key={`dot-${p.hourlyIdx}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={TEXT_PRIMARY}
                    stroke={ACCENT}
                    strokeWidth={1.5}
                  />
                )
              })}
            </Svg>
          </View>

          <View style={styles.row}>
            {slots.map((slot) => (
              <TempColumn key={`temp-${slot.kind}-${slot.timeIso}`} slot={slot} hourly={hourly} unit={unit} />
            ))}
          </View>

          <View style={styles.row}>
            {slots.map((slot) => (
              <PrecipColumn key={`pr-${slot.kind}-${slot.timeIso}`} slot={slot} hourly={hourly} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function TimeColumn({ slot, isFirstHourNow }: { slot: TimelineSlot; isFirstHourNow: boolean }) {
  let label: string
  if (slot.kind === 'hour') {
    label = isFirstHourNow ? 'Now' : formatHourShort(slot.timeIso)
  } else if (slot.kind === 'sunrise') {
    label = formatSunTime(slot.timeIso)
  } else {
    label = formatSunTime(slot.timeIso)
  }

  return (
    <View style={[styles.cell, styles.timeCell]}>
      <Text style={[styles.timeText, isFirstHourNow && styles.nowTime]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function IconColumn({ slot, hourly }: { slot: TimelineSlot; hourly: HourlyWeather }) {
  let name: IoniconName
  let color = TEXT_PRIMARY

  if (slot.kind === 'sunrise') {
    name = 'sunny-outline'
    color = ACCENT
  } else if (slot.kind === 'sunset') {
    name = 'moon-outline'
    color = ACCENT
  } else {
    const code = hourly.weatherCode[slot.hourlyIdx] ?? 0
    name = getWeatherCodeInfo(code).ionicon as IoniconName
  }

  return (
    <View style={styles.cell}>
      <Ionicons name={name} size={26} color={color} />
    </View>
  )
}

function TempColumn({
  slot,
  hourly,
  unit,
}: {
  slot: TimelineSlot
  hourly: HourlyWeather
  unit: 'C' | 'F'
}) {
  if (slot.kind === 'sunrise') {
    return (
      <View style={styles.cell}>
        <Text
          style={styles.sunLabel}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          Sunrise
        </Text>
      </View>
    )
  }
  if (slot.kind === 'sunset') {
    return (
      <View style={styles.cell}>
        <Text
          style={styles.sunLabel}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          Sunset
        </Text>
      </View>
    )
  }
  const temp = hourly.temperature[slot.hourlyIdx] ?? 0
  return (
    <View style={styles.cell}>
      <Text style={styles.tempText}>{formatTemp(temp, unit)}</Text>
    </View>
  )
}

function PrecipColumn({ slot, hourly }: { slot: TimelineSlot; hourly: HourlyWeather }) {
  if (slot.kind !== 'hour') {
    return (
      <View style={styles.cell}>
        <Text style={styles.precipDash}> </Text>
      </View>
    )
  }
  const pct = hourly.precipitationProbability[slot.hourlyIdx] ?? 0
  return (
    <View style={styles.precipCell}>
      <Ionicons name="water-outline" size={11} color={SECONDARY} />
      <Text style={styles.precipText}>{Math.round(pct)}%</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GHOST_BORDER,
    backgroundColor: GLASS_BG,
    paddingTop: 12,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  summary: {
    ...FONT_MEDIUM,
    fontSize: 13,
    color: TEXT_SECONDARY,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
  },
  chartWrap: {
    marginVertical: 2,
  },
  cell: {
    width: COL_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  timeCell: {
    minHeight: 34,
    justifyContent: 'flex-start',
  },
  timeText: {
    ...FONT_BOLD,
    fontSize: 11,
    color: TEXT_TERTIARY,
    textAlign: 'center',
  },
  nowTime: {
    color: TEXT_PRIMARY,
  },
  tempText: {
    ...FONT_BOLD,
    fontSize: 15,
    color: TEXT_SECONDARY,
  },
  sunLabel: {
    ...FONT_MEDIUM,
    fontSize: 10,
    color: ACCENT,
    textAlign: 'center',
    maxWidth: COL_W - 2,
  },
  precipCell: {
    width: COL_W,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  precipText: {
    ...FONT_MEDIUM,
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  precipDash: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
})
