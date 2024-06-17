import { ComponentProps, useMemo, useRef } from 'react'
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

import { Flex } from 'honorable'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { SERVICES_QUERY_PAGE_SIZE } from '../services/Services'

import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'

import { NamespacesDetailTable } from './NamespacesDetailTable'
import NamespaceSidecar from './NamespaceSidecar'

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
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useGetManagedNamespaceQuery,
        pageSize: SERVICES_QUERY_PAGE_SIZE,
        keyPath: ['managedNamespace', 'services'],
      },
      { namespaceId: namespaceId ?? '' }
    )

  const managedNamespace = data?.managedNamespace
  const services = data?.managedNamespace?.services?.edges

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
        <Title1H1 ref={titleRef}>{managedNamespace?.name}</Title1H1>

        {!data ? (
          <LoadingIndicator />
        ) : services?.length ? (
          <Flex
            gap={theme.spacing.medium}
            alignItems="flex-start"
            height="85%"
          >
            <NamespacesDetailTable
              data={data}
              error={error}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              onVirtualSliceChange={setVirtualSlice}
            />
            <NamespaceSidecar namespace={managedNamespace} />
          </Flex>
        ) : (
          <div css={{ height: '100%' }}>
            <EmptyState message="Looks like this namespace does not exist." />
          </div>
        )}
      </div>
    </ResponsivePageFullWidth>
  )
}
