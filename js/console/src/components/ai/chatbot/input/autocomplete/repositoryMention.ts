import { ScmType } from 'generated/graphql'

export type RepositoryMentionMetadata = {
  url: string
  slug?: string
  provider?: ScmType
  displayName: string
}

function repositoryHost(url: string): string | null {
  const trimmed = url.trim()
  const scpMatch = trimmed.match(/^[^@]+@([^:]+):/)
  if (scpMatch) return scpMatch[1].toLowerCase()

  try {
    return new URL(trimmed).hostname.toLowerCase()
  } catch {
    return null
  }
}

function providerForHost(host: string | null): ScmType | undefined {
  if (host === 'github.com') return ScmType.Github
  if (host === 'gitlab.com') return ScmType.Gitlab
  if (host === 'bitbucket.org') return ScmType.Bitbucket
  if (host === 'dev.azure.com' || host?.endsWith('.visualstudio.com'))
    return ScmType.AzureDevops
  return undefined
}

function repositorySlug(repoUrl: string): string | undefined {
  let path: string

  if (/^git@[^:]+:/.test(repoUrl)) {
    path = repoUrl.replace(/^git@[^:]+:/, '')
  } else if (/^ssh:\/\//.test(repoUrl)) {
    path = repoUrl.replace(/^ssh:\/\/(?:[^@]+@)?[^/]+\/?/, '')
  } else if (/^https?:\/\//.test(repoUrl)) {
    path = repoUrl.replace(/^https?:\/\/[^/]+\/?/, '')
  } else {
    return undefined
  }

  return (
    path
      .replace(/^\/+/, '')
      .replace(/\/-\/.*$/, '')
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean)
      .join('/') || undefined
  )
}

export function repositoryMentionMetadata(
  url: string
): RepositoryMentionMetadata {
  const normalizedUrl = url.trim()
  const provider = providerForHost(repositoryHost(normalizedUrl))
  const slug = provider ? repositorySlug(normalizedUrl) : undefined

  return {
    url: normalizedUrl,
    ...(slug ? { slug } : {}),
    ...(provider ? { provider } : {}),
    displayName: slug ?? normalizedUrl,
  }
}
