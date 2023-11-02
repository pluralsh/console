import { Dispatch } from 'react'

enum ProviderCloud {
  AWS = 'aws',
  Azure = 'azure',
  GCP = 'gcp',
}

interface ProviderState {
  onValidityChange?: Dispatch<boolean>
}

interface NodeGroup {
  readonly id: string
  name: string
  minNodes: number
  maxNodes: number
  nodeType: string
}

interface AWSNodeGroup extends NodeGroup {
  spotInstance: boolean
}

export type { NodeGroup, AWSNodeGroup, ProviderState }
export { ProviderCloud }
