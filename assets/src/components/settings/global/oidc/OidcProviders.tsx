import {
  Card,
  CaretRightIcon,
  Flex,
  IconFrame,
  PlusIcon,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  OidcProviderFragment,
  OidcProviderType,
  useDeleteOidcProviderMutation,
  useOidcProvidersQuery,
} from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { OidcCreateProviderModal } from './OidcCreateProviderModal'

const columnHelper = createColumnHelper<OidcProviderFragment>()

export function OidcProviders({
  setSelectedProvider,
}: {
  setSelectedProvider: (provider: OidcProviderFragment | null) => void
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data, loading, error } = useOidcProvidersQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const providers = mapExistingNodes(data?.oidcProviders)

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Table
        hideHeader
        fillLevel={1}
        rowBg="base"
        data={providers}
        columns={cols}
        loading={loading && !data}
        maxHeight={600}
        emptyStateProps={{ message: 'No providers found.' }}
        onRowClick={(_, row) => setSelectedProvider?.(row.original)}
      />
      <AddNewProviderCardSC
        clickable
        onClick={() => setShowCreateModal(true)}
      >
        <Body2BoldP>Add new Console OIDC provider</Body2BoldP>
        <IconFrame icon={<PlusIcon />} />
      </AddNewProviderCardSC>
      <OidcCreateProviderModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </Flex>
  )
}
const AddNewProviderCardSC = styled(Card)(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}))

const cols = [
  columnHelper.accessor((provider) => provider, {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const { name, description } = getValue()
      return (
        <StackedText
          gap="xxsmall"
          first={name}
          firstColor="text"
          firstPartialType="body2Bold"
          second={description}
          secondColor="text-light"
          secondPartialType="body2"
        />
      )
    },
  }),
  columnHelper.accessor((provider) => provider, {
    id: 'actions',
    cell: function Cell({ getValue }) {
      const { id, name } = getValue()
      const [showDeleteModal, setShowDeleteModal] = useState(false)
      const [deleteProvider, { loading: deleteLoading, error: deleteError }] =
        useDeleteOidcProviderMutation({
          variables: { id, type: OidcProviderType.Console },
          onCompleted: () => setShowDeleteModal(false),
          refetchQueries: ['OidcProviders'],
        })
      return (
        <Flex gap="xxsmall">
          <IconFrame
            clickable
            tooltip="Delete provider"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteModal(true)
            }}
            icon={<TrashCanIcon color="icon-danger" />}
          />
          <IconFrame
            clickable
            tooltip="Go to provider settings"
            icon={<CaretRightIcon />}
          />
          <Confirm
            destructive
            open={showDeleteModal}
            title="Delete provider"
            text={`Are you sure you want to delete "${name}"?`}
            label="Delete"
            close={() => setShowDeleteModal(false)}
            submit={() => deleteProvider()}
            loading={deleteLoading}
            error={deleteError}
          />
        </Flex>
      )
    },
  }),
]
