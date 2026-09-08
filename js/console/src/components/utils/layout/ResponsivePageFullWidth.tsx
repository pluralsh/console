import { CSSProperties, ComponentPropsWithoutRef } from 'react'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import { ScrollablePage } from './ScrollablePage'

export function ResponsivePageFullWidth({
  scrollable = true,
  style,
  children,
  ...props
}: { scrollable?: boolean; style?: CSSProperties } & ComponentPropsWithoutRef<
  typeof ScrollablePage
>) {
  return (
    <ResponsiveLayoutPage
      css={{
        flexDirection: 'column',
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
