import { useTheme } from 'styled-components'

export function CustomLegend({
  data,
}: {
  data: { label: string; value?: number; color: string }[]
}) {
  const theme = useTheme()
  return (
    <div>
      {data.map((item, index) => (
        <div
          css={{ display: 'flex', alignItems: 'center' }}
          key={index}
        >
          <div
            css={{
              backgroundColor: item.color,
              borderRadius: '50%',
              height: 12,
              width: 12,
            }}
          />
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.small,
              justifyContent: 'space-between',
              marginLeft: theme.spacing.xsmall,
              width: '100%',
            }}
          >
            <div css={{ color: theme.colors['text-light'] }}>{item.label}</div>
            <div css={{ color: theme.colors['text'] }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}