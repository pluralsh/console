import { createContext, useContext } from 'react'
import { type RouteObject } from 'react-router'
import { Navigate } from 'react-router-dom'

import { DeploymentSettingsFragment } from 'generated/graphql'

import Automation from 'components/automation/Automation'
import AutomationPr from 'components/automation/AutomationPr'
import ScmConnections from 'components/automation/ScmConnections'

import {
  AUTOMATION_DEFAULT_REL_PATH,
  AUTOMATION_PR_REL_PATH,
  AUTOMATION_REL_PATH,
  AUTOMATION_SCM_REL_PATH,
} from './automationRoutesConsts'
import { CdRoot } from './cdRoutes'

const CDContext = createContext<{
  deploymentSettings?: DeploymentSettingsFragment | undefined | null
}>({})

export function useDeploymentSettings() {
  const ctx = useContext(CDContext)

  return ctx?.deploymentSettings
}

export const automationRoutes = [
  {
    path: AUTOMATION_REL_PATH,
    element: <CdRoot />,
    children: [
      {
        index: true,
        element: <Navigate to={AUTOMATION_DEFAULT_REL_PATH} />,
      },
      {
        element: <Automation />,
        children: [
          {
            path: AUTOMATION_PR_REL_PATH,
            element: <ScmConnections />,
          },
          {
            path: AUTOMATION_SCM_REL_PATH,
            element: <AutomationPr />,
          },
        ],
      },
    ],
  },
] as const satisfies RouteObject[]
