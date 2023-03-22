import { useContext } from 'react'
import moment from 'moment'
import styled from 'styled-components'

import SubscriptionContext from '../contexts/SubscriptionContext'

const Message = styled.p(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

const MessageLink = styled.a(({ theme }) => ({ ...theme.partials.text.inlineLink }))

export default function BillingLegacyUserMessage() {
  const {
    isPaidPlan, isGrandfathered, isGrandfathetingExpired, account,
  } = useContext(SubscriptionContext)

  if (isPaidPlan || !(isGrandfathered || isGrandfathetingExpired)) return null

  return (
    <Message>
      Legacy user access
      {isGrandfathetingExpired ? ' expired' : ` until ${moment(account?.grandfatheredUntil).format('MMM DD, YYYY')}`}
      {' '}
      <MessageLink
        href="https://app.plural.sh/account/billing"
        target="_blank"
        rel="noopener noreferrer"
      >
        upgrade now
      </MessageLink>
    </Message>
  )
}
