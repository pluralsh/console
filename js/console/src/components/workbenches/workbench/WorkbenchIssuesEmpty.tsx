import { Button, Flex } from '@pluralsh/design-system'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import styled from 'styled-components'
import { IssueFilterEmptyKind } from './workbenchIssuesDisplay'

const EMPTY_COPY: Record<
  IssueFilterEmptyKind,
  { message: string; description: string }
> = {
  sources: {
    message: 'No source selected',
    description: 'It looks like there are no sources selected.',
  },
  statuses: {
    message: 'No statuses selected',
    description: 'It looks like there are no status selected.',
  },
}

export function WorkbenchIssuesFilterEmpty({
  kind,
  onReset,
}: {
  kind: IssueFilterEmptyKind
  onReset: () => void
}) {
  const { message, description } = EMPTY_COPY[kind]

  return (
    <WrapperSC>
      <CopySC>
        <Body1BoldP css={{ margin: 0 }}>{message}</Body1BoldP>
        <Body2P
          $color="text-xlight"
          css={{ margin: 0 }}
        >
          {description}
        </Body2P>
      </CopySC>
      <Button
        small
        onClick={onReset}
      >
        Reset filters
      </Button>
    </WrapperSC>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  minHeight: 160,
}))

const CopySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))
