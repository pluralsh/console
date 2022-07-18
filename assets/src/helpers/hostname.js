export function localized(path) {
  const { hostname } = window.location
  const proto = window.location.protocol
  const { port } = window.location
  if (!port) {
    return `${proto}//${hostname}${path}`
  }

  return `${proto}//${hostname}:${port}${path}`
}
