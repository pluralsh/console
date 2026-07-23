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
import { useCallback, useRef, useState } from 'react'
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
  const menuBtnRef = useRef<HTMLButtonElement>(null)
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

  return (
    <div css={{ position: 'relative' }}>
      <Tooltip
        arrow
        placement="left-start"
        label={profileLabel}
      >
        <ProfileButtonSC
          ref={menuBtnRef}
          tertiary
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label={
            impersonating
              ? `Open profile menu. Impersonating service account ${impersonatedEmail ?? ''}`
              : 'Open profile menu'
          }
        >
          <Avatar
            name={me?.name}
            src={me?.profile}
            size={32}
            css={{
              ...(me?.profile
                ? {}
                : {
                    backgroundColor: theme.colors['fill-three'],
                    border: theme.borders.input,
                    fontSize: 12,
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
        </ProfileButtonSC>
      </Tooltip>
      <SimplePopupMenu
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
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

const ProfileButtonSC = styled(Button)({
  position: 'relative',
  padding: 0,
  transition: 'filter 0.1s ease',
  '&:hover': { filter: 'brightness(1.1)' },
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
