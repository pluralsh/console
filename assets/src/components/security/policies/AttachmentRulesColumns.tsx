import {
  Chip,
  Flex,
  IconFrame,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import { StrongSC } from 'components/utils/typography/Text'
import {
  BindingPolicyTinyFragment,
  useDeleteBindingPolicyMutation,
} from 'generated/graphql'
import { startCase, truncate } from 'lodash'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { Edge } from 'utils/graphql'

const columnHelper = createColumnHelper<Edge<BindingPolicyTinyFragment>>()

export const ColRules = columnHelper.accessor(({ node }) => node?.policy, {
  id: 'rules',
  header: 'Rules',
  meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
  cell: function Cell({ getValue }) {
    const policy = getValue()

    return (
      <StackedText
        truncate
        first={policy?.name}
        second={policy?.description}
      />
    )
  },
})

export const ColBindPolicy = columnHelper.accessor(
  ({ node }) => node?.bindPolicy?.name,
  {
    id: 'bindPolicy',
    header: 'Bind policy',
    meta: { gridTemplate: 'auto' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const name = getValue()

      return (
        <span
          css={{
            ...theme.partials.text.code,
            color: theme.colors['text-xlight'],
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      )
    },
  }
)

export const ColTarget = columnHelper.accessor(({ node }) => node?.type, {
  id: 'target',
  header: 'Target',
  meta: { gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const type = getValue()

    if (!type) return null

    return (
      <Chip
        size="small"
        fillLevel={1}
        css={{
          borderRadius: 20,
          minWidth: 80,
          justifyContent: 'center',
        }}
      >
        <span css={{ color: theme.colors['text-xlight'] }}>
          {startCase(type.toLowerCase())}
        </span>
      </Chip>
    )
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  meta: { gridTemplate: 'auto' },
  cell: function Cell({ row: { original } }) {
    return <AttachmentRuleActions rule={original?.node} />
  },
})

function AttachmentRuleActions({
  rule,
}: {
  rule: Nullable<BindingPolicyTinyFragment>
}) {
  const theme = useTheme()
  const { popToast } = useSimpleToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const label = rule?.policy?.name ?? 'attachment rule'

  const [deleteBindingPolicy, { loading, error }] =
    useDeleteBindingPolicyMutation({
      variables: { id: rule?.id ?? '' },
      refetchQueries: ['BindingPolicies'],
      awaitRefetchQueries: true,
      onCompleted: () => {
        popToast({
          content: `${label} deleted`,
          severity: 'success',
        })
        setDeleteOpen(false)
      },
    })

  return (
    <Flex
      align="center"
      justify="flex-end"
      gap="xxsmall"
    >
      <IconFrame
        icon={<PencilIcon />}
        tooltip="Edit attachment rule"
        textValue={`Edit ${label}`}
      />
      <IconFrame
        clickable
        tooltip="Delete attachment rule"
        textValue={`Delete ${label}`}
        icon={<TrashCanIcon color={theme.colors['icon-danger']} />}
        onClick={() => setDeleteOpen(true)}
      />
      <Confirm
        open={deleteOpen}
        close={() => setDeleteOpen(false)}
        destructive
        title="Delete attachment rule"
        label="Delete attachment rule"
        loading={loading}
        error={error}
        submit={() => deleteBindingPolicy()}
        text={
          <span>
            Are you sure you want to delete{' '}
            <StrongSC $color="text-danger">
              {truncate(label, { length: 40 })}
            </StrongSC>
            ?
          </span>
        }
      />
    </Flex>
  )
}
