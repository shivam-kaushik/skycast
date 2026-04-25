import OpenAI from 'openai'
import type { CurrentWeather, HourlyWeather, DailyWeather } from '@/src/types/weather'
import type { AirQualityData } from '@/src/types/weather'
import type { UserRoutine } from '@/src/store/aiCoachStore'
import { describePollenLevel } from '@/src/utils/weatherDescriptions'

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
})

export type ChatModel = 'gpt-4o-mini' | 'gpt-4o'

export interface WeatherContext {
  current: CurrentWeather
  hourly: HourlyWeather
  daily: DailyWeather
  airQuality?: AirQualityData
  routine?: UserRoutine
  persona: 'athlete' | 'wellness'
  unit: 'C' | 'F'
}

export function buildWeatherContext(ctx: WeatherContext): string {
  const { current, hourly, daily, airQuality, routine, persona, unit } = ctx
  const deg = unit === 'C' ? '°C' : '°F'
  const temp = unit === 'C' ? current.temperature : (current.temperature * 9) / 5 + 32

  const pollenPeak = airQuality
    ? describePollenLevel(
        Math.max(
          ...(airQuality.hourly.grassPollen.slice(0, 24).filter(Boolean) as number[]),
          ...(airQuality.hourly.birchPollen.slice(0, 24).filter(Boolean) as number[]),
          ...(airQuality.hourly.ragweedPollen.slice(0, 24).filter(Boolean) as number[]),
        ),
      )
    : 'Unknown'

  const rainHours = hourly.precipitationProbability
    .slice(0, 48)
    .filter((p) => p >= 50).length

  const lines = [
    `Persona: ${persona}`,
    `Current: ${Math.round(temp)}${deg}, ${current.humidity}% humidity, wind ${Math.round(current.windSpeed)} km/h, UV ${current.uvIndex.toFixed(1)}, pressure ${Math.round(current.pressure)} hPa`,
    `Pollen (peak 24h): ${pollenPeak}`,
    `Rain risk (next 48h): ${rainHours} hours with ≥50% chance`,
    `AQI: ${airQuality ? airQuality.current.usAqi : 'unknown'}`,
  ]

  if (routine) {
    lines.push(
      `User schedule: active from ${routine.morningStartHour}:00, commute ${routine.commuteStartHour}–${routine.commuteEndHour}, outdoor evening ${routine.eveningOutdoorHour}:00`,
    )
  }

  return lines.join('\n')
}

export function routeModel(intent: 'chat' | 'wardrobe' | 'trip'): ChatModel {
  return intent === 'trip' ? 'gpt-4o' : 'gpt-4o-mini'
}

const SYSTEM_PROMPT_BASE = `You are Skycast AI, a personal weather assistant. Answer in 2–4 short sentences. Be specific and actionable. No filler or generic advice.`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function streamChat(
  messages: ChatMessage[],
  weatherCtx: string,
  model: ChatModel,
  onToken: (token: string) => void,
): Promise<void> {
  const systemContent = `${SYSTEM_PROMPT_BASE}\n\nWeather context:\n${weatherCtx}`

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemContent },
      ...messages,
    ],
    max_tokens: 300,
  })

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? ''
    if (token) onToken(token)
  }
}

export interface WardrobeAdvice {
  top: string
  bottom: string
  footwear: string
  accessories: string[]
  notes: string
}

export async function getWardrobeAdvice(weatherCtx: string): Promise<WardrobeAdvice> {
  const prompt = `Based on the weather context, provide clothing recommendations as a JSON object with keys: top, bottom, footwear, accessories (array of strings), notes. Be concise.`

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT_BASE}\n\nWeather context:\n${weatherCtx}` },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 250,
  })

  const raw = res.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<WardrobeAdvice>
  return {
    top: parsed.top ?? '',
    bottom: parsed.bottom ?? '',
    footwear: parsed.footwear ?? '',
    accessories: parsed.accessories ?? [],
    notes: parsed.notes ?? '',
  }
}

export async function getTripBriefing(
  destination: string,
  startDate: string,
  endDate: string,
  weatherCtx: string,
): Promise<string> {
  const prompt = `Generate a trip weather briefing for ${destination} from ${startDate} to ${endDate}. Include expected conditions, day-by-day highlights, and packing recommendations. Use the current location's context for comparison. Write 3–5 sentences.`

  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT_BASE}\n\nCurrent location context:\n${weatherCtx}` },
      { role: 'user', content: prompt },
    ],
    max_tokens: 400,
  })

  return res.choices[0]?.message?.content ?? ''
}
