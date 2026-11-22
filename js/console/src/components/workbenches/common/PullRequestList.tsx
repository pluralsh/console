import { IconFrame, prettifyRepoUrl } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { PrStatus, PullRequestBasicFragment } from 'generated/graphql'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { PrStatusIcon, WorkbenchPrStatusChip } from './WorkbenchJobPrIcon'

// one row per pull request, open ones first; the title opens the pr, the caption defaults to its repo and age
export function PullRequestList<T extends PullRequestBasicFragment>({
  pullRequests,
  caption = defaultCaption,
  titleTooltip,
}: {
  pullRequests: T[]
  caption?: (pr: T) => ReactNode
  titleTooltip?: (pr: T) => Nullable<string>
}) {
  return (
    <ListSC>
      {sortOpenFirst(pullRequests).map((pr) => (
        <RowSC key={pr.id}>
          <IconFrame
            type="tertiary"
            size="small"
            icon={<PrStatusIcon status={pr.status ?? PrStatus.Open} />}
          />
          <BodySC>
            <TitleSC
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              title={titleTooltip?.(pr) ?? pr.title ?? undefined}
            >
              {pr.title || prettifyRepoUrl(pr.url, true)}
            </TitleSC>
            <CaptionSC $color="text-xlight">{caption(pr)}</CaptionSC>
          </BodySC>
          <WorkbenchPrStatusChip status={pr.status} />
        </RowSC>
      ))}
    </ListSC>
  )
}

export const sortOpenFirst = <
  T extends Pick<PullRequestBasicFragment, 'status'>,
>(
  prs: T[]
) =>
  [...prs].sort(
    (a, b) =>
      Number(b.status === PrStatus.Open) - Number(a.status === PrStatus.Open)
  )

export const withAge = (
  pr: Pick<PullRequestBasicFragment, 'insertedAt'>,
  text: ReactNode
) => (
  <>
    {text}
    {pr.insertedAt ? ` · ${fromNow(pr.insertedAt)}` : ''}
  </>
)

const defaultCaption = (pr: PullRequestBasicFragment) =>
  withAge(pr, prettifyRepoUrl(pr.url, true))

const ListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

const RowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minWidth: 0,
}))

const BodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
})

const TitleSC = styled.a(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': { textDecoration: 'underline' },
}))

const CaptionSC = styled(CaptionP)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})
