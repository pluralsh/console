import {
  Flex,
  IconFrame,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { CloudConnectionTinyFragment } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCloudConnectionsSettingsEditAbsPath } from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { PROVIDER_TO_ICON } from 'components/workbenches/tools/workbenchToolsUtils'
import { DeleteCloudConnectionModal } from './DeleteCloudConnectionModal'

const columnHelper = createColumnHelper<CloudConnectionTinyFragment>()

export function getCloudConnectionColumns({
  refetch,
}: {
  refetch?: () => void
}) {
  return [
    columnHelper.accessor((connection) => connection, {
      id: 'provider',
      meta: { gridTemplate: '40px' },
      cell: ({ getValue }) => {
        const ProviderIcon = PROVIDER_TO_ICON[getValue().provider]
        return (
          <IconFrame
            size="small"
            type="floating"
            icon={<ProviderIcon fullColor />}
          />
        )
      },
    }),
    columnHelper.accessor((connection) => connection.name, {
      id: 'name',
      meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.display({
      id: 'actions',
      meta: { gridTemplate: 'fit-content(72px)' },
      cell: function Cell({ row }) {
        return (
          <CloudConnectionActions
            connection={row.original}
            refetch={refetch}
          />
        )
      },
    }),
  ]
}

function CloudConnectionActions({
  connection,
  refetch,
}: {
  connection: CloudConnectionTinyFragment
  refetch?: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  return (
    <Flex
      align="center"
      justify="flex-end"
      gap="xxsmall"
    >
      <IconFrame
        clickable
        tooltip="Edit cloud connection"
        icon={<PencilIcon />}
        onClick={() =>
          navigate(
            getCloudConnectionsSettingsEditAbsPath({
              cloudConnectionId: connection.id,
            })
          )
        }
      />
      <IconFrame
        clickable
        tooltip="Delete cloud connection"
        icon={<TrashCanIcon color={theme.colors['icon-danger']} />}
        onClick={() => setDeleting(true)}
      />
      <DeleteCloudConnectionModal
        connection={connection}
        open={deleting}
        refetch={refetch}
        onClose={() => setDeleting(false)}
      />
    </Flex>
  )
}
