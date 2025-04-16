import { SecurityChartData } from 'components/security/overview/useSecurityOverviewChartsData'
import { useTheme } from 'styled-components'

export function CustomLegend({ data }: { data: SecurityChartData }) {
  const theme = useTheme()
  return (
    <div>
      {data.map((layer) =>
        layer.data.map((item, index) => (
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
                flexShrink: 0,
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
              <div css={{ color: theme.colors['text-light'] }}>{item.x}</div>
              <div css={{ color: theme.colors['text'] }}>{item.y}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
