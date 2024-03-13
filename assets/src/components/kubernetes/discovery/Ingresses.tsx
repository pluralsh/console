import { ChipList, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { isEmpty } from 'lodash'

import {
  Ingress_Ingress as IngressT,
  useIngressesQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { useKubernetesContext } from '../Kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

const columnHelper = createColumnHelper<IngressT>()

const columns = [
  columnHelper.accessor((ingress) => ingress?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((ingress) => ingress?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((ingress) => ingress?.objectMeta.labels, {
    id: 'labels',
    header: 'Labels',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => {
      const labels = getValue()

      return (
        <ChipList
          size="small"
          limit={1}
          values={Object.entries(labels || {})}
          transformValue={(label) => label.join(': ')}
        />
      )
    },
  }),
  columnHelper.accessor((ingress) => ingress?.endpoints, {
    id: 'endpoints',
    header: 'Endpoints',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => JSON.stringify(getValue()),
  }),
  columnHelper.accessor((ingress) => ingress?.hosts, {
    id: 'hosts',
    header: 'Hosts',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => {
      const hosts = getValue()

      return isEmpty(hosts) ? '-' : hosts.map((host) => <div>{host}</div>)
    },
  }),
  columnHelper.accessor((ingress) => ingress?.objectMeta.creationTimestamp, {
    id: 'created',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export default function Ingresses() {
  const { cluster, namespace, filter } = useKubernetesContext()

  const { data, loading } = useIngressesQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      filterBy: `name,${filter}`,
    },
  }) // TODO: Pagination, sorting and filtering (filterBy=name,...).

  const ingresses = data?.handleGetIngressList?.items || []

  if (loading) return <LoadingIndicator />

  return (
    <Table
      data={ingresses}
      columns={columns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}
