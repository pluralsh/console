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
