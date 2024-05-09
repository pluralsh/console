import {
  Breadcrumb,
  ListBox,
  ListBoxItem,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useEffect, useMemo } from 'react'
import { isEmpty } from 'lodash'
import { useNavigate, useParams } from 'react-router-dom'

import {
  STACKS_ABS_PATH,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts'

import { GqlError } from '../utils/Alert'
import { mapExistingNodes } from '../../utils/graphql'
import { StackedText } from '../utils/table/StackedText'

import { useStacksQuery } from '../../generated/graphql'

import { StackTypeIconFrame } from './StackType'
import Stack from './Stack'

const STACKS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'stacks', url: STACKS_ABS_PATH },
]

export default function Stacks() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { stackId = '' } = useParams()

  // TODO: Add pagination and filtering.
  const { data, error } = useStacksQuery({
    variables: {},
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })

  useSetBreadcrumbs(STACKS_BASE_CRUMBS)

  const stacks = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks),
    [data?.infrastructureStacks]
  )

  const stack = useMemo(
    () => stacks.find(({ id }) => id === stackId),
    [stackId, stacks]
  )

  useEffect(() => {
    if (!isEmpty(stacks) && !stackId) navigate(getStacksAbsPath(stacks[0].id))
  }, [stacks, stackId, navigate])

  if (error)
    return (
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load stacks"
          error={error}
        />
      </div>
    )

  if (!data) {
    return <LoopingLogo />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'row',
        gap: theme.spacing.small,
        padding: theme.spacing.large,
        height: '100%',
      }}
    >
      <ListBox
        selectedKey={stackId}
        onSelectionChange={(key) => navigate(getStacksAbsPath(key as string))}
        disallowEmptySelection
        extendStyle={{ width: 360 }}
      >
        {/* TODO: Filter stacks without IDs. */}
        {stacks.map((stack) => (
          <ListBoxItem
            key={stack.id ?? ''}
            label={
              <div css={{ display: 'flex', gap: theme.spacing.small }}>
                <StackTypeIconFrame
                  stackType={stack.type}
                  type="secondary"
                />
                <StackedText
                  first={stack.name}
                  second={stack.repository?.url}
                />
              </div>
            }
            textValue={stack.name}
          />
        ))}
      </ListBox>
      <Stack stack={stack} />
    </div>
  )
}
