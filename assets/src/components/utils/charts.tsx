import { useTheme } from 'styled-components'

export const useChartTheme = () => {
  const theme = useTheme()

  return {
    tooltip: { container: { background: '#2A2E37', color: '#FFFFFF' } },
    background: 'transparent',
    axis: {
      ticks: {
        text: {
          fill: theme.colors['text-light'],
          ...theme.partials.text.body2,
          fontSize: 10,
        },
      },
    },
    grid: {
      line: {
        strokeWidth: 0.75,
        stroke: theme.colors['border-fill-three'],
      },
    },
  }
}
