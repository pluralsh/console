import { ComponentProps, useCallback, useMemo } from 'react'
import {
  Chip,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { AuthMethod, useGetServiceDataQuery } from 'generated/graphql'
import {
  CD_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
  GLOBAL_SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useParams } from 'react-router-dom'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { Flex } from 'honorable'

import { useTheme } from 'styled-components'

import { extendConnection } from 'utils/graphql'

import { Title1H1 } from 'components/utils/typography/Text'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { SERVICES_QUERY_PAGE_SIZE } from '../services/Services'

import {
  ColDistribution,
  ColLastActivity,
  ColServiceName,
  ColTags,
} from './GlobalServicesColumns'
import { GlobalServiceDetailTable } from './GlobalServiceDetailTable'
import GlobalServiceSidecar from './GlobalServiceSidecar'

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
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          height: '100%',
          flexGrow: 1,
        }}
      >
        {!data ? (
          <LoadingIndicator />
        ) : services?.length ? (
          <>
            <Title1H1>{globalService?.name}</Title1H1>

            <Flex
              gap={theme.spacing.medium}
              alignItems="flex-start"
              height="85%"
            >
              <GlobalServiceDetailTable
                data={data}
                error={error}
                fetchNextPage={fetchNextPage}
                loading={loading}
              />
              <GlobalServiceSidecar globalService={globalService} />
            </Flex>
          </>
        ) : (
          <div css={{ height: '100%' }}>
            <EmptyState message="Looks like this service does not exist." />
          </div>
        )}
      </div>
    </ResponsivePageFullWidth>
  )
}
