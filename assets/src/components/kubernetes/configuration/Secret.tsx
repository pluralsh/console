import { ReactElement, useEffect, useMemo, useState } from 'react'
import {
  Button,
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import {
  SecretQueryVariables,
  Secret_SecretDetail as SecretT,
  useSecretQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import {
  SECRETS_REL_PATH,
  getConfigurationAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { useCluster } from '../Cluster'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './Secrets'

const directory: Array<TabEntry> = [
  { path: '', label: 'Data' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Secret(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useSecretQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    fetchPolicy: 'cache-and-network',
    variables: {
      name,
      namespace,
    } as SecretQueryVariables,
  })

  const secret = data?.handleGetSecretDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getConfigurationAbsPath(
            cluster?.id
          )}/${SECRETS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.Secret,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={secret}>
          <SidecarItem heading="Type">{secret?.type}</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={secret} />
    </ResourceDetails>
  )
}

type SecretDataEntry = {
  key: string
  value: any
}

function SecretDataValue({
  value,
  forceReveal,
}: {
  value: any
  forceReveal: boolean
}) {
  const theme = useTheme()
  const [reveal, setReveal] = useState(false)

  useEffect(() => setReveal(forceReveal), [setReveal, forceReveal])

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.large,
      }}
    >
      <IconFrame
        size="medium"
        clickable
        tooltip={reveal ? 'Hide value' : 'Reveal value'}
        icon={reveal ? <EyeIcon /> : <EyeClosedIcon />}
        onClick={() => setReveal(() => !reveal)}
      />
      <div css={{ wordBreak: 'break-word' }}>
        {reveal ? atob(value) : value}
      </div>
    </div>
  )
}

const columnHelper = createColumnHelper<SecretDataEntry>()

const columns = [
  columnHelper.accessor((row) => row.key, {
    id: 'key',
    header: 'Key',
    meta: { gridTemplate: `fit-content(200px)` },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((row) => row.value, {
    id: 'value',
    header: 'Value',
    cell: ({ getValue, table }) => {
      const { revealAll } =
        (table.options?.meta as { revealAll?: boolean }) || {}

      return (
        <SecretDataValue
          value={getValue()}
          forceReveal={!!revealAll}
        />
      )
    },
  }),
]

export function SecretData(): ReactElement<any> {
  const secret = useOutletContext() as SecretT
  const [revealAll, setRevealAll] = useState(false)

  const headerContent = useMemo(
    () => (
      <Button
        floating
        startIcon={revealAll ? <EyeClosedIcon /> : <EyeIcon />}
        onClick={() => setRevealAll(!revealAll)}
      >
        {revealAll ? 'Hide all' : 'Reveal all'}
      </Button>
    ),
    [revealAll, setRevealAll]
  )

  useSetPageHeaderContent(headerContent)

  const data: SecretDataEntry[] = useMemo(
    () =>
      Object.entries(secret?.data ?? {}).map(([key, value]) => ({
        key,
        value,
      })),
    [secret?.data]
  )

  return (
    <FullHeightTableWrap>
      <Table
        data={data}
        columns={columns}
        reactTableOptions={{ meta: { revealAll } }}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
