import styled from 'styled-components'

export const WorkbenchTabWrapper = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
}))
