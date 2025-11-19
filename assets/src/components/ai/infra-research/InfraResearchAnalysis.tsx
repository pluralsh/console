import { Card, EmptyState, Flex, Markdown } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { isEmpty } from 'lodash'
import { useOutletContext } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { InfraResearchContextType } from './InfraResearch'

export function InfraResearchAnalysis() {
  const { spacing } = useTheme()
  const { infraResearch } = useOutletContext<InfraResearchContextType>()
  const analysis = infraResearch?.analysis

  if (!analysis) return <EmptyState message="No analysis found." />

  return (
    <WrapperSC>
      {analysis.summary && (
        <Flex
          direction="column"
          gap="small"
        >
          <Overline>Summary</Overline>
          <Card css={{ padding: spacing.medium }}>
            <Markdown text={analysis.summary} />
          </Card>
        </Flex>
      )}
      {!isEmpty(analysis.notes) && (
        <Flex
          direction="column"
          gap="small"
        >
          <Overline>Notes</Overline>
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
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  overflow: 'auto',
}))
