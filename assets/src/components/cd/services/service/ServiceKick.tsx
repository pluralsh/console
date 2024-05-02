import { Button, Tooltip } from '@pluralsh/design-system'
import { useSyncCooldown } from 'components/hooks/useSyncCooldown'
import { GqlError } from 'components/utils/Alert'
import { useKickServiceMutation } from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'

export default function ServiceKick({
  id,
  pulledAt,
}: {
  id: string
  pulledAt?: string | null
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useKickServiceMutation({
    variables: { id },
  })
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
      {error && (
        <GqlError
          header="Failed to promote canary"
          error={error}
        />
      )}
      <Tooltip label={<TooltipLabel pulledAt={pulledAt} />}>
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
            : 'Resync service'}
        </Button>
      </Tooltip>
    </div>
  )
}

function TooltipLabel({ pulledAt }: { pulledAt?: string | null }) {
  return (
    <>
      <p>
        Use this to sync this service now instead of in the next poll interval
      </p>
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
