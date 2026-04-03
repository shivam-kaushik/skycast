/**
 * Weather-reactive ambient background (Expo / React Native).
 *
 * First-party apps (Apple Weather, Samsung Weather) typically use GPU-native pipelines:
 * Metal shaders, high-density particles, and full-scene compositing — not available in JS.
 * Overcast: stratus bands; rain only if hourly WMO codes include rain/thunder and
 * max(current, next-12h hourly) precip ≥ threshold (precip % alone is not enough).
 * Dedicated rain/thunder WMO codes on current conditions still use full rain layers.
 */
import React, { memo, useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import ClearDayAmbientLayers from '@/src/components/home/ClearDayAmbientLayers'
import { getAmbientVisualKind, type AmbientVisualKind } from '@/src/utils/ambientWeatherKind'
import { rainOpacityForOvercast } from '@/src/utils/overcastRainAmbient'

const DROP_COUNT = 96
const DROP_COUNT_OVERCAST = 118
const SNOW_COUNT = 52
const STAR_COUNT = 48

const GRADIENTS: Record<AmbientVisualKind, readonly [string, string, ...string[]]> = {
  clearDay: ['#1a5fb4', '#3d8dd4', '#7eb8ea', '#c5e3fa'],
  clearNight: ['#050a14', '#0c1828', '#152838', '#1f3448'],
  partlyCloudyDay: ['#2563a8', '#4a7eb8', '#6fa0cc', '#9bc0e0'],
  partlyCloudyNight: ['#0a1524', '#1a2838', '#2a3848', '#3a4858'],
  cloudy: ['#2a3444', '#3d4a5c', '#4e5d72'],
  rain: ['#141e2a', '#1f2d3d', '#2c3c50'],
  snow: ['#283548', '#3a4a62', '#506078'],
  fog: ['#3e4654', '#4e5664', '#5e6674'],
  thunder: ['#0c0614', '#1a1428', '#261e38'],
}

interface WeatherAmbientBackgroundProps {
  weatherCode: number
  isDay: boolean
  /** Current conditions precip % */
  precipitationProbability?: number
  /** Peak hourly precip % in the next ~12h (see home screen). */
  hourlyPrecipitationMax?: number
  /**
   * At least one hourly step in the lookahead window has a rain/thunder WMO code.
   * Overcast rain animation is gated on this so high precip % alone does not imply rain.
   */
  hourlyForecastHasRainish?: boolean
}

function RainDrop({
  leftPct,
  delayMs,
  durationMs,
  travel,
  length,
  opacity,
}: {
  leftPct: number
  delayMs: number
  durationMs: number
  travel: number
  length: number
  opacity: number
}) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false),
    )
  }, [delayMs, durationMs, travel])
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: `${leftPct}%`,
    top: 0,
    width: 2.8,
    height: length,
    borderRadius: 1,
    backgroundColor: `rgba(210, 232, 255, ${opacity})`,
    transform: [{ translateY: interpolate(p.value, [0, 1], [-50, travel]) }],
  }))
  return <Animated.View style={style} />
}

function SnowFlake({
  leftPct,
  delayMs,
  durationMs,
  travel,
  size,
}: {
  leftPct: number
  delayMs: number
  durationMs: number
  travel: number
  size: number
}) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false),
    )
  }, [delayMs, durationMs, travel])
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: `${leftPct}%`,
    top: 0,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    transform: [{ translateY: interpolate(p.value, [0, 1], [-24, travel]) }],
    opacity: interpolate(p.value, [0, 0.12, 1], [0.45, 0.95, 0.55]),
  }))
  return <Animated.View style={style} />
}

function Star({ leftPct, topPct, delayMs, size }: { leftPct: number; topPct: number; delayMs: number; size: number }) {
  const o = useSharedValue(0.35)
  useEffect(() => {
    o.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: 1400 + (delayMs % 800), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: 1400 + (delayMs % 600), easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    )
  }, [delayMs])
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    opacity: o.value,
  }))
  return <Animated.View style={style} />
}

/** Full-bleed horizontal stratus layers (no circles — reads as cloud decks, not rings). */
function StratusBand({
  top,
  heightPct,
  dur,
  seed,
  strength,
  palette,
}: {
  top: `${number}%`
  heightPct: `${number}%`
  dur: number
  seed: number
  strength: number
  palette: 'overcast' | 'partly'
}) {
  const y = useSharedValue(0)
  useEffect(() => {
    y.value = withRepeat(
      withTiming(1, { duration: dur + seed * 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [dur, seed])
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: heightPct,
    top,
    transform: [{ translateY: interpolate(y.value, [0, 1], [-18, 18]) }],
  }))
  const a = 0.42 * strength
  const b = 0.2 * strength
  /**
   * Partly-cloudy: tint with sky blues (see GRADIENTS.partlyCloudyDay) so fades to transparent
   * do not leave a charcoal edge on the blue base. Overcast keeps cooler neutral grays.
   */
  const colors: readonly [string, string, string, string] | readonly [string, string, string] =
    palette === 'partly'
      ? ([
          `rgba(42, 96, 152, ${0.34 * strength})`,
          `rgba(58, 112, 168, ${0.2 * strength})`,
          `rgba(82, 132, 188, ${0.06 * strength})`,
          'rgba(255, 255, 255, 0)',
        ] as const)
      : ([`rgba(55, 65, 82, ${a})`, `rgba(75, 86, 102, ${b})`, 'rgba(255, 255, 255, 0)'] as const)
  const locations =
    palette === 'partly' ? ([0, 0.38, 0.72, 1] as const) : ([0, 0.5, 1] as const)
  return (
    <Animated.View style={style} pointerEvents="none">
      <LinearGradient
        colors={colors}
        locations={locations}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  )
}

function StratusBands({ variant }: { variant: 'overcast' | 'partly' }) {
  const s = variant === 'partly' ? 0.55 : 1
  const palette = variant
  return (
    <>
      <StratusBand top="-8%" heightPct="44%" dur={42000} seed={0} strength={s} palette={palette} />
      <StratusBand top="18%" heightPct="36%" dur={52000} seed={1} strength={s * 0.88} palette={palette} />
      <StratusBand top="36%" heightPct="32%" dur={48000} seed={2} strength={s * 0.72} palette={palette} />
    </>
  )
}

/** Slow color wash so the sky feels alive (not a flat poster). */
function SkyShimmer() {
  const o = useSharedValue(0)
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [])
  const wrap = useAnimatedStyle(() => ({
    opacity: interpolate(o.value, [0, 1], [0.22, 0.48]),
  }))
  return (
    <Animated.View style={[StyleSheet.absoluteFill, wrap]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(130, 185, 255, 0.45)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      />
    </Animated.View>
  )
}

function FogLayer() {
  const x = useSharedValue(0)
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 20000, easing: Easing.linear }), -1, false)
  }, [])
  const mist = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(235, 240, 248, 0.12)',
    opacity: interpolate(x.value, [0, 0.5, 1], [0.08, 0.2, 0.1]),
  }))
  return <Animated.View style={mist} pointerEvents="none" />
}

/** Darkens lower field slightly so falling rain reads with depth (layered atmosphere). */
function RainDepthVignette() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(6, 10, 18, 0.42)']}
        locations={[0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </View>
  )
}

function ThunderFlash() {
  const flash = useSharedValue(0)
  useEffect(() => {
    const run = (): void => {
      flash.value = withSequence(
        withTiming(0.28, { duration: 45 }),
        withTiming(0, { duration: 100 }),
        withTiming(0.1, { duration: 35 }),
        withTiming(0, { duration: 180 }),
      )
    }
    run()
    const id = setInterval(() => {
      run()
    }, 2800 + Math.floor(Math.random() * 3200))
    return () => clearInterval(id)
  }, [])
  const style = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef0ff',
    opacity: flash.value,
  }))
  return <Animated.View style={style} pointerEvents="none" />
}

function buildRainSeeds(count: number, phase: number) {
  return Array.from({ length: count }, (_, i) => ({
    leftPct: ((i * 47 + phase * 13) % 100) + (i % 3) * 0.4,
    delayMs: ((i * 41 + phase * 17) % 2400),
    durationMs: 480 + (i % 8) * 70,
    length: 14 + (i % 8) * 2.8,
    opacity: 0.52 + (i % 6) * 0.07,
  }))
}

const RainField = memo(function RainField({
  travel,
  dropOpacityScale,
  count,
  phase,
}: {
  travel: number
  dropOpacityScale: number
  count: number
  phase: number
}) {
  const seeds = useMemo(() => buildRainSeeds(count, phase), [count, phase])
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [{ rotate: '-9deg' }, { translateX: -12 }],
        },
      ]}
      pointerEvents="none"
    >
      {seeds.map((s, i) => (
        <RainDrop
          key={`${phase}-${i}`}
          {...s}
          travel={travel}
          opacity={Math.min(0.92, s.opacity * dropOpacityScale)}
        />
      ))}
    </View>
  )
})

const StarsLayer = memo(function StarsLayer() {
  const seeds = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        leftPct: (i * 41 + 7) % 94,
        topPct: 4 + (i * 23) % 42,
        delayMs: (i * 180) % 3200,
        size: i % 4 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
      })),
    [],
  )
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {seeds.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </View>
  )
})

const SnowLayer = memo(function SnowLayer({ travel }: { travel: number }) {
  const seeds = useMemo(
    () =>
      Array.from({ length: SNOW_COUNT }, (_, i) => ({
        leftPct: (i * 43 + 5) % 100,
        delayMs: (i * 67) % 5000,
        durationMs: 4000 + (i % 10) * 350,
        size: 2.5 + (i % 5) * 0.9,
      })),
    [],
  )
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {seeds.map((s, i) => (
        <SnowFlake key={i} {...s} travel={travel} />
      ))}
    </View>
  )
})

function WeatherAmbientBackgroundComponent({
  weatherCode,
  isDay,
  precipitationProbability = 0,
  hourlyPrecipitationMax = 0,
  hourlyForecastHasRainish = false,
}: WeatherAmbientBackgroundProps) {
  const { height: winH } = useWindowDimensions()
  const kind = useMemo(() => getAmbientVisualKind(weatherCode, isDay), [weatherCode, isDay])
  const colors = GRADIENTS[kind]
  const travel = winH + 160

  const precipSignal = Math.max(precipitationProbability, hourlyPrecipitationMax)
  const overcastRainLayerOpacity = rainOpacityForOvercast(precipSignal)
  const showOvercastRain =
    kind === 'cloudy' && hourlyForecastHasRainish && overcastRainLayerOpacity > 0

  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={[...colors]}
        locations={colors.length === 4 ? [0, 0.3, 0.62, 1] : [0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      {kind === 'clearDay' && <SkyShimmer />}

      {kind === 'clearDay' && <ClearDayAmbientLayers variant="clear" />}

      {kind === 'partlyCloudyDay' && (
        <>
          <StratusBands variant="partly" />
          <ClearDayAmbientLayers variant="partly" />
        </>
      )}

      {kind === 'partlyCloudyNight' && <StratusBands variant="partly" />}

      {kind === 'cloudy' && (
        <>
          <StratusBands variant="overcast" />
          {showOvercastRain && (
            <View style={{ opacity: overcastRainLayerOpacity }} pointerEvents="none">
              <RainField travel={travel} dropOpacityScale={1.5} count={DROP_COUNT_OVERCAST} phase={0} />
              <RainField travel={travel} dropOpacityScale={0.88} count={72} phase={7} />
            </View>
          )}
        </>
      )}

      {kind === 'clearNight' && <StarsLayer />}

      {(kind === 'rain' || kind === 'thunder') && (
        <>
          <RainField travel={travel} dropOpacityScale={1.15} count={DROP_COUNT} phase={0} />
          <RainField travel={travel} dropOpacityScale={0.75} count={56} phase={7} />
          <RainDepthVignette />
        </>
      )}

      {kind === 'snow' && <SnowLayer travel={travel} />}
      {kind === 'fog' && <FogLayer />}
      {kind === 'thunder' && <ThunderFlash />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
})

export default memo(WeatherAmbientBackgroundComponent)
