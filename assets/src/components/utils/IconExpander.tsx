import {
  Accordion,
  AccordionItem,
  CloseIcon,
  IconFrame,
  Input,
  useCloseItem,
  useIsItemOpen,
} from '@pluralsh/design-system'

import {
  ComponentProps,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
} from 'react'
import styled, { useTheme } from 'styled-components'

const ACCORDION_SINGLE_ITEM_VALUE = 'icon-expander'

export function IconExpander({
  icon,
  hideCloseIcon = false,
  children,
}: {
  icon: ReactElement
  hideCloseIcon?: boolean
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <Accordion
      type="single"
      orientation="horizontal"
      css={{
        border: theme.borders['fill-three'],
        minWidth: 'fit-content',
        height: '40px',
      }}
    >
      <AccordionItem
        hideDefaultIcon
        value={ACCORDION_SINGLE_ITEM_VALUE}
        trigger={<BlendedIconFrameSC icon={icon} />}
      >
        <div css={{ display: 'flex', height: '100%' }}>
          {children}
          {!hideCloseIcon && <CloseExpanderIcon />}
        </div>
      </AccordionItem>
    </Accordion>
  )
}

export function ExpandedInput({
  inputValue,
  onChange,
  ...props
}: {
  inputValue: string
  onChange: (value: string) => void
} & ComponentProps<typeof Input>) {
  const inputRef = useRef<HTMLElement>()
  const isOpen = useIsItemOpen(ACCORDION_SINGLE_ITEM_VALUE)

  useEffect(() => {
    // only using querySelector because honorable input refs point to the div wrapper around the input
    if (isOpen) inputRef.current?.querySelector('input')?.focus()
  }, [isOpen])

  return (
    <Input
      border="none"
      borderRadius={0}
      ref={inputRef}
      placeholder="Filter by name"
      value={inputValue}
      width={250}
      inputProps={{
        height: '100%',
      }}
      onChange={(e) => onChange(e.currentTarget.value)}
      {...props}
    />
  )
}

export function CloseExpanderIcon({
  ...props
}: ComponentProps<typeof EndIconButtonSC>) {
  const close = useCloseItem(ACCORDION_SINGLE_ITEM_VALUE)

  return (
    <EndIconButtonSC
      onClick={(e) => {
        e.stopPropagation()
        close()
      }}
      {...props}
    >
      <CloseIcon />
    </EndIconButtonSC>
  )
}

const EndIconButtonSC = styled.button(({ theme }) => ({
  background: theme.colors['fill-two'],
  border: 'none',
  color: theme.colors['icon-default'],
  padding: theme.spacing.small,
  '&:hover': {
    background: theme.colors['fill-two-hover'],
    cursor: 'pointer',
  },
}))

const BlendedIconFrameSC = styled(IconFrame).attrs({
  type: 'floating',
})(({ theme }) => ({
  height: '100%',
  width: '40px',
  border: 'none',
  borderRadius: 0,
  '&:hover': {
    background: theme.colors['fill-two-hover'],
  },
}))
