import { Command } from 'cmdk'
import styled, { useTheme } from 'styled-components'
import chroma from 'chroma-js'
import { useRef } from 'react'
import { setThemeColorMode } from '@pluralsh/design-system'

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
    width: 480,

    // TODO: Use dialog for positioning?
    left: '50%',
    position: 'fixed',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: theme.zIndexes.modal,
  },

  '[cmdk-input]': {
    ...theme.partials.reset.input,
    ...theme.partials.text.body2,
    backgroundColor: theme.colors['fill-three'],
    border: 'none',
    borderBottom: theme.borders.input,
    color: theme.colors.text,
    padding: '14px 16px',
    width: '100%',
  },

  '[cmdk-list]': {
    backgroundColor: theme.colors['fill-two'],
    padding: theme.spacing.small,
  },
}))

export default function CommandPalette({ open, setOpen }) {
  const theme = useTheme()
  const targetTheme = theme.mode === 'dark' ? 'light' : 'dark'
  const container = useRef()

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
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>

          <Command.Group>
            <Command.Item>Home</Command.Item>
            <Command.Item>Continuous Deployment (CD)</Command.Item>
            <Command.Item>Stacks</Command.Item>
            <Command.Item>Kubernetes Dashboard</Command.Item>
            <Command.Item>Pull Requests</Command.Item>
            <Command.Item>Policies</Command.Item>
            <Command.Item>Backups</Command.Item>
            <Command.Item>Notifications</Command.Item>
            <Command.Item>Settings</Command.Item>
          </Command.Group>

          {/* TODO: Add one more nav group. */}

          <Command.Group>
            <Command.Item>Open docs</Command.Item>
            <Command.Item>Help (contact support)</Command.Item>
          </Command.Group>

          <Command.Group>
            <Command.Item>Copy page link</Command.Item>
            <Command.Item onSelect={() => setThemeColorMode(targetTheme)}>
              Switch to {targetTheme} mode
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </Wrapper>
  )
}
