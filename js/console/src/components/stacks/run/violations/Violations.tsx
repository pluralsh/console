import { Table } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'

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
      getRowCanExpand={() => true}
      renderExpanded={ViolationExpansionPanel}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      emptyStateProps={{ message: 'No violations found.' }}
    />
  )
}
