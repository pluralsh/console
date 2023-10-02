import { ApolloError } from '@apollo/client'
import { Callout } from '@pluralsh/design-system'

export function GqlError({
  header,
  error,
}: {
  header?: string | undefined
  error: boolean | string | ApolloError | undefined
}) {
  return (
    <Callout
      severity="danger"
      title={header}
    >
      {typeof error === 'string'
        ? error
        : typeof error === 'boolean'
        ? ''
        : error?.graphQLErrors?.[0]?.message || ''}
    </Callout>
  )
}
