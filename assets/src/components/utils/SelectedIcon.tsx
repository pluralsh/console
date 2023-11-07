import { CheckRoundedIcon } from '@pluralsh/design-system'
import styled from 'styled-components'

export const SelectedIcon = styled(CheckRoundedIcon)(({ theme }) => ({
  color: theme.colors['action-primary'],
  position: 'relative',
  '& svg': {
    zIndex: 0,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '2px',
    right: '2px',
    left: '2px',
    bottom: '2px',
    backgroundColor: theme.colors['text-always-white'],
    borderRadius: '50%',
  },
}))
