import { Button, Tooltip } from '@pluralsh/design-system'
import { useSyncCooldown } from 'components/hooks/useSyncCooldown'
import { GqlError } from 'components/utils/Alert'
import { useState } from 'react'
import { useTheme } from 'styled-components'

export default function KickButton({
  pulledAt,
  kickMutationHook,
  message,
  tooltipMessage,
  variables,
}: {
  pulledAt?: string | null
  kickMutationHook: any
  message: string
  tooltipMessage: string
  variables: any
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = kickMutationHook({ variables })
  const [buttonClicked, setButtonClicked] = useState(false)

  const lastPullPlus15 =
    typeof pulledAt === 'string'
      ? new Date(new Date(pulledAt).getTime() + 15 * 1000)
      : null
  const { disabled, secondsRemaining } = useSyncCooldown(lastPullPlus15)

  return (
    <div
      style={{
        display: 'flex',
        gap: theme.spacing.small,
        flexDirection: 'column',
      }}
    >
      {error && <GqlError error={error} />}
      <Tooltip
        label={
          <TooltipLabel
            pulledAt={pulledAt}
            message={tooltipMessage}
          />
        }
      >
        <Button
          disabled={disabled && buttonClicked}
          onClick={() => {
            setButtonClicked(true)
            mutation()
          }}
          loading={loading}
        >
          {disabled && buttonClicked
            ? `Resync cooldown ${secondsRemaining}`
            : message}
        </Button>
      </Tooltip>
    </div>
  )
}

function TooltipLabel({
  pulledAt,
  message,
}: {
  pulledAt?: string | null
  message?: string
}) {
  return (
    <>
      <p>{message}</p>
      {pulledAt && (
        <p>
          Last synced:{' '}
          {new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
          }).format(new Date(pulledAt))}
        </p>
      )}
    </>
  )
}
