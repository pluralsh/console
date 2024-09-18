import { ComponentProps, Ref, forwardRef } from 'react'
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

function ResponsivePageFullWidthRef(
  {
    scrollable = true,
    children,
    ...props
  }: ComponentProps<typeof ResponsivePageFullWidthSC>,
  ref: Ref<HTMLDivElement>
) {
  return (
    <ResponsivePageFullWidthSC
      $scrollable={scrollable}
      ref={ref}
    >
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

export const ResponsivePageFullWidth = forwardRef(ResponsivePageFullWidthRef)
