import { Route } from 'react-router-dom'

import Stacks from '../components/stacks/Stacks'

import { STACKS_ABS_PATH } from './stacksRoutesConsts'

export const stacksRoutes = [
  <Route
    path={STACKS_ABS_PATH}
    element={<Stacks />}
  />,
]
