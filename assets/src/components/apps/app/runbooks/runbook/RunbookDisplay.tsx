import {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ThemeContext } from 'grommet'

import { Card } from '@pluralsh/design-system'

import { Flex } from 'honorable'

import { recurse } from './display/misc'

export const DisplayContext = createContext<any>({})

export function RunbookDisplay({ data, root: { children, attributes } }) {
  const theme = useContext(ThemeContext)
  const datasources = useMemo(() => (
    data.filter(d => !!d).reduce((acc, entry) => ({ ...acc, [entry.name]: entry }), {})
  ), [data])
  const [context, setContext] = useState({})

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <DisplayContext.Provider value={{ datasources, context, setContext }}>
      <Card
        marginTop="large"
        overflow="auto"
        padding="large"
      >
        <Flex
          direction="column"
          {...attributes}
        >
          {recurse(children, theme)}
        </Flex>
      </Card>
    </DisplayContext.Provider>
  )
}
