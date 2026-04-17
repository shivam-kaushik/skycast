/**
 * Glowing moon disc for clear and partly-cloudy night conditions.
 *
 * Three visual layers (outermost → innermost):
 *  1. Wide corona — very subtle radial bleed, colour-tinted sky blue
 *  2. Soft glow  — medium halo around the disc
 *  3. Moon disc  — pale ice-blue circle with a slight internal gradient
 *     that suggests a spherical surface
 *
 * A slow breathing animation (6 s period) gives the moon life without
 * being distracting.
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

function MoonLayerComponent() {
  const { width: W, height: H } = useWindowDimensions()
  const breathe = useSharedValue(0)

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 6200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.82, 1.0]),
  }))

  /** Moon positioned in the upper-right quadrant, matching the sun position in the clear-day layers. */
  const moonX = W * 0.75
  const moonY = 70
  const discR = 21          // disc radius (px)
  const glowR = discR * 2.8 // inner halo
  const coronaR = W * 0.38  // wide outer corona

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      {/** Only need to draw in the upper portion of the screen */}
      <Svg
        width={W}
        height={Math.min(H * 0.55, 320)}
        style={[StyleSheet.absoluteFill, styles.svg]}
      >
        <Defs>
          {/* Wide, faint corona */}
          <RadialGradient id="moonCorona" cx={moonX} cy={moonY} r={coronaR} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#b8d8ff" stopOpacity={0.18} />
            <Stop offset="45%"  stopColor="#90b8f0" stopOpacity={0.07} />
            <Stop offset="100%" stopColor="#6090d0" stopOpacity={0}    />
          </RadialGradient>
          {/* Soft inner glow */}
          <RadialGradient id="moonGlow" cx={moonX} cy={moonY} r={glowR} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#d8eeff" stopOpacity={0.52} />
            <Stop offset="55%"  stopColor="#c0dcff" stopOpacity={0.18} />
            <Stop offset="100%" stopColor="#a0c8ff" stopOpacity={0}    />
          </RadialGradient>
          {/* Moon disc — slight off-centre highlight to imply a sphere */}
          <RadialGradient
            id="moonDisc"
            cx={moonX - discR * 0.22}
            cy={moonY - discR * 0.22}
            r={discR}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%"   stopColor="#f2f9ff" stopOpacity={1}    />
            <Stop offset="60%"  stopColor="#d4e8ff" stopOpacity={0.98} />
            <Stop offset="100%" stopColor="#a8c8f0" stopOpacity={0.90} />
          </RadialGradient>
        </Defs>

        {/* Render from back to front */}
        <Circle cx={moonX} cy={moonY} r={coronaR} fill="url(#moonCorona)" />
        <Circle cx={moonX} cy={moonY} r={glowR}   fill="url(#moonGlow)"   />
        <Circle cx={moonX} cy={moonY} r={discR}   fill="url(#moonDisc)"   />
      </Svg>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  svg: {
    top: 0,
  },
})

export default memo(MoonLayerComponent)
