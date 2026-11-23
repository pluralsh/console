import { styledThemeDark } from '@pluralsh/design-system'
import {
  act,
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
  composerOptions,
  DevboxComposer,
  MAX_ATTACHMENTS,
  proxyModelValues,
} from './DevboxComposer'
import {
  applySlashCommand,
  getSlashQuery,
  groupSlashCommands,
  matchSlashCommands,
  slashCommandHint,
} from './devboxSlashCommands'
import { getMentionQuery } from './devboxFileMentions'
import { serializeEditableDiv } from 'components/utils/contentEditableChips'

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

// replaces the prompt's content and puts the caret at its end
const type = (el: HTMLElement, value: string) => {
  el.textContent = value
  const range = document.createRange()
  if (el.firstChild) range.setStart(el.firstChild, value.length)
  else range.setStart(el, 0)
  range.collapse(true)
  document.getSelection()?.removeAllRanges()
  document.getSelection()?.addRange(range)
  fireEvent.input(el)
}

const valueOf = (el: HTMLElement) => serializeEditableDiv(el)

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
    expect(valueOf(prompt)).toBe('/review ')
    expect(prompt.querySelector('[data-slash-command]')?.textContent).toBe(
      '/review'
    )
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByTestId('slash-hint').textContent).toBe(
      'what to focus on'
    )

    type(prompt, '/review tests')
    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('/review tests', [])
    expect(valueOf(prompt)).toBe('')
  })

  it('completes the highlighted command with tab', () => {
    const { prompt, onSubmit } = renderComposer()
    type(prompt, '/c')
    const tab = fireEvent.keyDown(prompt, { key: 'Tab' })
    expect(tab).toBe(false)
    expect(valueOf(prompt)).toBe('/compact ')
    expect(onSubmit).not.toHaveBeenCalled()
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
    expect(valueOf(prompt)).toBe('/compact ')
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
    expect(valueOf(prompt)).toBe('fix the build')

    fireEvent.keyDown(prompt, { key: 'Enter' })
    await waitFor(() => expect(valueOf(prompt)).toBe(''))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('shows Stop while the agent is running', () => {
    const onCancel = vi.fn()
    renderComposer({ running: true, onCancel })
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('DevboxComposer file mentions', () => {
  const home = [
    { path: '/home/devbox/src', name: 'src', type: 'directory' },
    { path: '/home/devbox/README.md', name: 'README.md', type: 'file' },
    { path: '/home/devbox/.bashrc', name: '.bashrc', type: 'file' },
  ]
  const src = [
    { path: '/home/devbox/src/main.go', name: 'main.go', type: 'file' },
  ]
  const listFiles = vi.fn(async (path: string) =>
    path === '~' ? home : path === 'src' ? src : []
  )

  it('browses directories and inserts absolute file paths', async () => {
    const { prompt } = renderComposer({ listFiles })
    type(prompt, 'look at @')
    const files = await screen.findByRole('listbox', { name: 'Files' })
    expect(
      within(files)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['src//home/devbox/src', 'README.md/home/devbox/README.md'])

    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(valueOf(prompt)).toBe('look at @src/')
    expect(listFiles).toHaveBeenLastCalledWith('src', { brief: true })

    await screen.findByText('main.go')
    fireEvent.keyDown(prompt, { key: 'ArrowDown' })
    fireEvent.keyDown(prompt, { key: 'Tab' })
    expect(valueOf(prompt)).toBe(
      'look at <plrl-devbox-file path="/home/devbox/src/main.go"></plrl-devbox-file> '
    )
    expect(prompt.querySelector('[data-chip]')?.textContent).toBe('main.go')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('mentions the folder being browsed as a chip', async () => {
    const { prompt, onSubmit } = renderComposer({ listFiles })
    type(prompt, 'refactor @')
    await screen.findByRole('listbox', { name: 'Files' })
    fireEvent.keyDown(prompt, { key: 'Enter' })
    await screen.findByText('Mention this folder')
    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(prompt.querySelector('[data-chip]')?.textContent).toBe('src/')
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith(
      'refactor <plrl-devbox-file path="/home/devbox/src/"></plrl-devbox-file>',
      []
    )
  })

  it('searches beneath the directory once a name is typed', async () => {
    const found = {
      but: [
        {
          path: '/home/devbox/src/ui/Button.tsx',
          name: 'Button.tsx',
          type: 'file',
        },
        { path: '/home/devbox/src/ui', name: 'ui', type: 'directory' },
      ],
    }
    let release = () => {}
    const searchFiles = vi.fn(
      (_path: string, query: string) =>
        new Promise<typeof found.but>((resolve) => {
          release = () => resolve(found[query] ?? [])
        })
    )
    const { prompt } = renderComposer({ listFiles, searchFiles })
    type(prompt, 'see @')
    await screen.findByText('README.md')
    type(prompt, 'see @but')
    expect(searchFiles).toHaveBeenLastCalledWith('~', 'but')
    release()
    const files = await screen.findByRole('listbox', { name: 'Files' })
    await within(files).findByText('Button.tsx')
    expect(within(files).getByText('src/ui/Button.tsx')).toBeTruthy()

    // the last results stay up while the next search runs
    type(prompt, 'see @butt')
    expect(searchFiles).toHaveBeenLastCalledWith('~', 'butt')
    expect(within(files).getByText('Button.tsx')).toBeTruthy()
    release()
    await waitFor(() =>
      expect(within(files).queryByText('Button.tsx')).toBeNull()
    )

    // a found directory is browsed into by its path beneath the one searched
    type(prompt, 'see @but')
    await within(files).findByText('ui/')
    fireEvent.mouseDown(within(files).getByText('ui/'))
    expect(valueOf(prompt)).toBe('see @src/ui/')
    await act(async () => release())
  })

  it('searches again when a query comes back, recovering from a failure', async () => {
    const searchFiles = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([
        { path: '/home/devbox/src/main.go', name: 'main.go', type: 'file' },
      ])
    const { prompt } = renderComposer({ listFiles, searchFiles })
    type(prompt, 'see @main')
    await screen.findByText("Couldn't search files")
    type(prompt, 'see @mai')
    type(prompt, 'see @main')
    await screen.findByText('main.go')
    expect(searchFiles.mock.calls.filter(([, q]) => q === 'main')).toHaveLength(
      2
    )
  })

  it('leaves typed @ text alone', () => {
    const { prompt, onSubmit } = renderComposer({ listFiles })
    type(prompt, 'explain @README.md vs mail@x')
    fireEvent.keyDown(prompt, { key: 'Escape' })
    fireEvent.keyDown(prompt, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('explain @README.md vs mail@x', [])
  })

  it('only completes @ at a word start', () => {
    expect(getMentionQuery('mail me@x')).toBeNull()
    expect(getMentionQuery('@src/ma')).toEqual({
      start: 0,
      end: 7,
      dir: 'src/',
      leaf: 'ma',
    })
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

describe('composerOptions', () => {
  const option = (configId: string, category: string) => ({
    configId,
    category,
    options: [{ value: 'a', name: 'A' }],
  })

  it('keeps the model, reasoning effort and autonomy, dropping agent extras', () => {
    const codex = [
      option('autonomy', 'autonomy'),
      option('mode', 'mode'),
      option('collaboration_mode', '_collaboration_mode'),
      option('model', 'model'),
      option('reasoning_effort', 'thought_level'),
      option('fast_mode', '_fast_mode'),
    ]
    expect(composerOptions(codex).map((o) => o.configId)).toEqual([
      'model',
      'reasoning_effort',
      'autonomy',
    ])
  })

  it("shows the agent's mode when there's no autonomy setting", () => {
    expect(
      composerOptions([option('model', 'model'), option('mode', 'mode')]).map(
        (o) => o.configId
      )
    ).toEqual(['model', 'mode'])
  })
})

describe('proxyModelValues', () => {
  it("lists the proxy's models under the agent's IDs, keeping a current alias", () => {
    const option = {
      configId: 'model',
      category: 'model',
      currentValue: 'default',
      options: [
        { value: 'default', name: 'Default (recommended)' },
        { value: 'opus', name: 'Opus' },
        { value: 'plural/openai/gpt-5', name: 'gpt-5' },
      ],
    }
    expect(
      proxyModelValues(option, ['openai/gpt-5', 'anthropic/claude-opus-4-1'])
    ).toEqual([
      { value: 'default', name: 'Default (recommended)' },
      { value: 'plural/openai/gpt-5', name: 'gpt-5' },
      { value: 'anthropic/claude-opus-4-1' },
    ])
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
