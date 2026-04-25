import React from 'react'
import { View, Pressable, StyleSheet, Platform } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { BG, ON_SURFACE, ACCENT_SOFT } from '@/src/theme/colors'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<string, { active: IoniconName; idle: IoniconName }> = {
  index: { active: 'home', idle: 'home-outline' },
  radar: { active: 'radio', idle: 'radio-outline' },
  air: { active: 'leaf', idle: 'leaf-outline' },
  sky: { active: 'moon', idle: 'moon-outline' },
  more: { active: 'ellipsis-horizontal', idle: 'ellipsis-horizontal' },
}

export default function StitchTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={Platform.OS === 'ios' ? 48 : 32} tint="dark" style={styles.blur}>
        <View style={styles.inner}>
          {state.routes.map((route, index) => {
            const opts = descriptors[route.key]?.options
            if (route.name === 'two') return null

            const isFocused = state.index === index
            const icons = TAB_ICONS[route.name] ?? {
              active: 'ellipse',
              idle: 'ellipse-outline',
            }
            const name = isFocused ? icons.active : icons.idle

            const onPress = (): void => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params)
              }
            }

            const onLongPress = (): void => {
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={(opts?.title as string | undefined) ?? route.name}
                testID={`tab-${route.name}`}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  styles.tabBtn,
                  isFocused && styles.tabBtnActive,
                  pressed && styles.tabBtnPressed,
                ]}
              >
                <Ionicons
                  name={name}
                  size={22}
                  color={isFocused ? BG : 'rgba(240, 232, 216, 0.75)'}
                />
              </Pressable>
            )
          })}
        </View>
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  blur: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    ...Platform.select({
      ios: {
        shadowColor: ACCENT_SOFT,
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.15,
        shadowRadius: 48,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10, 8, 4, 0.42)',
  },
  tabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: ON_SURFACE,
    ...Platform.select({
      ios: {
        shadowColor: ON_SURFACE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  tabBtnPressed: {
    opacity: 0.85,
  },
})
