import { Card } from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import styled from 'styled-components'
import { ChatSubmitButton } from '../chatbot/input/ChatInput'

export function InfraResearchExampleCard({
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
        <ChatSubmitButton
          as="div"
          bgColor="fill-two"
        />
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
  minWidth: 256,
  maxWidth: 456,
  padding: theme.spacing.medium,
  flex: '1 0 0',
}))

export const exampleCards = [
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
