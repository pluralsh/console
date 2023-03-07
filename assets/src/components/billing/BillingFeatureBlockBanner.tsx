import { Link } from 'react-router-dom'
import { Button, Card } from '@pluralsh/design-system'
import { Div, Flex, P } from 'honorable'
import { useContext } from 'react'

import SubscriptionContext from '../contexts/SubscriptionContext'

type BillingFeatureBlockBannerPropsType = {
  feature: string
  description?: string
  planFeature?: string | null
  placeholderImageURL?: string
}

export default function BillingFeatureBlockBanner({
  feature, description, planFeature, placeholderImageURL,
}: BillingFeatureBlockBannerPropsType) {
  const { account, isPaidPlan } = useContext(SubscriptionContext)

  if ((account?.availableFeatures || {})[planFeature || 'userManagement'] || isPaidPlan) return null

  return (
    <Flex
      position="absolute"
      top={15}
      left={0}
      right={0}
      bottom={0}
      align="center"
      justify="flex-start"
      direction="column"
      borderRadius="medium"
      padding="xxlarge"
      background={placeholderImageURL ? `url(${placeholderImageURL}) no-repeat top center` : undefined}
      backgroundSize="100% auto"
      backgroundColor="fill-zero"
      zIndex={10}
    >
      <Card
        padding="large"
        fillLevel={2}
      >
        <Div
          body1
          fontWeight="bold"
        >
          Upgrade your plan to access {feature}.
        </Div>
        <P
          body2
          color="text-light"
          marginTop="medium"
        >
          {description}
        </P>
        <Flex marginTop="large">
          <Button
            as={Link}
            to="/account/billing"
          >
            Review plans
          </Button>
        </Flex>
      </Card>
    </Flex>
  )
}
