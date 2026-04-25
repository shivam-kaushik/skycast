import { useAICoachStore } from '../aiCoachStore'

beforeEach(() => {
  useAICoachStore.setState({
    routine: {
      morningStartHour: 7,
      commuteStartHour: 8,
      commuteEndHour: 18,
      eveningOutdoorHour: 19,
    },
    feedbackByType: {},
  })
})

describe('aiCoachStore', () => {
  it('has correct default routine', () => {
    const { routine } = useAICoachStore.getState()
    expect(routine.morningStartHour).toBe(7)
    expect(routine.commuteStartHour).toBe(8)
    expect(routine.eveningOutdoorHour).toBe(19)
  })

  it('merges partial routine update', () => {
    useAICoachStore.getState().setRoutine({ morningStartHour: 6 })
    const { routine } = useAICoachStore.getState()
    expect(routine.morningStartHour).toBe(6)
    expect(routine.commuteStartHour).toBe(8) // unchanged
  })

  it('records helpful feedback', () => {
    useAICoachStore.getState().markFeedback('rain', true)
    const fb = useAICoachStore.getState().feedbackByType['rain']
    expect(fb?.helpful).toBe(1)
    expect(fb?.dismissed).toBe(0)
  })

  it('records dismissed feedback', () => {
    useAICoachStore.getState().markFeedback('uv', false)
    const fb = useAICoachStore.getState().feedbackByType['uv']
    expect(fb?.helpful).toBe(0)
    expect(fb?.dismissed).toBe(1)
  })

  it('accumulates feedback across calls', () => {
    useAICoachStore.getState().markFeedback('wind', true)
    useAICoachStore.getState().markFeedback('wind', true)
    useAICoachStore.getState().markFeedback('wind', false)
    const fb = useAICoachStore.getState().feedbackByType['wind']
    expect(fb?.helpful).toBe(2)
    expect(fb?.dismissed).toBe(1)
  })
})
