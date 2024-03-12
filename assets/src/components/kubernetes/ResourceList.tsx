import { Dispatch, SetStateAction, createContext, useContext } from 'react'

export type ResourceListContextT = {
  setNamespaced: Dispatch<SetStateAction<boolean>>
}

export const ResourceListContext = createContext<
  ResourceListContextT | undefined
>(undefined)

export default function ResourceList({
  children,
  namespaced = false,
}: {
  children: JSX.Element
  namespaced?: boolean
}): JSX.Element {
  const ctx = useContext(ResourceListContext)

  if (!ctx) {
    throw Error('ResourceList must be used within a ResourceListContext')
  }

  ctx.setNamespaced(namespaced)

  return children
}
