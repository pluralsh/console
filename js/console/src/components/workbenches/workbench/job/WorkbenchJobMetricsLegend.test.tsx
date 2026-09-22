import { fireEvent, render, screen } from '@testing-library/react'
import { styledThemeDark } from '@pluralsh/design-system'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { WorkbenchJobMetricsLegend } from './WorkbenchJobActivityResults'

describe('WorkbenchJobMetricsLegend', () => {
  it('selects a series and visually de-emphasizes the others', () => {
    const onSelect = vi.fn()

    render(
      <ThemeProvider theme={styledThemeDark}>
        <WorkbenchJobMetricsLegend
          series={[
            { id: 'success', label: 'status=success', data: [] },
            { id: 'error', label: 'status=error', data: [] },
          ]}
          selectedId="success"
          onSelect={onSelect}
        />
      </ThemeProvider>
    )

    const selected = screen.getByRole('button', { name: 'status=success' })
    const other = screen.getByRole('button', { name: 'status=error' })

    expect(selected.getAttribute('aria-pressed')).toBe('true')
    expect(other.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(other)
    expect(onSelect).toHaveBeenCalledWith('error')
  })
})
