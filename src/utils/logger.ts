type LogContext = Record<string, unknown>

type LoggerMethod = (scope: string, message?: string | Error | unknown, context?: LogContext) => void

function normalizeMessage(message: string | Error | unknown): string {
  if (message instanceof Error) return message.message
  if (typeof message === 'string') return message
  try {
    return JSON.stringify(message)
  } catch {
    return String(message)
  }
}

function buildPayload(scope: string, message: string | Error | unknown, context?: LogContext) {
  const payload: LogContext = {
    scope,
    message: normalizeMessage(message),
    ...(context ?? {}),
  }

  return payload
}

export const logger = {
  info: ((scope: string, message?: string | Error | unknown, context?: LogContext) => {
    const payload = buildPayload(scope, message ?? 'info', context)
    console.info(`[${scope}]`, payload)
  }) as LoggerMethod,

  warn: ((scope: string, message?: string | Error | unknown, context?: LogContext) => {
    const payload = buildPayload(scope, message ?? 'warning', context)
    console.warn(`[${scope}]`, payload)
  }) as LoggerMethod,

  error: ((scope: string, message?: string | Error | unknown, context?: LogContext) => {
    const payload = buildPayload(scope, message ?? 'error', context)
    console.error(`[${scope}]`, payload)
  }) as LoggerMethod,
}
