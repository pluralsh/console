export function isAbsoluteURL(url: string): boolean {
  return /^https?:\/\//igm.test(url) // TODO: Use better regexp and write unit tests.
}

export function toAbsoluteURL(url: string): string {
  return isAbsoluteURL(url) ? url : `//${url}`
}
