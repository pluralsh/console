import { Button } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ServicePromotion, useProceedServiceMutation } from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'

export default function ServicePromote({ id }) {
  const [rollback, setRollback] = useState(false)
  const theme = useTheme()
  const [mutation, { loading, error }] = useProceedServiceMutation({
    variables: { id },
  })

  return (
    <div
      css={{
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
      <div css={{ display: 'flex', gap: theme.spacing.small }}>
        <Button
          onClick={() => mutation()}
          loading={!rollback && loading}
        >
          Promote
        </Button>
        <Button
          secondary
          loading={rollback && loading}
          onClick={() => {
            setRollback(true)
            mutation({
              variables: { id, promotion: ServicePromotion.Rollback },
            })
          }}
        >
          Rollback
        </Button>
      </div>
    </div>
  )
}
