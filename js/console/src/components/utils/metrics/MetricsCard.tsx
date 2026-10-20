import { Card } from '@pluralsh/design-system'
import styled from 'styled-components'

/**
 * Card for metrics graphs, shared by workbench and built-in dashboards.  Hairline border on the page
 * background in light mode; in dark mode it matches section headers and dropdown popovers.
 */
export const MetricsCard = styled(Card)(({ theme }) =>
  theme.mode === 'dark'
    ? {
        backgroundColor: theme.colors['fill-one'],
        border: theme.borders['fill-one'],
      }
    : { backgroundColor: theme.colors['fill-zero'] }
)
