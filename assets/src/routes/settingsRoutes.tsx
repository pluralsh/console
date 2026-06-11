import { GlobalSettings } from 'components/settings/global/GlobalSettings'
import { GlobalSettingsAgents } from 'components/settings/global/GlobalSettingsAgents'
import { GlobalSettingsGeneral } from 'components/settings/global/GlobalSettingsGeneral'

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

import Observability from 'components/settings/global/observability/Observability'

import ProjectSettings from 'components/settings/projectsettings/ProjectSettings'

import ServiceAccounts from 'components/settings/usermanagement/serviceaccounts/ServiceAccounts'

import { AccessTokens } from 'components/profile/access-tokens/AccessTokens'

import { GlobalSettingsSMTP } from 'components/settings/global/GlobalSettingsSMTP'

import Notifications from '../components/settings/notifications/Notifications'

import NotificationSinks from '../components/settings/notifications/sinks/NotificationSinks'

import NotificationRouters from '../components/settings/notifications/routers/NotificationRouters'

import { AISettingsProvider } from 'components/settings/ai/AISettingsProvider'
import { ObservabilityProviders } from 'components/settings/global/observability/ObservabilityProviders'
import { OidcSettings } from 'components/settings/global/oidc/OidcSettings'
import { RequireCdEnabled } from './cdRoutes'
import {
  ACCESS_TOKENS_REL_PATH,
  AI_SETTINGS_AGENT_RUNTIMES_REL_PATH,
  AI_SETTINGS_AI_PROVIDER_REL_PATH,
  AI_SETTINGS_MCP_SERVERS_REL_PATH,
  AI_SETTINGS_REL_PATH,
  AUDITS_REL_PATH,
  CHATBOTS_SETTINGS_CREATE_REL_PATH,
  CHATBOTS_SETTINGS_EDIT_REL_PATH,
  CHATBOTS_SETTINGS_REL_PATH,
  GLOBAL_SETTINGS_REL_PATH,
  NOTIFICATIONS_REL_PATH,
  NOTIFICATIONS_ROUTERS_REL_PATH,
  NOTIFICATIONS_SINKS_REL_PATH,
  PROJECT_SETTINGS_REL_PATH,
  SETTINGS_REL_PATH,
  USER_MANAGEMENT_ABS_PATH,
  USER_MANAGEMENT_REL_PATH,
  WEBHOOKS_SETTINGS_EDIT_REL_PATH,
  WEBHOOKS_SETTINGS_CREATE_REL_PATH,
  WEBHOOKS_SETTINGS_ABS_PATH,
  WEBHOOKS_SETTINGS_REL_PATH,
} from './settingsRoutesConst'
import { AISettings } from 'components/settings/ai/AISettings'
import { McpServers } from 'components/settings/ai/mcp/McpServers'
import { AIAgentRuntimes } from 'components/settings/ai/agent-runtimes/AIAgentRuntimes'
import WebhooksSettings from '../components/settings/webhooks/WebhooksSettings'
import ChatbotsSettings from '../components/settings/chatbots/ChatbotsSettings'
import { WebhookCreateSettings } from 'components/settings/webhooks/WebhookCreateSettings'
import { WebhookEditSettings } from 'components/settings/webhooks/WebhookEditSettings'
import { ChatbotCreateSettings } from 'components/settings/chatbots/ChatbotCreateSettings'
import { ChatbotEditSettings } from 'components/settings/chatbots/ChatbotEditSettings'

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
          to="general"
        />
      }
    />
    <Route
      path="general"
      element={<GlobalSettingsGeneral />}
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
    >
      <Route
        index
        element={
          <Navigate
            replace
            to="providers"
          />
        }
      />
      <Route
        path="providers"
        element={<ObservabilityProviders />}
      />
      <Route
        path="webhooks"
        element={
          <Navigate
            replace
            to={WEBHOOKS_SETTINGS_ABS_PATH}
          />
        }
      />
    </Route>
    <Route
      path="oidc"
      element={<OidcSettings />}
    />
    <Route
      path="smtp"
      element={<GlobalSettingsSMTP />}
    />
  </Route>
)

const aiSettingsRoutes = (
  <Route
    path={AI_SETTINGS_REL_PATH}
    element={<AISettings />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={AI_SETTINGS_AI_PROVIDER_REL_PATH}
        />
      }
    />
    <Route
      path={AI_SETTINGS_AI_PROVIDER_REL_PATH}
      element={<AISettingsProvider />}
    />
    <Route
      path={AI_SETTINGS_AGENT_RUNTIMES_REL_PATH}
      element={<AIAgentRuntimes />}
    />
    <Route
      path={AI_SETTINGS_MCP_SERVERS_REL_PATH}
      element={<McpServers />}
    />
  </Route>
)

const webhooksSettingsRoutes = (
  <>
    <Route
      path={WEBHOOKS_SETTINGS_REL_PATH}
      element={<WebhooksSettings />}
    />
    <Route
      path={`${WEBHOOKS_SETTINGS_REL_PATH}/${WEBHOOKS_SETTINGS_CREATE_REL_PATH}`}
      element={<WebhookCreateSettings />}
    />
    <Route
      path={`${WEBHOOKS_SETTINGS_REL_PATH}/${WEBHOOKS_SETTINGS_EDIT_REL_PATH}`}
      element={<WebhookEditSettings />}
    />
  </>
)

const chatbotsSettingsRoutes = (
  <>
    <Route
      path={CHATBOTS_SETTINGS_REL_PATH}
      element={<ChatbotsSettings />}
    />
    <Route
      path={`${CHATBOTS_SETTINGS_REL_PATH}/${CHATBOTS_SETTINGS_CREATE_REL_PATH}`}
      element={<ChatbotCreateSettings />}
    />
    <Route
      path={`${CHATBOTS_SETTINGS_REL_PATH}/${CHATBOTS_SETTINGS_EDIT_REL_PATH}`}
      element={<ChatbotEditSettings />}
    />
  </>
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
    {aiSettingsRoutes}
    {webhooksSettingsRoutes}
    {chatbotsSettingsRoutes}
    {projectSettingsRoutes}
    {notificationsRoutes}
    {auditRoutes}
    <Route
      path={ACCESS_TOKENS_REL_PATH}
      element={<AccessTokens />}
    />
  </Route>
)
