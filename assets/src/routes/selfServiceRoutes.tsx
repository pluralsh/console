import { Navigate, Route } from 'react-router-dom'

import { PrAutomations } from 'components/self-service/pr/automations/PrAutomations'

import { OutstandingPrs } from 'components/self-service/pr/queue/OutstandingPrs'
import { ScmManagement } from 'components/self-service/pr/scm/PrScmManagement.tsx.tsx'

import { SelfService } from 'components/self-service/SelfService.tsx'
import { Catalog } from 'components/self-service/catalog/Catalog'
import { Catalogs } from 'components/self-service/catalog/Catalogs'
import { RequireCdEnabled } from './cdRoutes'
import {
  CATALOG_ABS_PATH,
  CATALOGS_ABS_PATH,
  PR_AUTOMATIONS_REL_PATH,
  PR_OUTSTANDING_REL_PATH,
  PR_REL_PATH,
  PR_SCM_REL_PATH,
  SELF_SERVICE_ABS_PATH,
} from './selfServiceRoutesConsts'

export const selfServiceRoutes = [
  <Route
    path={SELF_SERVICE_ABS_PATH}
    element={<SelfService />}
  >
    <Route
      index
      element={<Navigate to={CATALOGS_ABS_PATH} />}
    />
    {/* Catalogs */}
    <Route
      path={CATALOGS_ABS_PATH}
      element={<Catalogs />}
    />
    {/* PRs */}
    <Route
      path={PR_REL_PATH}
      element={<RequireCdEnabled />}
    >
      <Route
        index
        element={<Navigate to={PR_OUTSTANDING_REL_PATH} />}
      />
      <Route
        path={PR_OUTSTANDING_REL_PATH}
        element={<OutstandingPrs />}
      />
      <Route
        path={PR_SCM_REL_PATH}
        element={<ScmManagement />}
      />
      <Route
        path={PR_AUTOMATIONS_REL_PATH}
        element={<PrAutomations />}
      />
    </Route>
  </Route>,
  <Route
    path={CATALOG_ABS_PATH}
    element={<Catalog />}
  />,
]
