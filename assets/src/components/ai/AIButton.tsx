import { useTheme } from 'styled-components'
import { AiSparkleFilledIcon, Button } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { ButtonProps } from 'honorable'

export default function AIButton({
  active,
  children,
  ...props
}: {
  active?: boolean
  children: ReactNode
} & ButtonProps) {
  const theme = useTheme()

  return (
    <Button
      secondary
      small
      startIcon={<AiSparkleFilledIcon size={13} />}
      {...(active
        ? {
            backgroundImage: `linear-gradient(${theme.colors['fill-zero']}, ${theme.colors['fill-zero']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
            backgroundClip: 'padding-box, border-box',
            backgroundOrigin: 'border-box',
            border: '1px solid transparent',
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
  )
}
