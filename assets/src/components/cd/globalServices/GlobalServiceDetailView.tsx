import {
  Chip,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ComponentProps, useCallback, useMemo } from 'react'

import {
  AuthMethod,
  useGetServiceDataQuery,
  useSyncGlobalServiceMutation,
} from 'generated/graphql'
import {
  CD_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
  GLOBAL_SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useParams } from 'react-router-dom'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { useTheme } from 'styled-components'

import { extendConnection } from 'utils/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import KickButton from 'components/utils/KickButton'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { SERVICES_QUERY_PAGE_SIZE } from '../services/Services'

import { GlobalServiceDetailTable } from './GlobalServiceDetailTable'
import GlobalServiceSidecar from './GlobalServiceSidecar'
import {
  ColDistribution,
  ColLastActivity,
  ColServiceName,
  ColTags,
} from './GlobalServicesColumns'

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

export const GLOBAL_SERVICES_QUERY_PAGE_SIZE = 100

export const GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const columns = [
  ColServiceName,
  ColDistribution,
  ColTags,
  ColLastActivity,
]

export default function GlobalServiceDetailView() {
  const params = useParams()
  const theme = useTheme()
  const serviceId = params[GLOBAL_SERVICE_PARAM_ID]

  const queryResult = useGetServiceDataQuery({
    variables: {
      first: SERVICES_QUERY_PAGE_SIZE,
      serviceId: serviceId || '',
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

  const globalService = data?.globalService
  const pageInfo = globalService?.services?.pageInfo
  const services = globalService?.services?.edges

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!prev.globalService) return prev

        return {
          ...prev,
          globalService: extendConnection(
            prev.globalService,
            fetchMoreResult.globalService?.services,
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
          label: 'global-services',
          url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}`,
        },
        {
          label: globalService?.name || 'Service',
          url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}/${
            globalService?.name || 'Service'
          }`,
        },
      ],
      [globalService?.name]
    )
  )

  return (
    <ResponsivePageFullWidth scrollable={false}>
      {!data ? (
        <LoadingIndicator />
      ) : services?.length ? (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.medium,
            alignItems: 'flex-start',
            height: '100%',
          }}
        >
          <GlobalServiceDetailTable
            data={data}
            error={error}
            fetchNextPage={fetchNextPage}
            loading={loading}
          />
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <KickButton
              kickMutationHook={useSyncGlobalServiceMutation}
              message="Resync"
              tooltipMessage="Sync this service now instead of at the next poll interval"
              variables={{ id: globalService?.id }}
            />
            <GlobalServiceSidecar globalService={globalService} />
          </div>
        </div>
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="Looks like this service does not exist." />
        </div>
      )}
    </ResponsivePageFullWidth>
  )
}
