import { CSSProp } from 'styled-components'
import { ComponentType } from 'react'
import {
  AwsLogoIcon,
  AzureLogoIcon,
  GoogleLogoIcon,
} from '@pluralsh/design-system'

import { v4 } from 'uuid'

import { AWSNodeGroup, NodeGroup, Provider } from './types'

const disabledNumberInputArrows: CSSProp = {
  'input[type="number"]': {
    '-moz-appearance': 'textfield',
  },

  'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button': {
    '-webkit-appearance': 'none',
    margin: 0,
  },
}

const ProviderToDisplayName: { readonly [key in Provider]: string } = {
  [Provider.AWS]: 'AWS',
  [Provider.GCP]: 'GCP',
  [Provider.Azure]: 'Azure',
}

const ProviderToLogo: { readonly [key in Provider]: ComponentType } = {
  [Provider.AWS]: AwsLogoIcon,
  [Provider.GCP]: GoogleLogoIcon,
  [Provider.Azure]: AzureLogoIcon,
}

const RegionsForProvider: { readonly [key in Provider]: Array<string> } = {
  [Provider.AWS]: [
    'af-south-1',
    'eu-north-1',
    'ap-south-1',
    'eu-west-3',
    'eu-west-2',
    'eu-south-1',
    'eu-west-1',
    'ap-northeast-3',
    'ap-northeast-2',
    'me-south-1',
    'ap-northeast-1',
    'sa-east-1',
    'ca-central-1',
    'ap-east-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'eu-central-1',
    'ap-southeast-3',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
  ],
  [Provider.GCP]: [
    'asia-east1',
    'asia-east2',
    'asia-northeast1',
    'asia-northeast2',
    'asia-northeast3',
    'asia-south1',
    'asia-southeast1',
    'australia-southeast1',
    'europe-central2',
    'europe-west2',
    'europe-west3',
    'us-central1',
    'us-east1',
    'us-west1',
    'us-west2',
  ],
  [Provider.Azure]: [
    'eastus',
    'eastus2',
    'southcentralus',
    'westus2',
    'westus3',
    'australiaeast',
    'southeastasia',
    'northeurope',
    'swedencentral',
    'uksouth',
    'westeurope',
    'centralus',
    'southafricanorth',
    'centralindia',
    'eastasia',
    'japaneast',
    'koreacentral',
    'canadacentral',
    'francecentral',
    'germanywestcentral',
    'norwayeast',
    'brazilsouth',
  ],
}

const DefaultRegionForProvider: { readonly [key in Provider]: string } = {
  [Provider.AWS]: 'us-east-2',
  [Provider.GCP]: '',
  [Provider.Azure]: '',
}

function NewNodeGroup(provider: Provider): NodeGroup {
  switch (provider) {
    case Provider.AWS:
      return {
        id: v4(),
        nodeType: DefaultRegionForProvider[provider],
      } as AWSNodeGroup
    case Provider.GCP:
      return {} as NodeGroup
    case Provider.Azure:
      return {} as NodeGroup
  }
}

export {
  disabledNumberInputArrows,
  RegionsForProvider,
  DefaultRegionForProvider,
  NewNodeGroup,
  ProviderToDisplayName,
  ProviderToLogo,
}
