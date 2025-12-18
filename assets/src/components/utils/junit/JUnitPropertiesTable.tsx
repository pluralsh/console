import { TableProps, Table, Button, Modal, Code } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useState } from 'react'
import styled from 'styled-components'
import { Property } from 'utils/junitParse'

export function JUnitPropertiesTable({
  properties,
  cellBg = 'dark',
  ...props
}: {
  properties: Property[]
  cellBg?: 'dark' | 'bright'
} & Omit<TableProps, 'columns' | 'data'>) {
  return (
    <div data-cell-bg={cellBg}>
      <Table
        fillLevel={1}
        rowBg="base"
        padCells={false}
        data={properties}
        columns={propertyCols}
        {...props}
      />
    </div>
  )
}

const propertyColumnHelper = createColumnHelper<Property>()
const propertyCols = [
  propertyColumnHelper.accessor((property) => property.name, {
    id: 'properties',
    header: 'Properties',
    cell: function Cell({ getValue }) {
      return <PaddedCellSC>{getValue()}</PaddedCellSC>
    },
  }),
  propertyColumnHelper.accessor((property) => property, {
    id: 'values',
    header: 'Values',
    cell: function Cell({ getValue }) {
      const { name, value, inner } = getValue()
      const [isOpen, setIsOpen] = useState(false)
      return (
        <PaddedCellSC>
          {!inner ? (
            value
          ) : (
            <>
              <Button
                small
                secondary
                onClick={() => setIsOpen(true)}
              >
                View raw
              </Button>
              <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                header={name}
                size="large"
              >
                <Code>{inner}</Code>
              </Modal>
            </>
          )}
        </PaddedCellSC>
      )
    },
  }),
]
const PaddedCellSC = styled.div(({ theme }) => ({
  height: '100%',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  '*[data-cell-bg="dark"] &': { background: theme.colors['fill-zero'] },
  '*[data-cell-bg="bright"] &': { background: theme.colors['fill-three'] },
}))
