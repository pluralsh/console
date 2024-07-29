import { Command } from 'cmdk'
import styled, { useTheme } from 'styled-components'
import chroma from 'chroma-js'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { setThemeColorMode } from '@pluralsh/design-system'

import { HOME_ABS_PATH } from '../../routes/consoleRoutesConsts'
import { CD_ABS_PATH } from '../../routes/cdRoutesConsts'
import { STACKS_ROOT_PATH } from '../../routes/stacksRoutesConsts'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { PR_ABS_PATH } from '../../routes/prRoutesConsts'
import { POLICIES_ABS_PATH } from '../../routes/policiesRoutesConsts'
import { BACKUPS_ABS_PATH } from '../../routes/backupRoutesConsts'
import { NOTIFICATIONS_ABS_PATH } from '../../routes/notificationsRoutesConsts'
import { SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst'
import { HelpMenuState, launchHelp } from '../help/HelpLauncher'

export const Wrapper = styled.div(({ theme }) => ({
  '[cmdk-overlay]': {
    backgroundColor: `${chroma(theme.colors.grey[900]).alpha(0.3)}`,
    inset: 0,
    position: 'fixed',
    zIndex: theme.zIndexes.modal,
  },

  '[cmdk-root]': {
    border: theme.borders.input,
    borderRadius: theme.borderRadiuses.large,
    boxShadow: theme.boxShadows.modal,
    width: 480,

    // TODO: Use dialog for positioning?
    left: '50%',
    position: 'fixed',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: theme.zIndexes.modal,

    '[cmdk-input]': {
      ...theme.partials.reset.input,
      ...theme.partials.text.body2,
      backgroundColor: theme.colors['fill-two'],
      border: 'none',
      borderBottom: theme.borders.input,
      borderTopLeftRadius: theme.borderRadiuses.large,
      borderTopRightRadius: theme.borderRadiuses.large,
      color: theme.colors.text,
      padding: '14px 16px',
      width: '100%',
    },

    '[cmdk-list]': {
      backgroundColor: theme.colors['fill-one'],
      borderBottomLeftRadius: theme.borderRadiuses.large,
      borderBottomRightRadius: theme.borderRadiuses.large,
      padding: theme.spacing.small,

      '[cmdk-item]': {
        borderRadius: theme.borderRadiuses.large,
        color: theme.colors['text-light'],
        cursor: 'pointer',
        padding: '12px 16px',

        '&[data-selected="true"]': {
          backgroundColor: theme.colors['fill-one-selected'],
          color: theme.colors.text,
        },
      },

      '[cmdk-separator]': {
        backgroundColor: theme.colors['border-input'],
        height: 1,
        margin: '12px -12px',
        width: '100% + 24px', // TODO: Replace workaround.
      },
    },
  },
}))

export default function CommandPalette({ open, setOpen }) {
  const container = useRef()
  const theme = useTheme()
  const targetThemeColorMode = theme.mode === 'dark' ? 'light' : 'dark'
  const navigate = useNavigate()

  return (
    // TODO: Fix.
    <Wrapper ref={container}>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        container={container.current}
        label="Global Command Menu"
      >
        <Command.Input placeholder="Type a command or search..." />
        <Command.List onSelect={() => setOpen(false)}>
          <Command.Empty>No results found.</Command.Empty>

          <Command.Group>
            <Command.Item
              autoFocus
              onSelect={() => navigate(HOME_ABS_PATH)}
            >
              Home
            </Command.Item>
            <Command.Item onSelect={() => navigate(CD_ABS_PATH)}>
              Continuous Deployment (CD)
            </Command.Item>
            <Command.Item onSelect={() => navigate(STACKS_ROOT_PATH)}>
              Stacks
            </Command.Item>
            <Command.Item onSelect={() => navigate(KUBERNETES_ROOT_PATH)}>
              Kubernetes Dashboard
            </Command.Item>
            <Command.Item onSelect={() => navigate(PR_ABS_PATH)}>
              Pull Requests
            </Command.Item>
            <Command.Item onSelect={() => navigate(POLICIES_ABS_PATH)}>
              Policies
            </Command.Item>
            <Command.Item onSelect={() => navigate(BACKUPS_ABS_PATH)}>
              Backups
            </Command.Item>
            <Command.Item onSelect={() => navigate(NOTIFICATIONS_ABS_PATH)}>
              Notifications
            </Command.Item>
            <Command.Item onSelect={() => navigate(SETTINGS_ABS_PATH)}>
              Settings
            </Command.Item>
          </Command.Group>

          <Command.Separator />

          {/* TODO: Add one more nav group. */}

          <Command.Separator />

          <Command.Group>
            <Command.Item
              onSelect={() => window.open('https://docs.plural.sh', '_blank')}
            >
              Open docs
            </Command.Item>
            <Command.Item onSelect={() => launchHelp(HelpMenuState.intercom)}>
              Help (contact support)
            </Command.Item>
          </Command.Group>

          <Command.Separator />

          <Command.Group>
            <Command.Item
              onSelect={() =>
                window.navigator.clipboard.writeText(window.location.href)
              }
            >
              Copy page link
            </Command.Item>
            <Command.Item
              onSelect={() => setThemeColorMode(targetThemeColorMode)}
            >
              Switch to {targetThemeColorMode} mode
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </Wrapper>
  )
}
