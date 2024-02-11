import { useState } from 'react'
import {
  ArchitectureIcon,
  Button,
  Chip,
  IconFrame,
  ListBoxItemChipList,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { createColumnHelper } from '@tanstack/react-table'
import styled from 'styled-components'

import { AccessTokenFragment, AccessTokenScope } from '../../generated/graphql'

const ChipList = styled(ListBoxItemChipList)(() => ({
  justifyContent: 'flex-start',
}))

const columnHelper = createColumnHelper<AccessTokenScope>()

const columns = [
  columnHelper.accessor((row) => row, {
    id: 'api',
    header: 'APIs',
    cell: ({ getValue }) => {
      const scope = getValue()
      const apis: string[] = [
        ...(scope.apis ?? []),
        ...(scope.api ? [scope.api] : []),
      ]

      return (
        <ChipList
          maxVisible={Infinity}
          chips={apis.map((api) => (
            <Chip>{api}</Chip>
          ))}
        />
      )
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'id',
    header: 'IDs',
    cell: ({ getValue }) => {
      const scope = getValue()
      const ids: string[] = [
        ...(scope.ids ?? []),
        ...(scope.identifier ? [scope.identifier] : []),
      ]

      if (isEmpty(ids)) return <Chip>*</Chip>

      return (
        <ChipList
          maxVisible={Infinity}
          chips={ids.map((id) => (
            <Chip>{id}</Chip>
          ))}
        />
      )
    },
  }),
]

export function AccessTokensScopes({ token }: { token: AccessTokenFragment }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        textValue="Scopes"
        tooltip
        clickable
        size="medium"
        icon={<ArchitectureIcon />}
        onClick={() => setOpen(true)}
      />
      <Modal
        header="Access token scopes"
        portal
        open={open}
        size="large"
        onClose={() => setOpen(false)}
        actions={
          <Button
            type="button"
            secondary
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        }
      >
        {!isEmpty(token.scopes) ? (
          <Table
            data={token.scopes ?? []}
            columns={columns}
            reactTableOptions={{ getRowId: (row) => row.version }}
          />
        ) : (
          <>This token has full access.</>
        )}
      </Modal>
    </>
  )
}
