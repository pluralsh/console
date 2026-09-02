import {
  Chip,
  Flex,
  IconFrame,
  PencilIcon,
  TicketIcon,
  TrashCanIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from './webhookIcons'
import {
  humanizeIssueWebhookProvider,
  humanizeObservabilityWebhookType,
} from 'utils/webhookLabels'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWebhooksSettingsEditAbsPath } from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'

import CopyButton from 'components/utils/CopyButton'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { DeleteIssueWebhookModal } from './DeleteIssueWebhookModal'
import { DeleteObservabilityWebhookModal } from './DeleteObservabilityWebhookModal'
import { type WebhookListItem } from './WebhooksList'
import { WorkbenchJobActivityType } from '../../../generated/graphql'

const columnHelper = createColumnHelper<WebhookListItem>()

export function getWebhookColumns({
  refetchIssue,
  refetchObservability,
}: {
  refetchIssue?: () => void
  refetchObservability?: () => void
}) {
  return [
    columnHelper.accessor((item) => item, {
      id: 'provider',
      meta: { gridTemplate: '40px' },
      cell: ({ getValue }) => {
        const item = getValue()
        const isObservability =
          item.kind === WorkbenchJobActivityType.Observability
        const providerName = isObservability
          ? humanizeObservabilityWebhookType(item.webhook.type)
          : humanizeIssueWebhookProvider(item.webhook.provider)

        return (
          <IconFrame
            size="small"
            type="floating"
            tooltip={providerName}
            icon={
              isObservability
                ? getObservabilityWebhookTypeIcon(item.webhook.type)
                : getIssueWebhookProviderIcon(item.webhook.provider)
            }
          />
        )
      },
    }),
    columnHelper.accessor((item) => item.webhook.name, {
      id: 'name',
      meta: { gridTemplate: 'minmax(0, 0.5fr)' },
      cell: ({ getValue }) => (
        <StackedText
          first={getValue()}
          truncate
        />
      ),
    }),
    columnHelper.accessor((item) => item.webhook.url, {
      id: 'url',
      meta: { gridTemplate: 'minmax(0, 1fr)' },
      cell: function Cell({ getValue }) {
        const [showCopy, setShowCopy] = useState(false)

        return (
          <ColUrlWrapper
            onMouseEnter={() => setShowCopy(true)}
            onMouseLeave={() => setShowCopy(false)}
          >
            <span css={TRUNCATE}>{getValue()}</span>
            {showCopy && <CopyButton text={getValue()} />}
          </ColUrlWrapper>
        )
      },
    }),
    columnHelper.accessor((item) => item.kind, {
      id: 'kind',
      meta: { gridTemplate: 'fit-content(130px)' },
      cell: ({ getValue }) => <KindChip kind={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      meta: { gridTemplate: 'fit-content(72px)' },
      cell: function Cell({ row }) {
        return (
          <WebhookActions
            item={row.original}
            refetchIssue={refetchIssue}
            refetchObservability={refetchObservability}
          />
        )
      },
    }),
  ]
}

const ColUrlWrapper = styled.span(({ theme }) => ({
  maxWidth: '100%',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  '> span:first-child': {
    minWidth: 0,
  },
}))

function WebhookActions({
  item,
  refetchIssue,
  refetchObservability,
}: {
  item: WebhookListItem
  refetchIssue?: () => void
  refetchObservability?: () => void
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
        tooltip="Edit webhook"
        icon={<PencilIcon />}
        onClick={() =>
          navigate(
            getWebhooksSettingsEditAbsPath({
              webhookId: item.webhook.id,
            })
          )
        }
      />
      <IconFrame
        clickable
        tooltip="Delete webhook"
        icon={<TrashCanIcon color={theme.colors['icon-danger']} />}
        onClick={() => setDeleting(true)}
      />
      {item.kind === WorkbenchJobActivityType.Observability ? (
        <DeleteObservabilityWebhookModal
          observabilityWebhook={item.webhook}
          open={deleting}
          refetch={refetchObservability}
          onClose={() => setDeleting(false)}
        />
      ) : (
        <DeleteIssueWebhookModal
          issueWebhook={item.webhook}
          open={deleting}
          refetch={refetchIssue}
          onClose={() => setDeleting(false)}
        />
      )}
    </Flex>
  )
}

function KindChip({ kind }: { kind: WebhookListItem['kind'] }) {
  const theme = useTheme()

  const icon = (() => {
    switch (kind) {
      case WorkbenchJobActivityType.Observability:
        return (
          <VisualInspectionIcon
            size={10}
            fullColor={true}
            color={theme.colors['text-xlight']}
          />
        )
      case WorkbenchJobActivityType.Ticketing:
        return (
          <TicketIcon
            size={10}
            fullColor={true}
            color={theme.colors['text-xlight']}
          />
        )
      default:
        return undefined
    }
  })()

  const displayText = (() => {
    switch (kind) {
      case WorkbenchJobActivityType.Observability:
        return 'Observability'
      case WorkbenchJobActivityType.Ticketing:
        return 'Ticketing'
      default:
        return 'Unknown'
    }
  })()

  return (
    <Chip
      size="small"
      fillLevel={1}
      css={{ borderRadius: 20, display: 'flex' }}
      icon={icon}
    >
      <span
        css={{
          color: theme.colors['text-xlight'],
        }}
      >
        {displayText}
      </span>
    </Chip>
  )
}
