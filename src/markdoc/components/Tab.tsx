import { type ComponentProps, type MutableRefObject, forwardRef } from 'react'

import { useTheme } from 'styled-components'

import { Tab as TabBase } from '../../index'

function TabRef(
  { ...props }: ComponentProps<typeof TabBase>,
  ref: MutableRefObject<HTMLDivElement>
) {
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
