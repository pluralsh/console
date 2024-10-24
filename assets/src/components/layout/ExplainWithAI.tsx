import { AiSparkleFilledIcon, Button } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useState } from 'react'

const gradientBorder = (theme) => ({
  backgroundClip: 'padding-box, border-box',
  backgroundOrigin: 'border-box',
  backgroundImage: `linear-gradient(${theme.colors['fill-zero']}, ${theme.colors['fill-zero']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
  border: '1px solid transparent',
})

export default function ExplainWithAI() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <Button
      onClick={() => setOpen(true)}
      secondary
      small
      startIcon={<AiSparkleFilledIcon size={14} />}
      marginRight={66}
      width={163}
      {...(open
        ? { ...gradientBorder(theme), _hover: gradientBorder(theme) }
        : {})}
    >
      Explain with AI
    </Button>
  )
}
