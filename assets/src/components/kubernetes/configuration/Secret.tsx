import { ReactElement, useMemo, useState } from 'react'
import {
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
import { Metadata, useKubernetesCluster } from '../utils'
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

function SecretDataValue({ value }: { value: any }) {
  const theme = useTheme()
  const [reveal, setReveal] = useState(false)

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xxsmall,
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
    cell: ({ getValue }) => <SecretDataValue value={getValue()} />,
  }),
]

export default function Secret(): ReactElement {
  const theme = useTheme()
  const cluster = useKubernetesCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
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
          <Metadata objectMeta={secret?.objectMeta} />
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
          <SubTitle>Data</SubTitle>
          {/* TODO: Reveal all button. */}
          <Card
            css={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Table
              data={secretData || []}
              columns={columns}
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
