import { LoginContext } from 'components/contexts'
import { useCookieSettings } from 'components/tracking/CookieSettings'
import posthog from 'posthog-js'
import { useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function usePosthogIdentify() {
  const { me } = useContext(LoginContext)
  const { consent } = useCookieSettings()

  // Set posthog identity when user or consent changes
  useEffect(() => {
    if (consent?.statistics) {
      if (me?.pluralId) {
        posthog.identify(me.pluralId)
        if (me?.id) {
          posthog.alias(me.pluralId, me.id)
        }
      }
    }
  }, [consent, me?.id, me?.pluralId])
}

export function usePosthog() {
  const location = useLocation()
  const { consent } = useCookieSettings()

  // Opt in/out when consent changes
  useEffect(() => {
    if (consent.statistics) {
      posthog.opt_in_capturing()
    } else {
      posthog.opt_out_capturing()
    }
  }, [consent.statistics])

  // Track route change events
  useEffect(() => {
    posthog.capture('$pageview')
    // Need to run posthog.capture('$pageview') every time 'location' changes,
    // even though we're not reading 'location' in this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return null
}
