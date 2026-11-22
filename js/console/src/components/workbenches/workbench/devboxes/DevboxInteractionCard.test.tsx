import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  DevboxElicitationAction,
  DevboxInteractionFragment,
  DevboxInteractionKind,
  DevboxInteractionState,
  DevboxToolCallFragment,
} from 'generated/graphql'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import {
  DevboxInteractionCard,
  elicitationContent,
  validateElicitation,
} from './DevboxInteractionCard'

const interaction = (
  i: Partial<DevboxInteractionFragment>
): DevboxInteractionFragment => ({
  id: 'i1',
  externalId: 'ext',
  kind: DevboxInteractionKind.Permission,
  state: DevboxInteractionState.Pending,
  ...i,
})

const renderCard = (
  i: DevboxInteractionFragment,
  toolCall?: DevboxToolCallFragment
) => {
  const onRespond = vi.fn()
  render(
    <ThemeProvider theme={styledThemeDark}>
      <DevboxInteractionCard
        interaction={i}
        toolCall={toolCall}
        onRespond={onRespond}
      />
    </ThemeProvider>
  )
  return onRespond
}

const schema = {
  properties: {
    name: { type: 'string', title: 'Name', minLength: 2 },
    count: { type: 'integer', title: 'Count', minimum: 1, maximum: 5 },
    email: { type: 'string', title: 'Email', format: 'email' },
    confirm: { type: 'boolean', title: 'Confirm' },
  },
  required: ['name', 'count'],
}

describe('DevboxInteractionCard', () => {
  it('shows the command a permission request would run', () => {
    renderCard(interaction({ title: 'Run command' }), {
      toolCallId: 'tc-1',
      kind: 'execute',
      rawInput: { command: 'git push --force', cwd: '/home/dev/console' },
    } as DevboxToolCallFragment)
    expect(
      document.querySelector('[data-preview="command"]')?.textContent
    ).toContain('git push --force')
    expect(screen.getByText('in /home/dev/console')).toBeTruthy()
  })

  it("shows a subagent's command from the interaction when its transcript isn't loaded", () => {
    render(
      <ThemeProvider theme={styledThemeDark}>
        <DevboxInteractionCard
          interaction={interaction({
            title: 'Bash',
            toolCall: {
              toolCallId: 'tc-1',
              kind: 'execute',
              rawInput: { command: 'ls -la' },
            } as DevboxToolCallFragment,
          })}
          onRespond={vi.fn()}
        />
      </ThemeProvider>
    )
    expect(
      document.querySelector('[data-preview="command"]')?.textContent
    ).toContain('ls -la')
  })

  it('drops the preview once answered, leaving it to the transcript', () => {
    renderCard(
      interaction({
        title: 'Run command',
        state: DevboxInteractionState.Answered,
      }),
      {
        toolCallId: 'tc-1',
        kind: 'execute',
        rawInput: { command: 'git push --force' },
      } as DevboxToolCallFragment
    )
    expect(document.querySelector('[data-preview="command"]')).toBeNull()
  })

  it('answers a permission request with the chosen option or cancel', () => {
    const onRespond = renderCard(
      interaction({
        title: 'Run rm -rf build?',
        options: [
          { optionId: 'allow', name: 'Allow once', kind: 'allow_once' },
          { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
        ],
      })
    )
    expect(screen.getByText('Run rm -rf build?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Allow once' }))
    expect(onRespond).toHaveBeenLastCalledWith({ optionId: 'allow' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onRespond).toHaveBeenLastCalledWith({ cancelled: true })
  })

  it('validates a form elicitation before accepting it', () => {
    const onRespond = renderCard(
      interaction({
        kind: DevboxInteractionKind.FormElicitation,
        requestedSchema: schema,
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onRespond).not.toHaveBeenCalled()
    expect(screen.getAllByText('Required')).toHaveLength(2)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText('Count'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByText('Confirm'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onRespond).toHaveBeenCalledWith({
      action: DevboxElicitationAction.Accept,
      content: { name: 'Ada', count: 3, confirm: true },
    })
  })

  it('declines or cancels an elicitation', () => {
    const onRespond = renderCard(
      interaction({
        kind: DevboxInteractionKind.FormElicitation,
        requestedSchema: schema,
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(onRespond).toHaveBeenLastCalledWith({
      action: DevboxElicitationAction.Decline,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onRespond).toHaveBeenLastCalledWith({
      action: DevboxElicitationAction.Cancel,
    })
  })

  it('only links out to http(s) URLs for URL elicitations', () => {
    const onRespond = renderCard(
      interaction({
        kind: DevboxInteractionKind.UrlElicitation,
        url: 'javascript:alert(1)',
      })
    )
    expect(
      screen.getByText('Open link').closest('a')?.getAttribute('href')
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: "I'm done" }))
    expect(onRespond).toHaveBeenCalledWith({
      action: DevboxElicitationAction.Accept,
    })
  })

  it('shows who answered instead of a form once resolved', () => {
    renderCard(
      interaction({
        state: DevboxInteractionState.Answered,
        answeredBy: { id: 'u', name: 'Grace', email: 'g@x.io' },
        options: [{ optionId: 'allow', name: 'Allow' }],
      })
    )
    expect(screen.getByText(/by Grace/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull()
  })
})

describe('validateElicitation', () => {
  it('checks types, bounds and formats', () => {
    expect(
      validateElicitation(schema, {
        name: 'A',
        count: '9',
        email: 'nope',
      })
    ).toEqual({
      name: 'At least 2 characters',
      count: 'At most 5',
      email: 'Enter an email address',
    })
    expect(validateElicitation(schema, { name: 'Ada', count: '1.5' })).toEqual({
      count: 'Enter a whole number',
    })
    expect(
      elicitationContent(schema, { name: 'Ada', count: '2', email: '' })
    ).toEqual({ name: 'Ada', count: 2 })
  })
})
