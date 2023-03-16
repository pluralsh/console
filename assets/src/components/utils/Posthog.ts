import { LoginContext } from 'components/contexts'
import { useCookieSettings } from 'components/tracking/CookieSettings'
import posthog from 'posthog-js'
import { useCallback, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function usePosthogIdentify() {
  const { me } = useContext(LoginContext)
  const { consent } = useCookieSettings()

  return useCallback(() => {
    if (consent.statistics) {
      console.log('posthog opt in')
      posthog.opt_in_capturing()
      if (me?.pluralId) {
        console.log('posthog identify', me.id, me.pluralId)
        posthog.identify(me.pluralId)
        if (me?.id) {
          posthog.alias(me.pluralId, me.id)
        }
      }
    }
    else {
      console.log('posthog opt out')
      posthog.opt_out_capturing()
    }
  }, [consent.statistics, me?.id, me?.pluralId])
}

export function usePosthog() {
  const { me } = useContext(LoginContext)
  const location = useLocation()
  const { addListener, removeListener } = useCookieSettings()
  const posthogIdentify = usePosthogIdentify()

  useEffect(() => {
    posthogIdentify()
  }, [posthogIdentify])

  // Detect cookie preference change
  useEffect(() => {
    const onPrefChange = () => {
      posthogIdentify()
    }

    addListener(onPrefChange)

    return () => {
      removeListener(onPrefChange)
    }
  }, [addListener, removeListener, me, posthogIdentify])

  // Track route change events
  useEffect(() => {
    posthog.capture('$pageview')
    // Need to run posthog.capture('$pageview') every time 'location' changes,
    // even though we're not reading 'location' in this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return null
}
