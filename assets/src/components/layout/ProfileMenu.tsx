import {
  Avatar,
  Button,
  ButtonProps,
  CheckRoundedIcon,
  Divider,
  LogoutIcon,
  MoonIcon,
  PersonIcon,
  setThemeColorMode,
  SunIcon,
} from '@pluralsh/design-system'
import { BillingSubscriptionChip } from 'components/billing/BillingSubscriptionChip'
import { useLogin } from 'components/contexts'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { OverlineH1 } from 'components/utils/typography/Text'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'

export function ProfileMenu() {
  const theme = useTheme()
  const { me, logout } = useLogin()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  useOutsideClick(menuBtnRef, () => setIsMenuOpen(false))

  const handleLogout = useCallback(() => {
    setIsMenuOpen(false)
    logout?.()
  }, [logout])

  return (
    <div css={{ position: 'relative' }}>
      <Button
        ref={menuBtnRef}
        tertiary
        onClick={() => setIsMenuOpen((open) => !open)}
        css={{
          padding: 0,
          transition: 'filter 0.1s ease',
          '&:hover': { filter: 'brightness(1.1)' },
        }}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label="Open profile menu"
      >
        <Avatar
          name={me?.name}
          src={me?.profile}
          size={32}
        />
      </Button>
      <SimplePopupMenu
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
      >
        <Button
          small
          tertiary
          justifyContent="flex-start"
          endIcon={<BillingSubscriptionChip size="small" />}
          as={Link}
          to="/profile"
          onClick={() => setIsMenuOpen(false)}
          innerFlexProps={{ gap: 'xsmall' }}
        >
          <PersonIcon color="icon-light" />
          <span>My profile</span>
        </Button>
        <OverlineH1
          as="h3"
          $color="text-xlight"
          css={{
            padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
          }}
        >
          theme
        </OverlineH1>
        <Button
          tertiary
          justifyContent="flex-start"
          startIcon={<MoonIcon />}
          endIcon={theme.mode === 'dark' ? <CheckRoundedIcon /> : undefined}
          onClick={() => {
            setThemeColorMode('dark')
            setIsMenuOpen(false)
          }}
        >
          Dark
        </Button>
        <Button
          tertiary
          justifyContent="flex-start"
          startIcon={<SunIcon />}
          endIcon={theme.mode === 'light' ? <CheckRoundedIcon /> : undefined}
          onClick={() => {
            setThemeColorMode('light')
            setIsMenuOpen(false)
          }}
        >
          Light
        </Button>
        <Divider
          backgroundColor="border-fill-two"
          css={{
            padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
          }}
        />
        <Button
          tertiary
          justifyContent="flex-start"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </SimplePopupMenu>
    </div>
  )
}

export function HeaderMenuButton({
  to,
  external = false,
  ...props
}: { to: string; external?: boolean } & ButtonProps) {
  return (
    <Button
      small
      tertiary
      justifyContent="flex-start"
      as={Link}
      to={to}
      innerFlexProps={{ gap: 'xsmall' }}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  )
}
