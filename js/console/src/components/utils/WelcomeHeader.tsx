import { CSSProperties } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'

import { Title1H1 } from 'components/utils/typography/Text'

export function WelcomeHeader({
  heading = 'Welcome to Plural Console',
  marginBottom,
  textAlign = 'center',
  ...props
}: {
  heading?: string
  marginBottom?: keyof DefaultTheme['spacing']
} & CSSProperties) {
  const theme = useTheme()
  return (
    <div
      style={{
        ...props,
        marginBottom: marginBottom ? theme.spacing[marginBottom] : undefined,
      }}
    >
      <Title1H1
        $color="text"
        style={{ margin: 0, textAlign }}
      >
        {heading}
      </Title1H1>
    </div>
  )
}
