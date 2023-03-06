import { useContext } from 'react'
import { Chip } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

function BillingSubscriptionChip() {
  const { isProPlan, isEnterprisePlan } = useContext(SubscriptionContext)

  return (
    <Link
      to="/account/billing"
      style={{ textDecoration: 'none' }}
    >
      <Chip
        severity={isEnterprisePlan || isProPlan ? 'info' : 'neutral'}
        fillLevel={2}
        height={32}
      >
        {isEnterprisePlan ? 'Enterprise' : isProPlan ? 'Professional' : 'Open-source'}
      </Chip>
    </Link>
  )
}

export default BillingSubscriptionChip
