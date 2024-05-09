import { InfrastructureStackFragment } from '../../generated/graphql'

export default function Stack({
  stack,
}: {
  stack?: Nullable<InfrastructureStackFragment>
}) {
  return stack?.name
}
