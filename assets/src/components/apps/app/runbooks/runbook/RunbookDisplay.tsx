import { createContext, useMemo, useState } from 'react'

import { Card } from '@pluralsh/design-system'

import { Flex } from 'honorable'

import { useTheme } from 'styled-components'

import { recurse } from './display/misc'

export const DisplayContext = createContext<any>({})

export function RunbookDisplay({
  data,
  root: { children, attributes },
  ...props
}) {
  const theme = useTheme()

  const datasources = useMemo(
    () =>
      data
        .filter((d) => !!d)
        .reduce((acc, entry) => ({ ...acc, [entry.name]: entry }), {}),
    [data]
  )
  const [context, setContext] = useState({})

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <DisplayContext.Provider value={{ datasources, context, setContext }}>
      <Card
        css={{ padding: theme.spacing.large }}
        {...props}
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
