import {
  AppIcon,
  BriefcaseIcon,
  EmptyState,
  Flex,
  LoopingLogo,
  Tooltip,
} from '@pluralsh/design-system'
import { SideNavEntries } from 'components/layout/SideNavEntries'
import { GqlError, GqlErrorType } from 'components/utils/Alert'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import { JobFragment, PodFragment } from 'generated/graphql'
import { createContext, useContext, useMemo } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { TRUNCATE } from '../truncate.ts'

const DIRECTORY = [
  { path: 'logs', label: 'Logs' },
  { path: 'pods', label: 'Pods' },
  { path: 'status', label: 'Status' },
  { path: 'specs', label: 'Specs' },
]

const PodsContext = createContext<PodFragment[]>([])

export const useJobPods = () => {
  const ctx = useContext(PodsContext)

  if (!ctx) {
    throw new Error('useJobPods must be used within a PodsContext.Provider')
  }

  return useContext(PodsContext)
}

type OutletContextT = {
  refetch: () => void
  pathPrefix: string
  status: Nullable<JobFragment['status']>
  metadata: Nullable<JobFragment['metadata']>
  raw: Nullable<JobFragment['raw']>
  spec: Nullable<JobFragment['spec']>
}
export const useRunJob = () => useOutletContext<OutletContextT>()

export function K8sRunJob({
  job,
  pods,
  loading,
  error,
  pathPrefix,
  refetch,
}: {
  job: Nullable<JobFragment>
  pods: PodFragment[]
  loading?: boolean
  error?: GqlErrorType
  refetch: () => void
  pathPrefix: string
}) {
  const theme = useTheme()
  const { pathname } = useLocation()

  const outletContext: OutletContextT = useMemo(() => {
    const { status, metadata, raw, spec } = job ?? {}
    return { refetch, status, metadata, raw, spec, pathPrefix }
  }, [job, pathPrefix, refetch])

  const name = job?.metadata.name

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      flexGrow={1}
    >
      <ResponsiveLayoutSidenavContainer>
        <Flex
          align="center"
          gap="small"
          marginBottom={theme.spacing.medium}
        >
          <AppIcon
            size="xsmall"
            icon={<BriefcaseIcon size={theme.spacing.large} />}
          />
          <div css={{ minWidth: 0, '&>*': { ...TRUNCATE } }}>
            <Tooltip label={name}>
              <Subtitle2H1 css={{ margin: 0 }}>{name}</Subtitle2H1>
            </Tooltip>
          </div>
        </Flex>

        <SideNavEntries
          directory={DIRECTORY}
          pathname={pathname}
          pathPrefix={pathPrefix}
        />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer>
        <PodsContext value={pods}>
          {job ? (
            <Outlet context={outletContext} />
          ) : error ? (
            <GqlError error={error} />
          ) : loading ? (
            <LoopingLogo />
          ) : (
            <EmptyState message="Job not found." />
          )}
        </PodsContext>
      </ResponsiveLayoutContentContainer>
    </Flex>
  )
}
