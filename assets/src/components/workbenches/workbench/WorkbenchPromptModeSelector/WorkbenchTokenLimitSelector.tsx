import {
  AddIcon,
  Card,
  CloseIcon,
  Flex,
  useFloatingDropdown,
} from '@pluralsh/design-system'
import { ChatOptionPill } from 'components/ai/chatbot/input/ChatInput'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import type { WorkbenchJobBudgetAttributes } from 'generated/graphql'
import { cloneElement, useRef, useState } from 'react'
import { useButton } from 'react-aria'
import { useTheme } from 'styled-components'
import {
  WorkbenchBudgetAmountControl,
  formatBudgetLimitLabel,
} from './WorkbenchBudgetLimit'
import { WorkbenchBudgetSpendCapWarning } from './WorkbenchBudgetSpendCapWarning'
import { WorkbenchPromptPopover } from './WorkbenchPromptModeSelector'

const PANEL_WIDTH = 308

export function WorkbenchTokenLimitSelector({
  workbenchId,
  value,
  onChange,
  disabled = false,
}: {
  workbenchId?: Nullable<string>
  value: WorkbenchJobBudgetAttributes | null | undefined
  onChange: (value: WorkbenchJobBudgetAttributes | undefined) => void
  disabled?: boolean
}) {
  const theme = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const label = formatBudgetLimitLabel(value)
  const { floating, triggerRef: mergedTriggerRef } = useFloatingDropdown({
    triggerRef,
    width: PANEL_WIDTH,
    placement: 'left',
  })
  const { buttonProps } = useButton(
    {
      onPress: () => !disabled && setIsOpen((open) => !open),
      isDisabled: disabled,
    },
    triggerRef
  )

  const trigger = (
    <ChatOptionPill
      isOpen={isOpen}
      showArrow={false}
      disabled={disabled}
      css={{
        height: '100%',
        backgroundColor: label ? undefined : theme.colors['fill-one'],
      }}
    >
      {label ? (
        <>
          <span>{label}</span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear token limit"
            css={{ display: 'flex' }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onChange(undefined)
              setIsOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              event.stopPropagation()
              onChange(undefined)
              setIsOpen(false)
            }}
          >
            <CloseIcon size={10} />
          </span>
        </>
      ) : (
        <>
          <AddIcon size={10} />
          <span>Set token limit</span>
        </>
      )}
    </ChatOptionPill>
  )

  return (
    <>
      {cloneElement(trigger, {
        ref: mergedTriggerRef,
        ...buttonProps,
        ...(isOpen ? { style: { zIndex: theme.zIndexes.tooltip + 1 } } : {}),
      })}
      <WorkbenchPromptPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        floating={floating}
      >
        <Card
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
            padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
            backgroundColor: theme.colors['fill-one'],
            border: 'none',
            borderRadius: theme.borderRadiuses.large,
            boxShadow: theme.boxShadows.moderate,
          }}
        >
          <Flex
            direction="column"
            gap="xxsmall"
          >
            <Body2BoldP>Set token limit</Body2BoldP>
            <Body2P $color="text-xlight">
              Set a dollar or token limit. Default is unlimited.
            </Body2P>
          </Flex>
          <WorkbenchBudgetAmountControl
            value={value}
            onChange={onChange}
            disabled={disabled}
            stacked
          />
          <WorkbenchBudgetSpendCapWarning
            workbenchId={workbenchId}
            budget={value}
            skip={!isOpen}
          />
        </Card>
      </WorkbenchPromptPopover>
    </>
  )
}
