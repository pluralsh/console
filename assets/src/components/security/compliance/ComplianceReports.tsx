import {
  Button,
  Flex,
  InvoicesIcon,
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
import { parse } from 'content-disposition'
import streamSaver from 'streamsaver'
import { fetchToken } from '../../../helpers/auth.ts'
import { ReportHistory } from './ReportHistory.tsx'
import { Permissions } from './Permissions.tsx'

const fetchPolicyReport = (generator: string, token: string) => {
  streamSaver.mitm = '/mitm.html'
  fetch(`/v1/compliance/report/${generator}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    const contentDisposition = res.headers?.get('content-disposition') ?? ''
    const filename =
      parse(contentDisposition)?.parameters?.filename ?? 'report.zip'
    const writeStream = streamSaver.createWriteStream(filename)
    return res.body?.pipeTo(writeStream)
  })
}

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
    cell: function Cell({ getValue }) {
      const node = getValue()
      const token = fetchToken()

      if (!node) return null

      return (
        <Flex gap={'small'}>
          <Permissions generator={node} />
          <ReportHistory name={node.name} />
          <Button
            floating
            small
            startIcon={<InvoicesIcon />}
            onClick={() => fetchPolicyReport(node.name, token)}
          >
            Create report
          </Button>
        </Flex>
      )
    },
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
      data={data?.complianceReportGenerators?.edges || []}
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
