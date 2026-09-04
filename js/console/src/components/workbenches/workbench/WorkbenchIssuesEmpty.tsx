import { Button, Card } from '@pluralsh/design-system'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import styled from 'styled-components'
import { IssueFilterEmptyKind } from './workbenchIssuesDisplay'

export function WorkbenchIssuesFilterEmpty({
  kind,
  onReset,
}: {
  kind: IssueFilterEmptyKind
  onReset: () => void
}) {
  return (
    <WrapperSC fillLevel={1}>
      <CopySC>
        <Body1BoldP css={{ margin: 0 }}>No {kind} selected</Body1BoldP>
        <Body2P
          $color="text-light"
          css={{ margin: 0 }}
        >
          It looks like there are no {kind} selected.
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

const WrapperSC = styled(Card)(({ theme }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  height: 540,
  maxHeight: '100%',
  width: '100%',
  minHeight: 160,
  padding: `${theme.spacing.xlarge}px ${theme.spacing.medium}px`,
}))

const CopySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))
