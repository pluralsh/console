import { ReactElement, useMemo } from 'react'
import styled from 'styled-components'
import { AwsObjects } from './cloudquery/AWS.tsx'

// Cloud query uses prefixes to identify the provider and object type.
// It should match i.e. `aws_vpc`, `gcp_vpc`, `azure_vpc` etc.
enum ProviderPrefix {
  AWS = 'aws_',
  GCP = 'gcp_',
  Azure = 'azure_',
}

export enum ProviderObjectType {
  VPC = 'vpc',
  VPCSubnet = 'vpc_subnet',
  Account = 'account',
  EKS = 'eks_cluster',
}

interface CloudObjectsCardProps {
  query?: string
  content?: string
}

export default function CloudObjectsCard({
  query,
  content,
}: CloudObjectsCardProps): ReactElement | null {
  // This is just a heuristic check to determine the provider/type based
  // on the query string. Should be eventually replaced with properly
  // typed API responses.
  const provider = useMemo(() => {
    for (const prefix of Object.values(ProviderPrefix)) {
      const pattern = new RegExp(`^.*from\\s${prefix}.*$`, 'i')
      if (pattern.test(query?.toLowerCase() ?? '')) {
        return prefix
      }
    }

    return undefined
  }, [query])

  const objectType = useMemo(() => {
    for (const type of Object.values(ProviderObjectType)) {
      const pattern = new RegExp(`^.*(from\\s)?${provider}${type}(?!_).*$`, 'i')
      if (pattern.test(query?.toLowerCase() ?? '')) {
        return type
      }
    }
  }, [provider, query])

  const { objects, isValid } = useMemo(() => {
    if (!content) return { objects: [], isValid: false }

    try {
      const parsed = JSON.parse(content)
      return {
        objects: parsed,
        isValid: Array.isArray(parsed) && parsed.length > 0,
      }
    } catch (_) {
      return { objects: [], isValid: false }
    }
  }, [content])

  if (!provider || !objectType || !isValid) {
    return null
  }

  return (
    <CloudObjectsCardSC>
      <CloudObjectCard
        provider={provider}
        type={objectType}
        objects={objects}
      />
    </CloudObjectsCardSC>
  )
}
const CloudObjectsCardSC = styled.div(({ theme }) => ({
  '@container chat-message (min-width: 480px)': {
    width: '100cqw',
  },

  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.colors['fill-zero'],
  border: theme.borders.default,
  padding: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.large,
}))

interface CloudObjectCardProps {
  provider: ProviderPrefix
  type: ProviderObjectType
  objects: Array<any>
}

function CloudObjectCard({
  provider,
  type,
  objects,
}: CloudObjectCardProps): ReactElement | null {
  switch (provider) {
    case ProviderPrefix.AWS:
      return (
        <AwsObjects
          type={type}
          objects={objects}
        />
      )
    default:
      return null
  }
}
