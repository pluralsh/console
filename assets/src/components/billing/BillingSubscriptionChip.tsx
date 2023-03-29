import { useContext } from 'react'
import { Chip } from '@pluralsh/design-system'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import styled from 'styled-components'

const Link = styled.a({ textDecoration: 'none' })

export default function BillingSubscriptionChip() {
  const { isProPlan, isEnterprisePlan } = useContext(SubscriptionContext)

  return (
    <Link
      href="https://app.plural.sh/account/billing"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Chip
        severity={isEnterprisePlan || isProPlan ? 'info' : 'neutral'}
        fillLevel={2}
      >
        {isEnterprisePlan
          ? 'Enterprise'
          : isProPlan
          ? 'Professional'
          : 'Open-source'}
      </Chip>
    </Link>
  )
}
