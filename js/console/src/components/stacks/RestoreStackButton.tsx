import { Button, GraphQLToast } from '@pluralsh/design-system'
import { Dispatch, ReactNode } from 'react'
import { useRestoreStackMutation } from '../../generated/graphql.ts'

interface RestoreStackButtonProps {
  id: string
  setShowToast: Dispatch<boolean>
}

export default function RestoreStackButton({
  id,
  setShowToast,
}: RestoreStackButtonProps): ReactNode {
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
      <Button
        loading={loading}
        onClick={() => restore()}
      >
        Restore stack
      </Button>
    </>
  )
}
