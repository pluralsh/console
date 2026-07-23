import { describe, expect, it } from 'vitest'

import {
  decodeChipAttrValue,
  encodeChipAttrValue,
  insertPlrlText,
  serializeEditableDiv,
} from './contentEditableChips'
import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'

describe('chip attr encoding', () => {
  it('round-trips quotes, ampersands, and newlines', () => {
    const raw = 'Title "quoted"\nLine & two\t tab'
    expect(decodeChipAttrValue(encodeChipAttrValue(raw))).toBe(raw)
  })

  it('parses vulnerability chips with encoded descriptions', () => {
    const description = 'CVE details\nwith "quotes" & symbols'
    const xml = `<${MentionKind.Vulnerability} item-id="v1" item-name="CVE-2024-1" description="${encodeChipAttrValue(description)}"></${MentionKind.Vulnerability}>`
    const container = document.createElement('div')
    const range = document.createRange()
    range.selectNodeContents(container)
    range.collapse(true)
    insertPlrlText(range, xml)

    expect(serializeEditableDiv(container).trim()).toBe(xml)
    expect(
      container
        .querySelector('[data-attr-description]')
        ?.getAttribute('data-attr-description')
    ).toBe(description)
  })
})

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
