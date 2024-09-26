export function host() {
  const { hostname, protocol, port } = window.location
  const base = `${protocol}//${hostname}`

  if (port) return `${base}:${port}`

  return base
}

export function apiHost() {
  const {
    location: { hostname },
  } = window

  if (hostname === 'localhost' || hostname.endsWith('web.app')) {
    return 'app.plural.sh'
  }

  return hostname
}

export function secure() {
  return window.location.protocol.indexOf('https') >= 0
}
