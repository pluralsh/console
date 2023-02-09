import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { ComponentProps } from 'react'

import { ScrollablePage } from './ScrollablePage'

export function ResponsivePageFullWidth({
  scrollable = true,
  children,
  ...props
}: ComponentProps<typeof ScrollablePage>) {
  return (
    <ResponsiveLayoutPage
      flexDirection="column"
      {...(scrollable
        ? {
          paddingRight: 0,
          paddingBottom: 0,
        }
        : {})}
    >
      <ScrollablePage
        scrollable={scrollable}
        fullWidth
        {...props}
      >
        {children}
      </ScrollablePage>
    </ResponsiveLayoutPage>
  )
}
