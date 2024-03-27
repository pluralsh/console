import { ReactElement, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  Prop,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import {
  SecretQueryVariables,
  useSecretQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import { Metadata, MetadataSidecar, useKubernetesCluster } from '../utils'
import { NAMESPACE_PARAM } from '../Kubernetes'
import {
  SECRETS_REL_PATH,
  getConfigurationAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { getBreadcrumbs } from './Secrets'

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

export default function Secret(): ReactElement {
  const theme = useTheme()
  const cluster = useKubernetesCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const [revealAll, setRevealAll] = useState(false)
  const { data, loading } = useSecretQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
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
          url: getResourceDetailsAbsPath(clusterId, 'secret', name, namespace),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const secretData: SecretDataEntry[] = useMemo(
    () =>
      Object.entries(secret?.data ?? {}).map(([key, value]) => ({
        key,
        value,
      })),
    [secret?.data]
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <section>
          <SubTitle>Metadata</SubTitle>
          <MetadataSidecar objectMeta={secret?.objectMeta} />
        </section>
        <section>
          <SubTitle>Info</SubTitle>
          <Card
            css={{
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            <Prop title="Type">{secret?.type}</Prop>
          </Card>
        </section>
        <section>
          <div
            css={{
              ...theme.partials.text.subtitle1,
              alignItems: 'end',
              justifyContent: 'space-between',
              display: 'flex',
              marginBottom: theme.spacing.medium,
            }}
          >
            <span>Data</span>
            <Button
              floating
              startIcon={revealAll ? <EyeClosedIcon /> : <EyeIcon />}
              onClick={() => setRevealAll(!revealAll)}
            >
              {revealAll ? 'Hide all' : 'Reveal all'}
            </Button>
          </div>
          <Card
            css={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Table
              data={secretData || []}
              columns={columns}
              reactTableOptions={{ meta: { revealAll } }}
              css={{
                maxHeight: 'unset',
                height: '100%',
              }}
            />
          </Card>
        </section>
      </div>
    </ResponsivePageFullWidth>
  )
}
