import { Tooltip, UpdatesIcon, WrapWithIf } from '@pluralsh/design-system'
import { sidebarItemLayout } from 'components/utils/sidebar/SidebarItem'
import { use } from 'react'
import styled from 'styled-components'

import {
  reloadApplicationUpdate,
  useApplicationUpdateAvailable,
} from './applicationUpdate'
import { SidebarContext } from './Sidebar'

// laid out like the other sidebar items, so its icon lines up with theirs
const UpdateButtonSC = styled.button<{ $isExpanded: boolean }>(
  ({ theme, $isExpanded }) => ({
    ...theme.partials.reset.button,
    ...theme.partials.text.body2Bold,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: $isExpanded ? 'flex-start' : 'center',
    gap: theme.spacing.xsmall,
    whiteSpace: 'nowrap',
    ...sidebarItemLayout(theme, $isExpanded),
    height: 32,
    ...(!$isExpanded && { width: 32, padding: 0 }),
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-always-white'],
    backgroundColor: theme.colors['action-primary'],
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.colors['action-primary-hover'],
    },
    '&:focus-visible': {
      outline: theme.borders['outline-focused'],
    },
  })
)

export function ApplicationUpdateNavButton() {
  const { isExpanded } = use(SidebarContext)
  const updateAvailable = useApplicationUpdateAvailable()

  if (!updateAvailable) {
    return null
  }

  return (
    <WrapWithIf
      condition={!isExpanded}
      wrapper={
        <Tooltip
          label="A new console version is available. Reload to update."
          placement="right"
        />
      }
    >
      <UpdateButtonSC
        type="button"
        $isExpanded={isExpanded}
        onClick={(e) => {
          e.stopPropagation()
          reloadApplicationUpdate()
        }}
        aria-label="Update console"
      >
        <UpdatesIcon
          size={16}
          color="text-always-white"
        />
        {isExpanded && 'Update'}
      </UpdateButtonSC>
    </WrapWithIf>
  )
}
