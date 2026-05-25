import { describe, expect, it } from 'vitest'

import { serializeEditableDiv } from './contentEditableChips'

describe('serializeEditableDiv', () => {
  it('preserves newlines between a root text node and a sibling div', () => {
    const container = document.createElement('div')
    container.appendChild(document.createTextNode('skill_math.md'))
    const line = document.createElement('div')
    line.appendChild(document.createTextNode('skill_science.md'))
    container.appendChild(line)

    expect(serializeEditableDiv(container).trim()).toBe(
      'skill_math.md\nskill_science.md'
    )
  })

  it('preserves newlines between sibling div lines', () => {
    const container = document.createElement('div')
    for (const name of ['skill_math.md', 'skill_science.md']) {
      const line = document.createElement('div')
      line.appendChild(document.createTextNode(name))
      container.appendChild(line)
    }

    expect(serializeEditableDiv(container).trim()).toBe(
      'skill_math.md\nskill_science.md'
    )
  })

  it('preserves newlines between br-separated lines', () => {
    const container = document.createElement('div')
    container.appendChild(document.createTextNode('skill_math.md'))
    container.appendChild(document.createElement('br'))
    container.appendChild(document.createTextNode('skill_science.md'))

    expect(serializeEditableDiv(container).trim()).toBe(
      'skill_math.md\nskill_science.md'
    )
  })
})
