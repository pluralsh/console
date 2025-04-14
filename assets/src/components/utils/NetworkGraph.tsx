import {
  Card,
  EmptyState,
  Flex,
  Input,
  NamespaceIcon,
  SearchIcon,
} from '@pluralsh/design-system'
import { NamespaceFilter } from 'components/kubernetes/common/NamespaceFilter'
import {
  NetworkMeshEdgeFragment,
  useClusterNamespacesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from './LoadingIndicator'
import { TimestampSliderButton } from './TimestampSlider'

export function NetworkGraph({
  networkData,
  loading,
  q,
  setQ,
  namespace,
  setNamespace,
  setTimestamp,
}: {
  networkData: NetworkMeshEdgeFragment[]
  loading?: boolean
  q: string
  setQ: (q: string) => void
  namespace?: string
  setNamespace: (namespace?: string) => void
  setTimestamp: (timestamp: string | undefined) => void
}) {
  const { colors } = useTheme()
  const { clusterId } = useParams()
  const { data: namespacesData, error: namespacesError } =
    useClusterNamespacesQuery({
      variables: { clusterId },
    })
  const namespaces =
    namespacesData?.namespaces
      ?.filter(isNonNullable)
      .map((ns) => ns.metadata.name) ?? []

  return (
    <WrapperSC>
      <Flex
        gap="medium"
        width="100%"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search service names"
          startIcon={<SearchIcon color="icon-light" />}
          flex={1}
        />
        {!namespacesError && (
          <NamespaceFilter
            namespaces={namespaces}
            namespace={namespace ?? ''}
            onChange={setNamespace}
            startIcon={<NamespaceIcon color="icon-light" />}
            inputProps={{ placeholder: 'Filter by namespace' }}
            containerProps={{
              style: { background: colors['fill-one'], flex: 1 },
            }}
          />
        )}
        <TimestampSliderButton setTimestamp={setTimestamp} />
      </Flex>
      <Card flex={1}>
        {loading ? (
          <LoadingIndicator />
        ) : isEmpty(networkData) ? (
          <EmptyState message="No network data found." />
        ) : (
          <div>NetworkGraph</div>
        )}
      </Card>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  width: '100%',
}))
