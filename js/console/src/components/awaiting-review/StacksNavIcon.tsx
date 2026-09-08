import { StackIcon } from '@pluralsh/design-system'
import { useAwaitingReview } from 'components/contexts/AwaitingReviewContext'
import { useTheme } from 'styled-components'

export function StacksNavIcon() {
  const theme = useTheme()
  const { stacks } = useAwaitingReview()

  return (
    <div
      css={{
        position: 'relative',
        display: 'flex',
        flexShrink: 0,
      }}
    >
      <StackIcon />
      {stacks.length > 0 && (
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
