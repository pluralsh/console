import { StackIcon } from '@pluralsh/design-system'
import { usePendingApprovalStacks } from 'components/contexts/PendingApprovalStacksContext'
import { useTheme } from 'styled-components'

export function StacksNavIcon() {
  const theme = useTheme()
  const { count } = usePendingApprovalStacks()

  return (
    <div
      css={{
        position: 'relative',
        display: 'flex',
        flexShrink: 0,
      }}
    >
      <StackIcon />
      {count > 0 && (
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
