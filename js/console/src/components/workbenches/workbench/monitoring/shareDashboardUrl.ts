export const PUBLIC_DASHBOARD_PATH = 'public/dashboards'

export function shareDashboardUrl(origin: string, publicId: string): string {
  return `${origin.replace(/\/+$/, '')}/${PUBLIC_DASHBOARD_PATH}/${encodeURIComponent(publicId)}`
}
