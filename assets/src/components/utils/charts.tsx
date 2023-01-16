import { styledTheme as theme } from '@pluralsh/design-system'

export const CHART_THEME = {
  tooltip: { container: { background: '#2A2E37', color: '#FFFFFF' } },
  background: 'transparent',
  axis: {
    ticks: {
      text: {
        fontSize: 10,
        fill: theme.colors['text-light'],
      },
    },
    // domain: { line: null },
  },
  grid: {
    line: {
      strokeWidth: 0.5,
      stroke: theme.colors['text-xlight'],
    },
  },

}
