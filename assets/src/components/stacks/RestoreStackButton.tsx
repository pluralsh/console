import { Button, GraphQLToast, Toast } from '@pluralsh/design-system'
import { ReactNode, useState } from 'react'
import { useRestoreStackMutation } from '../../generated/graphql.ts'

interface RestoreStackButtonProps {
  id: string
  name: string
}

export default function RestoreStackButton({
  id,
  name,
}: RestoreStackButtonProps): ReactNode {
  const [showToast, setShowToast] = useState(false)
  const [restore, { error, loading }] = useRestoreStackMutation({
    variables: { id },
    onCompleted: () => setShowToast(true),
    refetchQueries: ['Stacks', 'Stack'],
    awaitRefetchQueries: true,
  })

  return (
    <>
      {error && (
        <GraphQLToast
          error={{ graphQLErrors: [...(error?.graphQLErrors ?? [])] }}
          header="Error (500)"
          margin="xlarge"
          marginVertical="xxxlarge"
        />
      )}
      {showToast && (
        <Toast
          position={'bottom'}
          onClose={() => setShowToast(false)}
          closeTimeout={5000}
          margin="large"
          severity="success"
        >
          Stack &quot;{name}&quot; restored.
        </Toast>
      )}
      <Button
        loading={loading}
        onClick={restore}
      >
        Restore stack
      </Button>
    </>
  )
}
