import { Card } from '@pluralsh/design-system'
import styled from 'styled-components'

export const SettingsFormCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing.large,
  minWidth: 150,
  maxWidth: '100%',
  gap: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
}))
