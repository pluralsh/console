import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { ApiSection } from '@src/lib/openapi-rest'

export type RestNavValue = {
  sections: ApiSection[]
  selectedId: string
}

type RestNavContextValue = {
  restNav: RestNavValue | null
  setRestNav: (value: RestNavValue | null) => void
}

const RestNavContext = createContext<RestNavContextValue>({
  restNav: null,
  setRestNav: () => {},
})

export function RestNavProvider({ children }: { children: ReactNode }) {
  const [restNav, setRestNav] = useState<RestNavValue | null>(null)
  const value = useMemo(() => ({ restNav, setRestNav }), [restNav])

  return (
    <RestNavContext.Provider value={value}>{children}</RestNavContext.Provider>
  )
}

export function useRestNav() {
  return useContext(RestNavContext).restNav
}

export function useSetRestNav(sections: ApiSection[], selectedId: string) {
  const { setRestNav } = useContext(RestNavContext)

  useEffect(() => {
    setRestNav({ sections, selectedId })

    return () => setRestNav(null)
  }, [sections, selectedId, setRestNav])
}
