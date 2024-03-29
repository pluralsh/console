import { Button, Tooltip } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useKickServiceMutation } from 'generated/graphql'
import { useTheme } from 'styled-components'

export default function ServiceKick({ id }) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useKickServiceMutation({
    variables: { id },
  })

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
      <Tooltip label="Use this to sync this service now instead of in the next poll interval">
        <Button
          onClick={mutation}
          loading={loading}
        >
          Resync service
        </Button>
      </Tooltip>
    </div>
  )
}
