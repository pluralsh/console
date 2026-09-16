import {
  Button,
  Tooltip,
  UpdatesIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { use } from 'react'
import styled from 'styled-components'

import {
  reloadApplicationUpdate,
  useApplicationUpdateAvailable,
} from './applicationUpdate'
import { SidebarContext } from './Sidebar'

const UPDATE_BUTTON_RADIUS_PX = 12

const SidebarUpdateWrapSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  padding: `0 ${theme.spacing.xsmall}px`,
  marginBottom: theme.spacing.xxsmall,
}))

const CollapsedUpdateSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  width: 32,
  height: 32,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.colors['action-primary'],
  border: '1px solid transparent',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.colors['action-primary-hover'],
  },
  '&:focus-visible': {
    outline: 'none',
    borderColor: theme.colors['border-outline-focused'],
  },
}))

const ExpandedUpdateButtonSC = styled(Button)({
  width: 'auto',
  borderRadius: UPDATE_BUTTON_RADIUS_PX,
})

export function ApplicationUpdateNavButton() {
  const { isExpanded } = use(SidebarContext)
  const updateAvailable = useApplicationUpdateAvailable()

  if (!updateAvailable) {
    return null
  }

  const reload = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    reloadApplicationUpdate()
  }

  return (
    <SidebarUpdateWrapSC>
      {isExpanded ? (
        <ExpandedUpdateButtonSC
          primary
          small
          justifyContent="center"
          innerFlexProps={{ gap: 'xsmall' }}
          onClick={reload}
          aria-label="Update console"
        >
          <UpdatesIcon color="text-always-white" />
          Update
        </ExpandedUpdateButtonSC>
      ) : (
        <WrapWithIf
          condition
          wrapper={
            <Tooltip
              label="A new console version is available. Reload to update."
              placement="right"
            />
          }
        >
          <CollapsedUpdateSC
            type="button"
            onClick={reload}
            aria-label="Update console"
          >
            <UpdatesIcon
              size={16}
              color="text-always-white"
            />
          </CollapsedUpdateSC>
        </WrapWithIf>
      )}
    </SidebarUpdateWrapSC>
  )
}
