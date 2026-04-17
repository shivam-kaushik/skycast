/**
 * Radar timeline scrubber — video-style continuous playhead.
 *
 * Design goals (Apple/Google Weather-inspired):
 *  - While playing: the thumb glides linearly from one frame to the next over the full
 *    frame interval (1200 ms). This looks like a video progress bar rather than a ticker
 *    that snaps to discrete positions.
 *  - While scrubbing: the thumb follows the finger instantly; no animation lag.
 *  - Time labels are relative to now: "Now", "+2h", "+4h" … so the user always knows
 *    how far ahead each tick is without reading an absolute clock time.
 *  - The active label is bright white; inactive ones are dim — identical to Apple Weather.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { parseTimelineInstant } from '@/src/utils/timelineInstant'
import { ACCENT_SOFT, TEXT_TERTIARY } from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM } from '@/src/theme/typography'

// ─── Visual constants ─────────────────────────────────────────────────────────
const TRACK_H = 3
const THUMB_D = 22
const THUMB_R = THUMB_D / 2
const HIT_SLOP = 22
const LABEL_H = 18
const TICK_H_MINOR = 5
const TICK_H_MAJOR = 9

// Spring for when user releases after scrubbing (snaps to nearest grid point)
const RELEASE_SPRING = { damping: 26, stiffness: 260, mass: 0.65 }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function progressFromIndex(idx: number, count: number): number {
  return count <= 1 ? 0 : Math.max(0, Math.min(1, idx / (count - 1)))
}

function indexFromX(x: number, trackWidth: number, count: number): number {
  if (count <= 1 || trackWidth <= 0) return 0
  return Math.round(Math.max(0, Math.min(1, x / trackWidth)) * (count - 1))
}

/**
 * Format a frame timestamp relative to `nowMs`.
 * Returns "Now" when ≤30 min from now, "+Nh" otherwise.
 */
function relativeLabel(timeIso: string, nowMs: number): string {
  const d = parseTimelineInstant(timeIso)
  if (!d) return ''
  const diffMin = (d.getTime() - nowMs) / 60_000
  if (Math.abs(diffMin) <= 30) return 'Now'
  const diffH = Math.round(diffMin / 60)
  return diffH > 0 ? `+${diffH}h` : `${diffH}h`
}

/**
 * Pick indices to show as labelled ticks. Always includes first and last;
 * adds up to 3 interior points roughly evenly spaced. Max 5 labels total.
 */
function buildLabelIndices(count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [0]
  if (count <= 5) return Array.from({ length: count }, (_, i) => i)
  const interior: number[] = []
  const step = Math.floor((count - 1) / 4)
  for (let k = step; k < count - 1 && interior.length < 3; k += step) interior.push(k)
  return [0, ...interior, count - 1]
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RadarTimeScrubberProps {
  times: string[]
  selectedIndex: number
  /** True = playhead is advancing automatically; affects thumb animation style. */
  isPlaying: boolean
  /** Frame advance interval in ms — must match the WebView animation timer (default 1200). */
  frameIntervalMs?: number
  onSelectIndex: (index: number) => void
  onInteractionStart?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RadarTimeScrubber({
  times,
  selectedIndex,
  isPlaying,
  frameIntervalMs = 1200,
  onSelectIndex,
  onInteractionStart,
}: RadarTimeScrubberProps) {
  const [layoutW, setLayoutW] = useState(0)
  const trackRef = useRef(0)
  const draggingRef = useRef(false)
  const lastCommittedRef = useRef(-1)
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // Shared value: thumb x position in px (absolute, not progress)
  const thumbPx = useSharedValue(0)
  const thumbScale = useSharedValue(1)

  const count = times.length
  const safeIndex = count > 0 ? Math.min(Math.max(0, selectedIndex), count - 1) : 0

  // Reference time for relative labels — first parseable time in the list (≈ "now")
  const nowMs = useMemo(() => {
    const first = parseTimelineInstant(times[0] ?? '')
    return first ? first.getTime() : Date.now()
  }, [times[0]])

  const labelIndices = useMemo(() => buildLabelIndices(count), [count])

  // ── Sync thumb with selectedIndex ─────────────────────────────────────────────
  useEffect(() => {
    if (draggingRef.current || trackRef.current <= 0) return
    const w = trackRef.current
    const targetPx = progressFromIndex(safeIndex, count) * w

    if (isPlayingRef.current && count > 1) {
      // While playing: glide linearly from current position toward the NEXT frame's position.
      // This gives a continuously moving bar — the thumb reaches the next grid point exactly
      // when that frame fires, so it never jumps. Linear easing = constant-speed video bar.
      const nextPx = progressFromIndex(Math.min(safeIndex + 1, count - 1), count) * w
      // Snap to current frame position first (in case the previous animation overshot)
      cancelAnimation(thumbPx)
      thumbPx.value = targetPx
      // Then animate toward the next frame over the full interval
      thumbPx.value = withTiming(nextPx, {
        duration: frameIntervalMs,
        easing: Easing.linear,
      })
    } else {
      // Paused: spring-snap to current frame grid point
      cancelAnimation(thumbPx)
      thumbPx.value = withSpring(targetPx, RELEASE_SPRING)
    }

    lastCommittedRef.current = safeIndex
  }, [safeIndex, count, frameIntervalMs])

  // ── On-layout ─────────────────────────────────────────────────────────────────
  const onTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width
      trackRef.current = w
      setLayoutW(w)
      thumbPx.value = progressFromIndex(safeIndex, count) * w
    },
    [safeIndex, count],
  )

  // ── Commit a drag x-position ──────────────────────────────────────────────────
  const commitX = useCallback(
    (localX: number) => {
      const w = trackRef.current
      if (count === 0 || w <= 0) return
      const clampedX = Math.max(0, Math.min(w, localX))
      thumbPx.value = clampedX          // follow finger instantly (no spring during drag)
      const idx = indexFromX(clampedX, w, count)
      if (idx !== lastCommittedRef.current) {
        lastCommittedRef.current = idx
        onSelectIndex(idx)
      }
    },
    [count, onSelectIndex],
  )

  // ── PanResponder ──────────────────────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => count > 0,
        onMoveShouldSetPanResponder: () => count > 0,
        onPanResponderGrant: (e) => {
          if (count === 0) return
          onInteractionStart?.()
          cancelAnimation(thumbPx)
          draggingRef.current = true
          thumbScale.value = withSpring(1.3, { damping: 12, stiffness: 300 })
          commitX(e.nativeEvent.locationX)
        },
        onPanResponderMove: (e) => {
          if (!draggingRef.current || count === 0) return
          commitX(e.nativeEvent.locationX)
        },
        onPanResponderRelease: (e) => {
          draggingRef.current = false
          thumbScale.value = withSpring(1, { damping: 18, stiffness: 300 })
          if (count === 0) return
          commitX(e.nativeEvent.locationX)
          // Snap thumb to the committed grid point
          const w = trackRef.current
          if (w > 0) {
            thumbPx.value = withSpring(
              progressFromIndex(lastCommittedRef.current, count) * w,
              RELEASE_SPRING,
            )
          }
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false
          thumbScale.value = withSpring(1, { damping: 18, stiffness: 300 })
        },
      }),
    [commitX, count, onInteractionStart],
  )

  // ── Animated styles ───────────────────────────────────────────────────────────
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbPx.value - THUMB_R },
      { scale: thumbScale.value },
    ],
  }))

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, thumbPx.value),
  }))

  // ── Edge case ─────────────────────────────────────────────────────────────────
  if (count === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading timeline…</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      {/* ── Relative time labels ─────────────────────────────────────────────── */}
      <View style={[styles.labelsRow, { height: LABEL_H }]} pointerEvents="none">
        {layoutW > 0 &&
          labelIndices.map((i) => {
            const iso = times[i] ?? ''
            const label = relativeLabel(iso, nowMs)
            if (!label) return null
            const rawLeft = (i / Math.max(1, count - 1)) * layoutW
            const isActive = i === safeIndex
            // Clamp so labels near the edges don't clip
            const maxLeft = layoutW - 36
            const clampedLeft = Math.max(0, Math.min(maxLeft, rawLeft - 18))
            return (
              <Text
                key={i}
                numberOfLines={1}
                style={[
                  styles.timeLabel,
                  isActive && styles.timeLabelActive,
                  { position: 'absolute', left: clampedLeft },
                ]}
              >
                {label}
              </Text>
            )
          })}
      </View>

      {/* ── Track + animated thumb ───────────────────────────────────────────── */}
      <View
        style={styles.trackHit}
        {...panResponder.panHandlers}
        onLayout={onTrackLayout}
      >
        {/* Background track */}
        <View style={styles.trackBg}>
          {/* Animated fill */}
          <Animated.View style={[styles.fill, fillStyle]} />

          {/* Per-frame tick marks */}
          {count > 1 &&
            layoutW > 0 &&
            times.map((_, i) => {
              const tickX = (i / (count - 1)) * layoutW
              const isEndpoint = i === 0 || i === count - 1
              const isActive = i === safeIndex
              const isMajor = isEndpoint || isActive
              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.tick,
                    isMajor ? styles.tickMajor : styles.tickMinor,
                    {
                      left: tickX - (isMajor ? 1 : 0.5),
                      height: isMajor ? TICK_H_MAJOR : TICK_H_MINOR,
                      top: -(isMajor ? TICK_H_MAJOR : TICK_H_MINOR - TRACK_H) / 2,
                    },
                  ]}
                />
              )
            })}
        </View>

        {/* Animated playhead thumb */}
        <Animated.View pointerEvents="none" style={[styles.thumb, thumbStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  labelsRow: {
    position: 'relative',
    marginBottom: 8,
  },
  timeLabel: {
    ...FONT_MEDIUM,
    fontSize: 10,
    color: TEXT_TERTIARY,
    letterSpacing: 0.2,
    width: 36,
    textAlign: 'center',
  },
  timeLabelActive: {
    ...FONT_BOLD,
    color: '#ffffff',
  },
  trackHit: {
    minHeight: TRACK_H + HIT_SLOP * 2,
    justifyContent: 'center',
    paddingVertical: HIT_SLOP,
  },
  trackBg: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
    backgroundColor: ACCENT_SOFT,
    opacity: 0.7,
  },
  tick: {
    position: 'absolute',
    borderRadius: 1,
  },
  tickMinor: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  tickMajor: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -THUMB_R,
    width: THUMB_D,
    height: THUMB_D,
    borderRadius: THUMB_R,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: ACCENT_SOFT,
    elevation: 6,
    shadowColor: ACCENT_SOFT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    zIndex: 10,
  },
  empty: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    ...FONT_MEDIUM,
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
})
