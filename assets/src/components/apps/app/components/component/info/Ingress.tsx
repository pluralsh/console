import { Card, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import PropWide from 'components/utils/PropWide'
import { Flex, H2, H3 } from 'honorable'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

const COLUMN_HELPER = createColumnHelper<any>()

const columns = [
  COLUMN_HELPER.accessor(row => row.host, {
    id: 'host',
    cell: prop => prop.getValue(),
    header: 'Host',
  }),
  COLUMN_HELPER.accessor(row => row.path, {
    id: 'path',
    cell: prop => prop.getValue(),
    header: 'Path',
  }),
  COLUMN_HELPER.accessor(row => row.backend, {
    id: 'backend',
    cell: prop => prop.getValue(),
    header: 'Backend',
  }),
]

function Routes({ rules }) {
  const data = useMemo(() => rules.reduce((accumulator, rule) => {
    const paths = rule.http?.paths

    return accumulator.concat(paths?.map(({ path, backend: { serviceName, servicePort } }) => ({
      host: rule.host,
      path: path || '*',
      backend: `${serviceName || '-'}:${servicePort || '-'}`,
    })))
  }, []), [rules])

  return (
    <>
      <H3
        marginBottom="medium"
        marginTop="large"
      >
        Routes
      </H3>
      <Table
        data={data}
        columns={columns}
      />
    </>
  )
}

export default function Ingress() {
  const { data } = useOutletContext<any>()

  if (!data?.ingress) return null

  const { ingress } = data
  const loadBalancer = ingress.status?.loadBalancer
  const hasIngress = !!loadBalancer?.ingress && !isEmpty(loadBalancer.ingress)
  const rules = ingress.spec?.rules || []

  return (
    <Flex direction="column">
      {hasIngress && (
        <>
          <H2 marginBottom="medium">Status</H2>
          <Card padding="large">
            <PropWide
              title={loadBalancer.ingress[0].ip ? 'IP' : 'Hostname'}
              fontWeight={600}
            >
              {loadBalancer.ingress[0].ip || loadBalancer.ingress[0].hostname || '-'}
            </PropWide>
          </Card>
        </>
      )}
      <H2
        marginBottom="medium"
        marginTop="large"
      >
        Spec
      </H2>
      <Routes rules={rules} />
    </Flex>
  )
}
