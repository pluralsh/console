import { useTheme } from 'styled-components'

export default function GraphHeader({ title }: { title: string }) {
  const theme = useTheme()

  return (
    <div
      css={{
        color: theme.colors['text-light'],
        justifyContent: 'center',
        ...theme.partials.text.overline,
        textAlign: 'center',
      }}
    >
      {title}
    </div>
  )
}
