import type { MapLayer } from '@/src/components/radar/mapLayerConfig'

export interface LegendStop {
  label: string
  color: string
}

export interface RadarLegendConfig {
  title: string
  stops: LegendStop[]
}

const LEGEND_CONFIG: Record<MapLayer, RadarLegendConfig> = {
  precipitation: {
    title: 'Precipitation',
    stops: [
      { label: 'Extreme', color: '#F8E71C' },
      { label: 'Heavy', color: '#C870F8' },
      { label: 'Moderate', color: '#4A9EFF' },
      { label: 'Light', color: '#1E5EFF' },
    ],
  },
  temperature: {
    title: 'Temperature',
    stops: [
      { label: '>38C', color: '#FF3B30' },
      { label: '31-38C', color: '#FF6B6B' },
      { label: '23-30C', color: '#FFD166' },
      { label: '13-22C', color: '#06D6A0' },
      { label: '3-12C', color: '#4A9EFF' },
      { label: '<=2C', color: '#A78BFA' },
    ],
  },
  wind: {
    title: 'Wind',
    stops: [
      { label: 'Severe', color: '#FF6B6B' },
      { label: 'Strong', color: '#FFD166' },
      { label: 'Breezy', color: '#4A9EFF' },
      { label: 'Calm', color: '#06D6A0' },
    ],
  },
  air: {
    title: 'Air Quality',
    stops: [
      { label: 'Very Unhealthy', color: '#C0392B' },
      { label: 'Unhealthy', color: '#FF6B6B' },
      { label: 'Sensitive', color: '#FF9500' },
      { label: 'Moderate', color: '#FFD166' },
      { label: 'Good', color: '#06D6A0' },
    ],
  },
}

export function getRadarLegend(layer: MapLayer): RadarLegendConfig {
  return LEGEND_CONFIG[layer]
}
