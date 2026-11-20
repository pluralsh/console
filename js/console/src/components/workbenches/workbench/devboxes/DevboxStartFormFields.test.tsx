import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  DevboxAgentFragment,
  DevboxAgentType,
  DevboxProbeStatus,
  DevboxStatus,
} from 'generated/graphql'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import {
  DevboxBillingOptions,
  DevboxStartFormFields,
} from './DevboxStartFormFields'
import {
  DevboxStartBox,
  defaultStartValues,
  validateStartValues,
} from './devboxStartForm'

const box: DevboxStartBox = {
  id: 'box-1',
  name: 'web',
  status: DevboxStatus.Ready,
  allowedRepositories: ['github.com/acme/web'],
  agents: [
    {
      type: DevboxAgentType.Claude,
      default: true,
      probeStatus: DevboxProbeStatus.Ok,
      models: [{ id: 'sonnet', name: 'Sonnet' }],
      commands: [{ name: 'review', description: 'Review the diff' }],
    } as DevboxAgentFragment,
    {
      type: DevboxAgentType.Codex,
      probeStatus: DevboxProbeStatus.Ok,
      models: [],
    } as DevboxAgentFragment,
  ],
}

function renderFields(billing?: DevboxBillingOptions) {
  const values = {
    ...defaultStartValues(box, ['https://github.com/acme/web']),
    model: 'gpt-5',
    repositories: [
      'https://github.com/acme/web',
      'https://github.com/acme/api',
    ],
  }
  const onChange = vi.fn()
  render(
    <MemoryRouter>
      <ThemeProvider theme={styledThemeDark}>
        <DevboxStartFormFields
          boxes={[box]}
          values={values}
          onChange={onChange}
          errors={validateStartValues(values, box)}
          candidateRepositories={['https://github.com/acme/web']}
          billing={billing}
        />
      </ThemeProvider>
    </MemoryRouter>
  )
  return onChange
}

describe('DevboxStartFormFields', () => {
  it('shows catalog validation errors inline', () => {
    renderFields()
    expect(
      screen.getByText("This model isn't in the agent's catalog")
    ).toBeTruthy()
    expect(
      screen.getByText('Not allowed on this box: https://github.com/acme/api')
    ).toBeTruthy()
    expect(screen.getByText('/review')).toBeTruthy()
  })

  it('toggles repositories', () => {
    const onChange = renderFields()
    fireEvent.click(screen.getByText('https://github.com/acme/api'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ repositories: ['https://github.com/acme/web'] })
    )
  })

  it('offers per-agent billing and links to settings when a plan is not linked', () => {
    renderFields({
      allowed: true,
      linkedAgents: [DevboxAgentType.Claude],
      defaults: {},
      settingsPath: '/profile/ai-subscriptions',
    })
    expect(screen.getByText('Billing')).toBeTruthy()
    expect(
      screen
        .getByText('Link your ChatGPT plan')
        .closest('a')
        ?.getAttribute('href')
    ).toBe('/profile/ai-subscriptions')
    expect(screen.queryByText('Link your Claude plan')).toBeNull()
  })

  it('hides billing when the workbench disallows subscriptions', () => {
    renderFields({
      allowed: false,
      linkedAgents: [],
      defaults: {},
      settingsPath: '/profile/ai-subscriptions',
    })
    expect(screen.queryByText('Billing')).toBeNull()
  })
})
