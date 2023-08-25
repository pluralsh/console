import { Callout } from '@pluralsh/design-system'

export function GqlError({ header, error }: any) {
  return (
    <Callout
      severity="danger"
      title={header}
    >
      {error?.graphQLErrors[0]?.message}
    </Callout>
  )
}
