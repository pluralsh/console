import {
  Breadcrumb,
  ListBox,
  ListBoxItem,
  LoopingLogo,
  Sidecar,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useEffect, useMemo } from 'react'
import { isEmpty } from 'lodash'
import { useNavigate, useParams } from 'react-router-dom'

import capitalize from 'lodash/capitalize'

import {
  STACKS_ABS_PATH,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts'
import { GqlError } from '../utils/Alert'
import { mapExistingNodes } from '../../utils/graphql'
import { StackedText } from '../utils/table/StackedText'
import { useStacksQuery } from '../../generated/graphql'
import { RESPONSIVE_LAYOUT_CONTENT_WIDTH } from '../utils/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'

import { ResponsiveLayoutSpacer } from '../utils/layout/ResponsiveLayoutSpacer'

import { ClusterProviderIcon } from '../utils/Provider'

import { StackTypeIcon, StackTypeIconFrame } from './StackTypeIcon'
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
        extendStyle={{
          borderColor: theme.colors.border,
          backgroundColor: theme.colors['fill-one'],
          width: 400,
        }}
      >
        {stacks.map((stack) => (
          <ListBoxItem
            key={stack.id ?? ''}
            label={
              <div css={{ display: 'flex', gap: theme.spacing.small }}>
                <StackTypeIconFrame stackType={stack.type} />
                <StackedText
                  first={stack.name}
                  second={stack.repository?.url}
                />
              </div>
            }
            textValue={stack.name}
            css={{
              borderColor: theme.colors.border,
              '&:hover': {
                backgroundColor:
                  theme.mode === 'light'
                    ? theme.colors['fill-zero-hover']
                    : theme.colors['fill-one-hover'],
              },
            }}
          />
        ))}
      </ListBox>
      <ResponsiveLayoutSpacer />
      <div css={{ width: RESPONSIVE_LAYOUT_CONTENT_WIDTH }}>
        <Stack stack={stack} />
      </div>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer>
        <Sidecar heading="Stack">
          <SidecarItem heading="Name">{stack?.name}</SidecarItem>
          <SidecarItem heading="ID">{stack?.id}</SidecarItem>
          <SidecarItem heading="Type">
            <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
              <StackTypeIcon
                size={16}
                stackType={stack?.type}
              />
              {capitalize(stack?.type)}
            </div>
          </SidecarItem>
          {stack?.configuration?.image && (
            <SidecarItem heading="Image">
              {stack?.configuration?.image}
            </SidecarItem>
          )}
          <SidecarItem heading="Version">
            {stack?.configuration?.version}
          </SidecarItem>
          <SidecarItem heading="Repository">
            {stack?.repository?.url}
          </SidecarItem>
          <SidecarItem heading="Ref">{stack?.git?.ref}</SidecarItem>
          <SidecarItem heading="Folder">{stack?.git?.folder}</SidecarItem>
          <SidecarItem heading="Cluster">
            <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
              <ClusterProviderIcon
                cluster={stack?.cluster}
                size={16}
              />
              {stack?.cluster?.name}
            </div>
          </SidecarItem>
        </Sidecar>
      </ResponsiveLayoutSidecarContainer>
    </div>
  )
}
