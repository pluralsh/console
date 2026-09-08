import { RouteObject } from 'react-router'

import ConsumeSecret from '../components/sharesecret/ConsumeSecret'

import { SECRETS_REL_PATH } from './secretsRoutesConsts'

export const secretsRoutes = [
  {
    path: SECRETS_REL_PATH,
    element: <ConsumeSecret />,
  },
] as const satisfies RouteObject[]
