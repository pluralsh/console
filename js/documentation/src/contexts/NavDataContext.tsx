import { createContext, useContext } from 'react'

import type { NavData } from '../NavData'

export const NavDataContext = createContext<NavData>({
  docs: [],
})
export const useNavMenu = () => {
  const navData = useContext(NavDataContext)

  return navData.docs
}

export const useNavData = () => useContext(NavDataContext)
export const NavDataProvider = NavDataContext.Provider
