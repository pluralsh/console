import {
  Breadcrumb,
  ListBox,
  ListBoxItem,
  LoopingLogo,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  Key,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { isEmpty } from 'lodash'

import { Outlet } from 'react-router-dom'

import { STACKS_ABS_PATH } from '../../routes/stacksRoutesConsts'

import {
  InfrastructureStack,
  useInfrastructureStacksQuery,
} from '../../generated/graphql'
import { GqlError } from '../utils/Alert'
import { mapExistingNodes } from '../../utils/graphql'
import { StackedText } from '../utils/table/StackedText'

import { StackTypeIconFrame } from './StackType'

type StacksContextT = {
  stacks: InfrastructureStack[]
}

const StacksContext = createContext<StacksContextT | undefined>(undefined)

export const useStacksContext = () => {
  const ctx = useContext(StacksContext)

  if (!ctx) {
    throw Error('useStacksContext() must be used within a StacksContext')
  }

  return ctx
}

const STACKS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'stacks', url: STACKS_ABS_PATH },
]

export default function Stacks() {
  const theme = useTheme()
  const [stack, setStack] = useState<Key>('')

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

  const context = useMemo(() => ({ stacks }) as StacksContextT, [stacks, stack])

  useEffect(() => {
    if (isEmpty(stack) && !isEmpty(stacks))
      setStack(stacks[0].id ?? stacks[0].name)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStack])

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
        selectedKey={stack}
        onSelectionChange={setStack}
        disallowEmptySelection
        extendStyle={{ width: 360 }}
      >
        {stacks.map((stack) => (
          <ListBoxItem
            key={stack.id ?? stack.name}
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
      <StacksContext.Provider value={context}>
        <Outlet />
      </StacksContext.Provider>
    </div>
  )
}
