import { Box } from 'grommet'
import { useTheme } from 'styled-components'

export function Info({ text, description, ...box }: any) {
  const theme = useTheme()

  return (
    <Box
      fill="horizontal"
      {...box}
    >
      <span css={{ fontWeight: 'bold' }}>{text}</span>
      <span css={{ color: theme.colors['text-light'] }}>{description}</span>
    </Box>
  )
}
