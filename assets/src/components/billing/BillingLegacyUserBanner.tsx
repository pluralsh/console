import { useContext } from 'react'
import { Callout } from '@pluralsh/design-system'
import { DivProps } from 'honorable'
import styled from 'styled-components'

import SubscriptionContext from '../contexts/SubscriptionContext'

type BillingLegacyUserBannerPropsType = DivProps & {
  feature?: string
}

const Wrapper = styled.div(({ theme }) => ({ marginBottom: theme.spacing.medium }))

const Link = styled.a({ textDecoration: 'none' })

export default function BillingLegacyUserBanner({ feature, ...props }: BillingLegacyUserBannerPropsType) {
  const { isProPlan, isEnterprisePlan, isGrandfathered } = useContext(SubscriptionContext)
  const open = !(isProPlan || isEnterprisePlan) && isGrandfathered

  if (!open) return null

  return (
    <Wrapper>
      <Callout
        severity="warning"
        title="Legacy user access ends soon."
        {...props}
      >
        {!!feature && (
          <>
            {feature} are a Professional plan feature.
            {' '}
            <Link
              href="https://app.plural.sh/account/billing"
              target="_blank"
              rel="noopener noreferrer"
            >
              Upgrade now
            </Link>
            .
          </>
        )}
        {!feature && 'You have access to Professional features for a short period of time.'}
      </Callout>
    </Wrapper>
  )
}
