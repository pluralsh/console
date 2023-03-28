import { useContext } from 'react'
import { Callout } from '@pluralsh/design-system'
import styled from 'styled-components'

import SubscriptionContext from '../contexts/SubscriptionContext'

type BillingLegacyUserBannerPropsType = {
  feature: string
}

const Wrapper = styled.div(({ theme }) => ({ marginBottom: theme.spacing.medium }))

const Link = styled.a({ textDecoration: 'none' })

export default function BillingLegacyUserBanner({ feature }: BillingLegacyUserBannerPropsType) {
  const { isPaidPlan, isGrandfathered, isGrandfathetingExpired } = useContext(SubscriptionContext)

  if (isPaidPlan || !(isGrandfathered || isGrandfathetingExpired)) return null

  return (
    <Wrapper>
      <Callout
        severity={isGrandfathetingExpired ? 'danger' : 'warning'}
        title={isGrandfathetingExpired ? 'Legacy user access expired.' : 'Legacy user access ends soon.'}
      >
        {isGrandfathetingExpired
          ? (
            <>
              You may still use existing {feature} but creating new
              and editing existing {feature} requires a Plural Professional Plan.
            </>
          )
          : (
            <>
              {feature.charAt(0).toUpperCase() + feature.slice(1)} are a Professional plan feature.
            </>
          )}
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
