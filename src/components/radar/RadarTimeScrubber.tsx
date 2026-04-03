import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, PanResponder, type LayoutChangeEvent } from 'react-native'
import {
  firstParsedTimelineDate,
  formatTimelineClock,
  lastParsedTimelineDate,
} from '@/src/utils/timelineInstant'
import { TEXT_TERTIARY, ACCENT_SOFT, GLASS_BG, GHOST_BORDER } from '@/src/theme/colors'
import { FONT_MEDIUM } from '@/src/theme/typography'

const TRACK_H = 6
const THUMB = 16
const HIT_SLOP_V = 18

function indexFromLocalX(localX: number, trackWidth: number, count: number): number {
  if (count <= 1 || trackWidth <= 0) return 0
  const r = Math.max(0, Math.min(1, localX / trackWidth))
  return Math.round(r * (count - 1))
}

interface RadarTimeScrubberProps {
  times: string[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  /** Pause playback as soon as the user touches the timeline (video-style). */
  onInteractionStart?: () => void
}

/**
 * Single continuous timeline with progress fill and draggable thumb (video-style scrubber).
 */
export default function RadarTimeScrubber({
  times,
  selectedIndex,
  onSelectIndex,
  onInteractionStart,
}: RadarTimeScrubberProps) {
  const trackW = useRef(0)
  const [layoutW, setLayoutW] = useState(0)
  const draggingRef = useRef(false)
  const lastCommitted = useRef(-1)

  const count = times.length
  const safeIndex = count > 0 ? Math.min(Math.max(0, selectedIndex), count - 1) : 0
  const progress = count <= 1 ? 0 : safeIndex / (count - 1)

  useEffect(() => {
    lastCommitted.current = safeIndex
  }, [safeIndex])

  const firstClock = useMemo(
    () => formatTimelineClock(firstParsedTimelineDate(times)),
    [times],
  )
  const lastClock = useMemo(
    () => formatTimelineClock(lastParsedTimelineDate(times)),
    [times],
  )

  const commitX = useCallback(
    (localX: number) => {
      const w = trackW.current
      if (count === 0 || w <= 0) return
      const idx = indexFromLocalX(localX, w, count)
      if (idx === lastCommitted.current) return
      lastCommitted.current = idx
      onSelectIndex(idx)
    },
    [count, onSelectIndex],
  )

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => count > 0,
        onMoveShouldSetPanResponder: () => count > 0,
        onPanResponderGrant: (e) => {
          if (count === 0) return
          onInteractionStart?.()
          draggingRef.current = true
          commitX(e.nativeEvent.locationX)
        },
        onPanResponderMove: (e) => {
          if (!draggingRef.current || count === 0) return
          commitX(e.nativeEvent.locationX)
        },
        onPanResponderRelease: (e) => {
          draggingRef.current = false
          if (count === 0) return
          commitX(e.nativeEvent.locationX)
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false
        },
      }),
    [commitX, count, onInteractionStart],
  )

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    trackW.current = w
    setLayoutW(w)
  }, [])

  if (count === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading timeline…</Text>
      </View>
    )
  }

  const fillW = layoutW > 0 ? Math.max(0, progress * layoutW) : 0
  const thumbLeft =
    layoutW > 0 ? Math.max(0, Math.min(layoutW - THUMB, progress * layoutW - THUMB / 2)) : 0

  return (
    <View style={styles.wrap}>
      <View style={styles.labelsRow}>
        <Text style={styles.endLabel}>{firstClock}</Text>
        <Text style={styles.endLabel}>{lastClock}</Text>
      </View>
      <View style={styles.trackHit} {...panResponder.panHandlers} onLayout={onTrackLayout}>
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: fillW }]} />
          {count > 1 &&
            layoutW > 0 &&
            times.map((_, i) => {
              const tickLeft = (i / (count - 1)) * layoutW
              const isMajor = i === 0 || i === count - 1 || i === safeIndex
              return (
                <View
                  key={`tick-${i}`}
                  pointerEvents="none"
                  style={[
                    styles.tick,
                    isMajor ? styles.tickMajor : styles.tickMinor,
                    { left: tickLeft - (isMajor ? 1 : 0.5) },
                  ]}
                />
              )
            })}
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              top: '50%',
              marginTop: -THUMB / 2,
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  endLabel: {
    ...FONT_MEDIUM,
    fontSize: 10,
    color: TEXT_TERTIARY,
    letterSpacing: 0.3,
  },
  trackHit: {
    minHeight: TRACK_H + HIT_SLOP_V * 2,
    justifyContent: 'center',
    paddingVertical: HIT_SLOP_V,
  },
  trackBg: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GHOST_BORDER,
    overflow: 'hidden',
    position: 'relative',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
    backgroundColor: 'rgba(255, 193, 7, 0.45)',
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tickMinor: {
    opacity: 0.6,
  },
  tickMajor: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 2,
    borderColor: 'rgba(10, 15, 30, 0.95)',
    zIndex: 2,
    elevation: 4,
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
