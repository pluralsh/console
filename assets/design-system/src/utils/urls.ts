export function removeTrailingSlashes(str: string | null | undefined) {
  if (typeof str !== 'string') {
    return str
  }

  return str.replace(/\/+$/, '')
}

export function isRelativeUrl(str: string) {
  if (str.startsWith('/')) {
    return false
  }

  return !isExternalUrl(str)
}

export function isExternalUrl(str?: string | null) {
  return !!str.match(/^(\/\/|[a-z\d+-.]+?:)/i)
}

export function getBarePathFromPath(url: string) {
  return url.split(/[?#]/)[0]
}

export function isSubrouteOf(route: string, compareRoute: string) {
  return route.startsWith(compareRoute)
}

export function toHtmlId(str: string) {
  const id = str
    .replace(/\W+/g, ' ') //
    .trim()
    .replace(/\s/g, '-')
    .toLowerCase()

  // make sure the id starts with a letter or underscore
  return id.match(/^($|[A-Za-z_])/) ? id : `_${id}`
}

/**
 * Validates git clone URLs matching backend validation:
 * - https://host/owner/repo[.git] (nested paths supported, e.g. GitLab groups)
 * - ssh://[user@]host/owner/repo[.git]
 * - git@host:owner/repo[.git]
 */
export function isValidRepoUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false

  if (trimmed.startsWith('http://') || trimmed.startsWith('ftp://'))
    return false

  const allowedScheme =
    trimmed.startsWith('https://') ||
    trimmed.startsWith('ssh://') ||
    trimmed.startsWith('git@')

  if (!allowedScheme) return false

  const path = extractRepoProjectPath(trimmed)
  if (!path) return false

  const segments = path.split('/')
  return segments.length >= 2 && segments.every((segment) => segment.length > 0)
}

/**
 * Extracts the repository project path (namespace/project, including nested GitLab groups)
 * from a git clone URL, SCP-style URL, or GitLab merge request web URL.
 */
export function extractRepoProjectPath(repoUrl: string): string | null {
  const trimmed = repoUrl.trim()
  if (!trimmed) return null

  let path: string | null = null

  if (/^git@[^:]+:/.test(trimmed)) {
    path = trimmed.replace(/^git@[^:]+:/, '')
  } else if (/^ssh:\/\//.test(trimmed)) {
    path = trimmed.replace(/^ssh:\/\/(?:[^@]+@)?[^/]+\/?/, '')
  } else if (/^https?:\/\//.test(trimmed)) {
    path = trimmed.replace(/^https?:\/\/[^/]+\/?/, '')
  } else {
    return null
  }

  path = path
    .replace(/^\/+/, '')
    .replace(/\/-\/.*$/, '')
    .replace(/\.git$/, '')

  const normalized = path.split('/').filter(Boolean).join('/')
  return normalized || null
}

export function prettifyRepoUrl(
  repoUrl: string,
  showFullPath: boolean = false
) {
  const fullPath = extractRepoProjectPath(repoUrl)
  if (!fullPath) return repoUrl

  if (showFullPath) return fullPath

  const segments = fullPath.split('/')
  if (segments.length === 2) return `${segments[0]}/${segments[1]}`

  // Nested GitLab groups (or other multi-segment paths): show the full project slug.
  return fullPath
}
