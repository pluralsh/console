import {
  Accordion,
  AccordionItem,
  CloseIcon,
  IconFrame,
  Input,
} from '@pluralsh/design-system'

import {
  ComponentProps,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled, { CSSProperties, useTheme } from 'styled-components'

export function IconExpander({
  icon,
  hideCloseIcon = false,
  children,
  ...cssProps
}: {
  icon: ReactElement
  hideCloseIcon?: boolean
  children: ReactNode
} & CSSProperties) {
  const theme = useTheme()
  // will hold the item's randomly assigned id if open, empty string if closed
  const [openItem, setOpenItem] = useState('')

  return (
    <div css={{ position: 'relative' }}>
      <Accordion
        type="single"
        value={openItem}
        onValueChange={setOpenItem}
        orientation="horizontal"
        css={{
          border: theme.borders['fill-three'],
          overflow: 'hidden',
          ...cssProps,
        }}
      >
        <AccordionItem
          caret="none"
          padding="none"
          paddingArea="trigger-only"
          css={{ height: '40px' }}
          trigger={<BlendedIconFrameSC icon={icon} />}
        >
          <div css={{ display: 'flex', height: '100%' }}>
            {children}
            {!hideCloseIcon && (
              <EndIconButtonSC onClick={() => setOpenItem('')}>
                <CloseIcon />
              </EndIconButtonSC>
            )}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
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

  useEffect(() => {
    // only using querySelector because honorable input refs point to the div wrapper around the input
    inputRef.current?.querySelector('input')?.focus()
  }, [])

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
