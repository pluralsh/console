import { styledThemeDark } from '@pluralsh/design-system'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it } from 'vitest'

import { ChatMarkdown } from './ChatMarkdown'
import { SimplifiedMarkdown } from './multithread/MultiThreadViewerMessage'

const text =
  'See <plrl-file path="/workbench/reports/latency.md" description="p99 by region"></plrl-file> and ' +
  '<plrl-file path="/workbench/data/raw.csv" onclick="alert(1)">the raw data</plrl-file>' +
  '<script>alert(2)</script>'

describe('plrl-file references', () => {
  it.each([
    ['ChatMarkdown', <ChatMarkdown text={text} />],
    ['SimplifiedMarkdown', <SimplifiedMarkdown text={text} />],
  ])('render as sanitized chips in %s', (_, markdown) => {
    const { container } = render(
      <ThemeProvider theme={styledThemeDark}>{markdown}</ThemeProvider>
    )

    expect(screen.getByText('latency.md')).toBeTruthy()
    expect(screen.getByText('the raw data')).toBeTruthy()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('[onclick]')).toBeNull()
  })
})
