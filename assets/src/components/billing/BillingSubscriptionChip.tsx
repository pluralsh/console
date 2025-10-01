import { useContext } from 'react'
import { Chip, ChipProps, WrapWithIf } from '@pluralsh/design-system'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import styled from 'styled-components'

const Link = styled.a({ textDecoration: 'none' })

export function BillingSubscriptionChip({
  asLink = false,
  ...props
}: { asLink?: boolean } & ChipProps) {
  const { isProPlan, isEnterprisePlan } = useContext(SubscriptionContext)

  return (
    <WrapWithIf
      condition={!!asLink}
      wrapper={
        <Link
          href="https://app.plural.sh/account/billing"
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      <Chip
        severity={isEnterprisePlan || isProPlan ? 'info' : 'neutral'}
        fillLevel={2}
        {...props}
      >
        {isEnterprisePlan
          ? 'Enterprise'
          : isProPlan
            ? 'Professional'
            : 'Open-source'}
      </Chip>
    </WrapWithIf>
  )
}
