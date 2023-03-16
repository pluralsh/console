import { LoginContext } from 'components/contexts'
import posthog from 'posthog-js'
import { useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { User } from '../../generated/graphql'

import { addPrefChangeListener, getPrefs, removePrefChangeListener } from '../../utils/cookiePrefs'

export default function PosthogIdentify(me?: User) {
  if (getPrefs().statistics) {
    console.log('posthog opt in')
    posthog.opt_in_capturing()
    if (me?.pluralId) {
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
}

export function Posthog() {
  const { me } = useContext<any>(LoginContext)
  const location = useLocation()

  PosthogIdentify(me)

  // Detect cookie preference change
  useEffect(() => {
    const onPrefChange = () => {
      PosthogIdentify(me)
    }

    addPrefChangeListener(onPrefChange)

    return () => {
      removePrefChangeListener(onPrefChange)
    }
  }, [me])

  // Track route change events
  useEffect(() => {
    posthog.capture('$pageview')
    // Need to run posthog.capture('$pageview') every time 'location' changes,
    // even though we're not reading 'location' in this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return null
}
