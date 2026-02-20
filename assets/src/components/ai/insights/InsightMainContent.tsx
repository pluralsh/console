import { AiSparkleFilledIcon, Markdown } from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import styled from 'styled-components'
import {
  useAIEnabled,
  useLoadingDeploymentSettings,
} from '../../contexts/DeploymentSettingsContext'
import { AIDisabledState, EmptyStateCompact } from '../AIThreads'

export function InsightMainContent({
  text,
  kind,
}: {
  text: Nullable<string>
  kind: Nullable<string>
}) {
  const aiEnabled = useAIEnabled()
  const loading = useLoadingDeploymentSettings()

  if (loading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="100%"
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
