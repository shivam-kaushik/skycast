import type { AirQualityData, DailyWeather, HourlyWeather } from '@/src/types/weather'
import {
  buildActivityWindowInsights,
  buildPhase2Insights,
  buildPhase3Insights,
  buildSmartNotifications,
  buildTomorrowHeadsUp,
} from '@/src/utils/aiInsights'

function makeHourly(date: string): HourlyWeather {
  const time = Array.from({ length: 24 }, (_, hour) => `${date}T${hour.toString().padStart(2, '0')}:00`)
  return {
    time,
    temperature: time.map(() => 20),
    apparentTemperature: time.map(() => 20),
    precipitationProbability: time.map((_, i) => (i === 10 ? 70 : 10)),
    precipitation: time.map(() => 0),
    weatherCode: time.map(() => 0),
    windSpeed: time.map(() => 10),
    windGusts: time.map((_, i) => (i === 15 ? 60 : 20)),
    uvIndex: time.map((_, i) => (i === 12 ? 8 : 3)),
    cloudCover: time.map(() => 20),
    visibility: time.map(() => 10),
    humidity: time.map(() => 50),
  }
}

function makeDaily(today: string, tomorrow: string): DailyWeather {
  return {
    time: [today, tomorrow],
    tempMax: [22, 21],
    tempMin: [12, 11],
    weatherCode: [0, 0],
    precipitationSum: [0, 5],
    precipitationProbabilityMax: [40, 80],
    windSpeedMax: [20, 25],
    windGustsMax: [30, 45],
    uvIndexMax: [6, 7],
    sunrise: [`${today}T06:00`, `${tomorrow}T06:00`],
    sunset: [`${today}T19:00`, `${tomorrow}T19:00`],
  }
}

describe('aiInsights', () => {
  const today = '2026-04-07'
  const tomorrow = '2026-04-08'
  const hourly = makeHourly(today)
  const daily = makeDaily(today, tomorrow)
  const airQuality: AirQualityData = {
    current: {
      pm10: 10,
      pm25: 8,
      co: 0.1,
      no2: 5,
      ozone: 30,
      so2: 1,
      usAqi: 95,
      europeanAqi: 40,
    },
    hourly: {
      time: hourly.time,
      pm10: hourly.time.map(() => 10),
      pm25: hourly.time.map(() => 8),
      no2: hourly.time.map(() => 5),
      ozone: hourly.time.map(() => 30),
      alderPollen: hourly.time.map(() => 0),
      birchPollen: hourly.time.map(() => 0),
      grassPollen: hourly.time.map((_, i) => (i === 11 ? 50 : 5)),
      mugwortPollen: hourly.time.map(() => 0),
      olivePollen: hourly.time.map(() => 0),
      ragweedPollen: hourly.time.map(() => 0),
    },
  }

  const baseInput = {
    hourly,
    daily,
    airQuality,
    alertsEnabled: {
      rain: true,
      uv: true,
      wind: true,
      pollen: true,
      severe: true,
    },
    thresholds: { rain: 60, uv: 7, wind: 50 },
    routine: {
      morningStartHour: 7,
      commuteStartHour: 8,
      commuteEndHour: 18,
      eveningOutdoorHour: 19,
    },
    now: new Date(`${today}T09:00:00`),
  }

  it('builds activity windows', () => {
    const insights = buildActivityWindowInsights(baseInput)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]?.title.length).toBeGreaterThan(0)
  })

  it('builds tomorrow heads-up when tomorrow exists', () => {
    const headsUp = buildTomorrowHeadsUp(baseInput)
    expect(headsUp).not.toBeNull()
    expect(headsUp?.message).toMatch(/Tomorrow/)
  })

  it('builds smart notifications honoring thresholds', () => {
    const notifications = buildSmartNotifications(baseInput)
    const types = notifications.map((n) => n.type)
    expect(types).toEqual(expect.arrayContaining(['rain', 'uv', 'wind', 'pollen', 'tomorrow']))
  })

  it('builds phase 2 and 3 insights', () => {
    const p2 = buildPhase2Insights(baseInput)
    const p3 = buildPhase3Insights(baseInput)
    expect(p2.length).toBeGreaterThan(0)
    expect(p3.length).toBeGreaterThan(0)
  })
})
