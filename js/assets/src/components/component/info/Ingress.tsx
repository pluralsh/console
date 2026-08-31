import { Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { IngressFragment } from 'generated/graphql'
import { Kind } from 'components/kubernetes/common/types'
import { getResourceDetailsAbsPath } from 'routes/kubernetesRoutesConsts'

import IngressCertificates from './IngressCertificates'

import {
  InfoSectionH2,
  InfoSectionH3,
  PaddedCard,
  PropWideBold,
} from './common'
import { ComponentDetailsContext } from '../ComponentDetails'

type IngressRuleFlatT = {
  host?: string
  path: string
  pathType: string
  serviceName: string
  servicePort: string
}

const COLUMN_HELPER = createColumnHelper<IngressRuleFlatT>()

type IngressRoutesTableMeta = {
  clusterId?: Nullable<string>
  namespace?: Nullable<string>
}

const COLUMNS = [
  COLUMN_HELPER.accessor((row) => row.host, {
    id: 'host',
    cell: (prop) => prop.getValue(),
    header: 'Host',
  }),
  COLUMN_HELPER.accessor((row) => row.path, {
    id: 'path',
    cell: (prop) => prop.getValue(),
    header: 'Path',
  }),
  COLUMN_HELPER.accessor((row) => row.pathType, {
    id: 'pathType',
    cell: (prop) => prop.getValue(),
    header: 'Path type',
  }),
  COLUMN_HELPER.accessor((row) => row, {
    id: 'backend',
    header: 'Backend',
    cell: function Cell({
      table,
      row: {
        original: { serviceName, servicePort },
      },
    }) {
      const theme = useTheme()
      const meta = table.options.meta as IngressRoutesTableMeta | undefined
      const { clusterId, namespace } = meta ?? {}
      const portPart = `${servicePort || '-'}`

      if (serviceName && clusterId && namespace) {
        return (
          <Flex>
            <Link
              to={getResourceDetailsAbsPath(
                clusterId,
                Kind.Service,
                serviceName,
                namespace
              )}
              css={{
                ...theme.partials.text.inlineLink,
              }}
            >
              {serviceName}
            </Link>
            <span>:</span>
            <span>{portPart}</span>
          </Flex>
        )
      }

      return `${serviceName || '-'}:${portPart}`
    },
  }),
]

function Routes({
  rules,
  clusterId,
  namespace,
}: {
  rules: IngressFragment['spec']['rules']
  clusterId: Nullable<string>
  namespace: Nullable<string>
}) {
  const theme = useTheme()
  const data = useMemo(
    () =>
      (rules ?? []).reduce<IngressRuleFlatT[]>((accumulator, rule) => {
        const paths = rule?.http?.paths ?? []

        return accumulator.concat(
          paths.map((p) => {
            const path = p?.path
            const pathType = p?.pathType
            const backend = p?.backend
            return {
              host: rule?.host,
              path: path || '*',
              pathType: pathType ?? '',
              serviceName: backend?.serviceName ?? '',
              servicePort: backend?.servicePort ?? '',
            } as IngressRuleFlatT
          })
        )
      }, []),
    [rules]
  )
  return (
    <>
      <InfoSectionH3
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Routes
      </InfoSectionH3>
      <Table
        data={data}
        columns={COLUMNS}
        reactTableOptions={{ meta: { clusterId, namespace } }}
      />
    </>
  )
}

export default function IngressOutlet() {
  const { componentDetails, cluster } =
    useOutletContext<ComponentDetailsContext>()

  return componentDetails?.__typename === 'Ingress' ? (
    <IngressBase
      ingress={componentDetails}
      clusterId={cluster?.id}
      namespace={componentDetails.metadata?.namespace}
    />
  ) : null
}

export function IngressBase({
  ingress,
  clusterId,
  namespace,
}: {
  ingress: IngressFragment
  clusterId?: Nullable<string>
  namespace?: Nullable<string>
}) {
  const theme = useTheme()
  const loadBalancer = ingress.status?.loadBalancer
  const balancerIngress =
    !!loadBalancer?.ingress && !isEmpty(loadBalancer.ingress)
      ? loadBalancer.ingress
      : null
  const rules = ingress.spec?.rules || []

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      {balancerIngress && (
        <>
          <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
            Status
          </InfoSectionH2>
          <PaddedCard>
            <PropWideBold title={balancerIngress[0]?.ip ? 'IP' : 'Hostname'}>
              {balancerIngress[0]?.ip || balancerIngress[0]?.hostname || '-'}
            </PropWideBold>
          </PaddedCard>
        </>
      )}
      <InfoSectionH2 css={{ marginTop: theme.spacing.large }}>
        Spec
      </InfoSectionH2>
      <Routes
        rules={rules}
        clusterId={clusterId}
        namespace={namespace}
      />
      <IngressCertificates certificates={ingress.certificates} />
    </div>
  )
}
