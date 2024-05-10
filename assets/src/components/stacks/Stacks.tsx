import {
  ListBox,
  ListBoxItem,
  LoopingLogo,
  Sidecar,
  SidecarItem,
  TreeNavEntry,
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
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'

import { StackTypeIcon, StackTypeIconFrame } from './StackTypeIcon'
import Stack from './Stack'

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

  const breadcrumbs = useMemo(
    () => [
      { label: 'stacks', url: getStacksAbsPath('') },
      { label: stackId, url: getStacksAbsPath(stackId) },
    ],
    [stackId]
  )

  useSetBreadcrumbs(breadcrumbs)

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
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <ResponsiveLayoutSidenavContainer
        width={300}
        overflowY="auto"
      >
        {stacks?.map((stack) => (
          <TreeNavEntry
            key={stack.id ?? ''}
            label={
              <div
                css={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: theme.spacing.small,
                }}
              >
                <StackTypeIconFrame
                  size="small"
                  stackType={stack.type}
                />
                <StackedText
                  first={stack.name}
                  second={stack.repository?.url}
                />
              </div>
            }
            active={stack.id === stackId}
            activeSecondary={false}
            href={getStacksAbsPath(stack.id)}
            desktop
          />
        ))}
        {/* TODO: Load more button */}
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <div css={{ width: RESPONSIVE_LAYOUT_CONTENT_WIDTH }}>
        <Stack stack={stack} />
      </div>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer>
        <Sidecar heading="Stack">
          <SidecarItem heading="Name">{stack?.name}</SidecarItem>
          <SidecarItem heading="ID">{stack?.id}</SidecarItem>
          <SidecarItem heading="Status">
            {stack?.paused ? 'Paused' : 'Active'}
          </SidecarItem>
          <SidecarItem heading="Approval">
            {stack?.approval ? 'Required' : 'Not required'}
          </SidecarItem>
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
    </ResponsiveLayoutPage>
  )
}
