import React from 'react'
import { Tabs } from 'expo-router'
import StitchTabBar from '@/src/components/navigation/StitchTabBar'
import { BG } from '@/src/theme/colors'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <StitchTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: BG },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="radar" options={{ title: 'Radar' }} />
      <Tabs.Screen name="air" options={{ title: 'Air' }} />
      <Tabs.Screen name="sky" options={{ title: 'Sky' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  )
}
