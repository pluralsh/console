import { PUBLIC_DASHBOARD_PATH, shareDashboardUrl } from './shareDashboardUrl'

describe('shareDashboardUrl', () => {
  it('builds the public dashboard url with an encoded id', () => {
    expect(PUBLIC_DASHBOARD_PATH).toBe('public/dashboards')
    expect(shareDashboardUrl('https://console.example.com', 'a-b_c=')).toBe(
      'https://console.example.com/public/dashboards/a-b_c%3D'
    )
  })

  it('does not double up a trailing slash on the origin', () => {
    expect(shareDashboardUrl('https://console.example.com/', 'abc')).toBe(
      'https://console.example.com/public/dashboards/abc'
    )
  })
})
