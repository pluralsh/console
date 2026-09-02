import { describe, expect, it } from 'vitest'
import { ScmType } from 'generated/graphql'
import { repositoryMentionMetadata } from './repositoryMention'

describe('repositoryMentionMetadata', () => {
  it.each([
    [
      'https://github.com/pluralsh/console.git',
      ScmType.Github,
      'pluralsh/console',
    ],
    [
      'git@gitlab.com:group/nested/project.git',
      ScmType.Gitlab,
      'group/nested/project',
    ],
    [
      'ssh://git@bitbucket.org/workspace/repository.git',
      ScmType.Bitbucket,
      'workspace/repository',
    ],
    [
      'https://dev.azure.com/pluralsh/project/_git/console',
      ScmType.AzureDevops,
      'pluralsh/project/_git/console',
    ],
  ])('infers %s as a known provider', (url, provider, slug) => {
    expect(repositoryMentionMetadata(url)).toMatchObject({
      url,
      provider,
      slug,
      displayName: slug,
    })
  })

  it('uses the full URL for an unrecognized host', () => {
    const url = 'https://git.example.com/team/project.git'

    expect(repositoryMentionMetadata(url)).toEqual({
      url,
      displayName: url,
    })
  })
})
