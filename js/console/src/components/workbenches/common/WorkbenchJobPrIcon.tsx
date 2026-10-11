import {
  Chip,
  Flex,
  IconFrame,
  PrClosedIcon,
  PrMergedIcon,
  PrOpenIcon,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { PrStatus } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

const PR_STATUS_LABEL: Record<PrStatus, string> = {
  [PrStatus.Open]: 'Open',
  [PrStatus.Merged]: 'Merged',
  [PrStatus.Closed]: 'Closed',
}

type PullRequests = Nullable<
  ReadonlyArray<
    Nullable<{
      status?: Nullable<PrStatus>
      url?: Nullable<string>
      title?: Nullable<string>
    }>
  >
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

// A job's PRs as a chip: a single one by its number, opening it; several by
// their count, titled in a tooltip. Nothing renders without any.
export function WorkbenchJobPrChip({
  pullRequests,
}: {
  pullRequests?: PullRequests
}) {
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
    <WrapWithIf
      condition={!single?.url}
      wrapper={
        <Tooltip
          placement="top"
          label={prs.map((pr) => pr.title || pr.url).join(', ')}
        />
      }
    >
      <Chip
        size="small"
        clickable={!!single?.url}
        {...(single?.url && {
          onClick: (e) => {
            e.stopPropagation()
            window.open(single.url ?? '', '_blank', 'noopener,noreferrer')
          },
        })}
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
    </WrapWithIf>
  )
}
