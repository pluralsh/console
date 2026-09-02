import { Card } from '@pluralsh/design-system'
import styled from 'styled-components'

export function WorkbenchIssuesDisplayPanel() {
  return <PanelSC fillLevel={1} />
}

const PanelSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: theme.spacing.medium,
  overflowY: 'auto',
  padding: theme.spacing.medium,
  width: 230,
}))
