import { type ComponentProps, type ReactNode, useMemo, useReducer } from 'react'

import { NavigationContextProvider } from '../components/contexts/NavigationContext'

export function Link({ children, ...props }: ComponentProps<'a'>) {
  return (
    <a
      {...props}
      onClick={(e) => {
        e.preventDefault()
        console.info('Link clicked to:', props?.href)
        props.onClick?.(e)
      }}
    >
      {children}
    </a>
  )
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
