import { CSSProperties } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'

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
      css={{
        ...props,
        marginBottom: marginBottom ? theme.spacing[marginBottom] : undefined,
      }}
    >
      <h1 css={{ ...theme.partials.text.title1, margin: 0, textAlign }}>
        {heading}
      </h1>
    </div>
  )
}
