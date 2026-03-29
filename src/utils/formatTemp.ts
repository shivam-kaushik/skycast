export function formatTemp(value: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    const fahrenheit = Math.round(value * (9 / 5) + 32)
    return `${fahrenheit}°F`
  }
  return `${Math.round(value)}°C`
}
