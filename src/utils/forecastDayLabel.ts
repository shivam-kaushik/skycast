const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Label for a daily forecast row: Today, Tomorrow, or weekday (local calendar). */
export function getForecastDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  return DAY_NAMES[d.getDay()] ?? dateStr.slice(5)
}
