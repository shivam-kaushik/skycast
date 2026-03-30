import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { BG, ACCENT, TEXT_TERTIARY, GLASS_BORDER } from '@/src/theme/colors'

type IoniconName = ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, color, size }: { name: IoniconName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: GLASS_BORDER,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TEXT_TERTIARY,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          title: 'Radar',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="navigate-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="air"
        options={{
          title: 'Air',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="leaf-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Hide legacy template screens */}
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  )
}
