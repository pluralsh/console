import { Card, EmptyState, Flex, Markdown } from '@pluralsh/design-system'
import { OverlineH3 } from 'components/utils/typography/Text'
import { InfraResearchAnalysisFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import styled, { useTheme } from 'styled-components'

export function InfraResearchAnalysis({
  analysis,
}: {
  analysis: Nullable<InfraResearchAnalysisFragment>
}) {
  const { spacing } = useTheme()

  if (!analysis) return <EmptyState message="No analysis found." />

  return (
    <WrapperSC>
      {!isEmpty(analysis.notes) && (
        <Flex
          direction="column"
          gap="xxsmall"
        >
          <OverlineH3 $color="text-light">Notes</OverlineH3>
          <Card
            css={{ padding: spacing.medium, paddingTop: 0, paddingLeft: 0 }}
          >
            <Markdown
              text={
                analysis.notes?.map((note) => note && `- ${note}`).join('\n') ??
                ''
              }
            />
          </Card>
        </Flex>
      )}
      {analysis.summary && (
        <Flex
          direction="column"
          gap="xxsmall"
        >
          <OverlineH3 $color="text-light">Summary</OverlineH3>
          <Card css={{ padding: spacing.medium }}>
            <Markdown text={analysis.summary} />
          </Card>
        </Flex>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))
