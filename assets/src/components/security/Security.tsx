import { Outlet } from 'react-router-dom'

export function Security() {
  return (
    <div css={{ height: '100%' }}>
      <h1>Security</h1>
      <Outlet />
    </div>
  )
}
