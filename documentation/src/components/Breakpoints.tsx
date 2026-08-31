import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type Breakpoint =
  | ''
  | 'md'
  | 'twoColumn'
  | 'fullHeader'
  | 'threeColumn'
  | 'maxWidth'

export const breakpoints: Record<Breakpoint, number> = {
  '': 0,
  md: 720,
  twoColumn: 1000,
  fullHeader: 1000,
  threeColumn: 1280,
  maxWidth: 1588,
}

export const mqs = Object.fromEntries(
  Object.entries(breakpoints).map(([key, val]) => [
    key,
    `@media screen and (min-width: ${val}px)`,
  ])
) as Record<Breakpoint, string>

export const BreakpointContext = createContext<Breakpoint>('')

export function BreakpointProvider({ children }: PropsWithChildren) {
  const [windowWidth, setWindowWidth] = useState(0)
  const val = useMemo(() => {
    let curBreakpoint: Breakpoint = ''

    for (const [name, width] of Object.entries(breakpoints)) {
      if (windowWidth > width) {
        curBreakpoint = name as Breakpoint
      }
    }

    return curBreakpoint
  }, [windowWidth])

  useEffect(() => {
    setWindowWidth(window.innerWidth)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', () => {
      setWindowWidth(window.innerWidth)
    })
  })

  return (
    <BreakpointContext.Provider value={val}>
      {children}
    </BreakpointContext.Provider>
  )
}

export function BreakpointIsGreaterOrEqual(a: Breakpoint, b: Breakpoint) {
  return breakpoints[a] >= breakpoints[b]
}

export function BreakpointIsLessThan(a: Breakpoint, b: Breakpoint) {
  return breakpoints[a] < breakpoints[b]
}

export const useBreakpoint = () => useContext(BreakpointContext)
