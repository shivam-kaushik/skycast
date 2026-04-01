import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ImageBackground,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { useRouter } from 'expo-router'
import GlassCard from '@/src/components/shared/GlassCard'
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  SECONDARY,
  ON_PRIMARY,
  ON_SURFACE_VARIANT,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'
import {
  describeHumidity,
  describeUV,
  describeVisibility,
} from '@/src/utils/weatherDescriptions'
import type { CurrentWeather } from '@/src/types/weather'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface MetricTilesGridProps {
  current: CurrentWeather
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GAP = 12
const PAD = 16
const TILE_WIDTH = (SCREEN_WIDTH - PAD * 2 - GAP) / 2

function degToCompass8(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
  const i = Math.round(deg / 45) % 8
  return dirs[i] ?? 'N'
}

function uvShortLabel(index: number): string {
  if (index <= 2) return 'Low'
  if (index <= 5) return 'Moderate'
  if (index <= 7) return 'High'
  if (index <= 10) return 'Very high'
  return 'Extreme'
}

function pressureHint(hpa: number): string {
  if (hpa >= 1010 && hpa <= 1025) return 'Stable'
  if (hpa < 1005) return 'Low'
  if (hpa > 1030) return 'High'
  return 'Variable'
}

const RADAR_PREVIEW =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB2y2Eut-cgNkB8c4PJQNWi_ILES5xHNzEYbIuD628Oisv_e3zGVTpIyyuoCx8sOkqwIkS1YfLgS6ZXTz-c1Q4hdzOau2Axj2KjxhZE8M0U5RPVM-WtMmcOh6OdCXr0PF6i7sgcGmSg6EFD_JdeHipub-WVYu-YwNNDvjuydOPY9fbYS5dmRXokqPoV9RYbwSYX0WKagusHd-L7SkuE0aAwdW_ov8vZZClgdHHiiFh0pU8xQb0pEAINuqWKyGksTYJXFzA9hugwQBw'

export default function MetricTilesGrid({ current }: MetricTilesGridProps) {
  const router = useRouter()

  const tiles: {
    icon: IoniconName
    label: string
    value: string
    sub: string
    accent?: typeof ACCENT | typeof SECONDARY
  }[] = [
    {
      icon: 'sunny-outline',
      label: 'UV Index',
      value: String(Math.round(current.uvIndex)),
      sub: uvShortLabel(current.uvIndex),
      accent: ACCENT,
    },
    {
      icon: 'speedometer-outline',
      label: 'Wind',
      value: `${Math.round(current.windSpeed)} km/h`,
      sub: degToCompass8(current.windDirection),
    },
    {
      icon: 'water-outline',
      label: 'Humidity',
      value: `${current.humidity}%`,
      sub: describeHumidity(current.humidity).split('—')[0]?.trim() ?? '',
    },
    {
      icon: 'eye-outline',
      label: 'Visibility',
      value: `${current.visibility.toFixed(1)} km`,
      sub: describeVisibility(current.visibility).split('—')[0]?.trim() ?? '',
    },
    {
      icon: 'analytics-outline',
      label: 'Pressure',
      value: `${Math.round(current.pressure)} hPa`,
      sub: pressureHint(current.pressure),
      accent: SECONDARY,
    },
  ]

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <GlassCard key={tile.label} style={[styles.tile, { width: TILE_WIDTH }]}>
          <View style={styles.tileTop}>
            <View style={styles.tileTitleRow}>
              <Ionicons name={tile.icon} size={14} color={TEXT_TERTIARY} />
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={[styles.tileSub, tile.accent && { color: tile.accent }]}>{tile.sub}</Text>
          </View>
          {tile.label === 'Humidity' && (
            <View style={styles.waterMark}>
              <Ionicons name="water" size={48} color={SECONDARY} style={{ opacity: 0.2 }} />
            </View>
          )}
          {tile.label === 'Wind' && (
            <View style={styles.windIcon}>
              <Ionicons
                name="navigate"
                size={22}
                color={ACCENT}
                style={{ transform: [{ rotate: `${current.windDirection}deg` }] }}
              />
            </View>
          )}
          {tile.label === 'UV Index' && (
            <View style={styles.uvBar}>
              <View
                style={[
                  styles.uvFill,
                  { width: `${Math.min(100, (current.uvIndex / 11) * 100)}%` },
                ]}
              />
            </View>
          )}
        </GlassCard>
      ))}

      <Pressable
        style={[styles.ctaWrap, { width: TILE_WIDTH }]}
        onPress={() => router.push('/radar')}
      >
        <ImageBackground
          source={{ uri: RADAR_PREVIEW }}
          style={styles.ctaImage}
          imageStyle={styles.ctaImageInner}
        >
          <LinearGradient
            colors={['rgba(255,193,7,0.95)', 'rgba(255,228,175,0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaKicker}>Precise Maps</Text>
            <Text style={styles.ctaTitle}>Rain viewer for your region</Text>
            <View style={styles.ctaRow}>
              <Text style={styles.ctaExplore}>Explore</Text>
              <Ionicons name="arrow-forward" size={14} color={ON_PRIMARY} />
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PAD,
    gap: GAP,
  },
  tile: {
    minHeight: 148,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileTop: {
    gap: 4,
    zIndex: 1,
  },
  tileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    ...FONT_BOLD,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ON_SURFACE_VARIANT,
  },
  tileValue: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  tileSub: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  uvBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  uvFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  windIcon: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(79, 70, 50, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterMark: {
    position: 'absolute',
    right: 8,
    bottom: 4,
  },
  ctaWrap: {
    minHeight: 148,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 70, 50, 0.15)',
  },
  ctaImage: {
    flex: 1,
    minHeight: 148,
  },
  ctaImageInner: {
    opacity: 0.35,
  },
  ctaGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,193,7,0.88)',
  },
  ctaKicker: {
    ...FONT_BOLD,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ON_PRIMARY,
    opacity: 0.9,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ON_PRIMARY,
    lineHeight: 24,
    maxWidth: 140,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaExplore: {
    ...FONT_BOLD,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: ON_PRIMARY,
  },
})
