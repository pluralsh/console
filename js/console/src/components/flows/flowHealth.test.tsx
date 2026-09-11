import { render, screen } from '@testing-library/react'
import {
  HonorableThemeProvider,
  styledThemeDark,
} from '@pluralsh/design-system'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it } from 'vitest'
import { FlowPipelineChip } from './flowHealth'

function renderPipelineChip({
  pipelineCount,
  pendingCount,
  stoppedCount,
}: {
  pipelineCount: number
  pendingCount: number
  stoppedCount?: number
}) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={styledThemeDark}>
        <HonorableThemeProvider>
          <FlowPipelineChip
            pipelineCount={pipelineCount}
            pendingCount={pendingCount}
            stoppedCount={stoppedCount}
          />
        </HonorableThemeProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('FlowPipelineChip', () => {
  it('shows the total pipeline count alongside pending pipelines', () => {
    renderPipelineChip({ pipelineCount: 5, pendingCount: 1 })

    expect(screen.getByText('5 pipelines')).toBeTruthy()
    expect(screen.getByText('1 pending')).toBeTruthy()
  })

  it('shows the total pipeline count alongside stopped pipelines', () => {
    renderPipelineChip({ pipelineCount: 2, pendingCount: 0, stoppedCount: 1 })

    expect(screen.getByText('2 pipelines')).toBeTruthy()
    expect(screen.getByText('1 stopped')).toBeTruthy()
  })
})
