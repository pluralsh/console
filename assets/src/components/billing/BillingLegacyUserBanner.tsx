import { useContext } from 'react'
import { Callout } from '@pluralsh/design-system'
import styled from 'styled-components'
import { upperFirst } from 'lodash'

import usePersistedState from 'components/hooks/usePersistedState'

import SubscriptionContext from '../contexts/SubscriptionContext'

type BillingLegacyUserBannerPropsType = {
  feature: string
}

const Wrapper = styled.div(({ theme }) => ({ marginBottom: theme.spacing.medium }))

const Link = styled.a({ textDecoration: 'none' })

export default function BillingLegacyUserBanner({ feature }: BillingLegacyUserBannerPropsType) {
  const { isPaidPlan, isGrandfathered, isGrandfathetingExpired } = useContext(SubscriptionContext)
  const featureId = feature?.replace(/\s+/g, '-').toLowerCase()
  const localStorageId = `${isGrandfathetingExpired ? 'expired' : ''}-legacy-banner-${featureId}-closed`
  const [closed, setClosed] = usePersistedState(localStorageId, false)

  if (isPaidPlan || !(isGrandfathered || isGrandfathetingExpired)) return null

  return (
    <Wrapper>
      <Callout
        severity={isGrandfathetingExpired ? 'danger' : 'warning'}
        title={isGrandfathetingExpired ? 'Legacy user access expired.' : 'Legacy user access ends soon.'}
        closeable
        closed={closed}
        onClose={setClosed}
      >
        {isGrandfathetingExpired
          ? (
            <>
              You may still use existing {feature} but creating new
              and editing existing {feature} requires a Plural Professional Plan.
            </>
          )
          : <> {upperFirst(feature)} are a Professional plan feature. </>}
        {' '}
        <Link
          href="https://app.plural.sh/account/billing"
          target="_blank"
          rel="noopener noreferrer"
        >
          Upgrade now.
        </Link>
      </Callout>
    </Wrapper>
  )
}
