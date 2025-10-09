import { ApolloError } from '@apollo/client'
import { Callout } from '@pluralsh/design-system'
import { HTMLAttributes } from 'react'

export type GqlErrorType = boolean | string | ApolloError | null | undefined

export function GqlError({
  header,
  error,
  ...props
}: {
  header?: string | undefined
  error: GqlErrorType
  props?: HTMLAttributes<HTMLDivElement>
}) {
  return (
    <Callout
      severity="danger"
      title={header}
      {...props}
    >
      {typeof error === 'string'
        ? error
        : typeof error === 'boolean'
          ? ''
          : error?.graphQLErrors?.[0]?.message ||
            error?.message ||
            'Error: check logs for more details'}
    </Callout>
  )
}
