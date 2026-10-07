import { PersonaConfigurationFragment } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { getDirectory } from './Settings'

const enabled = (configuration: PersonaConfigurationFragment, path: string) =>
  getDirectory(configuration).find((entry) => entry && entry.path === path)
    ?.enabled

describe('settings persona configuration', () => {
  it('only hides tabs that are explicitly disabled', () => {
    const configuration = {
      settings: { userManagement: false },
    } as PersonaConfigurationFragment

    expect(enabled(configuration, 'user-management')).toBe(false)
    expect(enabled(configuration, 'global')).toBe(true)
  })

  it('lets the root all setting override disabled tabs', () => {
    const configuration = {
      all: true,
      settings: { userManagement: false },
    } as PersonaConfigurationFragment

    expect(enabled(configuration, 'user-management')).toBe(true)
  })

  it('falls back to the legacy sidebar setting for audit logs', () => {
    expect(
      enabled(
        { sidebar: { audits: false } } as PersonaConfigurationFragment,
        'audits'
      )
    ).toBe(false)
    expect(
      enabled(
        {
          sidebar: { audits: false },
          settings: { audits: true },
        } as PersonaConfigurationFragment,
        'audits'
      )
    ).toBe(true)
  })
})
