import { Button, Callout, Flex } from '@pluralsh/design-system'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  DevboxInstanceFragment,
  useRebaseDevboxInstanceMutation,
} from 'generated/graphql'
import { useEffect, useState } from 'react'
import { formatDateTime } from 'utils/datetime'
import {
  BOOT_SCRIPT_HINT,
  canUpdate,
  deadlineText,
  isUpdating,
  UPDATE_KEEPS,
  UPDATE_LOSES,
} from './devboxUpdates'

// An admin forced an update of the box: the instance restarts at the deadline whatever it is doing, so its
// users are told when, what they lose, and can take the restart at a moment of their choosing.
export function DevboxUpdateNotice({
  instance,
}: {
  instance: DevboxInstanceFragment
}) {
  const { popToast } = useSimpleToast()
  const deadline = instance.updateDeadlineAt
  const now = useNow(!!deadline)
  const [update, { loading }] = useRebaseDevboxInstanceMutation({
    variables: { id: instance.id },
    onError: (e) => popToast({ content: e.message, severity: 'danger' }),
  })
  if (!deadline || !instance.outdated) return null

  const reason = instance.updateCampaign?.reason
  return (
    <Callout
      severity="warning"
      title={`This instance restarts for a required update ${deadlineText(deadline, now)}`}
    >
      <Flex
        direction="column"
        gap="small"
      >
        <span>
          {reason ? `${reason}. ` : ''}
          At {formatDateTime(deadline)} it restarts on the box&apos;s current
          version. {UPDATE_KEEPS} {UPDATE_LOSES} {BOOT_SCRIPT_HINT}
        </span>
        <Flex>
          <Button
            small
            secondary
            loading={loading || isUpdating(instance)}
            disabled={!canUpdate(instance)}
            onClick={() => update()}
          >
            Update now
          </Button>
        </Flex>
      </Flex>
    </Callout>
  )
}

// the current time, refreshed while a deadline is counting down
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(timer)
  }, [active])
  return now
}
