import { AiSparkleOutlineIcon } from '@pluralsh/design-system'
import { useAwaitingReview } from 'components/contexts/AwaitingReviewContext'
import { useTheme } from 'styled-components'

export function AINavIcon() {
  const theme = useTheme()
  const { agentRuns } = useAwaitingReview()

  return (
    <div
      css={{
        position: 'relative',
        display: 'flex',
        flexShrink: 0,
      }}
    >
      <AiSparkleOutlineIcon />
      {agentRuns.length > 0 && (
        <div
          css={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: theme.colors.yellow[300],
          }}
        />
      )}
    </div>
  )
}
