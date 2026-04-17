/**
 * Warm atmospheric horizon glow for dawn and dusk conditions.
 * A large elliptical radial gradient emanates upward from the bottom of the screen,
 * simulating the warm light band visible on the horizon at sunrise/sunset.
 */
import React, { memo, useEffect } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

export type HorizonGlowVariant = 'dawn' | 'dusk'

const PALETTES: Record<HorizonGlowVariant, { inner: string; mid: string; outer: string }> = {
  dawn: {
    inner: '#ffb040',  // warm amber
    mid: '#e05840',    // coral-red
    outer: '#7a1c60',  // deep magenta
  },
  dusk: {
    inner: '#ff9a30',  // bright orange-amber
    mid: '#c83878',    // rose-magenta
    outer: '#38147a',  // deep violet
  },
}

function HorizonGlowLayerComponent({ variant }: { variant: HorizonGlowVariant }) {
  const { width: W, height: H } = useWindowDimensions()
  const breathe = useSharedValue(0)

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.72, 1.0]),
  }))

  const c = PALETTES[variant]

  // The gradient origin is placed below the screen so the glow radiates upward.
  // Using a large circle rather than an ellipse so the gradient expands naturally.
  const cx = W * 0.5
  const cy = H + H * 0.15   // below the visible area
  const r = H * 1.05         // reaches well into the upper sky

  const id = `hg_${variant}`

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor={c.inner} stopOpacity={0.65} />
            <Stop offset="20%"  stopColor={c.inner} stopOpacity={0.42} />
            <Stop offset="45%"  stopColor={c.mid}   stopOpacity={0.22} />
            <Stop offset="70%"  stopColor={c.outer}  stopOpacity={0.08} />
            <Stop offset="100%" stopColor={c.outer}  stopOpacity={0}    />
          </RadialGradient>
        </Defs>
        {/* Full-screen rect ensures the gradient always covers the whole background */}
        <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  )
}

export default memo(HorizonGlowLayerComponent)
