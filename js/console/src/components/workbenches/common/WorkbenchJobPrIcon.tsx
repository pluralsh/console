import {
  IconFrame,
  PrClosedIcon,
  PrMergedIcon,
  PrOpenIcon,
} from '@pluralsh/design-system'
import { PrStatus } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

const PR_STATUS_LABEL: Record<PrStatus, string> = {
  [PrStatus.Open]: 'Open',
  [PrStatus.Merged]: 'Merged',
  [PrStatus.Closed]: 'Closed',
}

export function WorkbenchJobPrIcon({
  pullRequests,
}: {
  pullRequests?: Nullable<
    ReadonlyArray<Nullable<{ status?: Nullable<PrStatus> }>>
  >
}) {
  const theme = useTheme()
  const prs = pullRequests?.filter(isNonNullable) ?? []
  if (prs.length === 0)
    return (
      <span
        aria-hidden
        css={{ width: 24, flexShrink: 0 }}
      />
    )

  const status = prs.some((pr) => pr.status === PrStatus.Merged)
    ? PrStatus.Merged
    : prs.some((pr) => pr.status === PrStatus.Open)
      ? PrStatus.Open
      : prs.some((pr) => pr.status === PrStatus.Closed)
        ? PrStatus.Closed
        : PrStatus.Open
  const icon =
    status === PrStatus.Merged ? (
      <PrMergedIcon color={theme.colors['code-block-purple']} />
    ) : status === PrStatus.Closed ? (
      <PrClosedIcon color="icon-danger" />
    ) : (
      <PrOpenIcon color="icon-success" />
    )

  return (
    <IconFrame
      type="tertiary"
      size="small"
      textValue={`${PR_STATUS_LABEL[status]} pull request`}
      icon={icon}
    />
  )
}
