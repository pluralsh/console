import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { ChatMarkdown } from './ChatMarkdown'
import {
  DevboxFileOpenContext,
  devboxLinkPath,
  withSlashCommandChip,
} from './DevboxFileChip'

const renderMarkdown = (
  text: string,
  openFile?: (path: string) => void,
  cwd = '/home/devbox/console'
) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={styledThemeDark}>
        <DevboxFileOpenContext value={openFile ? { openFile, cwd } : null}>
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

describe('devboxLinkPath', () => {
  const cwd = '/home/devbox/console'

  it('resolves relative links against the working directory', () => {
    expect(devboxLinkPath('src/main.go', cwd)).toBe(
      '/home/devbox/console/src/main.go'
    )
    expect(devboxLinkPath('./src/../go.mod', `${cwd}/`)).toBe(
      '/home/devbox/console/go.mod'
    )
    expect(devboxLinkPath('../other/', cwd)).toBe('/home/devbox/other/')
    expect(devboxLinkPath('src/main.go', null)).toBeNull()
  })

  it('keeps absolute and file:// paths, dropping line suffixes', () => {
    expect(devboxLinkPath('/etc/hosts', null)).toBe('/etc/hosts')
    expect(devboxLinkPath('file:///home/devbox/a%20b.go', null)).toBe(
      '/home/devbox/a b.go'
    )
    expect(devboxLinkPath('src/main.go#L12', cwd)).toBe(
      '/home/devbox/console/src/main.go'
    )
    expect(devboxLinkPath('src/main.go:12:3', cwd)).toBe(
      '/home/devbox/console/src/main.go'
    )
  })

  it('leaves external links and anchors alone', () => {
    for (const href of [
      'https://plural.sh/docs',
      'mailto:hi@plural.sh',
      '//cdn.example.com/x.js',
      '#usage',
      '',
    ])
      expect(devboxLinkPath(href, cwd)).toBeNull()
  })
})

describe('DevboxMarkdownLink', () => {
  it('opens workspace links in the files panel', () => {
    const openFile = vi.fn()
    renderMarkdown(
      'see [main.go](src/main.go:4) and [docs](https://plural.sh)',
      openFile
    )
    fireEvent.click(screen.getByText('main.go'))
    expect(openFile).toHaveBeenCalledWith('/home/devbox/console/src/main.go')

    const external = screen.getByText('docs')
    expect(external.getAttribute('target')).toBe('_blank')
    fireEvent.click(external)
    expect(openFile).toHaveBeenCalledTimes(1)
  })

  it('renders relative links as plain links outside a devbox', () => {
    renderMarkdown('see [main.go](src/main.go)')
    expect(screen.getByText('main.go').getAttribute('target')).toBe('_blank')
  })
})
