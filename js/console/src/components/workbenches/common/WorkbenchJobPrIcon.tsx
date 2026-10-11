import {
  Chip,
  ChipProps,
  Flex,
  IconFrame,
  Modal,
  PrClosedIcon,
  PrMergedIcon,
  PrOpenIcon,
  Table,
} from '@pluralsh/design-system'
import {
  ColInsertedAt,
  ColLinkout,
  ColStatus,
  ColTitle,
} from 'components/self-service/pr/queue/PrQueueColumns'
import { PrStatus, PullRequestBasicFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

const PR_STATUS_LABEL: Record<PrStatus, string> = {
  [PrStatus.Open]: 'Open',
  [PrStatus.Merged]: 'Merged',
  [PrStatus.Closed]: 'Closed',
}

type PullRequests = Nullable<
  ReadonlyArray<Nullable<{ status?: Nullable<PrStatus> }>>
>

// the most advanced status among a job's PRs
function jobPrStatus(prs: ReadonlyArray<{ status?: Nullable<PrStatus> }>) {
  return prs.some((pr) => pr.status === PrStatus.Merged)
    ? PrStatus.Merged
    : prs.some((pr) => pr.status === PrStatus.Open)
      ? PrStatus.Open
      : prs.some((pr) => pr.status === PrStatus.Closed)
        ? PrStatus.Closed
        : PrStatus.Open
}

function PrStatusIcon({ status, size }: { status: PrStatus; size?: number }) {
  const theme = useTheme()

  return status === PrStatus.Merged ? (
    <PrMergedIcon
      size={size}
      color={theme.colors['code-block-purple']}
    />
  ) : status === PrStatus.Closed ? (
    <PrClosedIcon
      size={size}
      color="icon-danger"
    />
  ) : (
    <PrOpenIcon
      size={size}
      color="icon-success"
    />
  )
}

export function WorkbenchJobPrIcon({
  pullRequests,
}: {
  pullRequests?: PullRequests
}) {
  const prs = pullRequests?.filter(isNonNullable) ?? []
  if (prs.length === 0)
    return (
      <span
        aria-hidden
        css={{ width: 24, flexShrink: 0 }}
      />
    )

  const status = jobPrStatus(prs)

  return (
    <IconFrame
      type="tertiary"
      size="small"
      textValue={`${PR_STATUS_LABEL[status]} pull request`}
      icon={<PrStatusIcon status={status} />}
    />
  )
}

const PR_TABLE_COLUMNS = [ColTitle, ColStatus, ColInsertedAt, ColLinkout]

// A job's PRs as a chip: a single one by its number, opening it; several by
// their count, listed in a modal. Nothing renders without any.
export function WorkbenchJobPrChip({
  pullRequests,
  fillLevel,
}: {
  pullRequests?: Nullable<ReadonlyArray<Nullable<PullRequestBasicFragment>>>
  fillLevel?: ChipProps['fillLevel']
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const prs = pullRequests?.filter(isNonNullable) ?? []
  if (isEmpty(prs)) return null

  const single = prs.length === 1 ? prs[0] : undefined
  const singleNumber = single?.url?.match(
    /\/(?:pull|pulls|merge_requests)\/(\d+)/
  )?.[1]
  const label = single
    ? singleNumber
      ? `#${singleNumber}`
      : 'PR'
    : `${prs.length} PRs`

  return (
    <>
      <Chip
        size="small"
        clickable
        fillLevel={fillLevel}
        tooltip={single ? single.title || single.url : 'View pull requests'}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (single) window.open(single.url, '_blank', 'noopener,noreferrer')
          else setModalOpen(true)
        }}
      >
        <Flex
          gap="xsmall"
          align="center"
        >
          <PrStatusIcon
            status={jobPrStatus(prs)}
            size={12}
          />
          <span css={{ whiteSpace: 'nowrap' }}>{label}</span>
        </Flex>
      </Chip>
      {!single && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          header="Pull requests"
          size="auto"
        >
          <Table
            data={prs.map((pr) => ({ node: pr }))}
            columns={PR_TABLE_COLUMNS}
          />
        </Modal>
      )}
    </>
  )
}
