import { Button, Card } from '@pluralsh/design-system'
import { useContext } from 'react'
import styled from 'styled-components'

import SubscriptionContext from '../contexts/SubscriptionContext'

type BillingFeatureBlockBannerPropsType = {
  feature: string
  description?: string
  planFeature: string
  placeholderImageURL?: string
  additionalCondition?: boolean
}

const Wrapper = styled.div<{backgroundImage?: string}>(({ theme, backgroundImage }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyItems: 'flex-start',
  position: 'absolute',
  top: 15,
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing.xxlarge,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors['fill-zero'],
  zIndex: 10,

  ...(backgroundImage && {
    backgroundImage: `url(${backgroundImage})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top center',
    backgroundSize: '100% auto',
  }),
}))

const Header = styled.div(({ theme }) => ({
  ...theme.partials.text.body1,
  fontWeight: '600',
}))

const Description = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  marginTop: theme.spacing.medium,
}))

export default function BillingFeatureBlockBanner({
  feature, description, planFeature, placeholderImageURL, additionalCondition = true,
}: BillingFeatureBlockBannerPropsType) {
  const { availableFeatures, isPaidPlan } = useContext(SubscriptionContext)

  if (availableFeatures?.[planFeature] || isPaidPlan || !additionalCondition) return null

  return (
    <Wrapper backgroundImage={placeholderImageURL}>
      <Card
        padding="large"
        fillLevel={2}
      >
        <Header>Upgrade your plan to access {feature}.</Header>
        <Description>{description}</Description>
        <Button
          as="a"
          href="https://app.plural.sh/account/billing"
          target="_blank"
          rel="noopener noreferrer"
          width="max-content"
          marginTop="large"
        >
          Review plans
        </Button>
      </Card>
    </Wrapper>
  )
}
