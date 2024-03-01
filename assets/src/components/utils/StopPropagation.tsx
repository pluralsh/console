import { ReactNode } from 'react'

export function StopPropagation({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ display: 'contents' }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}
