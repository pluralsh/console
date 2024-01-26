import { createContext, useContext } from 'react'
import { type RouteObject } from 'react-router'
import { Navigate } from 'react-router-dom'

import { DeploymentSettingsFragment } from 'generated/graphql'

import PRQueue from 'components/pr/PullRequestsQueue'
import OutstandingPrs from 'components/pr/OutstandingPrs'

import DependencyDashboard from 'components/pr/DependencyDashboard'

import {
  PR_DEFAULT_REL_PATH,
  PR_DEPENDENCIES_REL_PATH,
  PR_OUTSTANDING_REL_PATH,
  PR_REL_PATH,
} from './prRoutesConsts'
import { CdRoot } from './cdRoutes'

const CDContext = createContext<{
  deploymentSettings?: DeploymentSettingsFragment | undefined | null
}>({})

export function useDeploymentSettings() {
  const ctx = useContext(CDContext)

  return ctx?.deploymentSettings
}

export const prRoutes = [
  {
    path: PR_REL_PATH,
    element: <CdRoot />,
    children: [
      {
        index: true,
        element: <Navigate to={PR_DEFAULT_REL_PATH} />,
      },
      {
        Component: PRQueue,
        children: [
          {
            path: PR_OUTSTANDING_REL_PATH,
            Component: OutstandingPrs,
          },
          {
            path: PR_DEPENDENCIES_REL_PATH,
            Component: DependencyDashboard,
          },
        ],
      },
    ],
  },
] as const satisfies RouteObject[]
