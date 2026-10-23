// where the agent's python sandbox mounts the workbench filesystem
export const SANDBOX_ROOT = '/workbench'

// agents reference files by their sandbox path, while the api takes paths within the workbench
export function toWorkbenchPath(path: string): string {
  const trimmed = path.trim()
  const withRoot = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  if (withRoot === SANDBOX_ROOT) return '/'
  if (withRoot.startsWith(`${SANDBOX_ROOT}/`))
    return withRoot.slice(SANDBOX_ROOT.length)
  return withRoot
}

export function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

// directories containing a path, outermost first and excluding the root
export function ancestorDirectories(path: Nullable<string>): string[] {
  const parts = (path ?? '').split('/').filter(Boolean)

  return parts.slice(0, -1).map((_, i) => `/${parts.slice(0, i + 1).join('/')}`)
}

// forces an attachment disposition rather than viewing inline
export function workbenchFileDownloadUrl(url: Nullable<string>) {
  if (!url) return undefined
  return `${url}${url.includes('?') ? '&' : '?'}download=true`
}
