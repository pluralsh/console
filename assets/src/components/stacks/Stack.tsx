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
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import capitalize from 'lodash/capitalize'

import moment from 'moment'

import { useKickStackMutation, useStacksQuery } from '../../generated/graphql'
import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'
import { ClusterProviderIcon } from '../utils/Provider'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'

import { useFetchPaginatedData } from '../cd/utils/useFetchPaginatedData'

import KickButton from '../utils/KickButton'

import { TRUNCATE } from '../utils/truncate'

import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'

import { GqlError } from '../utils/Alert'

import StackStatusChip from './common/StackStatusChip'

import { StackTypeIcon } from './common/StackTypeIcon'

import DeleteStack from './delete/DeleteStack'

const QUERY_PAGE_SIZE = 100

export default function Stack() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { stackId = '' } = useParams()

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
          onSelectionChange={(id) =>
            navigate(pathname.replace(stackId, id as string))
          }
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
              label={<div css={{ ...TRUNCATE, width: 140 }}>{s.name}</div>}
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
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSidecarContainer
        display="flex"
        flexDirection="column"
        gap="medium"
      >
        {stack && (
          <>
            <KickButton
              pulledAt={stack.repository?.pulledAt}
              kickMutationHook={useKickStackMutation}
              message="Resync stack"
              tooltipMessage="Use this to sync this stack now instead of at the next poll interval."
              variables={{ id: stack.id }}
            />
            <DeleteStack
              stack={stack}
              refetch={refetch}
            />
            <Sidecar
              heading="Stack details"
              css={{ overflowX: 'auto' }}
            >
              <SidecarItem heading="Name">
                <div css={{ display: 'flex', gap: theme.spacing.small }}>
                  {stack.name}
                </div>
              </SidecarItem>
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
              <SidecarItem heading="Approvals">
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
              <SidecarItem heading="Cluster">
                <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
                  <ClusterProviderIcon
                    cluster={stack.cluster}
                    size={16}
                  />
                  {stack.cluster?.name}
                </div>
              </SidecarItem>
              {stack.configuration.image && (
                <SidecarItem heading="Image">
                  {stack.configuration.image}
                </SidecarItem>
              )}
              <SidecarItem heading="Version">
                {stack.configuration.version}
              </SidecarItem>
              <SidecarItem heading="Repository">
                {stack.repository?.url}
              </SidecarItem>
              <SidecarItem heading="Ref">{stack.git.ref}</SidecarItem>
              <SidecarItem heading="Folder">{stack.git.folder}</SidecarItem>
            </Sidecar>
          </>
        )}
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
