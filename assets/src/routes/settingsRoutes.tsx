import { GlobalSettings } from 'components/settings/global/GlobalSettings'
import { GlobalSettingsAgents } from 'components/settings/global/GlobalSettingsAgents'

import { GlobalSettingsRepositories } from 'components/settings/global/GlobalSettingsRepositories'
import { Navigate, Route } from 'react-router-dom'

import { GlobalSettingsPermissions } from 'components/settings/global/GlobalSettingsPermissions'

import Audits from 'components/settings/audits/Audits'
import AuditsList from 'components/settings/audits/AuditsList'
import AuditsMap from 'components/settings/audits/AuditsMap'
import UserManagement from 'components/settings/usermanagement/UserManagement'
import { Groups } from 'components/settings/usermanagement/groups/Groups'
import { Personas } from 'components/settings/usermanagement/personas/Personas'
import Users from 'components/settings/usermanagement/users/Users'

import Settings from 'components/settings/Settings'

import EmailSettings from 'components/settings/usermanagement/email/EmailSettings'
import Roles from 'components/settings/usermanagement/roles/Roles'
import { Webhooks } from 'components/settings/usermanagement/webhooks/Webhooks'

import Observability from 'components/settings/global/observability/Observability'

import ProjectSettings from 'components/settings/projectsettings/ProjectSettings'

import ServiceAccounts from 'components/settings/usermanagement/serviceaccounts/ServiceAccounts'

import { AccessTokens } from 'components/profile/AccessTokens'

import { GlobalSettingsSMTP } from 'components/settings/global/GlobalSettingsSMTP'

import Notifications from '../components/settings/notifications/Notifications'

import NotificationSinks from '../components/settings/notifications/sinks/NotificationSinks'

import NotificationRouters from '../components/settings/notifications/routers/NotificationRouters'

import { RequireCdEnabled } from './cdRoutes'
import {
  AUDITS_REL_PATH,
  GLOBAL_SETTINGS_REL_PATH,
  NOTIFICATIONS_REL_PATH,
  NOTIFICATIONS_ROUTERS_REL_PATH,
  NOTIFICATIONS_SINKS_REL_PATH,
  PROJECT_SETTINGS_REL_PATH,
  SETTINGS_REL_PATH,
  USER_MANAGEMENT_ABS_PATH,
  USER_MANAGEMENT_REL_PATH,
} from './settingsRoutesConst'
import { GlobalSettingsAiProvider } from 'components/settings/global/GlobalSettingsAiProvider'

const userManagementRoutes = (
  <Route
    path={USER_MANAGEMENT_REL_PATH}
    element={<UserManagement />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="users"
        />
      }
    />
    <Route
      path="users"
      element={<Users />}
    />
    <Route
      path="groups"
      element={<Groups />}
    />
    <Route
      path="service-accounts"
      element={<ServiceAccounts />}
    />
    <Route
      path="personas"
      element={<Personas />}
    />
    <Route
      path="roles"
      element={<Roles />}
    />
    <Route
      path="webhooks"
      element={<Webhooks />}
    />
    <Route
      path="email-settings"
      element={<EmailSettings />}
    />
  </Route>
)
const globalSettingsRoutes = (
  <Route
    path={GLOBAL_SETTINGS_REL_PATH}
    element={<GlobalSettings />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="permissions"
        />
      }
    />
    <Route
      path="permissions"
      element={<GlobalSettingsPermissions />}
    />
    <Route
      path="repositories"
      element={<GlobalSettingsRepositories />}
    />
    <Route
      path="ai-provider"
      element={<GlobalSettingsAiProvider />}
    />
    <Route
      path="agents"
      element={<GlobalSettingsAgents />}
    />
    <Route
      path="observability"
      element={<Observability />}
    />
    <Route
      path="smtp"
      element={<GlobalSettingsSMTP />}
    />
  </Route>
)

const projectSettingsRoutes = (
  <Route
    path={PROJECT_SETTINGS_REL_PATH}
    element={<ProjectSettings />}
  />
)

const notificationsRoutes = (
  <Route
    path={NOTIFICATIONS_REL_PATH}
    element={<RequireCdEnabled />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={NOTIFICATIONS_ROUTERS_REL_PATH}
        />
      }
    />
    <Route element={<Notifications />}>
      <Route
        path={NOTIFICATIONS_ROUTERS_REL_PATH}
        element={<NotificationRouters />}
      />
      <Route
        path={NOTIFICATIONS_SINKS_REL_PATH}
        element={<NotificationSinks />}
      />
    </Route>
  </Route>
)

const auditRoutes = (
  <Route
    path={AUDITS_REL_PATH}
    element={<Audits />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="list"
        />
      }
    />
    <Route
      path="list"
      element={<AuditsList />}
    />
    <Route
      path="map"
      element={<AuditsMap />}
    />
  </Route>
)

export const settingsRoutes = (
  <Route
    path={SETTINGS_REL_PATH}
    element={<Settings />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={USER_MANAGEMENT_ABS_PATH}
        />
      }
    />
    {userManagementRoutes}
    {globalSettingsRoutes}
    {projectSettingsRoutes}
    {notificationsRoutes}
    {auditRoutes}
    <Route
      path="access-tokens"
      element={<AccessTokens />}
    />
  </Route>
)
