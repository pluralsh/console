import { ReactElement, createContext, useMemo } from 'react'

import {
  PluralContext as Plural,
  usePluralContextQuery,
} from '../../generated/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'
import ShowAfterDelay from '../utils/ShowAfterDelay'

interface ContextProps {
  context: Plural
}

const PluralContext = createContext<ContextProps>({} as ContextProps)

function PluralProvider({ children }): ReactElement {
  const { data, loading } = usePluralContextQuery({
    pollInterval: 120_000,
  })
  const context = useMemo(
    () => ({ context: data?.pluralContext } as ContextProps),
    [data]
  )

  if (loading || !data) {
    return (
      <ShowAfterDelay>
        <LoadingIndicator />
      </ShowAfterDelay>
    )
  }

  return (
    <PluralContext.Provider value={context}>{children}</PluralContext.Provider>
  )
}

export { PluralContext, PluralProvider }
