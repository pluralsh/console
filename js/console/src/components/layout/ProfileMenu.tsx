import {
  Avatar,
  Button,
  Divider,
  KeyIcon,
  LogoutIcon,
  PersonIcon,
  Spinner,
  Tooltip,
} from '@pluralsh/design-system'
import { BillingSubscriptionChip } from 'components/billing/BillingSubscriptionChip'
import { useLogin } from 'components/contexts'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { useServiceAccountImpersonation } from 'components/hooks/useServiceAccountImpersonation'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { SidebarContext } from 'components/layout/Sidebar'
import { SidebarItem } from 'components/utils/sidebar/SidebarItem'
import { MouseEvent, use, useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

export function ProfileMenu() {
  const { me, logout } = useLogin()
  const theme = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const {
    impersonating,
    impersonatedEmail,
    originalUserLabel,
    restoring,
    restoreSession,
  } = useServiceAccountImpersonation(me?.email)
  const { isExpanded } = use(SidebarContext)
  const menuBtnRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuBtnRef, () => setIsMenuOpen(false))

  const handleLogout = useCallback(() => {
    setIsMenuOpen(false)
    logout?.()
  }, [logout])

  const profileLabel = impersonating
    ? `Impersonating service account${impersonatedEmail ? `: ${impersonatedEmail}` : ''}`
    : 'Open profile menu'
  const returnLabel = originalUserLabel
    ? `Return to ${originalUserLabel}`
    : 'Return to my account'

  const ariaLabel = impersonating
    ? `Open profile menu. Impersonating service account ${impersonatedEmail ?? ''}`
    : 'Open profile menu'
  const toggleMenu = (e: MouseEvent) => {
    e.stopPropagation()
    setIsMenuOpen((open) => !open)
  }

  const avatar = (size: number) => (
    <AvatarWrapperSC>
      <Avatar
        name={me?.name ?? undefined}
        src={me?.profile ?? undefined}
        size={size}
        css={{
          transition: 'background-color 0.1s ease, filter 0.1s ease',
          ...(me?.profile
            ? {
                '&:hover, button:hover &': {
                  filter:
                    theme.mode === 'light' ? 'brightness(0.92)' : undefined,
                },
              }
            : {
                backgroundColor: theme.colors['fill-three'],
                border: theme.borders.input,
                fontSize: size < 32 ? '0.625rem' : '0.75rem',
                ...(theme.mode === 'light' && {
                  // Initials default to white (for action-primary fill);
                  // on light grey chrome use default dark text.
                  color: theme.colors.text,
                }),
                'button:hover &, button:focus-visible &': {
                  backgroundColor: theme.colors['fill-three-hover'],
                },
              }),
        }}
      />
      {impersonating && (
        <ImpersonationIconSC>
          {restoring ? (
            <Spinner size={10} />
          ) : (
            <KeyIcon
              size={14}
              color="icon-info"
            />
          )}
        </ImpersonationIconSC>
      )}
    </AvatarWrapperSC>
  )

  return (
    <div
      ref={menuBtnRef}
      css={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        alignSelf: 'stretch',
      }}
    >
      {isExpanded ? (
        <SidebarItem
          type="button"
          expandedLabel={me?.name ?? 'Profile'}
          onClick={toggleMenu}
          css={{ color: theme.colors['text-xlight'] }}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label={ariaLabel}
        >
          {avatar(20)}
        </SidebarItem>
      ) : (
        <Tooltip
          arrow
          placement="right"
          label={profileLabel}
          displayOn={isMenuOpen ? 'none' : undefined}
        >
          <ProfileButtonSC
            tertiary
            onClick={toggleMenu}
            css={{
              borderRadius: theme.borderRadiuses.medium,
              padding: 0,
              ...(theme.mode === 'light' && {
                // Tertiary hover uses a light wash — keep the avatar chrome instead
                '&:hover': { background: 'transparent' },
                '&:focus-visible': { background: 'transparent' },
              }),
            }}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={ariaLabel}
          >
            {avatar(32)}
          </ProfileButtonSC>
        </Tooltip>
      )}
      <SimplePopupMenu
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
        type="sidebar"
        css={{ width: 260 }}
      >
        {impersonating && (
          <>
            <Button
              small
              tertiary
              width="100%"
              minWidth={0}
              justifyContent="flex-start"
              startIcon={!restoring ? <KeyIcon /> : undefined}
              loading={restoring}
              onClick={restoreSession}
              innerFlexProps={{
                gap: 'xsmall',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <ReturnLabelSC title={returnLabel}>{returnLabel}</ReturnLabelSC>
            </Button>
            <Divider
              backgroundColor="border-fill-two"
              padding="xsmall"
            />
          </>
        )}
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

const ProfileButtonSC = styled(Button)(({ theme }) => ({
  position: 'relative',
  transition: 'filter 0.1s ease',
  ...(theme.mode !== 'light' && {
    '&:hover': { filter: 'brightness(1.1)' },
  }),
}))

const AvatarWrapperSC = styled.span({
  position: 'relative',
  display: 'inline-flex',
  flexShrink: 0,
})

const ImpersonationIconSC = styled.span(({ theme }) => ({
  alignItems: 'center',
  color: theme.colors['text-primary-accent'],
  display: 'inline-flex',
  height: 16,
  justifyContent: 'center',
  minWidth: 16,
  padding: 0,
  position: 'absolute',
  right: -4,
  top: -4,
}))

const ReturnLabelSC = styled.span({
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
})
