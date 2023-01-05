import React, { useContext, useState } from 'react'
import {
  A,
  Div,
  Flex,
  Span,
} from 'honorable'
import { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'

import { lookahead } from '../utils/array'

import { LoginContext } from './contexts'

type Breadcrumb = {
  url?: string
  text: string
}

export const BreadcrumbsContext = React.createContext<{
  breadcrumbs: Breadcrumb[]
  setBreadcrumbs:(arg: Breadcrumb[]) => void
    }>({
      breadcrumbs: [],
      setBreadcrumbs: () => {},
    })

export const useBreadcrumbs = () => useContext(BreadcrumbsContext)

export function Breadcrumbs() {
  const { breadcrumbs } = useContext(BreadcrumbsContext)
  const { configuration } = useContext(LoginContext)
  const cluster = configuration?.manifest?.cluster
  const theme = useTheme()

  const children = Array.from(lookahead(breadcrumbs, (crumb: Breadcrumb, next: Breadcrumb) => {
    if (next.url) {
      return (
        <Flex
          direction="row"
          gap="small"
          key={`${crumb.text}-${crumb.url}`}
        >
          <Span color="text-xlight">
            {typeof crumb.url !== 'string' ? (
              crumb.text
            ) : (
              <A
                as={Link}
                to={crumb.url}
                _hover={{
                  cursor: 'pointer',
                  color: 'text',
                  textDecoration: 'underline',
                }}
              >
                {crumb.text}
              </A>
            )}
          </Span>
          <Div color={theme.colors.grey[700]}>/</Div>
        </Flex>
      )
    }

    return crumb.text
  }))

  return (
    <Flex
      direction="row"
      gap="small"
      paddingVertical="small"
    >
      {cluster && (
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
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <BreadcrumbsContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbsContext.Provider>
  )
}

