import { AiSparkleFilledIcon, Card, Markdown } from '@pluralsh/design-system'
import styled from 'styled-components'
import { useAIEnabled } from '../contexts/DeploymentSettingsContext.tsx'
import { AIDisabledState, AIEmptyState } from './AI.tsx'

const cssProps = {
  background: 'transparent',
  border: 'none',
  justifyContent: 'start',
}

export const InsightDisplay = ({
  text,
  kind = 'resource',
}: {
  text: Nullable<string>
  kind: Nullable<string>
}) => {
  const aiEnabled = useAIEnabled()

  return (
    <InsightWrapperCardSC>
      {text ? (
        <Markdown text={text} />
      ) : aiEnabled ? (
        <AIEmptyState
          cssProps={cssProps}
          icon={
            <AiSparkleFilledIcon
              color="icon-primary"
              size={24}
            />
          }
          message="No insights yet"
          description={`This ${kind} does not have any insights yet. Check back later to see if there are any.`}
        />
      ) : (
        <AIDisabledState cssProps={cssProps} />
      )}
    </InsightWrapperCardSC>
  )
}

const InsightWrapperCardSC = styled(Card)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing.medium,
  overflow: 'auto',
}))
