import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { useTheme } from 'styled-components'

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

  if (!data?.ingress) return null

  const { ingress } = data
  const loadBalancer = ingress.status?.loadBalancer
  const hasIngress = !!loadBalancer?.ingress && !isEmpty(loadBalancer.ingress)
  const rules = ingress.spec?.rules || []

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      {hasIngress && (
        <>
          <InfoSectionH2
            css={{
              marginBottom: theme.spacing.medium,
            }}
          >
            Status
          </InfoSectionH2>
          <PaddedCard>
            <PropWideBold
              title={loadBalancer.ingress[0].ip ? 'IP' : 'Hostname'}
            >
              {loadBalancer.ingress[0].ip ||
                loadBalancer.ingress[0].hostname ||
                '-'}
            </PropWideBold>
          </PaddedCard>
        </>
      )}
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
      <Routes rules={rules} />
    </div>
  )
}
