import {
  Breadcrumb,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { STACKS_ABS_PATH } from '../../routes/stacksRoutesConsts'

import { useInfrastructureStacksQuery } from '../../generated/graphql'
import { GqlError } from '../utils/Alert'

const BACKUPS_OBJECT_STORES_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'stacks', url: STACKS_ABS_PATH },
]

export default function InfrastructureStacks() {
  const theme = useTheme()

  // TODO: Add pagination and filtering.
  const { data, error } = useInfrastructureStacksQuery({
    variables: {},
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })

  useSetBreadcrumbs(BACKUPS_OBJECT_STORES_BASE_CRUMBS)

  if (error) {
    return <GqlError error={error} />
  }

  if (!data) {
    return <LoopingLogo />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      {JSON.stringify(data?.infrastructureStacks?.edges)}
    </div>
  )
}
