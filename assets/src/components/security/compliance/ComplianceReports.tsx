import {
  Button,
  Flex,
  IconFrame,
  InvoicesIcon,
  ListIcon,
  PeopleIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  COMPLIANCE_REPORTS_ABS_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'

import { createColumnHelper } from '@tanstack/react-table'
import { Edge } from '../../../utils/graphql.ts'
import {
  ComplianceReportGeneratorFragment,
  useComplianceReportGeneratorsQuery,
} from '../../../generated/graphql.ts'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData.tsx'
import { GqlError } from '../../utils/Alert.tsx'

const columnHelper =
  createColumnHelper<Edge<ComplianceReportGeneratorFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    meta: { gridTemplate: `fit-content(300px)` },
    cell: ({}) => (
      <Flex gap={'small'}>
        <IconFrame
          clickable
          icon={<PeopleIcon />}
          type={'floating'}
        />
        <IconFrame
          clickable
          icon={<ListIcon />}
          type={'floating'}
        />
        <Button
          floating
          small
          startIcon={<InvoicesIcon />}
          type="submit"
        >
          Create report
        </Button>
      </Flex>
    ),
  }),
]

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  {
    label: 'compliance reports',
    url: COMPLIANCE_REPORTS_ABS_PATH,
  },
]

export function ComplianceReports() {
  useSetBreadcrumbs(breadcrumbs)

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useComplianceReportGeneratorsQuery,
      keyPath: ['complianceReportGenerators'],
    })

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      hideHeader
      rowBg="raised"
      virtualizeRows
      data={[
        { node: { name: 'test' } }, // TODO data?.complianceReportGenerators?.edges || []
        { node: { name: 'test' } },
        { node: { name: 'test' } },
        { node: { name: 'test' } },
        { node: { name: 'test' } },
      ]}
      loading={!data && loading}
      columns={columns}
      hasNextPage={data?.complianceReportGenerators?.pageInfo?.hasNextPage}
      isFetchingNextPage={loading}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      onVirtualSliceChange={setVirtualSlice}
      fetchNextPage={fetchNextPage}
    />
  )
}
