import { ComponentProps, useCallback, useMemo } from 'react'
import {
  Chip,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { AuthMethod, useGetManagedNamespaceQuery } from 'generated/graphql'
import {
  CD_REL_PATH,
  NAMESPACES_PARAM_ID,
  NAMESPACES_REL_PATH,
} from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useParams } from 'react-router-dom'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { Title1H1 } from 'components/utils/typography/Text'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useTheme } from 'styled-components'

import { extendConnection } from 'utils/graphql'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { SERVICES_QUERY_PAGE_SIZE } from '../services/Services'

import { NamespacesDetailTable } from './NamespacesDetailTable'

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

export const NAMESPACES_QUERY_PAGE_SIZE = 100

export const NAMESPACES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export default function NamespacesDetailView() {
  const params = useParams()
  const theme = useTheme()
  const namespaceId = params[NAMESPACES_PARAM_ID]

  const queryResult = useGetManagedNamespaceQuery({
    variables: {
      first: SERVICES_QUERY_PAGE_SIZE,
      namespaceId: namespaceId || '',
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData

  const managedNamespace = data?.managedNamespace
  const services = managedNamespace?.services?.edges
  const pageInfo = managedNamespace?.services?.pageInfo

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!prev.managedNamespace) return prev

        return {
          ...prev,
          managedNamespace: extendConnection(
            prev.managedNamespace,
            fetchMoreResult.managedNamespace?.services,
            'services'
          ),
        }
      },
    })
  }, [fetchMore, pageInfo?.endCursor])

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'namespaces',
          url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}`,
        },
        {
          label: managedNamespace?.name || '',
          url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}/${
            managedNamespace?.name || ''
          }`,
        },
      ],
      [managedNamespace?.name]
    )
  )

  return (
    <ResponsivePageFullWidth scrollable={false}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          height: '100%',
        }}
      >
        <Title1H1>{managedNamespace?.name}</Title1H1>

        {!data ? (
          <LoadingIndicator />
        ) : services?.length ? (
          <NamespacesDetailTable
            data={data}
            error={error}
            fetchNextPage={fetchNextPage}
            loading={loading}
          />
        ) : (
          <div css={{ height: '100%' }}>
            <EmptyState message="Looks like you don't have any service deployments yet." />
          </div>
        )}
      </div>
    </ResponsivePageFullWidth>
  )
}
