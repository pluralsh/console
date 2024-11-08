import { DefaultTheme, useTheme } from 'styled-components'
import {
  AiSparkleOutlineIcon,
  AnimatedDiv,
  Button,
} from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { ButtonProps } from 'honorable'
import { useTransition } from 'react-spring'

export default function ExplainWithAIButton({
  active,
  startIcon = <AiSparkleOutlineIcon size={13} />,
  visible,
  children,
  ...props
}: {
  active?: boolean
  startIcon?: ReactNode
  visible: boolean
  children: ReactNode
} & ButtonProps) {
  const theme = useTheme()
  const transitions = useTransition(visible ? [true] : [], {
    from: { opacity: 0, scale: `85%`, marginRight: -100 },
    enter: { opacity: 1, scale: '100%', marginRight: 0 },
    leave: { opacity: 0, scale: `85%`, marginRight: -100 },
  })

  return transitions((styles) => (
    <AnimatedDiv style={styles}>
      <Button
        secondary
        small
        startIcon={startIcon}
        {...(active
          ? {
              ...aiGradientBorderStyles(theme),
              transitionDuration: '1s',
              transitionProperty: 'border',
              _hover: {
                backgroundImage: `linear-gradient(${theme.colors['fill-zero-selected']}, ${theme.colors['fill-zero-selected']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
                border: '1px solid transparent',
              },
            }
          : {})}
        {...props}
      >
        {children}
      </Button>
    </AnimatedDiv>
  ))
}

export const aiGradientBorderStyles = (
  theme: DefaultTheme,
  backgroundColor: keyof DefaultTheme['colors'] = 'fill-zero'
) => ({
  backgroundImage: `linear-gradient(${theme.colors[backgroundColor]}, ${theme.colors[backgroundColor]}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
  backgroundClip: 'padding-box, border-box',
  backgroundOrigin: 'border-box',
  border: '1px solid transparent',
})
