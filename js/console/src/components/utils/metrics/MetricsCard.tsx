import { Card } from '@pluralsh/design-system'
import styled from 'styled-components'

/** Card for metrics graphs: hairline border on the page background, like workbench dashboard panels. */
export const MetricsCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
}))
