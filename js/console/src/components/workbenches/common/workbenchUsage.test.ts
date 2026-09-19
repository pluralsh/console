import { describe, expect, it } from 'vitest'
import {
  billedTokenCount,
  cachedPromptPercentageLabel,
  cachedShareOfPrompt,
  formatTokenCost,
  formatTokenCount,
  inputShareOfTotal,
  outputShareOfTotal,
  promptTokenCount,
  reasoningShareOfOutput,
} from './workbenchUsage'

describe('workbench usage formatting', () => {
  it('formats token counts below 1K as 1K', () => {
    expect(formatTokenCount(0)).toBe('0')
    expect(formatTokenCount(1)).toBe('1K')
    expect(formatTokenCount(500)).toBe('1K')
    expect(formatTokenCount(999)).toBe('1K')
  })

  it('formats token counts to whole K below 1M', () => {
    expect(formatTokenCount(1_000)).toBe('1K')
    expect(formatTokenCount(1_001)).toBe('1K')
    expect(formatTokenCount(1_100)).toBe('1K')
    expect(formatTokenCount(1_499)).toBe('1K')
    expect(formatTokenCount(1_500)).toBe('2K')
    expect(formatTokenCount(1_501)).toBe('2K')
    expect(formatTokenCount(1_600)).toBe('2K')
    expect(formatTokenCount(995_000)).toBe('995K')
  })

  it('promotes rounded 1000K to 1M near the million boundary', () => {
    expect(formatTokenCount(999_499)).toBe('999K')
    expect(formatTokenCount(999_500)).toBe('1M')
    expect(formatTokenCount(999_501)).toBe('1M')
    expect(formatTokenCount(999_999)).toBe('1M')
  })

  it('formats token counts with one decimal for M and bigger', () => {
    expect(formatTokenCount(1_000_000)).toBe('1M')
    expect(formatTokenCount(1_050_000)).toBe('1.1M')
    expect(formatTokenCount(1_100_000)).toBe('1.1M')
    expect(formatTokenCount(2_800_000)).toBe('2.8M')
    expect(formatTokenCount(3_000_000)).toBe('3M')
    expect(formatTokenCount(3_004_000)).toBe('3M')
    expect(formatTokenCount(3_050_000)).toBe('3.1M')
  })

  it('formats token counts with one decimal for B and bigger', () => {
    expect(formatTokenCount(1_000_000_000)).toBe('1B')
    expect(formatTokenCount(1_500_000_000)).toBe('1.5B')
  })

  it('formats token cost with two decimals', () => {
    expect(formatTokenCost(9.37)).toBe('$9.37')
    expect(formatTokenCost(10)).toBe('$10.00')
  })

  it('does not format missing usage values', () => {
    expect(formatTokenCount(null)).toBeUndefined()
    expect(formatTokenCost(undefined)).toBeUndefined()
  })

  it('does not format zero cost values', () => {
    expect(formatTokenCost(0)).toBeUndefined()
  })
})

describe('workbench token usage shares', () => {
  it('treats OpenAI-style cache reads as a subset of input tokens', () => {
    const usage = {
      inputTokens: 1_000,
      cachedTokens: 800,
      outputTokens: 200,
      totalTokens: 1_200,
    }

    expect(promptTokenCount(usage)).toBe(1_000)
    expect(cachedShareOfPrompt(usage)).toBeCloseTo(0.8)
    expect(cachedPromptPercentageLabel(usage)).toBe('80% of input')
    expect(inputShareOfTotal(usage)).toBeCloseTo(1_000 / 1_200)
    expect(outputShareOfTotal(usage)).toBeCloseTo(200 / 1_200)
  })

  it('does not divide Anthropic/Gemini cache reads by uncached input tokens', () => {
    const usage = {
      inputTokens: 824,
      cachedTokens: 667_000,
      outputTokens: 19_000,
      reasoningTokens: 0,
      totalTokens: 57_140,
    }

    expect(promptTokenCount(usage)).toBe(667_824)
    expect(cachedShareOfPrompt(usage)).toBeCloseTo(667_000 / 667_824)
    expect(cachedPromptPercentageLabel(usage)).toBe('100% of input')
    expect(cachedShareOfPrompt(usage)).toBeLessThanOrEqual(1)
    expect(inputShareOfTotal(usage)).toBeCloseTo(824 / 57_140)
    expect(outputShareOfTotal(usage)).toBeCloseTo(19_000 / 57_140)
  })

  it('measures reasoning against output rather than job total', () => {
    const usage = {
      inputTokens: 100,
      outputTokens: 400,
      reasoningTokens: 100,
      totalTokens: 500,
    }

    expect(reasoningShareOfOutput(usage)).toBeCloseTo(0.25)
  })

  it('does not fold nested cache or reasoning counts into a fallback total', () => {
    expect(
      billedTokenCount({
        inputTokens: 50,
        outputTokens: 10,
        cachedTokens: 10_000,
        reasoningTokens: 4,
      })
    ).toBe(60)
  })

  it('omits a cache percentage when no tokens were cached', () => {
    expect(
      cachedPromptPercentageLabel({ inputTokens: 1_000, cachedTokens: 0 })
    ).toBeUndefined()
  })
})
