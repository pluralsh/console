import { useLocation, useNavigate } from 'react-router-dom'
import queryString, { ParsedQuery } from 'query-string'
import { Button, Flex, IconFrame } from '@pluralsh/design-system'
import { useCallback } from 'react'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import { GqlError } from '../utils/Alert'
import { PLURAL_MARK, PLURAL_MARK_WHITE } from './constants'
import {
  useConsentMutation,
  useMeQuery,
  useOidcConsentQuery,
} from '../../generated/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'
import { clearLocalStorage } from '../../helpers/localStorage.ts'
import { LoginPortal } from './LoginPortal.tsx'

function Icon({
  icon,
  darkIcon,
}: {
  icon: Nullable<string>
  darkIcon: Nullable<string>
}) {
  const dark = useTheme().mode !== 'light'
  const src = dark ? (darkIcon ?? icon) : icon

  return src ? (
    <IconFrame
      icon={
        <img
          src={src}
          width="48px"
          height="48px"
        />
      }
      type="floating"
      css={{ width: '64px', height: '64px' }}
    />
  ) : null
}

const getChallenge = (parsedQueryString: ParsedQuery): string => {
  const challenge = parsedQueryString.consent_challenge

  if (Array.isArray(challenge)) {
    return !isEmpty(challenge) ? (challenge[0] ?? '') : ''
  }

  return challenge ?? ''
}

export function OAuthConsent() {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: userData, loading: userLoading } = useMeQuery()
  const challenge = getChallenge(queryString.parse(location.search))
  const { data } = useOidcConsentQuery({ variables: { challenge } })
  const consent = data?.oidcConsent?.consent
  const [mutation, { loading, error }] = useConsentMutation({
    variables: {
      challenge,
      scopes: consent?.requestedScope || ['profile', 'openid'],
    },
    onCompleted: ({ oauthConsent }) => {
      if (oauthConsent?.redirectTo) {
        window.location.href = oauthConsent.redirectTo
      }
    },
  })

  const logout = useCallback(() => {
    clearLocalStorage()
    navigate('/login')
  }, [navigate])

  if (!data || userLoading) return <LoadingIndicator />

  if (!userData?.me?.email) {
    logout()
  }

  return (
    <LoginPortal>
      <Flex
        direction="column"
        align="center"
        gap="xlarge"
      >
        <Flex
          direction="row"
          gap="large"
        >
          <Icon
            icon={PLURAL_MARK}
            darkIcon={PLURAL_MARK_WHITE}
          />
        </Flex>

        <Flex
          direction="column"
          align="center"
          gap="xsmall"
          paddingTop="medium"
        >
          <span
            css={{
              ...theme.partials.text.title1,
              color: theme.colors['text-light'],
              textAlign: 'center',
            }}
          >
            Access required
          </span>
          <span
            css={{
              ...theme.partials.text.body1,
              color: theme.colors['text-light'],
              textAlign: 'center',
            }}
          >
            Allow access to your Plural profile information, no other data will
            be shared.
          </span>
        </Flex>
        <Flex
          gap="small"
          width="100%"
          direction="column"
          align="center"
        >
          {error && (
            <GqlError
              error={error}
              header="Consent request failed"
            />
          )}
          <Button
            width="100%"
            loading={loading}
            onClick={() => mutation()}
          >
            Login with Plural
          </Button>

          <span
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
              textAlign: 'center',
            }}
          >
            You are currently signed in as {userData?.me?.email}.&nbsp;
            <a
              css={{ ...theme.partials.text.inlineLink }}
              onClick={logout}
            >
              Wrong account?
            </a>
          </span>
        </Flex>
      </Flex>
    </LoginPortal>
  )
}
