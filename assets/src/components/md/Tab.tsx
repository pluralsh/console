import { forwardRef } from 'react'
import type { ComponentProps } from 'react'

import { Tab as TabBase } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

function TabRef({ ...props }: ComponentProps<typeof TabBase>, ref) {
  const theme = useTheme()

  return (
    <TabBase
      ref={ref}
      flexGrow={1}
      flexShrink={1}
      justifyContent="center"
      {...{
        '& div': {
          justifyContent: 'center',
          paddingTop: theme.spacing.xsmall,
          paddingBottom: theme.spacing.xsmall - 3,
          fontFamily: theme.fontFamilies.sansHero,
        },
      }}
      {...props}
    />
  )
}

export default forwardRef(TabRef)
