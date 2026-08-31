import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Button,
  usePrevious,
} from '@pluralsh/design-system'
import type { ButtonProps } from 'honorable'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { useNavData } from '../contexts/NavDataContext'
import { getBarePathFromPath } from '../utils/text'

import { PluralMenu } from './MobileMenu'
import { NavPositionWrapper, SideNav } from './SideNav'

import type { MenuId } from '../NavData'
import type { PartialBy } from '../utils/typescript'

const setIsOpenStub: Dispatch<SetStateAction<boolean>> = () => {}

export type NavContextValue = {
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
}
export const NavContext = createContext<NavContextValue>({
  setIsOpen: setIsOpenStub,
  isOpen: false,
})

function NavButtonsUnstyled({ desktop: _desktop, children, ...props }) {
  return (
    <div {...props}>
      <div>{children}</div>
    </div>
  )
}

export const NavButtons = styled(NavButtonsUnstyled)<{ desktop: boolean }>(
  ({ desktop, theme }) => ({
    padding: theme.spacing.medium,
    backgroundColor: theme.colors['fill-one'],

    ...(desktop
      ? {
          paddingLeft: 0,
          marginLeft: -1000,
        }
      : {}),

    '> div': {
      marginLeft: desktop ? 1000 : 0,
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.medium,
      justifyContent: 'space-between',
    },
  })
)

export const NavWrap = styled.div((_) => ({
  position: 'relative',
  flexGrow: 1,
}))

function NavButton({
  navDirection = 'back',
  ...props
}: { navDirection: 'forward' | 'back' } & ButtonProps) {
  return (
    <Button
      tertiary
      startIcon={
        navDirection === 'back' ? <ArrowLeftIcon /> : <ArrowRightIcon />
      }
      {...props}
    />
  )
}
export function FullNav({
  desktop = true,
  isOpen,
  setIsOpen,
}: PartialBy<NavContextValue, 'setIsOpen' | 'isOpen'> & {
  desktop: boolean
}) {
  const [menuId, setMenuId] = useState<MenuId>('docs')
  const navData = useNavData()
  const router = useRouter()
  const thisPath = getBarePathFromPath(router.asPath)
  const previousPath = usePrevious(thisPath)

  useEffect(() => {
    if (thisPath !== previousPath) {
      if (setIsOpen) {
        setIsOpen(false)
      }
      setMenuId('docs')
    }
  }, [thisPath, previousPath, setIsOpen])

  const showNavButton = !desktop
  let rightNavButton
  let leftNavButton

  if (!desktop) {
    if (menuId === 'plural') {
      rightNavButton = (
        <NavButton
          navDirection="forward"
          onClick={() => setMenuId('docs')}
        >
          Docs menu
        </NavButton>
      )
    } else if (menuId === 'docs') {
      leftNavButton = (
        <NavButton
          navDirection="back"
          onClick={() => setMenuId('plural')}
        >
          Plural menu
        </NavButton>
      )
    }
  }

  const navContextValue = useMemo(
    () => ({ setIsOpen: setIsOpen || setIsOpenStub, isOpen: !!isOpen }),
    [setIsOpen, isOpen]
  )

  const content = (
    <NavContext.Provider value={navContextValue}>
      {showNavButton && (
        <NavButtons desktop={desktop}>
          {leftNavButton}
          {rightNavButton}
        </NavButtons>
      )}
      <NavWrap>
        {menuId === 'plural' ? (
          <PluralMenu />
        ) : (
          <SideNav
            navData={navData[menuId]}
            menuId={menuId}
            setMenuId={setMenuId}
            desktop={desktop}
            padTop={!showNavButton}
          />
        )}
      </NavWrap>
    </NavContext.Provider>
  )

  if (desktop) {
    return (
      <NavPositionWrapper
        role="navigation"
        aria-label="Main"
      >
        {content}
      </NavPositionWrapper>
    )
  }

  return content
}
