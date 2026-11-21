import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { DevboxDiffTab } from './DevboxDiffTab'

vi.mock('./devboxChanges', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./devboxChanges')>()),
  useDevboxChanges: () => ({
    groups: [
      {
        repository: 'console',
        path: '/home/dev/console',
        files: [
          { path: 'docs/webhooks.mdx', status: 'modified', additions: 4 },
          {
            path: 'monolith/src/lib/rate-limit.ts',
            status: 'added',
            additions: 28,
          },
        ],
      },
    ],
    loading: false,
    refetch: vi.fn(),
  }),
}))

describe('DevboxDiffTab', () => {
  it('lists changes as a tree and selects a file to view its diff', () => {
    const onSelect = vi.fn()
    render(
      <ThemeProvider theme={styledThemeDark}>
        <DevboxDiffTab
          instanceId="inst"
          live
          selected={null}
          onSelect={onSelect}
        />
      </ThemeProvider>
    )
    expect(screen.getByText('All changes')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('monolith / src / lib')).toBeTruthy()
    expect(screen.getByText('+28')).toBeTruthy()
    expect(screen.getByText('A')).toBeTruthy()

    fireEvent.click(screen.getByText('webhooks.mdx'))
    expect(onSelect).toHaveBeenLastCalledWith(
      '/home/dev/console/docs/webhooks.mdx'
    )
    fireEvent.click(screen.getByText('All changes'))
    expect(onSelect).toHaveBeenLastCalledWith('*')
  })
})
