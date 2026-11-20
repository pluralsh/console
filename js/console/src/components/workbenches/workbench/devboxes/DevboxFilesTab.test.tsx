import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { DevboxFilesTab } from './DevboxFilesTab'
import { DevboxWorkspaceApi } from './devboxWorkspaceApi'

const tree: Record<string, { path: string; name: string; type: string }[]> = {
  '~': [
    { path: '/home/devbox/README.md', name: 'README.md', type: 'file' },
    { path: '/home/devbox/src', name: 'src', type: 'directory' },
  ],
  '/home/devbox/src': [
    { path: '/home/devbox/src/values.yaml', name: 'values.yaml', type: 'file' },
  ],
}

function renderTab(selected: Nullable<string>, onSelect = vi.fn()) {
  const api = {
    listFiles: vi.fn(async (path: string) => tree[path] ?? []),
    readFile: vi.fn(async (path: string) => ({ path, content: 'a: 1' })),
  } as unknown as DevboxWorkspaceApi
  render(
    <ThemeProvider theme={styledThemeDark}>
      <DevboxFilesTab
        api={api}
        live
        selected={selected}
        onSelect={onSelect}
      />
    </ThemeProvider>
  )
  return { onSelect }
}

describe('DevboxFilesTab', () => {
  it('lists folders first with file type icons', async () => {
    const { onSelect } = renderTab(null)
    const readme = await screen.findByText('README.md')
    expect(screen.getAllByRole('treeitem')[0].textContent).toBe('src')
    expect(screen.getByAltText('md')).toBeTruthy()
    fireEvent.click(readme)
    expect(onSelect).toHaveBeenCalledWith('/home/devbox/README.md')
  })

  it('reveals a selected file inside a folder', async () => {
    renderTab('/home/devbox/src/values.yaml')
    expect(await screen.findByText('values.yaml')).toBeTruthy()
    expect(screen.getByAltText('yaml')).toBeTruthy()
  })

  it('only shows the tree, leaving the file to the main view', async () => {
    renderTab('/home/devbox/README.md')
    await screen.findByText('README.md')
    expect(screen.queryByText('a: 1')).toBeNull()
  })
})
