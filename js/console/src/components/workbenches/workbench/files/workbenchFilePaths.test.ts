import { describe, expect, it } from 'vitest'
import {
  ancestorDirectories,
  basename,
  toWorkbenchPath,
} from './workbenchFilePaths'

describe('workbenchFilePaths', () => {
  it('strips the sandbox mount from agent paths', () => {
    expect(toWorkbenchPath('/workbench/reports/a.md')).toBe('/reports/a.md')
    expect(toWorkbenchPath('/workbench')).toBe('/')
    expect(toWorkbenchPath('/workbenches/a.md')).toBe('/workbenches/a.md')
    expect(toWorkbenchPath('reports/a.md')).toBe('/reports/a.md')
  })

  it('lists ancestor directories outermost first', () => {
    expect(ancestorDirectories('/a/b/c.md')).toEqual(['/a', '/a/b'])
    expect(ancestorDirectories('/c.md')).toEqual([])
    expect(ancestorDirectories(null)).toEqual([])
  })

  it('takes the last path segment as the name', () => {
    expect(basename('/a/b/c.md')).toBe('c.md')
    expect(basename('/a/b/')).toBe('b')
  })
})
