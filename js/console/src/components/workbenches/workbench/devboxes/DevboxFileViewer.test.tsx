import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { DevboxFileViewer, languageForPath } from './DevboxFileViewer'
import { DevboxWorkspaceApi } from './devboxWorkspaceApi'

describe('DevboxFileViewer', () => {
  it('shows the file and closes back to the session', async () => {
    const onClose = vi.fn()
    const api = {
      readFile: vi.fn(async (path: string) => ({ path, content: 'a: 1' })),
    } as unknown as DevboxWorkspaceApi
    render(
      <ThemeProvider theme={styledThemeDark}>
        <DevboxFileViewer
          api={api}
          path="/home/devbox/values.yaml"
          onClose={onClose}
        />
      </ThemeProvider>
    )
    expect(await screen.findByText('values.yaml')).toBeTruthy()
    await waitFor(() =>
      expect(api.readFile).toHaveBeenCalledWith('/home/devbox/values.yaml')
    )
    fireEvent.click(screen.getByLabelText('Close file'))
    expect(onClose).toHaveBeenCalled()
  })

  it('picks a language from the extension', () => {
    expect(languageForPath('main.go')).toBe('go')
    expect(languageForPath('Dockerfile')).toBe('plaintext')
  })
})
