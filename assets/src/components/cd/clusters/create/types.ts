enum Provider {
  AWS = 'aws',
  Azure = 'azure',
  GCP = 'gcp',
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
