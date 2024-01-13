import { ComponentProps } from 'react'
import styled from 'styled-components'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import { ScrollablePage } from './ScrollablePage'

const ResponsivePageFullWidthSC = styled(ResponsiveLayoutPage)<{
  $scrollable: boolean
}>(({ $scrollable }) => ({
  flexDirection: 'column',
  ...($scrollable
    ? {
        paddingRight: 0,
        paddingBottom: 0,
      }
    : {}),
}))

export function ResponsivePageFullWidth({
  scrollable = true,
  children,
  ...props
}: ComponentProps<typeof ScrollablePage>) {
  return (
    <ResponsivePageFullWidthSC $scrollable={scrollable}>
      <ScrollablePage
        scrollable={scrollable}
        fullWidth
        {...props}
      >
        {children}
      </ScrollablePage>
    </ResponsivePageFullWidthSC>
  )
}
