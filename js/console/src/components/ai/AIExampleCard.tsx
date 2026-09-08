import { Card } from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import styled from 'styled-components'

export function AIExampleCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <CardSC>
      <StretchedFlex>
        <Body2BoldP $color="text">{title}</Body2BoldP>
        {/* <ChatSubmitButton
          as="div"
          bgColor="fill-two"
        /> */}
      </StretchedFlex>
      <Body2P $color="text-light">{description}</Body2P>
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  minWidth: 225,
  maxWidth: 456,
  padding: theme.spacing.medium,
  flex: '1 0 0',
}))

export const infraResearchExamples = [
  {
    title: 'Make diagrams',
    description: 'Visualize your infrastructure using Mermaid diagrams',
  },
  {
    title: 'Deep dive on architecture',
    description:
      'Understand your infrastructure dependencies and relationships',
  },
  {
    title: 'Learn about your cluster',
    description: 'Learn about your clusters and their components',
  },
] as const

export const agentRunExamples = [
  {
    title: 'Double the size of Grafana DB',
    description: 'Double the size of Grafana DB',
  },
  {
    title: 'Use m5.large node type',
    description: 'Use m5.large node type for the dem-dev cluster',
  },
  {
    title: 'Add a node label selector',
    description:
      'Add a “platform.plural.sh/role: metrics” node label selector to the Grafana DB',
  },
] as const
