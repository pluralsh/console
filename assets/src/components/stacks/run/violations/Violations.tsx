import { Table } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../../utils/table/useFetchPaginatedData.tsx'
import { StackRunOutletContextT } from '../Route.tsx'
import { columns } from './columns.tsx'
import ViolationExpansionPanel from './ViolationExpansionPanel.tsx'

export default function Violations(): ReactNode {
  const { stackRun } = useOutletContext<StackRunOutletContextT>()

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      css={{ maxHeight: '100%' }}
      data={stackRun?.violations || []}
      columns={columns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      getRowCanExpand={() => true}
      renderExpanded={ViolationExpansionPanel}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      emptyStateProps={{ message: 'No violations found.' }}
    />
  )
}
