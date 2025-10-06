import { Card } from '@pluralsh/design-system'
import { useKeyDown } from '@react-hooks-library/core'
import { animated, useTransition } from '@react-spring/web'
import { Dispatch, ReactNode, SetStateAction } from 'react'
import styled from 'styled-components'

export function SimplePopupMenu({
  isOpen,
  setIsOpen,
  type = 'header',
  children,
}: {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  type?: 'header' | 'sidebar'
  children: ReactNode
}) {
  useKeyDown(['Escape'], () => setIsOpen(false))

  const transitions = useTransition(isOpen ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  return transitions((styles) => (
    <AnimatedWrapperSC
      $type={type}
      // allows us to put the outside click handler on the launch button instead of the menu
      onClick={(e) => e.stopPropagation()}
      style={styles}
    >
      <MenuCardSC fillLevel={2}>{children}</MenuCardSC>
    </AnimatedWrapperSC>
  ))
}

const MenuCardSC = styled(Card)(({ theme }) => ({
  width: 230,
  padding: `${theme.spacing.xsmall}px 0`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  flexDirection: 'column',
  [`& a, & button`]: {
    ...theme.partials.text.body2,
    color: theme.colors.text,
    textDecoration: 'none',
    paddingTop: 0,
    paddingBottom: 0,
    height: 40,
  },
}))

const AnimatedWrapperSC = styled(animated.div)<{ $type: 'header' | 'sidebar' }>(
  ({ theme, $type }) => ({
    position: 'absolute',
    zIndex: theme.zIndexes.modal,
    minWidth: 175,
    display: 'flex',
    flexDirection: 'column',
    ...($type === 'header'
      ? { top: 40, right: 0, transformOrigin: 'top right' }
      : { bottom: 0, left: 40, transformOrigin: 'bottom left' }),
  })
)
