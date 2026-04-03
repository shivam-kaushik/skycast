/**
 * Clear / partly-cloudy daylight atmosphere.
 *
 * UX reference: major weather apps (Apple Weather, Google Weather, Samsung) lean on
 * soft sky gradients, radial bloom, and parallax — not sharp rotating line segments,
 * which users misread as precipitation streaks. See also Material expressive motion
 * guidelines: primary motion reinforces meaning; avoid decorative patterns that
 * compete with data (e.g. vertical/diagonal lines ≈ rain).
 */
import React, { memo, useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

export type ClearDayAmbientVariant = 'clear' | 'partly'

interface ClearDayAmbientLayersProps {
  variant: ClearDayAmbientVariant
}

const MOTE_COUNT = 16

function LightMote({ index, strength }: { index: number; strength: number }) {
  const t = useSharedValue(0)
  const left = useMemo(() => (index * 37 + 11) % 86 + 5, [index])
  const top = useMemo(() => 10 + (index * 23) % 52, [index])
  const span = 10 + (index % 6) * 5
  const duration = 8800 + (index % 9) * 700
  const size = 2 + (index % 4) * 0.75

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [duration])

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: `${left}%`,
    top: `${top}%`,
    width: size,
    height: size,
    borderRadius: size,
    backgroundColor: `rgba(255, 252, 245, ${0.22 * strength})`,
    opacity: interpolate(t.value, [0, 0.5, 1], [0.12 * strength, 0.38 * strength, 0.12 * strength]),
    transform: [{ translateX: interpolate(t.value, [0, 1], [-span, span]) }],
  }))

  return <Animated.View style={style} pointerEvents="none" />
}

function SoftSunBloom({ variant }: { variant: ClearDayAmbientVariant }) {
  const { width: W } = useWindowDimensions()
  const pulse = useSharedValue(0)
  const strength = variant === 'clear' ? 1 : 0.62

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [])

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.82 * strength, 1 * strength]),
  }))

  const h = Math.min(380, Math.max(260, W * 0.92))
  const sunCx = W * 0.78
  const sunCy = 68
  const bloomR = W * 0.52
  const coreR = W * 0.2

  const gidBloom = `clearBloom-${variant}`
  const gidCore = `clearCore-${variant}`

  return (
    <Animated.View
      style={[styles.svgWrap, wrapStyle]}
      pointerEvents="none"
    >
      <Svg width={W} height={h} style={styles.svg}>
        <Defs>
          <RadialGradient id={gidBloom} cx={sunCx} cy={sunCy} r={bloomR} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#fff9ec" stopOpacity={0.38 * strength} />
            <Stop offset="35%" stopColor="#a8d4ff" stopOpacity={0.14 * strength} />
            <Stop offset="100%" stopColor="#1a5fb4" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gidCore} cx={sunCx} cy={sunCy} r={coreR} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#fff2c8" stopOpacity={0.55 * strength} />
            <Stop offset="55%" stopColor="#ffd88a" stopOpacity={0.12 * strength} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={sunCx} cy={sunCy} r={bloomR} fill={`url(#${gidBloom})`} />
        <Circle cx={sunCx} cy={sunCy} r={coreR * 1.05} fill={`url(#${gidCore})`} />
      </Svg>
    </Animated.View>
  )
}

function ClearDayAmbientLayersComponent({ variant }: ClearDayAmbientLayersProps) {
  const strength = variant === 'clear' ? 1 : 0.68

  const motes = useMemo(() => Array.from({ length: MOTE_COUNT }, (_, i) => i), [])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SoftSunBloom variant={variant} />
      <View style={styles.motes}>
        {motes.map((i) => (
          <LightMote key={i} index={i} strength={strength} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  svgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  svg: {
    backgroundColor: 'transparent',
  },
  motes: {
    ...StyleSheet.absoluteFillObject,
  },
})

export default memo(ClearDayAmbientLayersComponent)
