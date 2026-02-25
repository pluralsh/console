import { AiSparkleFilledIcon, Markdown } from '@pluralsh/design-system'
import { MarkdownSkeleton } from 'components/utils/SkeletonLoaders'
import styled from 'styled-components'
import {
  useAIEnabled,
  useLoadingDeploymentSettings,
} from '../../contexts/DeploymentSettingsContext'
import { AIDisabledState, EmptyStateCompact } from '../AIThreads'

export function InsightMainContent({
  text,
  kind,
  loading,
}: {
  text: Nullable<string>
  kind: Nullable<string>
  loading?: boolean
}) {
  const aiEnabled = useAIEnabled()
  const deploymentSettingsLoading = useLoadingDeploymentSettings()
  const isLoading = deploymentSettingsLoading || (!text && loading)

  if (isLoading)
    return (
      <MarkdownSkeleton
        bright
        padding="medium"
        sections={[5, 3, 6, 2]}
      />
    )

  return (
    <WrapperSC>
      {text ? (
        <Markdown text={text} />
      ) : aiEnabled ? (
        <EmptyStateCompact
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
