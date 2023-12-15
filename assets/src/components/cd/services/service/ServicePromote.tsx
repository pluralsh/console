import { Button } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useProceedServiceMutation } from 'generated/graphql'

export default function ServicePromote({ id }) {
  const [mutation, { loading, error }] = useProceedServiceMutation({
    variables: { id },
  })

  return (
    <>
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
    </>
  )
}
