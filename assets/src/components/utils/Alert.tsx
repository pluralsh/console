import { ApolloError } from '@apollo/client'
import { Callout, SemanticSpacingKey } from '@pluralsh/design-system'
import { HTMLAttributes } from 'react'
import { useTheme } from 'styled-components'

export type GqlErrorType = boolean | string | ApolloError | null | undefined

export function GqlError({
  header,
  error,
  margin,
  ...props
}: {
  header?: string | undefined
  error: GqlErrorType
  margin?: SemanticSpacingKey
  props?: HTMLAttributes<HTMLDivElement>
}) {
  const { spacing } = useTheme()
  return (
    <Callout
      severity="danger"
      title={header}
      css={{ margin: margin ? spacing[margin] : undefined }}
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
