/**
 * Weather-reactive ambient background (Expo / React Native).
 *
 * Visual hierarchy:
 *  1. Base gradient      — time-of-day-aware colour palette
 *  2. Atmospheric layers — horizon glow (dawn/dusk), moon (night), aurora shimmer (clear night)
 *  3. Weather particles  — rain drops, snow flakes, stars
 *  4. Cloud parallax     — 3-depth stratus bands (near/mid/far move at different speeds)
 *  5. Sky shimmer        — slow colour wash on clear days
 *  6. Fog / thunder fx   — opacity layer + lightning flash
 *
 * First-party apps (Apple Weather, Samsung Weather) use GPU-native pipelines
 * (Metal shaders, high-density particles) not available in JS.  This component
 * approximates the effect with react-native-reanimated shared values + SVG.
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
import HorizonGlowLayer from '@/src/components/home/HorizonGlowLayer'
import MoonLayer from '@/src/components/home/MoonLayer'
import {
  getAmbientVisualKind,
  getTimePhase,
  type AmbientVisualKind,
  type TimePhase,
} from '@/src/utils/ambientWeatherKind'
import { rainOpacityForOvercast } from '@/src/utils/overcastRainAmbient'

// ─── Particle counts ──────────────────────────────────────────────────────────
const DROP_COUNT = 96
const DROP_COUNT_OVERCAST = 118
const SNOW_COUNT = 52
const STAR_COUNT = 48

// ─── Base gradient palettes ───────────────────────────────────────────────────
const GRADIENTS: Record<AmbientVisualKind, readonly [string, string, ...string[]]> = {
  clearDay:           ['#1a5fb4', '#3d8dd4', '#7eb8ea', '#c5e3fa'],
  clearNight:         ['#050a14', '#0c1828', '#152838', '#1f3448'],
  partlyCloudyDay:    ['#2563a8', '#4a7eb8', '#6fa0cc', '#9bc0e0'],
  partlyCloudyNight:  ['#0a1524', '#1a2838', '#2a3848', '#3a4858'],
  cloudy:             ['#2a3444', '#3d4a5c', '#4e5d72'],
  rain:               ['#141e2a', '#1f2d3d', '#2c3c50'],
  snow:               ['#283548', '#3a4a62', '#506078'],
  fog:                ['#3e4654', '#4e5664', '#5e6674'],
  thunder:            ['#0c0614', '#1a1428', '#261e38'],
}

// ─── Time-of-day palettes (dawn / dusk override clear/partly-cloudy) ──────────
// 5-stop gradients to capture the full sky colour band from zenith → horizon.
const DAWN_CLEAR: readonly [string, string, string, string, string] =
  ['#0e0b28', '#2c1458', '#8a3065', '#d06c3a', '#f0b858']
const DUSK_CLEAR: readonly [string, string, string, string, string] =
  ['#090720', '#1c1040', '#782555', '#c85c28', '#e8a040']
const DAWN_PARTLY: readonly [string, string, string, string, string] =
  ['#0e0c2a', '#2a1650', '#782c60', '#b86438', '#d8a850']
const DUSK_PARTLY: readonly [string, string, string, string, string] =
  ['#0a0822', '#1a1242', '#682250', '#b05428', '#ce9838']
const MORNING_CLEAR: readonly [string, string, string, string] =
  ['#1e74d4', '#3898e8', '#72c0f0', '#c4e6fc']
const AFTERNOON_CLEAR: readonly [string, string, string, string] =
  ['#1040a8', '#2870cc', '#55a0e4', '#8ac8f5']

/** Select the appropriate gradient palette based on weather kind + time phase. */
function buildGradient(
  kind: AmbientVisualKind,
  phase: TimePhase,
): readonly [string, string, ...string[]] {
  if (kind === 'clearDay') {
    if (phase === 'dawn')      return DAWN_CLEAR
    if (phase === 'dusk')      return DUSK_CLEAR
    if (phase === 'morning')   return MORNING_CLEAR
    if (phase === 'afternoon') return AFTERNOON_CLEAR
  }
  if (kind === 'partlyCloudyDay') {
    if (phase === 'dawn') return DAWN_PARTLY
    if (phase === 'dusk') return DUSK_PARTLY
  }
  return GRADIENTS[kind]
}

/** Derive gradient stop locations from colour count. */
function gradientLocations(colors: readonly string[]): readonly [number, number, ...number[]] {
  switch (colors.length) {
    case 3:  return [0, 0.48, 1]          as const
    case 4:  return [0, 0.3, 0.62, 1]    as const
    case 5:  return [0, 0.22, 0.50, 0.76, 1] as const
    default: return [0, 0.5, 1]           as const
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface WeatherAmbientBackgroundProps {
  weatherCode: number
  isDay: boolean
  /** Current conditions precip % */
  precipitationProbability?: number
  /** Peak hourly precip % in the next ~12 h. */
  hourlyPrecipitationMax?: number
  /**
   * At least one hourly step in the lookahead window has a rain/thunder WMO code.
   * Overcast rain animation is gated on this so high precip % alone does not imply rain.
   */
  hourlyForecastHasRainish?: boolean
  /** ISO sunrise string from the daily forecast — used for time-phase gradient selection. */
  sunrise?: string
  /** ISO sunset string from the daily forecast — used for time-phase gradient selection. */
  sunset?: string
}

// ─── Rain drop ────────────────────────────────────────────────────────────────
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

// ─── Snow flake ───────────────────────────────────────────────────────────────
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

// ─── Twinkling star ───────────────────────────────────────────────────────────
function Star({
  leftPct,
  topPct,
  delayMs,
  size,
}: {
  leftPct: number
  topPct: number
  delayMs: number
  size: number
}) {
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

// ─── Stratus cloud band ───────────────────────────────────────────────────────
/**
 * A single full-bleed horizontal cloud deck.
 *
 * `depth` controls the parallax feel:
 *   'far'  — slow drift, subtle opacity  (background layer)
 *   'mid'  — medium speed, medium opacity
 *   'near' — faster, stronger            (foreground layer)
 */
function StratusBand({
  top,
  heightPct,
  dur,
  seed,
  strength,
  palette,
  yRange = 18,
  xDriftRange = 0,
  xDriftDur = 60000,
}: {
  top: `${number}%`
  heightPct: `${number}%`
  dur: number
  seed: number
  strength: number
  palette: 'overcast' | 'partly'
  /** Vertical travel range (px each side). */
  yRange?: number
  /** Horizontal drift range (px each side). 0 = no horizontal drift. */
  xDriftRange?: number
  /** Duration for one cycle of the horizontal drift. */
  xDriftDur?: number
}) {
  const y = useSharedValue(0)
  const x = useSharedValue(0)

  useEffect(() => {
    y.value = withRepeat(
      withTiming(1, { duration: dur + seed * 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
    if (xDriftRange > 0) {
      x.value = withDelay(
        seed * 4000,
        withRepeat(
          withTiming(1, { duration: xDriftDur + seed * 6000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      )
    }
  }, [dur, seed, xDriftRange, xDriftDur])

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: heightPct,
    top,
    transform: [
      { translateY: interpolate(y.value, [0, 1], [-yRange, yRange]) },
      { translateX: interpolate(x.value, [0, 1], [-xDriftRange, xDriftRange]) },
    ],
  }))

  const a = 0.42 * strength
  const b = 0.2 * strength

  const colors: readonly [string, string, string, string] | readonly [string, string, string] =
    palette === 'partly'
      ? ([
          `rgba(42, 96, 152, ${0.34 * strength})`,
          `rgba(58, 112, 168, ${0.20 * strength})`,
          `rgba(82, 132, 188, ${0.06 * strength})`,
          'rgba(255, 255, 255, 0)',
        ] as const)
      : ([
          `rgba(55, 65, 82, ${a})`,
          `rgba(75, 86, 102, ${b})`,
          'rgba(255, 255, 255, 0)',
        ] as const)

  const locations =
    palette === 'partly'
      ? ([0, 0.38, 0.72, 1] as const)
      : ([0, 0.5, 1] as const)

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

/**
 * Three-depth cloud parallax system.
 * Far layer moves slowest → near layer moves fastest, creating 3-D depth.
 */
function StratusBands({ variant }: { variant: 'overcast' | 'partly' }) {
  const baseMult = variant === 'partly' ? 0.55 : 1
  const palette = variant
  return (
    <>
      {/* Far — slow, subtle, background sky depth */}
      <StratusBand
        top="-6%"      heightPct="42%"
        dur={62000}    seed={0}
        strength={baseMult * 0.65}
        palette={palette}
        yRange={6}     xDriftRange={5}   xDriftDur={78000}
      />
      {/* Mid — medium parallax */}
      <StratusBand
        top="20%"      heightPct="35%"
        dur={44000}    seed={1}
        strength={baseMult * 0.82}
        palette={palette}
        yRange={14}    xDriftRange={12}  xDriftDur={58000}
      />
      {/* Near — faster, stronger, foreground depth */}
      <StratusBand
        top="40%"      heightPct="30%"
        dur={28000}    seed={2}
        strength={baseMult * 1.0}
        palette={palette}
        yRange={26}    xDriftRange={20}  xDriftDur={42000}
      />
    </>
  )
}

// ─── Sky shimmer ──────────────────────────────────────────────────────────────
/** Slow colour wash so the sky feels alive (not a flat poster). */
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

// ─── Fog layer ────────────────────────────────────────────────────────────────
/** Two counter-drifting mist sheets for a layered fog atmosphere. */
function FogLayer() {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 28000, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [])
  const s1 = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(225, 235, 248, 0.11)',
    opacity: interpolate(t.value, [0, 0.5, 1], [0.08, 0.22, 0.10]),
    transform: [{ translateX: interpolate(t.value, [0, 1], [-28, 28]) }],
  }))
  const s2 = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 220, 245, 0.09)',
    opacity: interpolate(t.value, [0, 0.5, 1], [0.14, 0.06, 0.16]),
    transform: [{ translateX: interpolate(t.value, [0, 1], [22, -22]) }],
  }))
  return (
    <>
      <Animated.View style={s1} pointerEvents="none" />
      <Animated.View style={s2} pointerEvents="none" />
    </>
  )
}

// ─── Rain depth vignette ──────────────────────────────────────────────────────
/** Darkens lower field slightly so falling rain reads with depth. */
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

// ─── Thunder flash ────────────────────────────────────────────────────────────
function ThunderFlash() {
  const flash = useSharedValue(0)
  useEffect(() => {
    const run = (): void => {
      flash.value = withSequence(
        withTiming(0.28, { duration: 45 }),
        withTiming(0, { duration: 100 }),
        withTiming(0.10, { duration: 35 }),
        withTiming(0, { duration: 180 }),
      )
    }
    run()
    const id = setInterval(() => run(), 2800 + Math.floor(Math.random() * 3200))
    return () => clearInterval(id)
  }, [])
  const style = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef0ff',
    opacity: flash.value,
  }))
  return <Animated.View style={style} pointerEvents="none" />
}

// ─── Aurora shimmer ───────────────────────────────────────────────────────────
/**
 * Subtle green-teal shimmer for clear nights — inspired by Apple Weather's
 * quiet auroral wash on clear dark-sky backgrounds.
 */
function AuroraShimmer() {
  const a = useSharedValue(0)
  const b = useSharedValue(0)
  useEffect(() => {
    a.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true)
    b.value = withDelay(
      5000,
      withRepeat(withTiming(1, { duration: 24000, easing: Easing.inOut(Easing.sin) }), -1, true),
    )
  }, [])
  const band1 = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: '8%',
    height: '18%',
    opacity: interpolate(a.value, [0, 0.5, 1], [0.04, 0.13, 0.04]),
    transform: [{ translateX: interpolate(a.value, [0, 1], [-24, 24]) }],
  }))
  const band2 = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: '22%',
    height: '14%',
    opacity: interpolate(b.value, [0, 0.5, 1], [0.02, 0.09, 0.02]),
    transform: [{ translateX: interpolate(b.value, [0, 1], [18, -18]) }],
  }))
  return (
    <>
      <Animated.View style={band1} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(80, 200, 160, 0.55)', 'rgba(60, 180, 200, 0.4)', 'transparent']}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
      <Animated.View style={band2} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(60, 180, 200, 0.45)', 'rgba(80, 160, 180, 0.3)', 'transparent']}
          locations={[0, 0.4, 0.7, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.1, y: 0.5 }}
          end={{ x: 0.9, y: 0.5 }}
        />
      </Animated.View>
    </>
  )
}

// ─── Rain helpers ─────────────────────────────────────────────────────────────
function buildRainSeeds(count: number, phase: number) {
  return Array.from({ length: count }, (_, i) => ({
    leftPct: ((i * 47 + phase * 13) % 100) + (i % 3) * 0.4,
    delayMs: (i * 41 + phase * 17) % 2400,
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
      style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-9deg' }, { translateX: -12 }] }]}
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

// ─── Star layer ───────────────────────────────────────────────────────────────
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

// ─── Snow layer ───────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
function WeatherAmbientBackgroundComponent({
  weatherCode,
  isDay,
  precipitationProbability = 0,
  hourlyPrecipitationMax = 0,
  hourlyForecastHasRainish = false,
  sunrise = '',
  sunset = '',
}: WeatherAmbientBackgroundProps) {
  const { height: winH } = useWindowDimensions()

  const kind = useMemo(() => getAmbientVisualKind(weatherCode, isDay), [weatherCode, isDay])
  const phase = useMemo(() => getTimePhase(sunrise, sunset), [sunrise, sunset])

  const gradColors = useMemo(() => buildGradient(kind, phase), [kind, phase])
  const gradLocations = useMemo(() => gradientLocations(gradColors), [gradColors])

  const travel = winH + 160

  const precipSignal = Math.max(precipitationProbability, hourlyPrecipitationMax)
  const overcastRainLayerOpacity = rainOpacityForOvercast(precipSignal)
  const showOvercastRain =
    kind === 'cloudy' && hourlyForecastHasRainish && overcastRainLayerOpacity > 0

  // Horizon glow for golden-hour conditions on clear/partly-cloudy days
  const showHorizonGlow =
    (phase === 'dawn' || phase === 'dusk') &&
    (kind === 'clearDay' || kind === 'partlyCloudyDay')

  // Moon for clear/partly-cloudy nights
  const showMoon = kind === 'clearNight' || kind === 'partlyCloudyNight'

  // Aurora shimmer for clear nights only
  const showAurora = kind === 'clearNight'

  return (
    <View style={styles.root} pointerEvents="none">
      {/* 1 — Base gradient */}
      <LinearGradient
        colors={[...gradColors]}
        locations={gradLocations}
        style={StyleSheet.absoluteFill}
      />

      {/* 2a — Clear-day sky shimmer + sun bloom */}
      {kind === 'clearDay' && phase !== 'dawn' && phase !== 'dusk' && <SkyShimmer />}
      {kind === 'clearDay' && phase !== 'dawn' && phase !== 'dusk' && (
        <ClearDayAmbientLayers variant="clear" />
      )}

      {/* 2b — Partly-cloudy daylight layers */}
      {kind === 'partlyCloudyDay' && phase !== 'dawn' && phase !== 'dusk' && (
        <>
          <StratusBands variant="partly" />
          <ClearDayAmbientLayers variant="partly" />
        </>
      )}
      {kind === 'partlyCloudyDay' && (phase === 'dawn' || phase === 'dusk') && (
        <StratusBands variant="partly" />
      )}

      {/* 2c — Partly-cloudy night */}
      {kind === 'partlyCloudyNight' && <StratusBands variant="partly" />}

      {/* 2d — Overcast clouds */}
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

      {/* 2e — Night stars */}
      {kind === 'clearNight' && <StarsLayer />}
      {kind === 'partlyCloudyNight' && <StarsLayer />}

      {/* 2f — Aurora shimmer (clear night only) */}
      {showAurora && <AuroraShimmer />}

      {/* 2g — Moon */}
      {showMoon && <MoonLayer />}

      {/* 2h — Horizon atmospheric glow (dawn / dusk) */}
      {showHorizonGlow && <HorizonGlowLayer variant={phase as 'dawn' | 'dusk'} />}

      {/* 3 — Rain / thunder particles */}
      {(kind === 'rain' || kind === 'thunder') && (
        <>
          <RainField travel={travel} dropOpacityScale={1.15} count={DROP_COUNT} phase={0} />
          <RainField travel={travel} dropOpacityScale={0.75} count={56} phase={7} />
          <RainDepthVignette />
        </>
      )}

      {/* 4 — Snow */}
      {kind === 'snow' && <SnowLayer travel={travel} />}

      {/* 5 — Fog */}
      {kind === 'fog' && <FogLayer />}

      {/* 6 — Thunder flash */}
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
