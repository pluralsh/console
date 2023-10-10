enum Provider {
  AWS = 'aws',
  GCP = 'gcp',
  Azure = 'azure',
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

export type { NodeGroup, AWSNodeGroup }
export { Provider }
