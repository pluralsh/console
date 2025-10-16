import { Card, Markdown } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { RawYaml } from 'components/component/ComponentRaw'
import { SentinelFragment, SentinelRunResultFragment } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { deepOmitFalsy } from 'utils/graphql'

export function SentinelRunChecksTableExpander({
  row,
  parentSentinel,
}: {
  row: Row<SentinelRunResultFragment>
  parentSentinel: Nullable<SentinelFragment>
}) {
  const { spacing } = useTheme()
  const result = row.original
  const checkDef = parentSentinel?.checks?.find(
    (check) => check?.name === result.name
  )

  return (
    <WrapperSC>
      {result.reason && (
        <Card
          fillLevel={1}
          header={{ content: 'reason' }}
          css={{ padding: spacing.medium }}
        >
          <Markdown text={result.reason} />
        </Card>
      )}
      {checkDef && (
        <Card
          fillLevel={1}
          header={{ content: 'check definition' }}
        >
          <RawYaml
            showHeader={false}
            css={{ border: 'none', background: 'transparent' }}
            raw={deepOmitFalsy(checkDef)}
          />
        </Card>
      )}
    </WrapperSC>
  )
}
const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: `${theme.spacing.large}px ${theme.spacing.medium}px`,
  background: theme.colors['fill-zero'],
  borderTop: theme.borders['fill-one'],
}))
