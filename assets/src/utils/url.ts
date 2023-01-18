export function isAbsoluteURL(url: string): boolean {
  return /^https?:\/\//igm.test(url)
}

export function toAbsoluteURL(url: string): string {
  return isAbsoluteURL(url) ? url : `//${url}`
}
