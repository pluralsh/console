import {
  ListBoxFooterPlus,
  ListBoxItem,
  LoopingLogo,
  Select,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import React, { useEffect, useMemo } from 'react'
import { isEmpty } from 'lodash'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import capitalize from 'lodash/capitalize'

import moment from 'moment'

import {
  STACK_CONFIG_REL_PATH,
  STACK_ENV_REL_PATH,
  STACK_JOB_REL_PATH,
  STACK_REPO_REL_PATH,
  STACK_RUNS_REL_PATH,
  getStacksAbsPath,
} from '../../../routes/stacksRoutesConsts'
import { GqlError } from '../../utils/Alert'
import { mapExistingNodes } from '../../../utils/graphql'
import { StackFragment, useStacksQuery } from '../../../generated/graphql'
import { RESPONSIVE_LAYOUT_CONTENT_WIDTH } from '../../utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from '../../utils/layout/ResponsiveLayoutSpacer'
import { ClusterProviderIcon } from '../../utils/Provider'
import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../../utils/layout/ResponsiveLayoutSidenavContainer'

import { StackTypeIcon } from '../common/StackTypeIcon'

import StackStatusChip from '../common/StackStatusChip'

import { useFetchPaginatedData } from '../../cd/utils/useFetchPaginatedData'

import { SideNavEntries } from '../../layout/SideNavEntries'

import StackDelete from './StackDelete'

const QUERY_PAGE_SIZE = 100

const DIRECTORY = [
  { path: STACK_RUNS_REL_PATH, label: 'Runs' },
  { path: STACK_CONFIG_REL_PATH, label: 'Configuration' },
  { path: STACK_REPO_REL_PATH, label: 'Repository' },
  { path: STACK_ENV_REL_PATH, label: 'Environment' },
  { path: STACK_JOB_REL_PATH, label: 'Job' },
] as const

export type StackOutletContextT = {
  stack: StackFragment
  refetch?: Nullable<() => void>
}

export const getBreadcrumbs = (stackId: string) => [
  { label: 'stacks', url: getStacksAbsPath('') },
  ...(stackId ? [{ label: stackId, url: getStacksAbsPath(stackId) }] : []),
]

export default function Stack() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { stackId = '' } = useParams()
  const pathPrefix = getStacksAbsPath(stackId)

  const { data, error, refetch, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useStacksQuery,
      pageSize: QUERY_PAGE_SIZE,
      queryKey: 'infrastructureStacks',
    })

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

  if (!stack || isEmpty(stacks)) {
    return <LoopingLogo />
  }

  return (
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <ResponsiveLayoutSidenavContainer>
        <Select
          selectedKey={stack.id}
          onSelectionChange={(key) => navigate(getStacksAbsPath(key as string))}
          leftContent={
            <StackTypeIcon
              stackType={stack.type}
              size={16}
            />
          }
          // TODO: Fix onClick.
          dropdownFooter={
            pageInfo?.hasNextPage ? (
              <ListBoxFooterPlus onClick={() => fetchNextPage()}>
                Fetch more
              </ListBoxFooterPlus>
            ) : undefined
          }
        >
          {stacks.map((s) => (
            <ListBoxItem
              key={s.id ?? ''}
              label={s.name}
              aria-label={s.name}
              textValue={s.name}
              leftContent={
                <StackTypeIcon
                  stackType={s.type}
                  size={16}
                />
              }
            />
          ))}
        </Select>
        <div css={{ marginTop: theme.spacing.large }}>
          <SideNavEntries
            // TODO
            // @ts-ignore
            directory={DIRECTORY}
            pathname={pathname}
            pathPrefix={pathPrefix}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <div css={{ width: RESPONSIVE_LAYOUT_CONTENT_WIDTH, paddingTop: 64 }}>
        <Outlet context={{ stack, refetch } as StackOutletContextT} />
      </div>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer
        display="flex"
        flexDirection="column"
        gap="large"
      >
        {stack && (
          <>
            {/* TODO: When deleting show detach. */}
            <StackDelete
              stack={stack}
              refetch={refetch}
            />
            <Sidecar heading="Stack details">
              <SidecarItem heading="Name">
                <div css={{ display: 'flex', gap: theme.spacing.small }}>
                  {stack.name}
                </div>
              </SidecarItem>
              <SidecarItem heading="ID">{stack.id}</SidecarItem>
              <SidecarItem heading="Created">
                {moment(stack.insertedAt).fromNow()}
              </SidecarItem>
              {stack.deletedAt && (
                <SidecarItem heading="Deleted">
                  {moment(stack.deletedAt).fromNow()}
                </SidecarItem>
              )}
              <SidecarItem heading="Status">
                <StackStatusChip
                  paused={!!stack.paused}
                  deleting={!!stack.deletedAt}
                />
              </SidecarItem>
              <SidecarItem heading="Approval">
                {stack.approval ? 'Required' : 'Not required'}
              </SidecarItem>
              <SidecarItem heading="Type">
                <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
                  <StackTypeIcon
                    size={16}
                    stackType={stack.type}
                  />
                  {capitalize(stack.type)}
                </div>
              </SidecarItem>
              <SidecarItem heading="Repository">
                {stack.repository?.url}
              </SidecarItem>
              <SidecarItem heading="Cluster">
                <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
                  <ClusterProviderIcon
                    cluster={stack.cluster}
                    size={16}
                  />
                  {stack.cluster?.name}
                </div>
              </SidecarItem>
            </Sidecar>
          </>
        )}
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
