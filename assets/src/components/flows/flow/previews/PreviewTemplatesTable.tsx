import { Code, Tab, Table, TabList, TabPanel } from '@pluralsh/design-system'
import { Key } from '@react-types/shared'
import { ExpandedState, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  PreviewEnvironmentTemplateFragment,
  useFlowPreviewEnvironmentTemplatesQuery,
} from 'generated/graphql'
import { useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { deepOmitFalsy, mapExistingNodes } from 'utils/graphql'
import { stringify } from 'yaml'
import {
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
      getRowCanExpand={(row) =>
        !!row.original?.template || !!row.original?.commentTemplate
      }
      expandedRowType="custom"
      renderExpanded={({ row }) => <PreviewTemplateTableExpander row={row} />}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      reactTableOptions={reactTableOptions}
    />
  )
}

function PreviewTemplateTableExpander({
  row,
}: {
  row: Row<PreviewEnvironmentTemplateFragment>
}) {
  const { colors } = useTheme()
  const [activeTab, setActiveTab] = useState<Key>('service')
  const tabStateRef = useRef<any>(null)
  const serviceTemplate = deepOmitFalsy(row.original?.template)
  const commentTemplate = row.original?.commentTemplate ?? ''

  return (
    <div css={{ background: colors['fill-three'] }}>
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: activeTab,
          onSelectionChange: setActiveTab,
        }}
      >
        {!!serviceTemplate ? (
          <TemplateTabSC key="service">Service template</TemplateTabSC>
        ) : null}
        {!!commentTemplate ? (
          <TemplateTabSC key="comment">Comment template</TemplateTabSC>
        ) : null}
      </TabList>
      <TabPanel
        stateRef={tabStateRef}
        tabKey={activeTab}
      >
        <Code
          language={activeTab === 'service' ? 'yaml' : undefined}
          showHeader={false}
          fillLevel={3}
          showLineNumbers={activeTab === 'service'}
          css={{
            borderRadius: 0,
            borderRight: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
          }}
        >
          {activeTab === 'service'
            ? stringify(serviceTemplate)
            : commentTemplate}
        </Code>
      </TabPanel>
    </div>
  )
}

const TemplateTabSC = styled(Tab)(({ theme }) => ({
  flex: 0.5,
  '& *': {
    justifyContent: 'center',
    '&:hover': { background: theme.colors['fill-three-hover'] },
  },
}))

const cols = [ColExpanderWithInitialScroll, ColName, ColReferenceService]
