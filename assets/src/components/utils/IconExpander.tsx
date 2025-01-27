import {
  Accordion,
  AccordionItem,
  AnimatedDiv,
  CloseIcon,
  IconFrame,
  Input,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'

import {
  ComponentProps,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTransition } from 'react-spring'
import styled, { CSSProperties, useTheme } from 'styled-components'

export function IconExpander({
  icon,
  active,
  onClear,
  children,
  ...cssProps
}: {
  icon: ReactElement<any>
  active?: boolean
  onClear?: () => void
  children: ReactNode
} & CSSProperties) {
  const theme = useTheme()
  // will hold the item's randomly assigned id if open, empty string if closed
  const [openItem, setOpenItem] = useState('')
  const transitions = useTransition(active && !openItem ? [true] : [], {
    from: { opacity: 0, scale: `40%` },
    enter: { opacity: 1, scale: '100%' },
    leave: { opacity: 0, scale: `40%` },
    config: { duration: 200 },
  })

  const indicator = transitions((styles) => (
    <AnimatedDiv
      css={{
        position: 'absolute',
        right: -4,
        top: -4,
        height: 12,
        width: 12,
        backgroundColor: theme.colors['border-primary'],
        borderRadius: '50%',
        zIndex: 9999,
      }}
      style={styles}
    ></AnimatedDiv>
  ))

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
          ...(active ? { borderColor: theme.colors['border-primary'] } : {}),
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
            <WrapWithIf
              condition={!!active}
              wrapper={
                <Tooltip
                  placement="top"
                  label="Clear"
                />
              }
            >
              <BlendedIconFrameSC
                $active={!!active}
                onClick={() => onClear?.()}
                icon={
                  <CloseIcon
                    style={{
                      opacity: active ? 1 : 0.2,
                      transition: 'opacity 0.1s ease-out',
                    }}
                  />
                }
              />
            </WrapWithIf>
          </div>
        </AccordionItem>
      </Accordion>
      {indicator}
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
  const inputRef = useRef<HTMLElement>(undefined)

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
      onChange={(e) => onChange(e.currentTarget.value)}
      {...props}
    />
  )
}

const BlendedIconFrameSC = styled(IconFrame)<{ $active?: boolean }>(
  ({ theme, $active = true }) => ({
    background: theme.colors['fill-two'],
    height: '100%',
    width: '40px',
    border: 'none',
    borderRadius: 0,
    '&:hover': {
      background: $active ? theme.colors['fill-two-hover'] : undefined,
      cursor: $active ? 'pointer' : undefined,
    },
  })
)
