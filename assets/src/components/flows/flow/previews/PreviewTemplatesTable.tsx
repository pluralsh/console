import { Code, Table } from '@pluralsh/design-system'
import { ExpandedState, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  PreviewEnvironmentTemplateFragment,
  useFlowPreviewEnvironmentTemplatesQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { deepOmitFalsy, mapExistingNodes } from 'utils/graphql'
import { stringify } from 'yaml'
import {
  ColCommentTemplate,
  ColExpanderWithInitialScroll,
  ColName,
  ColReferenceService,
} from './PreviewTemplatesTableCols'

export function PreviewTemplatesTable({
  flowId,
  selectedTemplateId,
}: {
  flowId: string
  selectedTemplateId: Nullable<string>
}) {
  const [expandedRows, setExpandedRows] = useState<ExpandedState>(
    selectedTemplateId ? { [selectedTemplateId]: true } : {}
  )
  const [hasScrolledToSelection, setHasScrolledToSelection] = useState(false)

  const reactTableOptions = useMemo(
    () => ({
      meta: { hasScrolledToSelection, setHasScrolledToSelection },
      onExpandedChange: setExpandedRows,
      state: { expanded: expandedRows },
    }),
    [expandedRows, hasScrolledToSelection, setHasScrolledToSelection]
  )

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useFlowPreviewEnvironmentTemplatesQuery,
        keyPath: ['flow', 'previewEnvironmentTemplates'],
      },
      { id: flowId ?? '' }
    )

  const templates = useMemo(
    () => mapExistingNodes(data?.flow?.previewEnvironmentTemplates),
    [data]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      data={templates}
      columns={cols}
      fullHeightWrap
      virtualizeRows
      fillLevel={1}
      rowBg="raised"
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      getRowCanExpand={() => true}
      expandedRowType="custom"
      renderExpanded={PreviewTemplateTableExpander}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      reactTableOptions={reactTableOptions}
      {...expandedRowBorderFix}
    />
  )
}

function PreviewTemplateTableExpander({
  row,
}: {
  row: Row<PreviewEnvironmentTemplateFragment>
}) {
  const template = deepOmitFalsy(row.original.template)

  return (
    <Code
      language="yaml"
      showHeader={false}
      fillLevel={3}
      showLineNumbers
      css={{
        borderRadius: 0,
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
      }}
    >
      {stringify(template)}
    </Code>
  )
}

// TODO: add this to DS
// should also probably add a native scroll-to-row ability
const expandedRowBorderFix = {
  'tr[data-expander-row] td': { padding: 0 },
}

const cols = [
  ColExpanderWithInitialScroll,
  ColName,
  ColCommentTemplate,
  ColReferenceService,
]
