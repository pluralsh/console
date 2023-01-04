import React, { useContext, useState } from 'react'
import { Div, Flex, Span } from 'honorable'
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'

import { lookahead } from '../utils/array'

import { LoginContext } from './contexts'

type Breadcrumb = {
  url: string,
  text: string,
  disable?: boolean
}

export const BreadcrumbsContext = React.createContext<{breadcrumbs:Breadcrumb[], setBreadcrumbs:(arg:Breadcrumb[])=>void}>({
  breadcrumbs: [],
  setBreadcrumbs: () => { },
})

export function Breadcrumbs() {
  const navigate = useNavigate()
  const { breadcrumbs } = useContext(BreadcrumbsContext)
  const { configuration } = useContext(LoginContext)
  const cluster = configuration?.manifest?.cluster
  const theme = useTheme()

  const children = Array.from(lookahead(breadcrumbs, (crumb:Breadcrumb, next:Breadcrumb) => {
    if (next.url) {
      return (
        <Flex
          direction="row"
          gap="small"
        >
          <Span
            onClick={() => navigate(crumb.url)}
            color="text-xlight"
            _hover={{
              cursor: 'pointer',
              color: 'text',
              textDecoration: 'underline',
            }}
          >
            {crumb.text}
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
