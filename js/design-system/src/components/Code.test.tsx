import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getByRole } from '@testing-library/dom'
import { ThemeProvider } from 'styled-components'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { styledThemeDark } from '../theme'
import Code from './Code'

// @ts-expect-error React's act() environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// jsdom has no ResizeObserver; report one resize so Code picks its tab layout
globalThis.ResizeObserver = class {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ target, contentRect: target.getBoundingClientRect() }] as any,
      this as unknown as ResizeObserver
    )
  }
  unobserve() {}
  disconnect() {}
}

vi.mock('react-use-measure', () => ({
  default: () => [() => {}, { height: 0 }],
}))

const tabs = [
  { key: 'linux', label: 'Linux', language: 'sh', content: 'echo linux' },
  { key: 'macos', label: 'macOS', language: 'sh', content: 'echo macos' },
]

const container = document.createElement('div')

document.body.appendChild(container)
afterEach(() => (container.innerHTML = ''))

// multipanel panels carry aria-hidden instead of a tabpanel role
const panelFor = (key: string) =>
  container.querySelector(`[id$="-tabpanel-${key}"]`)

describe('Code tabs', () => {
  it('shows the selected tab panel after switching tabs', async () => {
    const root = createRoot(container)

    await act(async () =>
      root.render(
        <ThemeProvider theme={styledThemeDark}>
          <Code tabs={tabs} />
        </ThemeProvider>
      )
    )

    expect(panelFor('linux')?.getAttribute('aria-hidden')).toBeNull()
    expect(panelFor('macos')?.getAttribute('aria-hidden')).toBe('true')

    await act(async () =>
      getByRole(container, 'tab', { name: 'macOS' }).dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    )

    expect(panelFor('linux')?.getAttribute('aria-hidden')).toBe('true')
    expect(panelFor('macos')?.getAttribute('aria-hidden')).toBeNull()

    await act(async () => root.unmount())
  })
})
