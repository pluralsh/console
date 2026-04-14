import {
  ArrowTopRightIcon,
  Card,
  IconFrame,
  prettifyRepoUrl,
  PrOpenIcon,
} from '@pluralsh/design-system'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import { PullRequestBasicFragment } from 'generated/graphql'

import styled from 'styled-components'

export function WorkbenchJobPrs({ prs }: { prs: PullRequestBasicFragment[] }) {
  return (
    <>
      <StackedText
        icon={
          <IconFrame
            circle
            type="secondary"
            icon={<PrOpenIcon />}
          />
        }
        first={<Body2BoldP>Generated pull requests</Body2BoldP>}
      />
      {prs.map((pr) => (
        <WrapperCardSC
          key={pr.id}
          fillLevel={0}
          clickable
          forwardedAs="a"
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <StackedText
            truncate
            first={
              <span id={`link-${pr.id}`}>{prettifyRepoUrl(pr.url, true)}</span>
            }
            firstPartialType="body2"
            firstColor="text"
            second={pr.title}
          />
          <PrStatusChip status={pr.status} />
          <IconFrame
            size="small"
            tooltip="View PR"
            icon={<ArrowTopRightIcon color="icon-light" />}
          />
        </WrapperCardSC>
      ))}
    </>
  )
}

const WrapperCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  '&:hover span[id^="link-"]': { textDecoration: 'underline' },
}))
