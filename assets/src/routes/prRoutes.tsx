import { type RouteObject } from 'react-router'
import { Navigate } from 'react-router-dom'

import Pr from 'components/pr/Pr'
import PrQueue from 'components/pr/queue/PrQueue'
import PrScmConnections from 'components/pr/scm/PrScmConnections'
import PrAutomations from 'components/pr/automations/PrAutomations'

import PrScmWebhooks from 'components/pr/scm/ScmWebhooks'

import { RequireCdEnabled } from './cdRoutes'
import {
  PR_AUTOMATIONS_REL_PATH,
  PR_DEFAULT_REL_PATH,
  PR_QUEUE_REL_PATH,
  PR_REL_PATH,
  PR_SCM_REL_PATH,
  PR_SCM_WEBHOOKS_REL_PATH,
} from './prRoutesConsts'

export const prRoutes = [
  {
    path: PR_REL_PATH,
    element: <RequireCdEnabled />,
    children: [
      {
        index: true,
        element: <Navigate to={PR_DEFAULT_REL_PATH} />,
      },
      {
        element: <Pr />,
        children: [
          {
            path: PR_QUEUE_REL_PATH,
            element: <PrQueue />,
          },
          {
            path: PR_SCM_REL_PATH,
            element: <PrScmConnections />,
          },
          {
            path: PR_SCM_WEBHOOKS_REL_PATH,
            element: <PrScmWebhooks />,
          },
          {
            path: PR_AUTOMATIONS_REL_PATH,
            element: <PrAutomations />,
          },
        ],
      },
    ],
  },
] as const satisfies RouteObject[]
