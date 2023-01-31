import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { useTheme } from 'styled-components'
import { ComponentProps } from 'react'

import { ScrollablePage } from './ScrollablePage'

export function ResponsivePageFullWidth({
  scrollable = true,
  children,
  ...props
}: ComponentProps<typeof ScrollablePage>) {
  const theme = useTheme()

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
        {...(scrollable
          ? {
            marginRight: 'large',
            contentStyles: {
              paddingRight: theme.spacing.large - 6,
              paddingTop: theme.spacing.medium,
              paddingBottom: theme.spacing.large,
            },
          }
          : {})}
        {...props}
      >
        {children}
      </ScrollablePage>
    </ResponsiveLayoutPage>
  )
}
