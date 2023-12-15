import { Button } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ServicePromotion, useProceedServiceMutation } from 'generated/graphql'
import { useTheme } from 'styled-components'

export default function ServicePromote({ id }) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useProceedServiceMutation({
    variables: { id },
  })

  return (
    <div style={{ display: 'flex', gap: theme.spacing.small }}>
      {error && (
        <GqlError
          header="Failed to promote canary"
          error={error}
        />
      )}
      <Button
        onClick={mutation}
        loading={loading}
      >
        Promote Canary
      </Button>
      <Button
        seconday
        onClick={() =>
          mutation({ variables: { id, promotion: ServicePromotion.Rollback } })
        }
      >
        Rollback Canary
      </Button>
    </div>
  )
}
