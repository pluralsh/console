import {
  Button,
  GraphQLToast,
  IconFrame,
  ReloadIcon,
  Spinner,
  Tooltip,
} from '@pluralsh/design-system'
import { useSyncCooldown } from 'components/hooks/useSyncCooldown'
import { useCallback, useState } from 'react'
import { ButtonProps } from 'honorable'

export default function KickButton({
  pulledAt,
  kickMutationHook,
  message,
  icon = false,
  tooltipMessage,
  variables,
  ...props
}: {
  pulledAt?: string | null
  kickMutationHook: any
  message?: string
  icon?: boolean
  tooltipMessage: string
  variables: any
} & ButtonProps) {
  const [mutation, { loading, error }] = kickMutationHook({ variables })
  const [lastSync, setLastSync] = useState<Date | undefined>(undefined)
  const { disabled, secondsRemaining } = useSyncCooldown(lastSync, 5 * 1000)
  const onClick = useCallback(() => {
    setLastSync(new Date())
    mutation()
  }, [mutation])

  return (
    <div>
      {error && disabled && (
        <GraphQLToast
          error={{ ...error }}
          header="Error (500)"
          margin="xlarge"
          marginVertical="xxxlarge"
        />
      )}
      <Tooltip
        label={
          <TooltipLabel
            pulledAt={pulledAt}
            message={tooltipMessage}
          />
        }
      >
        {icon ? (
          <IconFrame
            icon={
              loading ? (
                <Spinner />
              ) : (
                <ReloadIcon color={disabled ? 'icon-disabled' : undefined} />
              )
            }
            type="secondary"
            disabled={disabled}
            clickable
            onClick={onClick}
          />
        ) : (
          <Button
            disabled={disabled}
            onClick={onClick}
            loading={loading}
            {...props}
          >
            {message} {disabled && `(${secondsRemaining})`}
          </Button>
        )}
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
