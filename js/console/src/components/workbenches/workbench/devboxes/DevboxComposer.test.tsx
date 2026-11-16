import { styledThemeDark } from '@pluralsh/design-system'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import {
  attachmentError,
  DevboxComposer,
  MAX_ATTACHMENTS,
} from './DevboxComposer'
import {
  applySlashCommand,
  getSlashQuery,
  groupSlashCommands,
  matchSlashCommands,
  slashCommandHint,
} from './devboxSlashCommands'

const commands = [
  {
    name: 'review',
    description: 'Review the diff',
    inputHint: 'what to focus on',
  },
  { name: 'compact', description: 'Summarize the conversation' },
  { name: 'skill:refactor', description: 'Refactor code' },
  { name: 'mcp:github:pr', description: 'Open a pull request' },
]

function renderComposer(
  props: Partial<Parameters<typeof DevboxComposer>[0]> = {}
) {
  const onSubmit = vi.fn()
  render(
    <ThemeProvider theme={styledThemeDark}>
      <DevboxComposer
        commands={commands}
        onSubmit={onSubmit}
        {...props}
      />
    </ThemeProvider>
  )
  return { onSubmit, prompt: screen.getByLabelText('Prompt') }
}

const type = (el: HTMLElement, value: string) =>
  fireEvent.change(el, { target: { value, selectionStart: value.length } })

const options = () =>
  within(screen.getByRole('listbox', { name: 'Slash commands' }))
    .getAllByRole('option')
    .map((o) => o.querySelector('code')?.textContent)

describe('DevboxComposer slash autocomplete', () => {
  it('lists grouped commands for a bare slash', () => {
    const { prompt } = renderComposer()
    type(prompt, '/')
    expect(screen.getByText('Skills')).toBeTruthy()
    expect(screen.getByText('MCP prompts')).toBeTruthy()
    expect(options()).toEqual([
      '/compact',
      '/review',
      '/mcp:github:pr',
      '/skill:refactor',
    ])
  })

  it('filters by prefix and picks with the keyboard', () => {
    const { prompt, onSubmit } = renderComposer()
    type(prompt, '/re')
    expect(options()[0]).toBe('/review')
    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect((prompt as HTMLTextAreaElement).value).toBe('/review ')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByTestId('slash-hint').textContent).toBe(
      'what to focus on'
    )

    type(prompt, '/review tests')
    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('/review tests', [])
    expect((prompt as HTMLTextAreaElement).value).toBe('')
  })

  it('navigates with arrows, picks with the mouse and dismisses with escape', () => {
    const { prompt } = renderComposer()
    type(prompt, '/')
    fireEvent.keyDown(prompt, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe(
      'true'
    )
    fireEvent.keyDown(prompt, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()

    type(prompt, '/c')
    fireEvent.mouseDown(screen.getByText('/compact'))
    expect((prompt as HTMLTextAreaElement).value).toBe('/compact ')
  })

  it('keeps the draft when the send fails and clears it once one succeeds', async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const { prompt } = renderComposer({ onSubmit })
    type(prompt, 'fix the build')

    fireEvent.keyDown(prompt, { key: 'Enter' })
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement)
          .disabled
      ).toBe(false)
    )
    expect((prompt as HTMLTextAreaElement).value).toBe('fix the build')

    fireEvent.keyDown(prompt, { key: 'Enter' })
    await waitFor(() => expect((prompt as HTMLTextAreaElement).value).toBe(''))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('shows Stop while the agent is running', () => {
    const onCancel = vi.fn()
    renderComposer({ running: true, onCancel })
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('DevboxComposer attachments', () => {
  const file = (name: string, size = 4, type = 'text/plain') => {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }
  const paste = (el: HTMLElement, files: File[]) =>
    fireEvent.paste(el, { clipboardData: { files } })

  it('sends pasted files with the prompt, even without text', () => {
    const { prompt, onSubmit } = renderComposer()
    const notes = file('notes.md')
    paste(prompt, [notes])
    expect(screen.getByText('notes.md')).toBeTruthy()

    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('', [notes])
    expect(screen.queryByText('notes.md')).toBeNull()
  })

  it('removes an attachment', () => {
    const { prompt } = renderComposer()
    paste(prompt, [file('a.txt')])
    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }))
    expect(screen.queryByText('a.txt')).toBeNull()
  })

  it('blocks prompts over the attachment limits', () => {
    const { prompt, onSubmit } = renderComposer()
    type(prompt, 'big')
    paste(prompt, [file('huge.bin', 25 * 1024 * 1024)])
    expect(screen.getByRole('alert').textContent).toMatch(/allowed per prompt/)

    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('caps the number of files', () => {
    expect(
      attachmentError(
        Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => file(`f${i}`))
      )
    ).toMatch(/At most 10/)
    expect(attachmentError([file('ok')])).toBeNull()
  })
})

describe('devboxSlashCommands', () => {
  it('only completes the first token', () => {
    expect(getSlashQuery('/rev')).toEqual({ query: 'rev', end: 4 })
    expect(getSlashQuery('/review now')).toBeNull()
    expect(getSlashQuery('hello /rev')).toBeNull()
  })

  it('matches fuzzily after prefixes and replaces the command token', () => {
    expect(matchSlashCommands(commands, 'pull').map((c) => c.name)).toEqual([
      'mcp:github:pr',
    ])
    expect(applySlashCommand('/re keep this', commands[0])).toBe(
      '/review keep this'
    )
    expect(slashCommandHint('/review ', commands)).toBe('what to focus on')
    expect(slashCommandHint('/review x', commands)).toBeNull()
    expect(groupSlashCommands(commands).map((g) => g.label)).toEqual([
      'Commands',
      'Skills',
      'MCP prompts',
    ])
  })
})
