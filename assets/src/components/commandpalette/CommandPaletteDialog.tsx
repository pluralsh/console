import { Command } from 'cmdk'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import { ModalWrapper } from '@pluralsh/design-system'

import chroma from 'chroma-js'

import CommandPalette from './CommandPalette'

export const Wrapper = styled(ModalWrapper)(({ theme }) => ({
  position: 'relative',
  top: '-96px',
  '[cmdk-root]': {
    border: theme.borders.input,
    borderRadius: theme.borderRadiuses.large,
    boxShadow: theme.boxShadows.modal,
    display: 'flex',
    flexDirection: 'column',
    width: 480,
    maxHeight: 480,

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

      '&::placeholder': {
        color: theme.colors['text-xlight'],
      },
    },

    '[cmdk-empty]': {
      alignItems: 'center',
      backgroundColor: theme.colors['fill-one-selected'],
      borderRadius: theme.borderRadiuses.large,
      cursor: 'pointer',
      display: 'flex',
      gap: theme.spacing.xsmall,
      padding: `${theme.spacing.small}px 16px`,

      '&:hover': {
        backgroundColor: theme.colors['fill-one-hover'],
      },
    },

    '[cmdk-list]': {
      backgroundColor: theme.colors['fill-one'],
      borderBottomLeftRadius: theme.borderRadiuses.large,
      borderBottomRightRadius: theme.borderRadiuses.large,
      height: `calc(var(--cmdk-list-height) + ${theme.spacing.small * 2}px)`,
      overflow: 'auto',
      padding: theme.spacing.small,
      transition: 'height 100ms ease',

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

        kbd: {
          backgroundColor: theme.colors['fill-two'],
          border: theme.borders['fill-two'],
        },

        '&[data-selected="true"]': {
          backgroundColor: theme.colors['fill-one-selected'],
          color: theme.colors.text,

          '.fade': {
            color: theme.colors['text-light'],
          },

          kbd: {
            backgroundColor: theme.colors['fill-three'],
            border: theme.borders['fill-three'],
          },
        },

        '&[data-disabled="true"]': {
          color: theme.colors['text-disabled'],

          '.fade': {
            color: theme.colors['text-disabled'],
          },
        },

        '&:hover': {
          backgroundColor: theme.colors['fill-one-hover'],
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

export default function CommandPaletteDialog({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const [value, setValue] = useState('')

  useEffect(() => setValue(''), [open])

  return (
    <Wrapper
      overlayStyles={{
        background: `${chroma(theme.colors.grey[900]).alpha(0.3)}`,
      }}
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
    >
      <Command>
        <CommandPalette
          value={value}
          setValue={setValue}
          close={() => setOpen(false)}
        />
      </Command>
    </Wrapper>
  )
}
