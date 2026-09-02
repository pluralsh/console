import type { WorkbenchJobModes } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  attributesForPromptMode,
  modesFormValue,
  updateCodingModes,
} from './workbenchPromptModes'

describe('workbench prompt modes', () => {
  it('maps the persisted review setting into form state', () => {
    const value = modesFormValue({
      coding: { approval: false, babysit: false, review: true },
    } as WorkbenchJobModes)

    expect(value?.coding?.review).toBe(true)
  })

  it('updates review mode while preserving other coding settings', () => {
    const value = updateCodingModes(
      { plan: false, coding: { approval: true, babysit: false } },
      { review: true }
    )

    expect(value).toMatchObject({
      plan: false,
      coding: { approval: true, babysit: false, review: true },
    })
  })

  it('clears coding review settings when read mode is selected', () => {
    const value = attributesForPromptMode('plan', {
      plan: false,
      coding: { review: true },
    })

    expect(value.plan).toBe(true)
    expect(value.coding).toBeUndefined()
  })
})
