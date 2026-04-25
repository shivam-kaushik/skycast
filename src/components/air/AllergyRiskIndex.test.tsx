import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AllergyRiskIndex from './AllergyRiskIndex'
import type { AllergyRiskData } from '@/src/types/weather'

const RISK: AllergyRiskData = {
  label: 'High',
  score: 0.75,
  dominantAllergen: 'Grass',
}

describe('AllergyRiskIndex', () => {
  it('renders risk label and dominant allergen', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<AllergyRiskIndex risk={RISK} humidity={65} windSpeed={18} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/High/)
    expect(json).toMatch(/Grass/)
    expect(json).toMatch(/Humidity/)
    expect(json).toMatch(/65/)
  })

  it('renders without dominant allergen', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <AllergyRiskIndex risk={{ ...RISK, dominantAllergen: null }} humidity={40} windSpeed={10} />,
      )
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
