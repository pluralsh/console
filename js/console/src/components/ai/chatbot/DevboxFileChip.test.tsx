import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { ChatMarkdown } from './ChatMarkdown'
import { DevboxFileOpenContext, withSlashCommandChip } from './DevboxFileChip'

const renderMarkdown = (text: string, openFile?: (path: string) => void) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={styledThemeDark}>
        <DevboxFileOpenContext value={openFile ?? null}>
          <ChatMarkdown text={text} />
        </DevboxFileOpenContext>
      </ThemeProvider>
    </MemoryRouter>
  )

describe('withSlashCommandChip', () => {
  it('chips only a leading command and renders it', () => {
    expect(withSlashCommandChip('/review the tests')).toBe(
      '<plrl-devbox-command command="review"></plrl-devbox-command> the tests'
    )
    expect(withSlashCommandChip('run /review')).toBe('run /review')

    renderMarkdown(withSlashCommandChip('/skill:refactor now'))
    expect(screen.getByText('/skill:refactor')).toBeTruthy()
  })
})

describe('DevboxFileChip', () => {
  it('renders file tags as chips that open the path', () => {
    const openFile = vi.fn()
    renderMarkdown(
      'explain <plrl-devbox-file path="/home/devbox/console/"></plrl-devbox-file> and <plrl-devbox-file path="/home/devbox/main.go"></plrl-devbox-file>',
      openFile
    )
    fireEvent.click(screen.getByText('console/'))
    expect(openFile).toHaveBeenCalledWith('/home/devbox/console/')
    fireEvent.click(screen.getByText('main.go'))
    expect(openFile).toHaveBeenLastCalledWith('/home/devbox/main.go')
  })

  it('renders a plain chip outside a devbox', () => {
    renderMarkdown(
      'see <plrl-devbox-file path="/home/devbox/main.go"></plrl-devbox-file>'
    )
    expect(screen.getByText('main.go')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
