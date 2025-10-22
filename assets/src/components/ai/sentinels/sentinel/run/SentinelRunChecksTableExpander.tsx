import { Card, Markdown } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { RawYaml } from 'components/component/ComponentRaw'
import styled, { useTheme } from 'styled-components'
import { deepOmitFalsy } from 'utils/graphql'
import { SentinelCheckWithResult } from './SentinelRun'

export function SentinelRunChecksTableExpander({
  row,
}: {
  row: Row<SentinelCheckWithResult>
}) {
  const { spacing } = useTheme()
  const { check, result } = row.original

  return (
    <WrapperSC>
      {result?.reason && (
        <Card
          fillLevel={1}
          header={{ content: 'reason' }}
          css={{ padding: spacing.medium }}
        >
          <Markdown text={result.reason} />
        </Card>
      )}
      <Card
        fillLevel={1}
        header={{ content: 'check definition' }}
      >
        <RawYaml
          showHeader={false}
          css={{ border: 'none', background: 'transparent' }}
          raw={deepOmitFalsy(check)}
        />
      </Card>
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
