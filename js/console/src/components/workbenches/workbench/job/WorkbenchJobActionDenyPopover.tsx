import { ApolloError } from '@apollo/client'
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react'
import {
  Button,
  CloseIcon,
  Flex,
  IconFrame,
  Input,
  Popover,
  PopoverWrapper,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { FormEvent, useState } from 'react'
import styled, { useTheme } from 'styled-components'

const POPOVER_WIDTH = 360

export function WorkbenchJobActionDenyButton({
  disabled,
  rejecting,
  rejectError,
  onDeny,
}: {
  disabled?: boolean
  rejecting: boolean
  rejectError?: ApolloError | null
  onDeny: (reason: string) => Promise<unknown> | unknown
}) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  const {
    refs: { setReference, setFloating },
    placement,
    strategy,
    x,
    y,
  } = useFloating({
    placement: 'top-start',
    strategy: 'fixed',
    middleware: [
      offset(theme.spacing.small),
      flip({ padding: theme.spacing.small }),
      shift({ padding: theme.spacing.small }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const close = () => {
    if (rejecting) return
    setOpen(false)
    setReason('')
  }

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    try {
      await onDeny(reason.trim())
      setOpen(false)
      setReason('')
    } catch {
      // keep open; rejectError is shown from the mutation hook
    }
  }

  return (
    <>
      <Button
        ref={setReference}
        small
        secondary
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled || rejecting}
        onClick={() => setOpen((value) => !value)}
        css={{
          color: theme.colors['text-danger-light'],
          borderColor: theme.colors['border-danger'],
          '&:hover': {
            color: theme.colors['text-danger-light'],
            borderColor: theme.colors['border-danger'],
          },
        }}
      >
        Deny
      </Button>
      {open && (
        <FloatingPortal id={theme.portals.default.id}>
          <PopoverWrapper
            $isOpen={open}
            $placement={placement}
            ref={setFloating}
            style={{
              position: strategy,
              left: x ?? 0,
              top: y ?? 0,
              width: POPOVER_WIDTH,
              height: 'auto',
              maxHeight: 'none',
              zIndex: theme.zIndexes.modal,
            }}
          >
            <Popover
              isOpen={open}
              onClose={close}
            >
              <DenyPopoverSC onSubmit={onSubmit}>
                <Flex
                  align="center"
                  justify="space-between"
                  gap="small"
                >
                  <Body2P $color="text">Reason for denial</Body2P>
                  <IconFrame
                    clickable
                    size="small"
                    type="tertiary"
                    tooltip="Close"
                    icon={<CloseIcon />}
                    disabled={rejecting}
                    onClick={close}
                  />
                </Flex>
                <CaptionP $color="text-xlight">
                  The agent will acknowledge your reasoning as it progresses.
                </CaptionP>
                {rejectError && <GqlError error={rejectError} />}
                <Input
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this action should not run."
                />
                <ActionsSC>
                  <Button
                    secondary
                    type="button"
                    disabled={rejecting}
                    onClick={close}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    secondary
                    loading={rejecting}
                    css={{
                      color: theme.colors['text-danger-light'],
                      borderColor: theme.colors['border-danger'],
                      '&:hover': {
                        color: theme.colors['text-danger-light'],
                        borderColor: theme.colors['border-danger'],
                      },
                    }}
                  >
                    Confirm denial
                  </Button>
                </ActionsSC>
              </DenyPopoverSC>
            </Popover>
          </PopoverWrapper>
        </FloatingPortal>
      )}
    </>
  )
}

const DenyPopoverSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  width: '100%',
  padding: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders['fill-two'],
  backgroundColor: theme.colors['fill-two'],
  boxShadow: theme.boxShadows.moderate,
}))

const ActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing.small,
}))
