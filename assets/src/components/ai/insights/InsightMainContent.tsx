import { AiSparkleFilledIcon, Markdown } from '@pluralsh/design-system'
import styled from 'styled-components'
import { useAIEnabled } from '../../contexts/DeploymentSettingsContext'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { AIDisabledState, AIEmptyState } from '../AI'

export function InsightMainContent({
  text,
  kind,
}: {
  text: Nullable<string>
  kind: Nullable<string>
}) {
  const aiEnabled = useAIEnabled()

  if (aiEnabled === undefined) return <LoadingIndicator />

  return (
    <WrapperSC>
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
    </WrapperSC>
  )
}

const cssProps = {
  background: 'transparent',
  border: 'none',
  justifyContent: 'start',
}

const WrapperSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
  overflow: 'auto',
}))
