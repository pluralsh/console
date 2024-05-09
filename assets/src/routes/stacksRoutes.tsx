import { Route } from 'react-router-dom'

import InfrastructureStacks from '../components/stacks/Stacks'

import { STACKS_ABS_PATH } from './stacksRoutesConsts'

export const stacksRoutes = [
  <Route
    path={STACKS_ABS_PATH}
    element={<InfrastructureStacks />}
  />,
]
