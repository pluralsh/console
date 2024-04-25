import { type RouteObject } from 'react-router'

import Policies from 'components/policies/Policies'

import PolicyDetails from 'components/policies/details/PolicyDetails'

import PolicyAffectedResources from 'components/policies/affectedResources/PolicyAffectedResources'

import { RequireCdEnabled } from './cdRoutes'
import {
  POLICIES_AFFECTED_RESOURCES_PATH,
  POLICIES_DETAILS_PATH,
  POLICIES_REL_PATH,
} from './policiesRoutesConsts'

export const policiesRoutes = [
  {
    path: POLICIES_REL_PATH,
    element: <RequireCdEnabled />,
    children: [
      {
        element: <Policies />,
        children: [
          {
            path: POLICIES_DETAILS_PATH,
            element: <PolicyDetails />,
          },
          {
            path: POLICIES_AFFECTED_RESOURCES_PATH,
            element: <PolicyAffectedResources />,
          },
        ],
      },
    ],
  },
] as const satisfies RouteObject[]
