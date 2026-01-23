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
 * - https://host/owner/repo[.git]
 * - ssh://[user@]host/owner/repo[.git]
 * - git@host:owner/repo[.git]
 */
export function isValidRepoUrl(url: string): boolean {
  const trimmed = url.trim()

  // https://host/owner/repo or https://host/owner/repo.git
  if (/^https:\/\/[^/]+\/[^/]+\/[^/]+(\.git)?$/.test(trimmed)) return true

  // ssh://[user@]host/owner/repo[.git]
  if (/^ssh:\/\/([^@]+@)?[^/]+\/[^/]+\/[^/]+(\.git)?$/.test(trimmed))
    return true

  // git@host:owner/repo[.git]
  if (/^git@[^:]+:[^/]+\/[^/]+(\.git)?$/.test(trimmed)) return true

  return false
}

export function prettifyRepoUrl(repoUrl: string) {
  const [owner, name] = repoUrl
    .trim()
    .replace(/^git@[^:]+:/, '')
    .replace(/^ssh:\/\/[^/]+\/?/, '')
    .replace(/^https?:\/\/[^/]+\/?/, '')
    .replace(/^\/+/, '')
    .replace(/\.git$/, '')
    .split('/')

  return owner && name ? `${owner}/${name}` : repoUrl
}
