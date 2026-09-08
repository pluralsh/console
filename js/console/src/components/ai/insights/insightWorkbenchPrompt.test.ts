import { describe, expect, it } from 'vitest'
import { extractSummaryAndRootCause } from './insightWorkbenchPrompt'

describe('extractSummaryAndRootCause', () => {
  it('keeps only the Summary and Root Cause sections', () => {
    expect(
      extractSummaryAndRootCause(`## Summary

The deployment cannot pull its image.

## Root Cause

The configured image tag does not exist.

## Key Evidence

The pod reports ImagePullBackOff.

## Contextual Observations

Use an approved image tag.`)
    ).toBe(`## Summary

The deployment cannot pull its image.

## Root Cause

The configured image tag does not exist.`)
  })

  it('returns an empty prompt when neither section exists', () => {
    expect(
      extractSummaryAndRootCause('## Key Evidence\n\nNo matching sections.')
    ).toBe('')
  })
})
