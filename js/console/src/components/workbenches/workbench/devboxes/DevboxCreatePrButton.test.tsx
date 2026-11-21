import { describe, expect, it } from 'vitest'
import { displayRemoteUrl } from './DevboxCreatePrButton'

describe('displayRemoteUrl', () => {
  it.each([
    ['https://github.com/pluralsh/console.git', 'github.com/pluralsh/console'],
    ['git@github.com:pluralsh/console.git', 'github.com/pluralsh/console'],
    [
      'https://x-access-token:secret@github.com/pluralsh/console',
      'github.com/pluralsh/console',
    ],
    [
      'ssh://git@git.example.com:2222/team/app.git',
      'git.example.com:2222/team/app',
    ],
    [
      'https://dev.azure.com/pluralsh/project/_git/console/',
      'dev.azure.com/pluralsh/project/_git/console',
    ],
  ])('shows %s as %s', (url, shown) => {
    expect(displayRemoteUrl(url)).toBe(shown)
  })
})
