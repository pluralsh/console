import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useTransientWorkbenchPrompt } from './useTransientWorkbenchPrompt'

describe('useTransientWorkbenchPrompt', () => {
  it('consumes a navigation prompt without leaving it in route state', async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/workbenches/workbench-1',
            search: '?backSource=send-to-workbench',
            state: { prompt: 'Investigate this insight' },
          },
        ]}
      >
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(
      () => ({
        prompt: useTransientWorkbenchPrompt().prompt,
        location: useLocation(),
      }),
      { wrapper }
    )

    expect(result.current.prompt).toBe('Investigate this insight')
    await waitFor(() => expect(result.current.location.state).toBeNull())
    expect(result.current.location.search).toBe('?backSource=send-to-workbench')
  })
})
