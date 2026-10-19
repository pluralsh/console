import { CSSProperties, ComponentPropsWithoutRef } from 'react'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { useTheme } from 'styled-components'

import { ScrollablePage } from './ScrollablePage'

export function ResponsivePageFullWidth({
  scrollable = true,
  style,
  children,
  ...props
}: { scrollable?: boolean; style?: CSSProperties } & ComponentPropsWithoutRef<
  typeof ScrollablePage
>) {
  const theme = useTheme()

  return (
    <ResponsiveLayoutPage
      css={{
        flexDirection: 'column',
        // with the scroll area's own top padding, leaves a large gap under the
        // page toolbar
        paddingTop: theme.spacing.large - theme.spacing.medium,
        ...(scrollable
          ? {
              paddingRight: 0,
              paddingBottom: 0,
            }
          : {}),
        ...style,
      }}
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
