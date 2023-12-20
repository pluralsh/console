import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { IngressFragment } from 'generated/graphql'

import IngressCertificates from './IngressCertificates'

import {
  InfoSectionH2,
  InfoSectionH3,
  PaddedCard,
  PropWideBold,
} from './common'

const COLUMN_HELPER = createColumnHelper<any>()

const columns = [
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
  COLUMN_HELPER.accessor((row) => row.backend, {
    id: 'backend',
    cell: (prop) => prop.getValue(),
    header: 'Backend',
  }),
]

function Routes({ rules }) {
  const theme = useTheme()
  const data = useMemo(
    () =>
      rules.reduce((accumulator, rule) => {
        const paths = rule.http?.paths

        return accumulator.concat(
          paths?.map(({ path, backend: { serviceName, servicePort } }) => ({
            host: rule.host,
            path: path || '*',
            backend: `${serviceName || '-'}:${servicePort || '-'}`,
          }))
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
        columns={columns}
      />
    </>
  )
}

export default function Ingress() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  const ingress = data?.ingress as Nullable<IngressFragment>

  if (!ingress) return null

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
          <InfoSectionH2
            css={{
              marginBottom: theme.spacing.medium,
            }}
          >
            Status
          </InfoSectionH2>
          <PaddedCard>
            <PropWideBold title={balancerIngress[0]?.ip ? 'IP' : 'Hostname'}>
              {balancerIngress[0]?.ip || balancerIngress[0]?.hostname || '-'}
            </PropWideBold>
          </PaddedCard>
        </>
      )}
      <InfoSectionH2
        css={{
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
      <Routes rules={rules} />
      <IngressCertificates certificates={ingress.certificates} />
    </div>
  )
}
