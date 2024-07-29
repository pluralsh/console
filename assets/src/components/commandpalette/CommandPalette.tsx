import { Command } from 'cmdk'
import styled from 'styled-components'
import chroma from 'chroma-js'
import { useRef } from 'react'

import { useCommands } from './commands'

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
    display: 'flex',
    flexDirection: 'column',
    left: '50%',
    maxHeight: 480,
    position: 'fixed',
    top: 128,
    transform: 'translate(-50%, 0)',
    width: 480,
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

      '::placeholder': {
        color: theme.colors['text-xlight'],
      },
    },

    '[cmdk-list]': {
      backgroundColor: theme.colors['fill-one'],
      borderBottomLeftRadius: theme.borderRadiuses.large,
      borderBottomRightRadius: theme.borderRadiuses.large,
      overflow: 'auto',
      padding: theme.spacing.small,

      '[cmdk-item]': {
        alignItems: 'center',
        borderRadius: theme.borderRadiuses.large,
        color: theme.colors['text-light'],
        cursor: 'pointer',
        display: 'flex',
        gap: theme.spacing.xxsmall,
        padding: `${theme.spacing.small}px 16px`,

        '.fade': {
          color: theme.colors['text-xlight'],
        },

        '&[data-selected="true"]': {
          backgroundColor: theme.colors['fill-one-selected'],
          color: theme.colors.text,

          '.fade': {
            color: theme.colors['text-light'],
          },
        },
      },

      '[cmdk-separator]': {
        backgroundColor: theme.colors['border-input'],
        height: 1,
        margin: `${theme.spacing.small}px -${theme.spacing.small}px`,
      },
    },
  },
}))

export default function CommandPalette({ open, setOpen }) {
  const container = useRef(null)
  const commands = useCommands()

  return (
    <Wrapper ref={container}>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        container={container.current ?? undefined}
      >
        <Command.Input placeholder="Type a command or search..." />
        <Command.List onSelect={() => setOpen(false)}>
          <Command.Empty>No results found.</Command.Empty>
          {commands.map((group, i) => (
            <>
              <Command.Group title={group.title}>
                {group.commands.map((command) => (
                  <Command.Item
                    onSelect={() => {
                      command.action()
                      setOpen(false)
                    }}
                  >
                    <command.icon marginRight="xsmall" />
                    <span className="fade">{command.prefix}</span>
                    <span>{command.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              {i < commands.length - 1 && <Command.Separator />}
            </>
          ))}
        </Command.List>
      </Command.Dialog>
    </Wrapper>
  )
}
