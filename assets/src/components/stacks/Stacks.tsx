import {
  Breadcrumb,
  ListBox,
  ListBoxItem,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { Key, useMemo, useState } from 'react'

import { STACKS_ABS_PATH } from '../../routes/stacksRoutesConsts'

import { useInfrastructureStacksQuery } from '../../generated/graphql'
import { GqlError } from '../utils/Alert'
import { mapExistingNodes } from '../../utils/graphql'
import { StackedText } from '../utils/table/StackedText'

import { StackTypeIconFrame } from './StackType'

const STACKS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'stacks', url: STACKS_ABS_PATH },
]

export default function Stacks() {
  const theme = useTheme()
  const [selectedKey, setSelectedKey] = useState<Key>('')

  // TODO: Add pagination and filtering.
  const { data, error } = useInfrastructureStacksQuery({
    variables: {},
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })

  useSetBreadcrumbs(STACKS_BASE_CRUMBS)

  const stacks = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks),
    [data?.infrastructureStacks]
  )

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
        padding: theme.spacing.large,
        height: '100%',
      }}
    >
      <ListBox
        selectedKey={selectedKey}
        onSelectionChange={(key) => {
          setSelectedKey(key)
        }}
        extendStyle={{ width: 360 }}
      >
        {stacks.map((stack) => (
          <ListBoxItem
            key={stack.id ?? stack.name}
            label={
              <div css={{ display: 'flex', gap: theme.spacing.small }}>
                <StackTypeIconFrame
                  stackType={stack.type}
                  type="floating"
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
    </div>
  )
}
