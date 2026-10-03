import { describe, expect, it } from 'vitest'
import { dashboardInputIsReady } from './WorkbenchDashboardFilters'

const validInput = {
  hasDatasource: true,
  hasData: true,
  loading: false,
  optionInput: true,
  hasValidValue: true,
  required: true,
  hasValue: true,
}

describe('dashboardInputIsReady', () => {
  it('stays ready while cached datasource options refresh', () => {
    expect(dashboardInputIsReady({ ...validInput, loading: true })).toBe(true)
  })

  it('waits for an uncached datasource', () => {
    expect(
      dashboardInputIsReady({
        ...validInput,
        hasData: false,
        loading: true,
      })
    ).toBe(false)
  })

  it('waits for required and option values', () => {
    expect(dashboardInputIsReady({ ...validInput, hasValidValue: false })).toBe(
      false
    )
    expect(dashboardInputIsReady({ ...validInput, hasValue: false })).toBe(
      false
    )
  })
})
