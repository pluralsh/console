import { ApolloError } from '@apollo/client'
import { Callout, Flex, SemanticSpacingKey } from '@pluralsh/design-system'
import { HTMLAttributes, ReactNode } from 'react'
import { useTheme } from 'styled-components'

export type GqlErrorType =
  | boolean
  | string
  | ApolloError
  | null
  | undefined
  | Error

export function GqlError({
  header,
  error,
  margin,
  action,
  ...props
}: {
  header?: string | undefined
  error: GqlErrorType
  margin?: SemanticSpacingKey
  action?: ReactNode
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
      <Flex
        direction="column"
        gap="medium"
      >
        {typeof error === 'string'
          ? error
          : typeof error === 'boolean'
            ? ''
            : (error instanceof ApolloError &&
                error.graphQLErrors?.[0]?.message) ||
              error?.message ||
              'Error: check logs for more details'}
        <div css={{ alignSelf: 'flex-end' }}>{action}</div>
      </Flex>
    </Callout>
  )
}
