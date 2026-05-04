import {
  Avatar,
  Button,
  ButtonProps,
  Divider,
  LogoutIcon,
  PersonIcon,
} from '@pluralsh/design-system'
import { BillingSubscriptionChip } from 'components/billing/BillingSubscriptionChip'
import { useLogin } from 'components/contexts'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export function ProfileMenu() {
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
        css={{ width: 245 }}
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
        <Divider
          backgroundColor="border-fill-two"
          padding="xsmall"
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
