import { CSSProperties, ComponentProps, Ref, forwardRef } from 'react'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import { ScrollablePage } from './ScrollablePage'

export const ResponsivePageFullWidth = forwardRef(
  (
    {
      scrollable = true,
      style,
      children,
      ...props
    }: { scrollable?: boolean; style?: CSSProperties } & ComponentProps<
      typeof ResponsiveLayoutPage
    >,
    ref: Ref<HTMLDivElement>
  ) => (
    <ResponsiveLayoutPage
      ref={ref}
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
)
