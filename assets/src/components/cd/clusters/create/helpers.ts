import { CSSProp } from 'styled-components'
import { ComponentType } from 'react'
import {
  AwsLogoIcon,
  AzureLogoIcon,
  GoogleLogoIcon,
} from '@pluralsh/design-system'

import { v4 } from 'uuid'

import { AWSNodeGroup, NodeGroup, ProviderCloud } from './types'

const disabledNumberInputArrows: CSSProp = {
  'input[type="number"]': {
    '-moz-appearance': 'textfield',
  },

  'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button': {
    '-webkit-appearance': 'none',
    margin: 0,
  },
}

const ProviderToDisplayName: { readonly [key in ProviderCloud]: string } = {
  [ProviderCloud.AWS]: 'AWS',
  [ProviderCloud.GCP]: 'GCP',
  [ProviderCloud.Azure]: 'Azure',
}

const ProviderToLogo: { readonly [key in ProviderCloud]: ComponentType } = {
  [ProviderCloud.AWS]: AwsLogoIcon,
  [ProviderCloud.GCP]: GoogleLogoIcon,
  [ProviderCloud.Azure]: AzureLogoIcon,
}

const RegionsForProvider: { readonly [key in ProviderCloud]: Array<string> } = {
  [ProviderCloud.AWS]: [
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
  [ProviderCloud.GCP]: [
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
  [ProviderCloud.Azure]: [
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

const DefaultRegionForProvider: { readonly [key in ProviderCloud]: string } = {
  [ProviderCloud.AWS]: 'us-east-2',
  [ProviderCloud.GCP]: '',
  [ProviderCloud.Azure]: '',
}

function NewNodeGroup(provider: ProviderCloud): NodeGroup {
  switch (provider) {
    case ProviderCloud.AWS:
      return {
        id: v4(),
        nodeType: DefaultRegionForProvider[provider],
      } as AWSNodeGroup
    case ProviderCloud.GCP:
      return {} as NodeGroup
    case ProviderCloud.Azure:
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
