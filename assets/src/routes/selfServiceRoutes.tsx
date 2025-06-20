import { Navigate, Route } from 'react-router-dom'

import PrAutomations from 'components/self-service/pr/automations/PrAutomations'

import PrQueue from 'components/self-service/pr/queue/PrQueue'
import { ScmManagement } from 'components/self-service/pr/scm/PrScmManagement.tsx.tsx'

import { SelfService } from 'components/self-service/SelfService.tsx'
import { Catalog } from 'components/self-service/catalog/Catalog'
import { Catalogs } from 'components/self-service/catalog/Catalogs'
import { RequireCdEnabled } from './cdRoutes'
import {
  CATALOG_ABS_PATH,
  CATALOGS_ABS_PATH,
  PR_AUTOMATIONS_REL_PATH,
  PR_DEFAULT_REL_PATH,
  PR_QUEUE_REL_PATH,
  PR_REL_PATH,
  PR_SCM_REL_PATH,
  SELF_SERVICE_ABS_PATH,
} from './selfServiceRoutesConsts'

export const selfServiceRoutes = (
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
    ,
    <Route
      path={CATALOG_ABS_PATH}
      element={<Catalog />}
    />
    {/* PRs */}
    <Route
      path={PR_REL_PATH}
      element={<RequireCdEnabled />}
    >
      <Route
        index
        element={<Navigate to={PR_DEFAULT_REL_PATH} />}
      />
      <Route
        path={PR_QUEUE_REL_PATH}
        element={<PrQueue />}
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
  </Route>
)
