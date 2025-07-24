import { ReactElement, useMemo } from 'react'
import styled from 'styled-components'
import { AwsObjects } from './cloudquery/aws.tsx'

// Cloud query uses prefixes to identify the provider and object type.
// It should match i.e. `aws_vpc`, `gcp_vpc`, `azure_vpc` etc.
enum ProviderPrefix {
  AWS = 'aws_',
  GCP = 'gcp_',
  AZURE = 'azure_',
}

export enum ProviderObjectType {
  VPC = 'vpc',
}

interface CloudObjectsCardProps {
  query?: string
  content?: string
}

export default function CloudObjectsCard({
  query,
  content,
}: CloudObjectsCardProps): ReactElement | null {
  // This is just a heuristic check to determine the provider based
  // on the query string.
  const provider = useMemo(() => {
    for (const prefix of Object.values(ProviderPrefix)) {
      // Check if query contains a table name with the prefix
      if (query?.includes(`FROM ${prefix}`)) {
        return prefix
      }

      // Fallback check for prefix in the query
      if (query?.includes(prefix)) {
        return prefix
      }
    }

    return undefined
  }, [query])

  const objectType = useMemo(() => {
    for (const type of Object.values(ProviderObjectType)) {
      if (query?.includes(`FROM ${provider}${type}`)) {
        return type
      }

      // TODO: this could potentially be a second loop to first check all FROM
      // clauses and then check the content
      if (query?.includes(`${provider}${type}`)) {
        return type
      }
    }
  }, [provider, query])

  if (!provider || !objectType) {
    return null
  }

  return (
    <CloudObjectsCardSC>
      <CloudObjectCard
        provider={provider}
        type={objectType}
        content={content}
      />
    </CloudObjectsCardSC>
  )
}
const CloudObjectsCardSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  background: theme.colors['fill-zero'],
  border: theme.borders.default,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
}))

function CloudObjectCard({ provider, type, content }): ReactElement | null {
  switch (provider) {
    case ProviderPrefix.AWS:
      return (
        <AwsObjects
          type={type}
          content={content}
        />
      )
    default:
      return null
  }
}
