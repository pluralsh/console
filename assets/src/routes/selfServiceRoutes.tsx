import { Navigate, Route } from 'react-router-dom'

import PrAutomations from 'components/pr/automations/PrAutomations'
import Pr from 'components/pr/Pr'
import PrQueue from 'components/pr/queue/PrQueue'
import { ScmManagement } from 'components/pr/scm/PrScmManagement.tsx.tsx'

import { SelfService } from 'components/self-service/SelfService.tsx'
import { Catalog } from '../components/catalog/Catalog.tsx'
import { Catalogs } from '../components/catalog/Catalogs.tsx'
import { RequireCdEnabled } from './cdRoutes'
import {
  CATALOG_ABS_PATH,
  CATALOGS_ABS_PATH,
  PR_AUTOMATIONS_REL_PATH,
  PR_DEFAULT_REL_PATH,
  PR_QUEUE_REL_PATH,
  PR_REL_PATH,
  PR_SCM_REL_PATH,
  PR_SCM_WEBHOOKS_REL_PATH,
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
      <Route element={<Pr />}>
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
  </Route>
)
