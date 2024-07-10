import { GlobalSettings } from 'components/settings/global/GlobalSettings'
import { GlobalSettingsAgents } from 'components/settings/global/GlobalSettingsAgents'

import { GlobalSettingsRepositories } from 'components/settings/global/GlobalSettingsRepositories'
import SelfManage from 'components/settings/global/SelfManage'
import { Navigate, Outlet, Route } from 'react-router-dom'

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
import { AccountVPN } from 'components/settings/usermanagement/vpn/VPN'
import { Webhooks } from 'components/settings/usermanagement/webhooks/Webhooks'

import Observability from 'components/settings/global/observability/Observability'

import {
  AUDITS_REL_PATH,
  GLOBAL_SETTINGS_REL_PATH,
  PROJECT_SETTINGS_ABS_PATH,
  PROJECT_SETTINGS_REL_PATH,
  SETTINGS_REL_PATH,
  USER_MANAGEMENT_REL_PATH,
} from './settingsRoutesConst'

function Placeholder() {
  return (
    <div>
      <h1>Settings</h1>
      <div>
        <Outlet />
      </div>
    </div>
  )
}

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
      element={<Placeholder />}
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
      path="vpn"
      element={<AccountVPN />}
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
      path="agents"
      element={<GlobalSettingsAgents />}
    />
    <Route
      path="observability"
      element={<Observability />}
    />
    <Route
      path="auto-update"
      element={<SelfManage />}
    />
  </Route>
)

const projectSettingsRoutes = (
  <Route
    path={PROJECT_SETTINGS_REL_PATH}
    element={<Placeholder />}
  />
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
          to={PROJECT_SETTINGS_ABS_PATH}
        />
      }
    />
    {userManagementRoutes}
    {globalSettingsRoutes}
    {projectSettingsRoutes}
    {auditRoutes}
  </Route>
)
