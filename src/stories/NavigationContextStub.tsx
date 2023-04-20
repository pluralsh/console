import {
  type MutableRefObject,
  type ReactNode,
  forwardRef,
  useMemo,
  useReducer,
} from 'react'

import {
  type NavigationContextLinkProps,
  NavigationContextProvider,
} from '../components/contexts/NavigationContext'

export const Link = forwardRef(
  (
    { children, ...props }: NavigationContextLinkProps,
    ref: MutableRefObject<any>
  ) => (
    <a
      ref={ref}
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
)

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
