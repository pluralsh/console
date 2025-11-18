import { type ComponentProps } from 'react'

import { useTheme } from 'styled-components'

import { Tab as TabBase } from '../../index'

function Tab({ ...props }: ComponentProps<typeof TabBase>) {
  const theme = useTheme()

  return (
    <TabBase
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

export default Tab
