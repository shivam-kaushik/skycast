import { create } from 'zustand'

export interface UserRoutine {
  morningStartHour: number
  commuteStartHour: number
  commuteEndHour: number
  eveningOutdoorHour: number
}

export interface NotificationFeedback {
  helpful: number
  dismissed: number
}

interface AICoachStore {
  routine: UserRoutine
  feedbackByType: Record<string, NotificationFeedback>
  setRoutine: (routine: Partial<UserRoutine>) => void
  markFeedback: (notificationType: string, helpful: boolean) => void
}

const DEFAULT_ROUTINE: UserRoutine = {
  morningStartHour: 7,
  commuteStartHour: 8,
  commuteEndHour: 18,
  eveningOutdoorHour: 19,
}

export const useAICoachStore = create<AICoachStore>((set) => ({
  routine: DEFAULT_ROUTINE,
  feedbackByType: {},
  setRoutine: (routine) =>
    set((state) => ({
      routine: { ...state.routine, ...routine },
    })),
  markFeedback: (notificationType, helpful) =>
    set((state) => {
      const prev = state.feedbackByType[notificationType] ?? { helpful: 0, dismissed: 0 }
      const next: NotificationFeedback = helpful
        ? { helpful: prev.helpful + 1, dismissed: prev.dismissed }
        : { helpful: prev.helpful, dismissed: prev.dismissed + 1 }
      return {
        feedbackByType: {
          ...state.feedbackByType,
          [notificationType]: next,
        },
      }
    }),
}))
