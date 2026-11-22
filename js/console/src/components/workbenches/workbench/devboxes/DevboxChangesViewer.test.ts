import { describe, expect, it } from 'vitest'
import { diffStatBoxes } from './DevboxChangesViewer'

describe('diffStatBoxes', () => {
  it.each([
    [0, 0, 0, 0],
    [2, 0, 2, 0],
    [1, 1, 1, 1],
    [3, 1, 3, 1],
    [5, 0, 5, 0],
    [10, 10, 2, 2],
    [7, 3, 3, 1],
    [1000, 1, 4, 0],
  ])('+%i −%i fills %i added and %i deleted', (add, del, added, deleted) => {
    expect(diffStatBoxes(add, del)).toEqual({ added, deleted })
  })
})
