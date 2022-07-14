export function localized(path) {
  const { hostname } = window.location
  const proto = window.location.protocol
  const { port } = window.location
  if (!port) {
    return `${proto}//${hostname}${path}`
  }

  return `${proto}//${hostname}:${port}${path}`
}

export const upstream = path => `https://${apiHost()}${path}`

export function apiHost() {
  switch (window.location.hostname) {
    case 'localhost':
      return 'console.plural.sh'
    default:
      return window.location.hostname
  }
}

export function secure() {
  return window.location.protocol.indexOf('https') >= 0
}
