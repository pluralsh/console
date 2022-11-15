import { useKeyboard } from '@react-aria/interactions'
import {
  ComponentPropsWithRef,
  Dispatch,
  ReactElement,
  useEffect,
  useRef,
} from 'react'
import AnimateHeight from 'react-animate-height'
import styled from 'styled-components'

import CaretDownIcon from './icons/CaretDownIcon'
import SuccessIcon from './icons/SuccessIcon'

const heightAnimationDuration = 333 // 333ms

const ChecklistItemInner = styled(ChecklistItemInnerUnstyled)(({ theme, completed, selected }) => ({
  display: 'flex',
  flexDirection: 'column',

  '.itemHeader': {
    padding: `${theme.spacing.xsmall}px ${theme.spacing.large}px`,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    color: selected ? theme.colors['action-link-active'] : theme.colors['action-link-inactive'],
    cursor: 'pointer',

    ':hover': {
      background: theme.colors['fill-two-hover'],
    },

    ':focus': {
      outline: `${theme.colors['border-outline-focused']} solid 1px`,
    },

    '.itemCircle': {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: '100%',
      background: theme.colors['fill-three'],
      ...theme.partials.text.body2,

      ...(!selected && {
        border: theme.borders['fill-three'],
      }),

      '> span': {
        position: 'absolute',
        opacity: completed ? 1 : 0,
        animation: completed ? 'overshoot 0.33s' : 'none',
      },

      '> div': {
        opacity: completed ? 0 : 1,
      },

      '&::after, &::before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        borderRadius: '100%',
      },

      '&:before': {
        border: '1px solid transparent',

        ...(selected && {
          borderTopColor: theme.colors['action-link-active'],
          borderRightColor: theme.colors['action-link-active'],
          borderBottomColor: theme.colors['action-link-active'],

          transition: `
            border-top-color 0.1s linear,
            border-right-color 0.1s linear 0.1s,
            border-bottom-color 0.1s linear 0.2s`,
        }),
      },

      '&:after': {
        border: '0 solid transparent',

        ...(selected && {
          borderTop: `1px solid ${theme.colors['action-link-active']}`,
          borderLeftWidth: '1px',
          borderRightWidth: '1px',
          transform: 'rotate(270deg)',
          transition: `
            transform 0.3s linear 0s,
            border-left-width 0.1s linear 0.3s`,
        }),
      },
    },

    '.itemTitle': {
      flex: '1 1 auto',
    },
  },

  '.itemContainer': {
    padding: `0 ${theme.spacing.large}px`,
    display: 'flex',
    gap: 28,
    color: theme.colors['text-light'],

    '.itemLine': {
      width: 1,
      background: theme.colors['action-link-active'],
      marginLeft: 16,
    },

    '.itemContent': {
      padding: `${theme.spacing.xsmall}px 0`,
    },
  },

  '@keyframes overshoot': {
    '0%': {
      transform: 'scale(0)',
    },
    '20%': {
      transform: 'scale(0.3)',
    },
    '40%': {
      transform: 'scale(0.6)',
    },
    '60%': {
      transform: 'scale(0.9)',
    },
    '80%': {
      transform: 'scale(1.2)',
    },
    '100%': {
      transform: 'scale(1)',
    },
  },
}))

type ChecklistItemProps = ComponentPropsWithRef<'div'> & {
  children?: ReactElement | ReactElement[] | string
  title: string
}

function ChecklistItem({
  children,
  ...props
}: ChecklistItemProps): JSX.Element {
  return (
    <div
      {...props}
    >{children}
    </div>
  )
}

enum KeyboardKey {
  ARROW_DOWN = 'ArrowDown',
  ARROW_UP = 'ArrowUp',
  ENTER = 'Enter',
  SPACE = ' ',
}

type ChecklistItemInnerProps = Omit<ChecklistItemProps, 'children'> & {
  children: ReactElement<ChecklistItemProps>
  index: number
  selected?: boolean
  focused?: boolean
  completed?: boolean
  onSelectionChange: Dispatch<number>
  onFocusChange: Dispatch<number>
}

function ChecklistItemInnerUnstyled({
  children,
  index,
  title,
  selected,
  focused,
  onSelectionChange,
  onFocusChange,
  ...props
}: ChecklistItemInnerProps): JSX.Element {
  const headerRef = useRef<HTMLDivElement>()
  const { keyboardProps } = useKeyboard({
    onKeyDown: e => {
      switch (e.key) {
      case KeyboardKey.ARROW_UP:
        if (focused) {
          onSelectionChange(index - 1)
          onFocusChange(index - 1)
        }
        break
      case KeyboardKey.ARROW_DOWN:
        if (focused) {
          onSelectionChange(index + 1)
          onFocusChange(index + 1)
        }
        break
      case KeyboardKey.ENTER:
      case KeyboardKey.SPACE:
        onSelectionChange(selected ? null : index)
      }
    },
  })

  useEffect(() => {
    if (headerRef.current && focused) {
      setTimeout(() => headerRef.current.focus())
    }
  }, [headerRef, focused])

  return (
    <div {...props}>
      <div
        {...keyboardProps}
        className="itemHeader"
        role="button"
        tabIndex={0}
        ref={headerRef}
        onClick={() => onSelectionChange(selected ? null : index)}
        onFocus={() => onFocusChange(index)}
        onBlur={() => onFocusChange(-1)}
      >
        <div className="itemCircle">
          <div>{index + 1}</div>
          <SuccessIcon
            size={16}
            color="icon-success"
          />
        </div>
        <div className="itemTitle">{title}</div>
        <CaretDownIcon className={selected ? 'arrowUp' : 'arrowDown'} />
      </div>
      <AnimateHeight
        height={selected ? 'auto' : 0}
        duration={heightAnimationDuration}
      >
        <div className="itemContainer">
          <div className="itemLine" />
          <div className="itemContent">{children}</div>
        </div>
      </AnimateHeight>
    </div>
  )
}

export { ChecklistItem, ChecklistItemInner, ChecklistItemProps }
