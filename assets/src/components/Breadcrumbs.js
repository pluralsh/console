import React, { useContext, useState } from 'react'

import {
  A,
  Div,
  Flex,
  Span,
} from 'honorable'

import { theme } from '@pluralsh/design-system'

import { lookahead } from '../utils/array'

import { LoginContext } from './contexts'

export const BreadcrumbsContext = React.createContext({
  breadcrumbs: [],
  setBreadcrumbs: () => null,
})

export function Breadcrumbs() {
  const { breadcrumbs } = useContext(BreadcrumbsContext)
  const { configuration } = useContext(LoginContext)
  const cluster = configuration?.manifest?.cluster

  const children = Array.from(lookahead(breadcrumbs, (crumb, next) => {
    if (next.url) {
      return (
        <Flex
          direction="row"
          gap="small"
        >
          <A
            href={crumb.url}
            color="text-xlight"
            _hover={{ color: 'text' }}
          >
            {crumb.text}
          </A>
          <Div color={theme.colors.grey[700]}>/</Div>
        </Flex>
      )
    }

    return <Span fontWeight={600}>{crumb.text}</Span>
  }))

  return (
    <Flex
      direction="row"
      gap="small"
      paddingVertical="small"
    >
      {cluster
      && (
        <Flex
          direction="row"
          gap="small"
        >
          <Div color="text-xlight">{cluster}</Div>
          <Div color={theme.colors.grey[700]}>/</Div>
        </Flex>
      )}
      {children}
    </Flex>
  )
}

export default function BreadcrumbProvider({ children }) {
  const [breadcrumbs, setBreadcrumbs] = useState([])

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <BreadcrumbsContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbsContext.Provider>
  )
}
