import {
  ArrowTopRightIcon,
  DocumentIcon,
  GitHubLogoIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { PullRequestEvidenceFragment } from 'generated/graphql'
import styled from 'styled-components'
import { getURLPath } from 'utils/url'
import { EvidenceWrapperSC } from './LogsEvidencePanel'

export function PrEvidencePanel({
  prs,
  setSelectedPr,
}: {
  prs: PullRequestEvidenceFragment[]
  setSelectedPr: (pr: PullRequestEvidenceFragment) => void
}) {
  return (
    <EvidenceWrapperSC>
      {prs.map((pr, i) => (
        <PrEvidenceLineSC key={i}>
          <IconFrame
            type="floating"
            background="fill-three"
            css={{ flexShrink: 0 }}
            icon={<GitHubLogoIcon color="icon-light" />}
          />
          <StackedText
            truncate
            first={pr.filename}
            firstColor="text"
            second={getURLPath(pr.url)}
            css={{ flex: 1 }}
          />
          <IconFrame
            clickable
            as="a"
            href={pr.url ?? ''}
            rel="noreferrer"
            target="_blank"
            style={{ flexShrink: 0 }}
            tooltip="View pull request"
            icon={<ArrowTopRightIcon css={{ '& svg': { width: 20 } }} />}
          />
          <IconFrame
            clickable
            tooltip="View file diff"
            style={{ flexShrink: 0 }}
            icon={<DocumentIcon css={{ '& svg': { width: 20 } }} />}
            onClick={() => setSelectedPr(pr)}
          />
        </PrEvidenceLineSC>
      ))}
    </EvidenceWrapperSC>
  )
}

const PrEvidenceLineSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  paddingRight: theme.spacing.small,
  borderBottom: theme.borders.input,
}))
