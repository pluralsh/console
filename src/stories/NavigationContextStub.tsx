import { ReactNode, useMemo, useReducer } from 'react'

import {
  LinkProps,
  NavigationContextProvider,
} from '../components/contexts/NavigationContext'

export function Link({ children, ...props }: LinkProps) {
  return <a {...props}>{children}</a>
}

const currentPathReducer = (_: string | null, newPath: string | null) => {
  console.info('Navigate to:', newPath)
  if (newPath) {
    return newPath
  }

  return ''
}

export function NavContextProviderStub({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useReducer(currentPathReducer, '')

  const value = useMemo(
    () => ({
      useNavigate: () => setCurrentPath,
      usePathname: () => currentPath,
      Link,
    }),
    [currentPath]
  )

  return (
    <NavigationContextProvider value={value}>
      {children}
    </NavigationContextProvider>
  )
}
