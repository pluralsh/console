import {
  type ComponentProps,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import React from 'react'
import { animated, useSpring } from 'react-spring'
import styled, { useTheme } from 'styled-components'

import useResizeObserver from '../hooks/useResizeObserver'
import { type UseDisclosureProps, useDisclosure } from '../hooks/useDisclosure'
import { CaretDownIcon } from '../icons'

import Card from './Card'

const paddingTransition = '0.2s ease'

function AccordionTriggerUnstyled({
  children,
  isOpen: _isOpen,
  unstyled: _unstyled,
  ...props
}: { isOpen?: boolean; unstyled?: boolean } & ComponentProps<'div'>) {
  console.log('props', props)

  return (
    <div {...props}>
      <div className="label">{children}</div>
      <div className="icon">
        <CaretDownIcon size={14} />
      </div>
    </div>
  )
}

const AccordionTrigger = styled(AccordionTriggerUnstyled)(({ theme }) => {
  const focusInset = theme.spacing.xsmall
  const padding = theme.spacing.medium

  return {
    display: 'flex',
    gap: theme.spacing.medium,
    padding,
    ...theme.partials.text.body2Bold,
    color: theme.colors.text,
    '.label': {
      flexGrow: 1,
    },
    '.icon > *:first-child': {
      transform: 'scale(100%)',
      transition: 'transform 0.4 ease',
    },
    '&:focus-visible': {
      outline: 'none',
      position: 'relative',
      '&::after': {
        ...theme.partials.focus.insetAbsolute,
        borderRadius: theme.borderRadiuses.medium,
        top: focusInset,
        bottom: focusInset,
        left: focusInset,
        right: focusInset,
      },
    },
    '&:hover': {
      '.icon > *:first-child': {
        transform: 'scale(115%)',
      },
    },
    '.icon': {
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      marginLeft: theme.spacing.xsmall,
      transformOrigin: '50% 50%',
      transform: 'scaleY(100%)',
      transition: 'transform 0.2s ease',
    },
    '&[aria-expanded="true"] .icon': {
      transform: 'scaleY(-100%)',
    },
  }
})

function AccordionContentUnstyled({
  isOpen,
  className,
  children,
  pad: _pad,
  unstyled: _unstyled,
  ...props
}: {
  isOpen?: boolean
  pad?: boolean
  unstyled?: boolean
} & HTMLAttributes<HTMLDivElement>) {
  const eltRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const onResize = useCallback(() => {
    if (eltRef.current?.offsetHeight) {
      setContentHeight(eltRef.current?.offsetHeight)
    }
  }, [])
  const theme = useTheme()

  useEffect(() => {
    onResize()
  }, [onResize])

  useResizeObserver(eltRef, onResize)
  const springs = useSpring({
    to: { height: isOpen ? contentHeight || 'auto' : 0 },
    config: isOpen
      ? {
          clamp: true,
          mass: 0.6,
          tension: 280,
          velocity: 0.02,
        }
      : {
          clamp: true,
          mass: 0.6,
          tension: 400,
          velocity: 0.02,
        },
  })
  const mOffset = theme.spacing.medium - theme.spacing.small

  return (
    <animated.div
      style={{
        overflow: 'hidden',
        ...(!_unstyled
          ? {
              marginTop: -mOffset,
              marginBottom: isOpen ? 0 : mOffset,
            }
          : {}),
        ...springs,
      }}
    >
      <div
        className={className}
        ref={eltRef}
        {...props}
      >
        {children}
      </div>
    </animated.div>
  )
}
const AccordionContent = styled(AccordionContentUnstyled)(
  ({ theme, pad, unstyled }) =>
    unstyled
      ? {}
      : {
          transition: `marginTop ${paddingTransition}`,
          ...(pad
            ? {
                paddingLeft: theme.spacing.medium,
                paddingRight: theme.spacing.medium,
                paddingBottom: theme.spacing.medium,
              }
            : {}),
        }
)

type AccordionPropsBase = {
  textValue?: string
  padContent?: boolean
  unstyled?: boolean
  children?: ReactNode | ((props: { isOpen: boolean }) => ReactNode)
} & UseDisclosureProps

type AccordionPropsWithTrigger = AccordionPropsBase & {
  triggerButton: ReactElement
  label?: never
}

type AccordionPropsWithLabel = AccordionPropsBase & {
  label: ReactNode
  triggerButton?: never
}

export type AccordionProps = AccordionPropsWithTrigger | AccordionPropsWithLabel

export default function Accordion({
  textValue,
  label,
  triggerButton,
  padContent = true,
  unstyled = false,
  children,
  isOpen: isOpenProp,
  onOpenChange,
  defaultOpen,
  id,
  ...props
}: AccordionProps) {
  if (!textValue && typeof label === 'string') {
    textValue = label
  }

  const { triggerProps, contentProps, isOpen } = useDisclosure({
    defaultOpen,
    isOpen: isOpenProp,
    onOpenChange,
    id,
  })

  useEffect(() => {}, [isOpen])

  const kids = useMemo(
    () =>
      typeof children === 'function'
        ? children({ isOpen: !!isOpen })
        : children,
    [children, isOpen]
  )

  const Wrapper = useMemo(() => {
    if (unstyled) {
      return function Div(props: ComponentProps<'div'>) {
        return <div {...props} />
      }
    }

    return Card
  }, [unstyled])
  const finalTriggerProps = {
    isOpen,
    ...triggerProps,
  }

  const trigger = triggerButton ? (
    React.cloneElement(triggerButton, finalTriggerProps)
  ) : (
    <AccordionTrigger
      unstyled={unstyled}
      {...finalTriggerProps}
    >
      {label}
    </AccordionTrigger>
  )

  return (
    <Wrapper {...props}>
      {trigger}
      <AccordionContent
        isOpen={isOpen}
        pad={padContent}
        unstyled={unstyled}
        {...contentProps}
      >
        {kids}
      </AccordionContent>
    </Wrapper>
  )
}
