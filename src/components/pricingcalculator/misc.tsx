import { ComponentType } from 'react'
import styled from 'styled-components'

// @ts-ignore
import styledContainerQuery from 'styled-container-query'

import AwsLogoIcon from '../icons/AwsLogoIcon'
import AzureLogoIcon from '../icons/AzureLogoIcon'
import { IconProps } from '../icons/createIcon'
import GoogleCloudLogoIcon from '../icons/GoogleCloudLogoIcon'

export const CLUSTER_PRICE = 399
export const USER_PRICE = 49

type Provider = {
  name: string
  id: string
  icon: ComponentType<IconProps>
  k8sPrice: number
  infraPrice: number
  appPrice: number // Additional instance cost. Each instance can handle 2 apps.
}

export const PROVIDERS: Provider[] = [
  {
    name: 'AWS',
    id: 'aws',
    icon: AwsLogoIcon,
    k8sPrice: 73,
    infraPrice: 165,
    appPrice: 54.9,
  },
  {
    name: 'GCP',
    id: 'gcp',
    icon: GoogleCloudLogoIcon,
    k8sPrice: 73,
    infraPrice: 221,
    appPrice: 48.92,
  },
  {
    name: 'Azure',
    id: 'azure',
    icon: AzureLogoIcon,
    k8sPrice: 72,
    infraPrice: 147,
    appPrice: 73.73,
  },
]

type ProviderCostEstimation = {
  k8s: number
  infra: number
  app: number
  total: number
}

export function estimateProviderCost(
  provider: Provider,
  appCount: number,
  clusterCount = 1
): ProviderCostEstimation {
  if (!provider) {
    return {
      total: 0,
      k8s: 0,
      infra: 0,
      app: 0,
    }
  }

  const { k8sPrice = 0, infraPrice = 0, appPrice = 0 } = provider
  const k8s = Math.round(k8sPrice * clusterCount)
  const infra = Math.round(infraPrice)

  // First 5 apps do not raise the cost, then for every 2 apps we add one more instance.
  const app =
    appCount <= 5 ? 0 : Math.round(Math.floor((appCount - 4) / 2) * appPrice)

  return {
    k8s,
    infra,
    app,
    total: k8s + infra + app,
  }
}

type PluralCostEstimation = {
  clusters: number
  users: number
  total: number
}

export function estimatePluralCost(
  isProPlan: boolean,
  clusterCount: number,
  userCount: number
): PluralCostEstimation {
  const pro = isProPlan ? 1 : 0
  const clusters = clusterCount * CLUSTER_PRICE * pro
  const users = userCount * USER_PRICE * pro

  return {
    clusters,
    users,
    total: clusters + users,
  }
}

export const PricingCalculatorWrap = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],

  p: {
    color: theme.colors['text-light'],
    marginBottom: theme.spacing.xlarge,
  },

  '.content': {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    gap: theme.spacing.xxxlarge,

    '&.with-padding': {
      paddingBottom: theme.spacing.medium,
    },

    '.column': {
      display: 'flex',
      flexBasis: '100%',
      flexDirection: 'column',
      flexGrow: 1,
      flexShrink: 1,
    },
  },

  '.hint': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginBottom: theme.spacing.medium,
    fontStyle: 'italic',
  },
}))

// If https://github.com/styled-components/styled-components/issues/416
// will be fixed then we can remove it and use above wrapper.
export const PricingCalculatorContainerQuery = styledContainerQuery.div`
  &:container(max-width: 620px) {
    .content {
      flex-direction: column;
      gap: 32px;
    }

    .hint {
      margin-bottom: 0;
    }
},
`
