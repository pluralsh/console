import { useTheme } from 'styled-components'

export function Info({ text, description, ...props }: any) {
  const theme = useTheme()

  return (
    <div
      css={{ display: 'flex', flexDirection: 'column' }}
      {...props}
    >
      <span css={{ fontWeight: 'bold' }}>{text}</span>
      <span css={{ color: theme.colors['text-light'] }}>{description}</span>
    </div>
  )
}
