import type * as Types from './graphql'
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import { gql } from '@apollo/client';
export const PullRequestBasicFragmentDoc = /*#__PURE__*/ gql`
    fragment PullRequestBasic on PullRequest {
  id
  url
  title
  creator
  status
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.PullRequestBasicFragment, unknown>;
export const AgentTodoFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentTodo on AgentTodo {
  title
  description
  done
}
    ` as unknown as DocumentNode<Types.AgentTodoFragment, unknown>;
export const AgentRunTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentRunTiny on AgentRun {
  id
  status
  mode
  babysit
  approval
  approvedAt
  prompt
  shared
  error
  runtime {
    id
    name
    type
  }
  repository
  branch
  headBranch
  pullRequests {
    ...PullRequestBasic
  }
  podReference {
    name
    namespace
  }
  usage {
    totalCost
    totalTokens
  }
  workbenchJob {
    id
    workbench {
      id
      name
    }
  }
  upload {
    id
    session
    patch
  }
  todos {
    ...AgentTodo
  }
  insertedAt
  updatedAt
}
    ${PullRequestBasicFragmentDoc}
${AgentTodoFragmentDoc}` as unknown as DocumentNode<Types.AgentRunTinyFragment, unknown>;
export const AgentMessageCostFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentMessageCost on AgentMessageCost {
  total
  tokens {
    input
    output
    reasoning
  }
}
    ` as unknown as DocumentNode<Types.AgentMessageCostFragment, unknown>;
export const AgentMessageMetadataFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentMessageMetadata on AgentMessageMetadata {
  startedAt
  completedAt
  reasoning {
    text
    start
    end
  }
  file {
    name
    text
    start
    end
  }
  tool {
    name
    state
    input
    output
  }
}
    ` as unknown as DocumentNode<Types.AgentMessageMetadataFragment, unknown>;
export const AgentMessageFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentMessage on AgentMessage {
  id
  seq
  role
  message
  insertedAt
  cost {
    ...AgentMessageCost
  }
  metadata {
    ...AgentMessageMetadata
  }
}
    ${AgentMessageCostFragmentDoc}
${AgentMessageMetadataFragmentDoc}` as unknown as DocumentNode<Types.AgentMessageFragment, unknown>;
export const AgentAnalysisFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentAnalysis on AgentAnalysis {
  summary
  analysis
  bullets
}
    ` as unknown as DocumentNode<Types.AgentAnalysisFragment, unknown>;
export const AgentRunFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentRun on AgentRun {
  ...AgentRunTiny
  messages {
    ...AgentMessage
  }
  analysis {
    ...AgentAnalysis
  }
}
    ${AgentRunTinyFragmentDoc}
${AgentMessageFragmentDoc}
${AgentAnalysisFragmentDoc}` as unknown as DocumentNode<Types.AgentRunFragment, unknown>;
export const ClusterMinimalFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterMinimal on Cluster {
  id
  name
  handle
  provider {
    name
    cloud
  }
  distro
}
    ` as unknown as DocumentNode<Types.ClusterMinimalFragment, unknown>;
export const ClusterTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterTiny on Cluster {
  ...ClusterMinimal
  self
  upgradePlan {
    compatibilities
    deprecations
    incompatibilities
  }
  virtual
}
    ${ClusterMinimalFragmentDoc}` as unknown as DocumentNode<Types.ClusterTinyFragment, unknown>;
export const PolicyBindingFragmentDoc = /*#__PURE__*/ gql`
    fragment PolicyBinding on PolicyBinding {
  id
  user {
    id
    name
    email
  }
  group {
    id
    name
  }
}
    ` as unknown as DocumentNode<Types.PolicyBindingFragment, unknown>;
export const AgentRuntimeFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentRuntime on AgentRuntime {
  id
  name
  type
  aiProxy
  model {
    model
    provider
  }
  cluster {
    ...ClusterTiny
  }
  default
  createBindings {
    ...PolicyBinding
  }
}
    ${ClusterTinyFragmentDoc}
${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.AgentRuntimeFragment, unknown>;
export const AgentRuntimeReposFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentRuntimeRepos on AgentRuntime {
  id
  allowedRepositories
}
    ` as unknown as DocumentNode<Types.AgentRuntimeReposFragment, unknown>;
export const AgentRunRepositoryFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentRunRepository on AgentRunRepository {
  id
  url
  lastUsedAt
}
    ` as unknown as DocumentNode<Types.AgentRunRepositoryFragment, unknown>;
export const AgentMessageDeltaFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentMessageDelta on AgentMessageDelta {
  delta
  payload {
    ...AgentMessage
  }
}
    ${AgentMessageFragmentDoc}` as unknown as DocumentNode<Types.AgentMessageDeltaFragment, unknown>;
export const ChatThreadSettingsFragmentDoc = /*#__PURE__*/ gql`
    fragment ChatThreadSettings on ChatThreadSettings {
  memory
}
    ` as unknown as DocumentNode<Types.ChatThreadSettingsFragment, unknown>;
export const LogFacetFragmentDoc = /*#__PURE__*/ gql`
    fragment LogFacet on LogFacet {
  key
  value
}
    ` as unknown as DocumentNode<Types.LogFacetFragment, unknown>;
export const LogLineFragmentDoc = /*#__PURE__*/ gql`
    fragment LogLine on LogLine {
  facets {
    ...LogFacet
  }
  log
  timestamp
}
    ${LogFacetFragmentDoc}` as unknown as DocumentNode<Types.LogLineFragment, unknown>;
export const LogsEvidenceFragmentDoc = /*#__PURE__*/ gql`
    fragment LogsEvidence on LogsEvidence {
  clusterId
  serviceId
  line
  lines {
    ...LogLine
  }
}
    ${LogLineFragmentDoc}` as unknown as DocumentNode<Types.LogsEvidenceFragment, unknown>;
export const PullRequestEvidenceFragmentDoc = /*#__PURE__*/ gql`
    fragment PullRequestEvidence on PullRequestEvidence {
  contents
  filename
  patch
  repo
  sha
  title
  url
}
    ` as unknown as DocumentNode<Types.PullRequestEvidenceFragment, unknown>;
export const AlertEvidenceFragmentDoc = /*#__PURE__*/ gql`
    fragment AlertEvidence on AlertEvidence {
  alertId
  title
  resolution
}
    ` as unknown as DocumentNode<Types.AlertEvidenceFragment, unknown>;
export const KnowledgeEvidenceFragmentDoc = /*#__PURE__*/ gql`
    fragment KnowledgeEvidence on KnowledgeEvidence {
  name
  observations
  type
}
    ` as unknown as DocumentNode<Types.KnowledgeEvidenceFragment, unknown>;
export const AiInsightEvidenceFragmentDoc = /*#__PURE__*/ gql`
    fragment AiInsightEvidence on AiInsightEvidence {
  id
  type
  logs {
    ...LogsEvidence
  }
  pullRequest {
    ...PullRequestEvidence
  }
  alert {
    ...AlertEvidence
  }
  knowledge {
    ...KnowledgeEvidence
  }
  insertedAt
  updatedAt
}
    ${LogsEvidenceFragmentDoc}
${PullRequestEvidenceFragmentDoc}
${AlertEvidenceFragmentDoc}
${KnowledgeEvidenceFragmentDoc}` as unknown as DocumentNode<Types.AiInsightEvidenceFragment, unknown>;
export const AiInsightContextFragmentDoc = /*#__PURE__*/ gql`
    fragment AiInsightContext on AiInsight {
  evidence {
    ...AiInsightEvidence
  }
  cluster {
    id
    name
    distro
    provider {
      cloud
    }
  }
  clusterInsightComponent {
    id
    group
    version
    kind
    name
    namespace
    cluster {
      ...ClusterMinimal
    }
  }
  service {
    id
    name
    cluster {
      ...ClusterMinimal
    }
  }
  serviceComponent {
    id
    group
    version
    kind
    name
    namespace
    service {
      id
      name
      cluster {
        ...ClusterMinimal
      }
    }
  }
  stack {
    id
    name
    type
  }
  stackRun {
    id
    message
    type
    stack {
      id
      name
    }
  }
  alert {
    id
    title
    message
  }
}
    ${AiInsightEvidenceFragmentDoc}
${ClusterMinimalFragmentDoc}` as unknown as DocumentNode<Types.AiInsightContextFragment, unknown>;
export const AiInsightSummaryFragmentDoc = /*#__PURE__*/ gql`
    fragment AiInsightSummary on AiInsight {
  id
  summary
  freshness
  insertedAt
  updatedAt
  ...AiInsightContext
}
    ${AiInsightContextFragmentDoc}` as unknown as DocumentNode<Types.AiInsightSummaryFragment, unknown>;
export const AgentSessionFragmentDoc = /*#__PURE__*/ gql`
    fragment AgentSession on AgentSession {
  id
  type
  done
  connection {
    id
    name
    provider
  }
  cluster {
    id
  }
  runtime {
    id
    name
  }
  pullRequest {
    id
    url
  }
}
    ` as unknown as DocumentNode<Types.AgentSessionFragment, unknown>;
export const ChatThreadTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment ChatThreadTiny on ChatThread {
  id
  default
  summary
  insertedAt
  updatedAt
  lastMessageAt
  settings {
    ...ChatThreadSettings
  }
  insight {
    ...AiInsightSummary
  }
  flow {
    id
    name
    icon
  }
  session {
    ...AgentSession
  }
  research {
    id
    prompt
  }
  service {
    id
    name
  }
}
    ${ChatThreadSettingsFragmentDoc}
${AiInsightSummaryFragmentDoc}
${AgentSessionFragmentDoc}` as unknown as DocumentNode<Types.ChatThreadTinyFragment, unknown>;
export const AiInsightFragmentDoc = /*#__PURE__*/ gql`
    fragment AiInsight on AiInsight {
  id
  text
  summary
  sha
  freshness
  updatedAt
  insertedAt
  error {
    message
    source
  }
  ...AiInsightContext
}
    ${AiInsightContextFragmentDoc}` as unknown as DocumentNode<Types.AiInsightFragment, unknown>;
export const McpToolFragmentDoc = /*#__PURE__*/ gql`
    fragment McpTool on McpTool {
  name
  description
  inputSchema
}
    ` as unknown as DocumentNode<Types.McpToolFragment, unknown>;
export const McpServerFragmentDoc = /*#__PURE__*/ gql`
    fragment McpServer on McpServer {
  id
  name
  url
  protocol
  confirm
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  authentication {
    headers {
      id
      name
      value
    }
    plural
    oauth {
      enabled
      type
      tokenUrl
      clientId
      keyId
      audience
      resource
      scopes
    }
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.McpServerFragment, unknown>;
export const McpServerToolFragmentDoc = /*#__PURE__*/ gql`
    fragment McpServerTool on McpServerTool {
  tool {
    ...McpTool
  }
  server {
    ...McpServer
  }
}
    ${McpToolFragmentDoc}
${McpServerFragmentDoc}` as unknown as DocumentNode<Types.McpServerToolFragment, unknown>;
export const ChatThreadDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment ChatThreadDetails on ChatThread {
  ...ChatThreadTiny
  insight {
    ...AiInsight
  }
  tools {
    ...McpServerTool
  }
}
    ${ChatThreadTinyFragmentDoc}
${AiInsightFragmentDoc}
${McpServerToolFragmentDoc}` as unknown as DocumentNode<Types.ChatThreadDetailsFragment, unknown>;
export const PageInfoFragmentDoc = /*#__PURE__*/ gql`
    fragment PageInfo on PageInfo {
  hasNextPage
  endCursor
  hasPreviousPage
  startCursor
}
    ` as unknown as DocumentNode<Types.PageInfoFragment, unknown>;
export const ClusterBasicFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterBasic on Cluster {
  ...ClusterTiny
  protect
  deletedAt
  version
  currentVersion
}
    ${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterBasicFragment, unknown>;
export const PullRequestFragmentDoc = /*#__PURE__*/ gql`
    fragment PullRequest on PullRequest {
  ...PullRequestBasic
  service {
    id
    name
    protect
    deletedAt
  }
  cluster {
    ...ClusterBasic
  }
  labels
  patch
}
    ${PullRequestBasicFragmentDoc}
${ClusterBasicFragmentDoc}` as unknown as DocumentNode<Types.PullRequestFragment, unknown>;
export const ScmConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment ScmConnection on ScmConnection {
  id
  name
  insertedAt
  updatedAt
  type
  username
  baseUrl
  apiUrl
  azure {
    username
    organization
    project
  }
}
    ` as unknown as DocumentNode<Types.ScmConnectionFragment, unknown>;
export const PrConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment PrConfiguration on PrConfiguration {
  condition {
    field
    operation
    value
  }
  values
  default
  documentation
  displayName
  longform
  name
  optional
  placeholder
  type
  page
}
    ` as unknown as DocumentNode<Types.PrConfigurationFragment, unknown>;
export const PrConfirmationFragmentDoc = /*#__PURE__*/ gql`
    fragment PrConfirmation on PrConfirmation {
  checklist {
    label
  }
  text
}
    ` as unknown as DocumentNode<Types.PrConfirmationFragment, unknown>;
export const PrAutomationFragmentDoc = /*#__PURE__*/ gql`
    fragment PrAutomation on PrAutomation {
  id
  name
  icon
  darkIcon
  documentation
  addon
  identifier
  cluster {
    ...ClusterBasic
  }
  service {
    id
    name
  }
  role
  connection {
    ...ScmConnection
  }
  createBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  configuration {
    ...PrConfiguration
  }
  confirmation {
    ...PrConfirmation
  }
}
    ${ClusterBasicFragmentDoc}
${ScmConnectionFragmentDoc}
${PolicyBindingFragmentDoc}
${PrConfigurationFragmentDoc}
${PrConfirmationFragmentDoc}` as unknown as DocumentNode<Types.PrAutomationFragment, unknown>;
export const ChatFragmentDoc = /*#__PURE__*/ gql`
    fragment Chat on Chat {
  id
  content
  role
  seq
  type
  confirm
  confirmedAt
  attributes {
    file {
      name
    }
    tool {
      name
      arguments
    }
    prCall {
      context
      branch
    }
  }
  pullRequest {
    ...PullRequest
  }
  prAutomation {
    ...PrAutomation
  }
  agentRun {
    ...AgentRunTiny
  }
  server {
    id
    name
  }
  insertedAt
  updatedAt
}
    ${PullRequestFragmentDoc}
${PrAutomationFragmentDoc}
${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.ChatFragment, unknown>;
export const ChatThreadMessagesFragmentDoc = /*#__PURE__*/ gql`
    fragment ChatThreadMessages on ChatThread {
  id
  chats(
    first: $first
    last: $last
    after: $after
    before: $before
    reverse: $reverse
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Chat
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ChatFragmentDoc}` as unknown as DocumentNode<Types.ChatThreadMessagesFragment, unknown>;
export const CloudConnectionTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudConnectionTiny on CloudConnection {
  id
  name
  provider
}
    ` as unknown as DocumentNode<Types.CloudConnectionTinyFragment, unknown>;
export const CloudConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudConnection on CloudConnection {
  ...CloudConnectionTiny
  configuration {
    aws {
      accessKeyId
      region
      assumeRoleArn
    }
    gcp {
      projectId
    }
    azure {
      subscriptionId
      tenantId
      clientId
    }
    vsphere {
      server
      user
      allowUnverifiedSsl
    }
  }
  readBindings {
    ...PolicyBinding
  }
}
    ${CloudConnectionTinyFragmentDoc}
${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.CloudConnectionFragment, unknown>;
export const ServiceDeploymentTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentTiny on ServiceDeployment {
  id
  name
  cluster {
    ...ClusterMinimal
  }
  componentStatus
  status
  errors {
    message
    source
  }
}
    ${ClusterMinimalFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentTinyFragment, unknown>;
export const ServiceDeploymentChatFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentChat on ServiceDeployment {
  ...ServiceDeploymentTiny
  protect
  insight {
    ...AiInsightSummary
  }
}
    ${ServiceDeploymentTinyFragmentDoc}
${AiInsightSummaryFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentChatFragment, unknown>;
export const StackTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment StackTiny on InfrastructureStack {
  id
  insertedAt
  updatedAt
  deletedAt
  name
  type
  repository {
    url
    pulledAt
  }
  paused
  status
  insight {
    ...AiInsightSummary
  }
  parent {
    id
  }
}
    ${AiInsightSummaryFragmentDoc}` as unknown as DocumentNode<Types.StackTinyFragment, unknown>;
export const StackChatFragmentDoc = /*#__PURE__*/ gql`
    fragment StackChat on InfrastructureStack {
  ...StackTiny
  insight {
    ...AiInsightSummary
  }
}
    ${StackTinyFragmentDoc}
${AiInsightSummaryFragmentDoc}` as unknown as DocumentNode<Types.StackChatFragment, unknown>;
export const AiDeltaFragmentDoc = /*#__PURE__*/ gql`
    fragment AiDelta on AiDelta {
  seq
  message
  role
  content
  tool {
    id
    name
    arguments
    pending
  }
}
    ` as unknown as DocumentNode<Types.AiDeltaFragment, unknown>;
export const InfraResearchAnalysisFragmentDoc = /*#__PURE__*/ gql`
    fragment InfraResearchAnalysis on InfraResearchAnalysis {
  notes
  summary
}
    ` as unknown as DocumentNode<Types.InfraResearchAnalysisFragment, unknown>;
export const StackMinimalFragmentDoc = /*#__PURE__*/ gql`
    fragment StackMinimal on InfrastructureStack {
  id
  name
  type
  status
  insertedAt
  updatedAt
  deletedAt
}
    ` as unknown as DocumentNode<Types.StackMinimalFragment, unknown>;
export const InfraResearchAssociationFragmentDoc = /*#__PURE__*/ gql`
    fragment InfraResearchAssociation on InfraResearchAssociation {
  id
  stack {
    ...StackMinimal
  }
  service {
    ...ServiceDeploymentTiny
  }
}
    ${StackMinimalFragmentDoc}
${ServiceDeploymentTinyFragmentDoc}` as unknown as DocumentNode<Types.InfraResearchAssociationFragment, unknown>;
export const InfraResearchFragmentDoc = /*#__PURE__*/ gql`
    fragment InfraResearch on InfraResearch {
  id
  prompt
  status
  diagram
  published
  analysis {
    ...InfraResearchAnalysis
  }
  threads {
    ...ChatThreadTiny
  }
  associations {
    ...InfraResearchAssociation
  }
  user {
    id
    name
  }
  insertedAt
  updatedAt
}
    ${InfraResearchAnalysisFragmentDoc}
${ChatThreadTinyFragmentDoc}
${InfraResearchAssociationFragmentDoc}` as unknown as DocumentNode<Types.InfraResearchFragment, unknown>;
export const ClusterInsightComponentFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterInsightComponent on ClusterInsightComponent {
  id
  kind
  name
  namespace
  group
  version
  priority
  service {
    id
    name
    cluster {
      id
    }
  }
  insight {
    ...AiInsight
  }
}
    ${AiInsightFragmentDoc}` as unknown as DocumentNode<Types.ClusterInsightComponentFragment, unknown>;
export const ClusterInsightComponentDetailFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterInsightComponentDetail on ClusterInsightComponent {
  ...ClusterInsightComponent
  resource {
    raw
  }
}
    ${ClusterInsightComponentFragmentDoc}` as unknown as DocumentNode<Types.ClusterInsightComponentDetailFragment, unknown>;
export const PersonaConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment PersonaConfiguration on PersonaConfiguration {
  all
  deployments {
    addOns
    clusters
    pipelines
    providers
    repositories
    services
  }
  home {
    manager
    security
  }
  flows {
    permissions
    startWorkbenchJob
    pipelines
    previews
    workbenches
  }
  sidebar {
    audits
    flows
    kubernetes
    pullRequests
    settings
    backups
    stacks
    workbenches
    security
    cost
    cd
    ai
  }
  services {
    configuration
    secrets
  }
  settings {
    accessTokens
    ai
    audits
    chatbots
    cloudConnections
    global
    notifications
    projects
    userManagement
    webhooks
  }
  ai {
    pr
  }
}
    ` as unknown as DocumentNode<Types.PersonaConfigurationFragment, unknown>;
export const PersonaFragmentDoc = /*#__PURE__*/ gql`
    fragment Persona on Persona {
  id
  name
  description
  role
  bindings {
    ...PolicyBinding
  }
  configuration {
    ...PersonaConfiguration
  }
}
    ${PolicyBindingFragmentDoc}
${PersonaConfigurationFragmentDoc}` as unknown as DocumentNode<Types.PersonaFragment, unknown>;
export const UserFragmentDoc = /*#__PURE__*/ gql`
    fragment User on User {
  id
  pluralId
  name
  email
  emailSettings {
    digest
  }
  profile
  backgroundColor
  readTimestamp
  roles {
    admin
  }
  personas {
    ...Persona
  }
  homepage
}
    ${PersonaFragmentDoc}` as unknown as DocumentNode<Types.UserFragment, unknown>;
export const McpServerAuditFragmentDoc = /*#__PURE__*/ gql`
    fragment McpServerAudit on McpServerAudit {
  id
  actor {
    ...User
  }
  arguments
  tool
  insertedAt
  updatedAt
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.McpServerAuditFragment, unknown>;
export const McpServerConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment McpServerConnection on McpServerConnection {
  pageInfo {
    ...PageInfo
  }
  edges {
    node {
      ...McpServer
    }
  }
}
    ${PageInfoFragmentDoc}
${McpServerFragmentDoc}` as unknown as DocumentNode<Types.McpServerConnectionFragment, unknown>;
export const ContainerSpecFragmentDoc = /*#__PURE__*/ gql`
    fragment ContainerSpec on ContainerSpec {
  args
  env {
    name
    value
  }
  envFrom {
    configMap
    secret
  }
  image
}
    ` as unknown as DocumentNode<Types.ContainerSpecFragment, unknown>;
export const JobGateSpecFragmentDoc = /*#__PURE__*/ gql`
    fragment JobGateSpec on JobGateSpec {
  annotations
  containers {
    ...ContainerSpec
  }
  labels
  namespace
  raw
  serviceAccount
}
    ${ContainerSpecFragmentDoc}` as unknown as DocumentNode<Types.JobGateSpecFragment, unknown>;
export const SentinelCheckConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelCheckConfiguration on SentinelCheckConfiguration {
  log {
    namespaces
    query
    clusterId
    duration
    facets {
      ...LogFacet
    }
  }
  kubernetes {
    group
    version
    kind
    name
    namespace
  }
  integrationTest {
    distro
    format
    tags
    cases {
      type
      name
      loadbalancer {
        namePrefix
        namespace
        annotations
        dnsProbe {
          fqdn
          delay
          retries
        }
      }
      pvc {
        namePrefix
        storageClass
        size
      }
      coredns {
        dialFqdns
        delay
        retries
      }
    }
    job {
      ...JobGateSpec
    }
  }
}
    ${LogFacetFragmentDoc}
${JobGateSpecFragmentDoc}` as unknown as DocumentNode<Types.SentinelCheckConfigurationFragment, unknown>;
export const SentinelCheckFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelCheck on SentinelCheck {
  name
  type
  ruleFile
  configuration {
    ...SentinelCheckConfiguration
  }
}
    ${SentinelCheckConfigurationFragmentDoc}` as unknown as DocumentNode<Types.SentinelCheckFragment, unknown>;
export const SentinelFragmentDoc = /*#__PURE__*/ gql`
    fragment Sentinel on Sentinel {
  id
  name
  description
  status
  crontab
  nextRunAt
  lastRunAt
  git {
    ref
    folder
  }
  repository {
    id
    url
    httpsPath
  }
  checks {
    ...SentinelCheck
  }
  insertedAt
  updatedAt
}
    ${SentinelCheckFragmentDoc}` as unknown as DocumentNode<Types.SentinelFragment, unknown>;
export const SentinelRunTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelRunTiny on SentinelRun {
  id
  status
  insertedAt
  completedAt
}
    ` as unknown as DocumentNode<Types.SentinelRunTinyFragment, unknown>;
export const SentinelRunResultFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelRunResult on SentinelRunResult {
  name
  reason
  status
  successfulCount
  failedCount
  jobCount
}
    ` as unknown as DocumentNode<Types.SentinelRunResultFragment, unknown>;
export const SentinelRunFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelRun on SentinelRun {
  ...SentinelRunTiny
  results {
    ...SentinelRunResult
  }
  checks {
    ...SentinelCheck
  }
  sentinel {
    id
    name
    description
    repository {
      httpsPath
    }
  }
}
    ${SentinelRunTinyFragmentDoc}
${SentinelRunResultFragmentDoc}
${SentinelCheckFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunFragment, unknown>;
export const SentinelStatisticFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelStatistic on SentinelStatistic {
  status
  count
}
    ` as unknown as DocumentNode<Types.SentinelStatisticFragment, unknown>;
export const SentinelRunJobTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelRunJobTiny on SentinelRunJob {
  id
  status
  cluster {
    ...ClusterMinimal
  }
  reference {
    namespace
    name
  }
  insertedAt
  completedAt
}
    ${ClusterMinimalFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunJobTinyFragment, unknown>;
export const SentinelRunJobFragmentDoc = /*#__PURE__*/ gql`
    fragment SentinelRunJob on SentinelRunJob {
  ...SentinelRunJobTiny
  format
  output
  sentinelRun {
    id
    sentinel {
      id
      name
    }
  }
}
    ${SentinelRunJobTinyFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunJobFragment, unknown>;
export const AlertResolutionFragmentDoc = /*#__PURE__*/ gql`
    fragment AlertResolution on AlertResolution {
  resolution
}
    ` as unknown as DocumentNode<Types.AlertResolutionFragment, unknown>;
export const AlertFragmentDoc = /*#__PURE__*/ gql`
    fragment Alert on Alert {
  id
  title
  message
  type
  severity
  state
  fingerprint
  url
  annotations
  tags {
    id
    name
    value
  }
  insight {
    ...AiInsight
  }
  resolution {
    ...AlertResolution
  }
  workbench {
    id
  }
  workbenchJob {
    id
    status
  }
  updatedAt
}
    ${AiInsightFragmentDoc}
${AlertResolutionFragmentDoc}` as unknown as DocumentNode<Types.AlertFragment, unknown>;
export const AlertConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment AlertConnection on AlertConnection {
  edges {
    node {
      ...Alert
    }
  }
  pageInfo {
    ...PageInfo
  }
}
    ${AlertFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.AlertConnectionFragment, unknown>;
export const AuditFragmentDoc = /*#__PURE__*/ gql`
    fragment Audit on Audit {
  id
  type
  action
  repository
  ip
  city
  country
  latitude
  longitude
  actor {
    ...User
  }
  insertedAt
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.AuditFragment, unknown>;
export const ScmWebhookFragmentDoc = /*#__PURE__*/ gql`
    fragment ScmWebhook on ScmWebhook {
  id
  name
  owner
  type
  url
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.ScmWebhookFragment, unknown>;
export const AwaitingReviewStackFragmentDoc = /*#__PURE__*/ gql`
    fragment AwaitingReviewStack on InfrastructureStack {
  id
  name
  status
  runs(first: 50) {
    edges {
      node {
        id
        status
        message
        approvalResult {
          reason
          result
        }
        configuration {
          aiApproval {
            enabled
          }
        }
        pullRequest {
          id
          title
        }
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.AwaitingReviewStackFragment, unknown>;
export const AwaitingReviewAgentRunFragmentDoc = /*#__PURE__*/ gql`
    fragment AwaitingReviewAgentRun on AgentRun {
  id
  status
  approvedAt
  prompt
  repository
  runtime {
    id
    name
    type
  }
  analysis {
    summary
  }
  pullRequests {
    ...PullRequestBasic
  }
  workbenchJob {
    id
    insertedAt
    workbench {
      id
      name
    }
  }
}
    ${PullRequestBasicFragmentDoc}` as unknown as DocumentNode<Types.AwaitingReviewAgentRunFragment, unknown>;
export const AwaitingReviewWorkbenchActivityFragmentDoc = /*#__PURE__*/ gql`
    fragment AwaitingReviewWorkbenchActivity on WorkbenchJobActivity {
  id
  type
  status
  prompt
  result {
    explanation
    functionCall {
      name
      input
      toolId
      tool {
        id
        name
        tool
        configuration {
          lambda {
            description
          }
          cloudRun {
            description
          }
          azureFunction {
            description
          }
        }
      }
    }
    kubeRequest {
      handle
      method
      path
    }
    kubeDrain {
      handle
      node
      explanation
    }
    kubeExec {
      handle
      command
      namespace
      pod
      container
    }
  }
  workbenchJob {
    id
    prompt
    insertedAt
    result {
      workingTheory
    }
    workbench {
      id
      name
    }
  }
}
    ` as unknown as DocumentNode<Types.AwaitingReviewWorkbenchActivityFragment, unknown>;
export const ObjectStoreFragmentDoc = /*#__PURE__*/ gql`
    fragment ObjectStore on ObjectStore {
  id
  name
  s3 {
    bucket
    region
    endpoint
    accessKeyId
  }
  azure {
    container
    storageAccount
    resourceGroup
    subscriptionId
    clientId
    tenantId
  }
  gcs {
    bucket
  }
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.ObjectStoreFragment, unknown>;
export const ClustersObjectStoresFragmentDoc = /*#__PURE__*/ gql`
    fragment ClustersObjectStores on Cluster {
  ...ClusterBasic
  objectStore {
    ...ObjectStore
  }
}
    ${ClusterBasicFragmentDoc}
${ObjectStoreFragmentDoc}` as unknown as DocumentNode<Types.ClustersObjectStoresFragment, unknown>;
export const ClusterBackupFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterBackup on ClusterBackup {
  id
  cluster {
    ...ClusterBasic
  }
  garbageCollected
  insertedAt
  updatedAt
}
    ${ClusterBasicFragmentDoc}` as unknown as DocumentNode<Types.ClusterBackupFragment, unknown>;
export const ClusterRestoreFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterRestore on ClusterRestore {
  id
  status
  backup {
    ...ClusterBackup
  }
  insertedAt
  updatedAt
}
    ${ClusterBackupFragmentDoc}` as unknown as DocumentNode<Types.ClusterRestoreFragment, unknown>;
export const CatalogFragmentDoc = /*#__PURE__*/ gql`
    fragment Catalog on Catalog {
  id
  name
  author
  description
  category
  icon
  darkIcon
  createBindings {
    ...PolicyBinding
  }
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.CatalogFragment, unknown>;
export const CatalogSearchItemFragmentDoc = /*#__PURE__*/ gql`
    fragment CatalogSearchItem on CatalogSearchItem {
  id
  name
  author
  description
  category
  icon
  darkIcon
}
    ` as unknown as DocumentNode<Types.CatalogSearchItemFragment, unknown>;
export const PrAutomationSearchItemFragmentDoc = /*#__PURE__*/ gql`
    fragment PrAutomationSearchItem on PrAutomationSearchItem {
  id
  name
  documentation
  identifier
  role
  icon
  darkIcon
  cluster {
    id
    name
  }
}
    ` as unknown as DocumentNode<Types.PrAutomationSearchItemFragment, unknown>;
export const ClusterConditionFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterCondition on ClusterCondition {
  lastTransitionTime
  message
  reason
  severity
  status
  type
}
    ` as unknown as DocumentNode<Types.ClusterConditionFragment, unknown>;
export const AddonVersionFragmentDoc = /*#__PURE__*/ gql`
    fragment AddonVersion on AddonVersion {
  version
  kube
  chartVersion
  incompatibilities {
    version
    name
  }
  requirements {
    version
    name
  }
}
    ` as unknown as DocumentNode<Types.AddonVersionFragment, unknown>;
export const AddonVersionBlockingFragmentDoc = /*#__PURE__*/ gql`
    fragment AddonVersionBlocking on AddonVersion {
  blocking(kubeVersion: $kubeVersion)
}
    ` as unknown as DocumentNode<Types.AddonVersionBlockingFragment, unknown>;
export const RuntimeServiceDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment RuntimeServiceDetails on RuntimeService {
  id
  name
  version
  addon {
    icon
    versions {
      ...AddonVersion
    }
    releaseUrl(version: $version)
  }
  addonVersion {
    ...AddonVersionBlocking @include(if: $hasKubeVersion)
    ...AddonVersion
  }
}
    ${AddonVersionFragmentDoc}
${AddonVersionBlockingFragmentDoc}` as unknown as DocumentNode<Types.RuntimeServiceDetailsFragment, unknown>;
export const MetricResponseFragmentDoc = /*#__PURE__*/ gql`
    fragment MetricResponse on MetricResponse {
  metric
  values {
    timestamp
    value
  }
}
    ` as unknown as DocumentNode<Types.MetricResponseFragment, unknown>;
export const ClusterNodeMetricsFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterNodeMetrics on Cluster {
  id
  clusterNodeMetrics(node: $node, start: $start, stop: $stop, step: $step) {
    cpu {
      ...MetricResponse
    }
    cpuUsage {
      ...MetricResponse
    }
    memory {
      ...MetricResponse
    }
    memoryUsage {
      ...MetricResponse
    }
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.ClusterNodeMetricsFragment, unknown>;
export const ClusterUpgradePlanFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUpgradePlan on ClusterUpgradePlan {
  compatibilities
  deprecations
  incompatibilities
  kubeletSkew
}
    ` as unknown as DocumentNode<Types.ClusterUpgradePlanFragment, unknown>;
export const ClustersRowFragmentDoc = /*#__PURE__*/ gql`
    fragment ClustersRow on Cluster {
  currentVersion
  id
  self
  healthy
  healthScore
  protect
  name
  handle
  distro
  cpuTotal
  memoryTotal
  cpuUtil
  nodeCount
  namespaceCount
  availabilityZones
  podCount
  memoryUtil
  installed
  pingedAt
  deletedAt
  provider {
    id
    cloud
    name
    namespace
    supportedVersions
  }
  service {
    id
    repository {
      url
    }
  }
  version
  kubeletVersion
  tags {
    name
    value
  }
  upgradePlan {
    ...ClusterUpgradePlan
  }
  virtual
  insight {
    ...AiInsightSummary
  }
  extendedSupport {
    extended
    extendedFrom
  }
  disableAi
  remediationMinPriority
  remediationWindow
  remediationMaxJobs
  remediationWorkbench {
    id
    name
  }
}
    ${ClusterUpgradePlanFragmentDoc}
${AiInsightSummaryFragmentDoc}` as unknown as DocumentNode<Types.ClustersRowFragment, unknown>;
export const ApiDeprecationFragmentDoc = /*#__PURE__*/ gql`
    fragment ApiDeprecation on ApiDeprecation {
  availableIn
  blocking
  component {
    group
    version
    kind
    name
    namespace
    service {
      git {
        ref
        folder
      }
      repository {
        httpsPath
        urlFormat
      }
    }
  }
  deprecatedIn
  removedIn
  replacement
}
    ` as unknown as DocumentNode<Types.ApiDeprecationFragment, unknown>;
export const TaintFragmentDoc = /*#__PURE__*/ gql`
    fragment Taint on Taint {
  effect
  key
  value
}
    ` as unknown as DocumentNode<Types.TaintFragment, unknown>;
export const NodePoolFragmentDoc = /*#__PURE__*/ gql`
    fragment NodePool on NodePool {
  id
  name
  minSize
  maxSize
  instanceType
  spot
  labels
  taints {
    ...Taint
  }
}
    ${TaintFragmentDoc}` as unknown as DocumentNode<Types.NodePoolFragment, unknown>;
export const ClusterFragmentDoc = /*#__PURE__*/ gql`
    fragment Cluster on Cluster {
  ...ClustersRow
  apiDeprecations {
    ...ApiDeprecation
  }
  currentVersion
  id
  name
  handle
  metadata
  nodePools {
    ...NodePool
  }
  pingedAt
  provider {
    id
    cloud
    name
    namespace
    supportedVersions
  }
  self
  service {
    id
    name
    repository {
      url
    }
  }
  version
  tags {
    name
    value
  }
  parentCluster {
    ...ClustersRow
  }
  operationalLayout {
    serviceMesh
  }
  alerts(first: 500) {
    edges {
      node {
        id
      }
    }
  }
}
    ${ClustersRowFragmentDoc}
${ApiDeprecationFragmentDoc}
${NodePoolFragmentDoc}` as unknown as DocumentNode<Types.ClusterFragment, unknown>;
export const MetadataFragmentDoc = /*#__PURE__*/ gql`
    fragment Metadata on Metadata {
  uid
  name
  namespace
  labels {
    name
    value
  }
  annotations {
    name
    value
  }
  creationTimestamp
}
    ` as unknown as DocumentNode<Types.MetadataFragment, unknown>;
export const ClusterNodeFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterNode on Node {
  metadata {
    ...Metadata
  }
  status {
    phase
    allocatable
    capacity
    conditions {
      type
      status
      message
    }
  }
  spec {
    podCidr
    providerId
  }
}
    ${MetadataFragmentDoc}` as unknown as DocumentNode<Types.ClusterNodeFragment, unknown>;
export const NodeMetricFragmentDoc = /*#__PURE__*/ gql`
    fragment NodeMetric on NodeMetric {
  metadata {
    ...Metadata
  }
  usage {
    cpu
    memory
  }
  timestamp
  window
}
    ${MetadataFragmentDoc}` as unknown as DocumentNode<Types.NodeMetricFragment, unknown>;
export const ClusterWithNodesFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterWithNodes on Cluster {
  ...ClusterBasic
  nodes {
    ...ClusterNode
  }
  nodeMetrics {
    ...NodeMetric
  }
}
    ${ClusterBasicFragmentDoc}
${ClusterNodeFragmentDoc}
${NodeMetricFragmentDoc}` as unknown as DocumentNode<Types.ClusterWithNodesFragment, unknown>;
export const ClusterWithMetricsFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterWithMetrics on Cluster {
  ...ClusterWithNodes
  clusterMetrics(start: $start, stop: $stop, step: $step) {
    cpu {
      ...MetricResponse
    }
    cpuUsage {
      ...MetricResponse
    }
    cpuRequests {
      ...MetricResponse
    }
    cpuLimits {
      ...MetricResponse
    }
    memory {
      ...MetricResponse
    }
    memoryUsage {
      ...MetricResponse
    }
    memoryRequests {
      ...MetricResponse
    }
    memoryLimits {
      ...MetricResponse
    }
    pods {
      ...MetricResponse
    }
  }
}
    ${ClusterWithNodesFragmentDoc}
${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.ClusterWithMetricsFragment, unknown>;
export const ClusterBindingsFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterBindings on Cluster {
  id
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.ClusterBindingsFragment, unknown>;
export const ClusterStatusInfoFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterStatusInfo on ClusterStatusInfo {
  count
  healthy
}
    ` as unknown as DocumentNode<Types.ClusterStatusInfoFragment, unknown>;
export const ClusterUsageMetricsFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUsageMetrics on ClusterUsageMetrics {
  cpu @include(if: $cpu) {
    ...MetricResponse
  }
  cpuRequests @include(if: $cpuRequests) {
    ...MetricResponse
  }
  cpuLimits @include(if: $cpuLimits) {
    ...MetricResponse
  }
  cpuAllocatable @include(if: $cpuAllocatable) {
    ...MetricResponse
  }
  cpuThrottling @include(if: $cpuThrottling) {
    ...MetricResponse
  }
  memory @include(if: $memory) {
    ...MetricResponse
  }
  memoryRequests @include(if: $memoryRequests) {
    ...MetricResponse
  }
  memoryLimits @include(if: $memoryLimits) {
    ...MetricResponse
  }
  memoryAllocatable @include(if: $memoryAllocatable) {
    ...MetricResponse
  }
  oomKills @include(if: $oomKills) {
    ...MetricResponse
  }
  networkReceive @include(if: $networkReceive) {
    ...MetricResponse
  }
  networkTransmit @include(if: $networkTransmit) {
    ...MetricResponse
  }
  networkReceiveDropped @include(if: $networkReceiveDropped) {
    ...MetricResponse
  }
  networkTransmitDropped @include(if: $networkTransmitDropped) {
    ...MetricResponse
  }
  ephemeralStorage @include(if: $ephemeralStorage) {
    ...MetricResponse
  }
  fsReads @include(if: $fsReads) {
    ...MetricResponse
  }
  fsWrites @include(if: $fsWrites) {
    ...MetricResponse
  }
  volumeUsage @include(if: $volumeUsage) {
    ...MetricResponse
  }
  volumeCapacity @include(if: $volumeCapacity) {
    ...MetricResponse
  }
  volumeFullness @include(if: $volumeFullness) {
    ...MetricResponse
  }
  podsRunning @include(if: $podsRunning) {
    ...MetricResponse
  }
  podsPending @include(if: $podsPending) {
    ...MetricResponse
  }
  restarts @include(if: $restarts) {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsageMetricsFragment, unknown>;
export const NetworkMeshWorkloadFragmentDoc = /*#__PURE__*/ gql`
    fragment NetworkMeshWorkload on NetworkMeshWorkload {
  id
  name
  namespace
  service
}
    ` as unknown as DocumentNode<Types.NetworkMeshWorkloadFragment, unknown>;
export const NetworkMeshStatisticsFragmentDoc = /*#__PURE__*/ gql`
    fragment NetworkMeshStatistics on NetworkMeshStatistics {
  bytes
  packets
  connections
  http200
  http400
  http500
  httpClientLatency
}
    ` as unknown as DocumentNode<Types.NetworkMeshStatisticsFragment, unknown>;
export const NetworkMeshEdgeFragmentDoc = /*#__PURE__*/ gql`
    fragment NetworkMeshEdge on NetworkMeshEdge {
  id
  from {
    ...NetworkMeshWorkload
  }
  to {
    ...NetworkMeshWorkload
  }
  statistics {
    ...NetworkMeshStatistics
  }
}
    ${NetworkMeshWorkloadFragmentDoc}
${NetworkMeshStatisticsFragmentDoc}` as unknown as DocumentNode<Types.NetworkMeshEdgeFragment, unknown>;
export const ClusterKubernetesMetricsFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterKubernetesMetrics on Cluster {
  id
  componentMetrics(
    group: $group
    version: $version
    kind: $kind
    name: $name
    namespace: $namespace
    start: $start
    stop: $stop
    step: $step
  ) {
    cpu {
      ...MetricResponse
    }
    mem {
      ...MetricResponse
    }
    podCpu {
      ...MetricResponse
    }
    podMem {
      ...MetricResponse
    }
    cpuRequests {
      ...MetricResponse
    }
    memRequests {
      ...MetricResponse
    }
    cpuLimits {
      ...MetricResponse
    }
    memLimits {
      ...MetricResponse
    }
    podCpuRequests {
      ...MetricResponse
    }
    podMemRequests {
      ...MetricResponse
    }
    podCpuLimits {
      ...MetricResponse
    }
    podMemLimits {
      ...MetricResponse
    }
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.ClusterKubernetesMetricsFragment, unknown>;
export const NodeUsageMetricsFragmentDoc = /*#__PURE__*/ gql`
    fragment NodeUsageMetrics on NodeUsageMetrics {
  cpuUtilization @include(if: $cpuUtilization) {
    ...MetricResponse
  }
  cpuModes @include(if: $cpuModes) {
    ...MetricResponse
  }
  cpuCores @include(if: $cpuCores) {
    ...MetricResponse
  }
  load1 @include(if: $load1) {
    ...MetricResponse
  }
  load5 @include(if: $load5) {
    ...MetricResponse
  }
  load15 @include(if: $load15) {
    ...MetricResponse
  }
  memoryTotal @include(if: $memoryTotal) {
    ...MetricResponse
  }
  memoryUsed @include(if: $memoryUsed) {
    ...MetricResponse
  }
  memoryCached @include(if: $memoryCached) {
    ...MetricResponse
  }
  majorPageFaults @include(if: $majorPageFaults) {
    ...MetricResponse
  }
  filesystemFullness @include(if: $filesystemFullness) {
    ...MetricResponse
  }
  diskRead @include(if: $diskRead) {
    ...MetricResponse
  }
  diskWrite @include(if: $diskWrite) {
    ...MetricResponse
  }
  diskBusy @include(if: $diskBusy) {
    ...MetricResponse
  }
  networkReceive @include(if: $networkReceive) {
    ...MetricResponse
  }
  networkTransmit @include(if: $networkTransmit) {
    ...MetricResponse
  }
  networkErrors @include(if: $networkErrors) {
    ...MetricResponse
  }
  networkDropped @include(if: $networkDropped) {
    ...MetricResponse
  }
  cpu @include(if: $cpu) {
    ...MetricResponse
  }
  cpuRequests @include(if: $cpuRequests) {
    ...MetricResponse
  }
  cpuLimits @include(if: $cpuLimits) {
    ...MetricResponse
  }
  cpuAllocatable @include(if: $cpuAllocatable) {
    ...MetricResponse
  }
  memory @include(if: $memory) {
    ...MetricResponse
  }
  memoryRequests @include(if: $memoryRequests) {
    ...MetricResponse
  }
  memoryLimits @include(if: $memoryLimits) {
    ...MetricResponse
  }
  memoryAllocatable @include(if: $memoryAllocatable) {
    ...MetricResponse
  }
  oomKills @include(if: $oomKills) {
    ...MetricResponse
  }
  podsRunning @include(if: $podsRunning) {
    ...MetricResponse
  }
  podsAllocatable @include(if: $podsAllocatable) {
    ...MetricResponse
  }
  restarts @include(if: $restarts) {
    ...MetricResponse
  }
  conditions @include(if: $conditions) {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.NodeUsageMetricsFragment, unknown>;
export const ComponentMetricsFragmentFragmentDoc = /*#__PURE__*/ gql`
    fragment ComponentMetricsFragment on ServiceDeployment {
  componentMetrics(
    componentId: $componentId
    start: $start
    stop: $stop
    step: $step
  ) {
    cpu {
      ...MetricResponse
    }
    mem {
      ...MetricResponse
    }
    podCpu {
      ...MetricResponse
    }
    podMem {
      ...MetricResponse
    }
    cpuRequests {
      ...MetricResponse
    }
    memRequests {
      ...MetricResponse
    }
    cpuLimits {
      ...MetricResponse
    }
    memLimits {
      ...MetricResponse
    }
    podCpuRequests {
      ...MetricResponse
    }
    podMemRequests {
      ...MetricResponse
    }
    podCpuLimits {
      ...MetricResponse
    }
    podMemLimits {
      ...MetricResponse
    }
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.ComponentMetricsFragmentFragment, unknown>;
export const ServiceFileFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceFile on ServiceFile {
  path
  content
}
    ` as unknown as DocumentNode<Types.ServiceFileFragment, unknown>;
export const HelmRepositoryFragmentDoc = /*#__PURE__*/ gql`
    fragment HelmRepository on HelmRepository {
  id
  url
  health
  provider
  insertedAt
  pulledAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.HelmRepositoryFragment, unknown>;
export const FluxHelmRepositoryFragmentDoc = /*#__PURE__*/ gql`
    fragment FluxHelmRepository on FluxHelmRepository {
  metadata {
    namespace
    name
  }
  spec {
    url
    type
    provider
  }
  status {
    ready
    message
  }
}
    ` as unknown as DocumentNode<Types.FluxHelmRepositoryFragment, unknown>;
export const HelmChartVersionFragmentDoc = /*#__PURE__*/ gql`
    fragment HelmChartVersion on HelmChartVersion {
  name
  appVersion
  version
  digest
}
    ` as unknown as DocumentNode<Types.HelmChartVersionFragment, unknown>;
export const ProjectTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment ProjectTiny on Project {
  id
  name
  default
  description
}
    ` as unknown as DocumentNode<Types.ProjectTinyFragment, unknown>;
export const ServiceDeploymentsRowFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentsRow on ServiceDeployment {
  id
  name
  namespace
  protect
  promotion
  message
  git {
    ref
    folder
  }
  helm {
    chart
    version
    url
    repository {
      namespace
      name
    }
  }
  cluster {
    ...ClusterMinimal
  }
  helmRepository {
    spec {
      url
    }
    status {
      ready
      message
    }
  }
  repository {
    id
    url
    httpsPath
  }
  insertedAt
  updatedAt
  deletedAt
  componentStatus
  status
  errors {
    message
    source
    warning
  }
  globalService {
    id
    name
  }
  dryRun
  insight {
    ...AiInsightSummary
  }
}
    ${ClusterMinimalFragmentDoc}
${AiInsightSummaryFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentsRowFragment, unknown>;
export const GitRepositoryFragmentDoc = /*#__PURE__*/ gql`
    fragment GitRepository on GitRepository {
  id
  url
  health
  authMethod
  editable
  error
  insertedAt
  pulledAt
  updatedAt
  urlFormat
  httpsPath
  recurseSubmodules
}
    ` as unknown as DocumentNode<Types.GitRepositoryFragment, unknown>;
export const ServiceTemplateWithoutConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceTemplateWithoutConfiguration on ServiceTemplate {
  contexts
  dependencies {
    id
    name
    status
  }
  git {
    folder
    ref
  }
  helm {
    chart
    git {
      folder
      ref
    }
    ignoreCrds
    ignoreHooks
    release
    repository {
      name
      namespace
    }
    set {
      name
      value
    }
    url
    values
    valuesFiles
    version
  }
  kustomize {
    path
    enableHelm
  }
  name
  namespace
  repository {
    ...GitRepository
  }
  repositoryId
  syncConfig {
    createNamespace
    enforceNamespace
    namespaceMetadata {
      annotations
      labels
    }
  }
  templated
}
    ${GitRepositoryFragmentDoc}` as unknown as DocumentNode<Types.ServiceTemplateWithoutConfigurationFragment, unknown>;
export const GlobalServiceFragmentDoc = /*#__PURE__*/ gql`
    fragment GlobalService on GlobalService {
  id
  distro
  name
  project {
    ...ProjectTiny
  }
  cascade {
    delete
    detach
  }
  provider {
    id
    name
    cloud
    namespace
  }
  reparent
  service {
    ...ServiceDeploymentsRow
  }
  tags {
    name
    value
  }
  template {
    ...ServiceTemplateWithoutConfiguration
  }
  parent {
    id
    name
  }
  insertedAt
  updatedAt
  mgmt
}
    ${ProjectTinyFragmentDoc}
${ServiceDeploymentsRowFragmentDoc}
${ServiceTemplateWithoutConfigurationFragmentDoc}` as unknown as DocumentNode<Types.GlobalServiceFragment, unknown>;
export const HttpConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment HttpConnection on HttpConnection {
  host
  user
}
    ` as unknown as DocumentNode<Types.HttpConnectionFragment, unknown>;
export const SmtpSettingsFragmentDoc = /*#__PURE__*/ gql`
    fragment SmtpSettings on SmtpSettings {
  server
  port
  sender
  user
  ssl
}
    ` as unknown as DocumentNode<Types.SmtpSettingsFragment, unknown>;
export const AiSettingsFragmentDoc = /*#__PURE__*/ gql`
    fragment AiSettings on AiSettings {
  anthropic {
    baseUrl
    model
    toolModel
    proxy {
      enabled
      url
      noproxy
    }
  }
  openai {
    baseUrl
    model
    toolModel
    embeddingModel
    method
    proxy {
      enabled
      url
      noproxy
    }
  }
  openaiCompatible {
    baseUrl
    model
    toolModel
    embeddingModel
    method
    proxy {
      enabled
      url
      noproxy
    }
  }
  xai {
    baseUrl
    model
    toolModel
    embeddingModel
    method
    proxy {
      enabled
      url
      noproxy
    }
  }
  azure {
    apiVersion
    endpoint
    model
    embeddingModel
    toolModel
    proxy {
      enabled
      url
      noproxy
    }
  }
  ollama {
    model
    toolModel
    url
    proxy {
      enabled
      url
      noproxy
    }
  }
  vertex {
    model
    embeddingModel
    toolModel
    project
    location
    endpoint
    proxy {
      enabled
      url
      noproxy
    }
  }
  bedrock {
    modelId
    toolModelId
    embeddingModel
    modelSettings {
      modelId
      inferenceProfileArn
    }
    endpoint
    accessKeyId
    region
    proxy {
      enabled
      url
      noproxy
    }
  }
  enabled
  toolsEnabled
  provider
  toolProvider
  embeddingProvider
  analysisRates {
    fast
    slow
  }
  logAnalysis
  vectorStore {
    enabled
    store
  }
}
    ` as unknown as DocumentNode<Types.AiSettingsFragment, unknown>;
export const DeploymentSettingsFragmentDoc = /*#__PURE__*/ gql`
    fragment DeploymentSettings on DeploymentSettings {
  id
  name
  enabled
  selfManaged
  insertedAt
  updatedAt
  onboarded
  agentHelmValues
  agentHelmValuesTemplateable
  logging {
    enabled
    driver
    levels
  }
  latestK8sVsn
  lokiConnection {
    ...HttpConnection
  }
  prometheusConnection {
    ...HttpConnection
  }
  artifactRepository {
    ...GitRepository
  }
  deployerRepository {
    ...GitRepository
  }
  createBindings {
    ...PolicyBinding
  }
  smtp {
    ...SmtpSettings
  }
  ai {
    ...AiSettings
  }
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  gitBindings {
    ...PolicyBinding
  }
}
    ${HttpConnectionFragmentDoc}
${GitRepositoryFragmentDoc}
${PolicyBindingFragmentDoc}
${SmtpSettingsFragmentDoc}
${AiSettingsFragmentDoc}` as unknown as DocumentNode<Types.DeploymentSettingsFragment, unknown>;
export const ObservabilityProviderFragmentDoc = /*#__PURE__*/ gql`
    fragment ObservabilityProvider on ObservabilityProvider {
  id
  name
  type
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.ObservabilityProviderFragment, unknown>;
export const ObservabilityWebhookFragmentDoc = /*#__PURE__*/ gql`
    fragment ObservabilityWebhook on ObservabilityWebhook {
  id
  name
  type
  url
  insertedAt
  updatedAt
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.ObservabilityWebhookFragment, unknown>;
export const ObserverTargetFragmentDoc = /*#__PURE__*/ gql`
    fragment ObserverTarget on ObserverTarget {
  target
  format
  order
  git {
    type
    repositoryId
  }
  helm {
    url
    provider
    chart
  }
  oci {
    provider
    url
  }
}
    ` as unknown as DocumentNode<Types.ObserverTargetFragment, unknown>;
export const ServiceErrorFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceError on ServiceError {
  source
  message
  warning
}
    ` as unknown as DocumentNode<Types.ServiceErrorFragment, unknown>;
export const ObserverFragmentDoc = /*#__PURE__*/ gql`
    fragment Observer on Observer {
  id
  insertedAt
  updatedAt
  name
  crontab
  status
  lastRunAt
  nextRunAt
  lastValue
  agentRun {
    id
  }
  project {
    ...ProjectTiny
  }
  target {
    ...ObserverTarget
  }
  errors {
    ...ServiceError
  }
}
    ${ProjectTinyFragmentDoc}
${ObserverTargetFragmentDoc}
${ServiceErrorFragmentDoc}` as unknown as DocumentNode<Types.ObserverFragment, unknown>;
export const PipelineGateFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineGate on PipelineGate {
  id
  name
  state
  type
  cluster {
    id
  }
  approver {
    ...User
  }
  edge {
    pipeline {
      id
      name
    }
  }
  spec {
    job {
      ...JobGateSpec
    }
  }
  sentinel {
    id
    name
  }
  sentinelRun {
    id
    status
    insertedAt
    completedAt
  }
  insertedAt
  updatedAt
}
    ${UserFragmentDoc}
${JobGateSpecFragmentDoc}` as unknown as DocumentNode<Types.PipelineGateFragment, unknown>;
export const RevisionFragmentDoc = /*#__PURE__*/ gql`
    fragment Revision on Revision {
  id
  git {
    ref
    folder
  }
  insertedAt
  updatedAt
  message
  sha
  version
}
    ` as unknown as DocumentNode<Types.RevisionFragment, unknown>;
export const PipelineServiceDeploymentFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineServiceDeployment on ServiceDeployment {
  id
  name
  namespace
  cluster {
    id
    name
  }
  status
  componentStatus
  revision {
    id
  }
}
    ` as unknown as DocumentNode<Types.PipelineServiceDeploymentFragment, unknown>;
export const PromotionServiceFragmentDoc = /*#__PURE__*/ gql`
    fragment PromotionService on PromotionService {
  id
  revision {
    ...Revision
  }
  service {
    ...PipelineServiceDeployment
  }
  insertedAt
  updatedAt
}
    ${RevisionFragmentDoc}
${PipelineServiceDeploymentFragmentDoc}` as unknown as DocumentNode<Types.PromotionServiceFragment, unknown>;
export const PipelinePromotionFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelinePromotion on PipelinePromotion {
  id
  services {
    ...PromotionService
  }
  insertedAt
  updatedAt
  promotedAt
  revisedAt
}
    ${PromotionServiceFragmentDoc}` as unknown as DocumentNode<Types.PipelinePromotionFragment, unknown>;
export const PromotionCriteriaFragmentDoc = /*#__PURE__*/ gql`
    fragment PromotionCriteria on PromotionCriteria {
  id
  secrets
  prAutomation {
    id
  }
  source {
    ...PipelineServiceDeployment
  }
  insertedAt
  updatedAt
}
    ${PipelineServiceDeploymentFragmentDoc}` as unknown as DocumentNode<Types.PromotionCriteriaFragment, unknown>;
export const StageServiceFragmentDoc = /*#__PURE__*/ gql`
    fragment StageService on StageService {
  id
  criteria {
    ...PromotionCriteria
  }
  insertedAt
  updatedAt
  service {
    ...PipelineServiceDeployment
  }
}
    ${PromotionCriteriaFragmentDoc}
${PipelineServiceDeploymentFragmentDoc}` as unknown as DocumentNode<Types.StageServiceFragment, unknown>;
export const PipelinePullRequestFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelinePullRequest on PipelinePullRequest {
  id
  service {
    id
    name
    protect
    deletedAt
  }
  stage {
    id
  }
  pullRequest {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.PipelinePullRequestFragment, unknown>;
export const PipelineContextFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineContext on PipelineContext {
  id
  context
  insertedAt
  updatedAt
  pullRequests {
    ...PullRequest
  }
  pipelinePullRequests {
    ...PipelinePullRequest
  }
}
    ${PullRequestFragmentDoc}
${PipelinePullRequestFragmentDoc}` as unknown as DocumentNode<Types.PipelineContextFragment, unknown>;
export const PipelineStageFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineStage on PipelineStage {
  id
  name
  insertedAt
  updatedAt
  promotion {
    ...PipelinePromotion
  }
  services {
    ...StageService
  }
  context {
    ...PipelineContext
  }
  errors {
    message
    source
  }
}
    ${PipelinePromotionFragmentDoc}
${StageServiceFragmentDoc}
${PipelineContextFragmentDoc}` as unknown as DocumentNode<Types.PipelineStageFragment, unknown>;
export const PipelineStageEdgeFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineStageEdge on PipelineStageEdge {
  id
  insertedAt
  promotedAt
  updatedAt
  gates {
    ...PipelineGate
  }
  from {
    ...PipelineStage
  }
  to {
    ...PipelineStage
  }
}
    ${PipelineGateFragmentDoc}
${PipelineStageFragmentDoc}` as unknown as DocumentNode<Types.PipelineStageEdgeFragment, unknown>;
export const PipelineStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineStatus on PipelineStatus {
  closed
  pending
  running
}
    ` as unknown as DocumentNode<Types.PipelineStatusFragment, unknown>;
export const PipelineFragmentDoc = /*#__PURE__*/ gql`
    fragment Pipeline on Pipeline {
  id
  name
  insertedAt
  updatedAt
  edges {
    ...PipelineStageEdge
  }
  stages {
    ...PipelineStage
  }
  status {
    ...PipelineStatus
  }
}
    ${PipelineStageEdgeFragmentDoc}
${PipelineStageFragmentDoc}
${PipelineStatusFragmentDoc}` as unknown as DocumentNode<Types.PipelineFragment, unknown>;
export const PipelineConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineConnection on PipelineConnection {
  edges {
    node {
      ...Pipeline
    }
  }
  pageInfo {
    ...PageInfo
  }
}
    ${PipelineFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.PipelineConnectionFragment, unknown>;
export const PipelineBindingsFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineBindings on Pipeline {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.PipelineBindingsFragment, unknown>;
export const ContainerStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment ContainerStatus on ContainerStatus {
  restartCount
  ready
  name
  state {
    running {
      startedAt
    }
    terminated {
      exitCode
      message
      reason
    }
    waiting {
      message
      reason
    }
  }
}
    ` as unknown as DocumentNode<Types.ContainerStatusFragment, unknown>;
export const ResourceSpecFragmentDoc = /*#__PURE__*/ gql`
    fragment ResourceSpec on ResourceSpec {
  cpu
  memory
}
    ` as unknown as DocumentNode<Types.ResourceSpecFragment, unknown>;
export const ResourcesFragmentDoc = /*#__PURE__*/ gql`
    fragment Resources on Resources {
  limits {
    ...ResourceSpec
  }
  requests {
    ...ResourceSpec
  }
}
    ${ResourceSpecFragmentDoc}` as unknown as DocumentNode<Types.ResourcesFragment, unknown>;
export const ContainerFragmentDoc = /*#__PURE__*/ gql`
    fragment Container on Container {
  name
  image
  ports {
    containerPort
    protocol
  }
  resources {
    ...Resources
  }
}
    ${ResourcesFragmentDoc}` as unknown as DocumentNode<Types.ContainerFragment, unknown>;
export const PodFragmentDoc = /*#__PURE__*/ gql`
    fragment Pod on Pod {
  metadata {
    ...Metadata
  }
  status {
    phase
    podIp
    reason
    containerStatuses {
      ...ContainerStatus
    }
    initContainerStatuses {
      ...ContainerStatus
    }
    conditions {
      lastProbeTime
      lastTransitionTime
      message
      reason
      status
      type
    }
  }
  spec {
    nodeName
    serviceAccountName
    containers {
      ...Container
    }
    initContainers {
      ...Container
    }
  }
  raw
}
    ${MetadataFragmentDoc}
${ContainerStatusFragmentDoc}
${ContainerFragmentDoc}` as unknown as DocumentNode<Types.PodFragment, unknown>;
export const PipelineGateJobFragmentDoc = /*#__PURE__*/ gql`
    fragment PipelineGateJob on Job {
  events {
    action
    count
    eventTime
    lastTimestamp
    message
    reason
    type
  }
  metadata {
    ...Metadata
  }
  pods {
    ...Pod
  }
  raw
  spec {
    activeDeadlineSeconds
    backoffLimit
    parallelism
  }
  status {
    active
    completionTime
    failed
    startTime
    succeeded
  }
}
    ${MetadataFragmentDoc}
${PodFragmentDoc}` as unknown as DocumentNode<Types.PipelineGateJobFragment, unknown>;
export const ProviderCredentialFragmentDoc = /*#__PURE__*/ gql`
    fragment ProviderCredential on ProviderCredential {
  id
  insertedAt
  kind
  name
  namespace
  updatedAt
}
    ` as unknown as DocumentNode<Types.ProviderCredentialFragment, unknown>;
export const ClusterProviderFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterProvider on ClusterProvider {
  id
  name
  namespace
  cloud
  editable
  git {
    folder
    ref
  }
  repository {
    id
    url
  }
  service {
    id
    name
    namespace
  }
  credentials {
    ...ProviderCredential
  }
  supportedVersions
  deletedAt
  insertedAt
  updatedAt
}
    ${ProviderCredentialFragmentDoc}` as unknown as DocumentNode<Types.ClusterProviderFragment, unknown>;
export const PullRequestConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment PullRequestConnection on PullRequestConnection {
  pageInfo {
    ...PageInfo
  }
  edges {
    node {
      ...PullRequest
    }
  }
}
    ${PageInfoFragmentDoc}
${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.PullRequestConnectionFragment, unknown>;
export const ServiceDeploymentComponentFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentComponent on ServiceComponent {
  id
  uid
  name
  group
  kind
  namespace
  state
  synced
  version
  apiDeprecations {
    ...ApiDeprecation
  }
  content {
    desired
    live
  }
  insight {
    ...AiInsight
  }
}
    ${ApiDeprecationFragmentDoc}
${AiInsightFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentComponentFragment, unknown>;
export const ServiceContextFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceContext on ServiceContext {
  id
  configuration
  name
  project {
    id
    name
  }
  secrets {
    name
    value
  }
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.ServiceContextFragment, unknown>;
export const ServiceDependencyFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDependency on ServiceDependency {
  id
  name
  status
  updatedAt
}
    ` as unknown as DocumentNode<Types.ServiceDependencyFragment, unknown>;
export const ClusterScalingRecommendationFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterScalingRecommendation on ClusterScalingRecommendation {
  id
  namespace
  name
  type
  container
  cpuCost
  cpuRequest
  cpuRecommendation
  memoryCost
  memoryRequest
  memoryRecommendation
  service {
    ...ServiceDeploymentTiny
    cluster {
      distro
      provider {
        id
        cloud
        name
        namespace
        supportedVersions
      }
    }
  }
}
    ${ServiceDeploymentTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterScalingRecommendationFragment, unknown>;
export const ServiceDeploymentDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentDetails on ServiceDeployment {
  ...ServiceDeploymentsRow
  cluster {
    ...ClusterMinimal
    operationalLayout {
      serviceMesh
    }
  }
  namespace
  message
  version
  components {
    ...ServiceDeploymentComponent
  }
  contexts {
    ...ServiceContext
  }
  dependencies {
    ...ServiceDependency
  }
  repository {
    pulledAt
  }
  insight {
    ...AiInsight
  }
  imports {
    stack {
      ...StackMinimal
    }
  }
  parent {
    id
    name
    cluster {
      id
      name
    }
  }
  alerts(first: 500) {
    edges {
      node {
        id
      }
    }
  }
  scalingRecommendations {
    ...ClusterScalingRecommendation
  }
}
    ${ServiceDeploymentsRowFragmentDoc}
${ClusterMinimalFragmentDoc}
${ServiceDeploymentComponentFragmentDoc}
${ServiceContextFragmentDoc}
${ServiceDependencyFragmentDoc}
${AiInsightFragmentDoc}
${StackMinimalFragmentDoc}
${ClusterScalingRecommendationFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentDetailsFragment, unknown>;
export const ServiceComponentChildFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceComponentChild on ServiceComponentChild {
  id
  group
  kind
  version
  name
  namespace
  parentUid
  uid
  state
  insertedAt
  updatedAt
  insight {
    ...AiInsight
  }
}
    ${AiInsightFragmentDoc}` as unknown as DocumentNode<Types.ServiceComponentChildFragment, unknown>;
export const ServiceDeploymentComponentWithChildrenFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentComponentWithChildren on ServiceComponent {
  ...ServiceDeploymentComponent
  children {
    ...ServiceComponentChild
  }
}
    ${ServiceDeploymentComponentFragmentDoc}
${ServiceComponentChildFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentComponentWithChildrenFragment, unknown>;
export const ServiceDeploymentRevisionFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentRevision on Revision {
  id
  sha
  version
  message
  updatedAt
  insertedAt
  helm {
    chart
    version
  }
  git {
    folder
    ref
  }
}
    ` as unknown as DocumentNode<Types.ServiceDeploymentRevisionFragment, unknown>;
export const ServiceDeploymentRevisionsFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentRevisions on ServiceDeployment {
  revision {
    ...ServiceDeploymentRevision
  }
  revisions(first: 500) {
    edges {
      node {
        ...ServiceDeploymentRevision
      }
    }
  }
}
    ${ServiceDeploymentRevisionFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentRevisionsFragment, unknown>;
export const ServiceTreeNodeFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceTreeNode on ServiceDeployment {
  id
  name
  namespace
  updatedAt
  status
  componentStatus
  components {
    ...ServiceDeploymentComponent
  }
  cluster {
    id
    name
  }
  repository {
    url
    pulledAt
  }
  git {
    ref
    folder
  }
  helmRepository {
    spec {
      url
    }
  }
  parent {
    id
    name
  }
  owner {
    id
    name
  }
  errors {
    source
    message
  }
}
    ${ServiceDeploymentComponentFragmentDoc}` as unknown as DocumentNode<Types.ServiceTreeNodeFragment, unknown>;
export const ServiceDeploymentsConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentsConnection on ServiceDeploymentConnection {
  pageInfo {
    ...PageInfo
  }
  edges {
    node {
      ...ServiceDeploymentsRow
    }
  }
}
    ${PageInfoFragmentDoc}
${ServiceDeploymentsRowFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentsConnectionFragment, unknown>;
export const ServiceDeploymentBindingsFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceDeploymentBindings on ServiceDeployment {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentBindingsFragment, unknown>;
export const ComponentTreeFragmentDoc = /*#__PURE__*/ gql`
    fragment ComponentTree on ComponentTree {
  root {
    metadata {
      ...Metadata
    }
    raw
  }
  edges {
    from
    to
  }
  certificates {
    metadata {
      ...Metadata
    }
    raw
  }
  configmaps {
    metadata {
      ...Metadata
    }
    raw
  }
  cronjobs {
    metadata {
      ...Metadata
    }
    raw
  }
  daemonsets {
    metadata {
      ...Metadata
    }
    raw
  }
  deployments {
    metadata {
      ...Metadata
    }
    raw
  }
  ingresses {
    metadata {
      ...Metadata
    }
    raw
  }
  secrets {
    metadata {
      ...Metadata
    }
  }
  services {
    metadata {
      ...Metadata
    }
    raw
  }
  statefulsets {
    metadata {
      ...Metadata
    }
    raw
  }
}
    ${MetadataFragmentDoc}` as unknown as DocumentNode<Types.ComponentTreeFragment, unknown>;
export const ClusterUsageTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUsageTiny on ClusterUsage {
  id
  cpu
  memory
  gpu
  storage
  cpuUtil
  memUtil
  cpuCost
  memoryCost
  storageCost
  nodeCost
  controlPlaneCost
  ingressCost
  loadBalancerCost
  egressCost
  cluster {
    ...ClusterTiny
    project {
      id
      name
    }
  }
}
    ${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsageTinyFragment, unknown>;
export const ClusterUsageHistoryFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUsageHistory on ClusterUsageHistory {
  id
  timestamp
  cpuCost
  memoryCost
  storageCost
}
    ` as unknown as DocumentNode<Types.ClusterUsageHistoryFragment, unknown>;
export const ProjectUsageHistoryFragmentDoc = /*#__PURE__*/ gql`
    fragment ProjectUsageHistory on ProjectUsageHistory {
  timestamp
  cpu
  memory
  gpu
  storageCost
  projectId
}
    ` as unknown as DocumentNode<Types.ProjectUsageHistoryFragment, unknown>;
export const ClusterNamespaceUsageFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterNamespaceUsage on ClusterNamespaceUsage {
  id
  namespace
  storage
  cpuCost
  cpuUtil
  cpu
  memoryCost
  memUtil
  memory
  ingressCost
  loadBalancerCost
  egressCost
  storageCost
}
    ` as unknown as DocumentNode<Types.ClusterNamespaceUsageFragment, unknown>;
export const TagFragmentDoc = /*#__PURE__*/ gql`
    fragment Tag on Tag {
  name
  value
}
    ` as unknown as DocumentNode<Types.TagFragment, unknown>;
export const UserTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment UserTiny on User {
  name
  email
  profile
}
    ` as unknown as DocumentNode<Types.UserTinyFragment, unknown>;
export const ClusterRegistrationFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterRegistration on ClusterRegistration {
  id
  insertedAt
  updatedAt
  machineId
  name
  handle
  metadata
  tags {
    ...Tag
  }
  creator {
    ...UserTiny
  }
  project {
    ...ProjectTiny
  }
}
    ${TagFragmentDoc}
${UserTinyFragmentDoc}
${ProjectTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterRegistrationFragment, unknown>;
export const IsoImageFragmentDoc = /*#__PURE__*/ gql`
    fragment IsoImage on ClusterIsoImage {
  id
  user
  password
  registry
  image
  insertedAt
  project {
    name
  }
}
    ` as unknown as DocumentNode<Types.IsoImageFragment, unknown>;
export const ServiceStatusCountFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceStatusCount on ServiceStatusCount {
  count
  status
}
    ` as unknown as DocumentNode<Types.ServiceStatusCountFragment, unknown>;
export const FlowBasicFragmentDoc = /*#__PURE__*/ gql`
    fragment FlowBasic on Flow {
  id
  name
  description
  icon
  metadata
  repositories
  project {
    id
    name
  }
  agentRuntime {
    id
  }
  serviceCount
  componentCount
  alertCount
  pipelineCount
  pendingPipelineCount
  serviceStatuses {
    ...ServiceStatusCount
  }
  componentStatuses {
    state
    count
  }
}
    ${ServiceStatusCountFragmentDoc}` as unknown as DocumentNode<Types.FlowBasicFragment, unknown>;
export const FlowBasicWithBindingsFragmentDoc = /*#__PURE__*/ gql`
    fragment FlowBasicWithBindings on Flow {
  ...FlowBasic
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${FlowBasicFragmentDoc}
${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.FlowBasicWithBindingsFragment, unknown>;
export const PreviewEnvironmentInstanceFragmentDoc = /*#__PURE__*/ gql`
    fragment PreviewEnvironmentInstance on PreviewEnvironmentInstance {
  id
  pullRequest {
    url
  }
  service {
    ...ServiceDeploymentTiny
    protect
    deletedAt
  }
  template {
    id
    name
  }
  updatedAt
  insertedAt
}
    ${ServiceDeploymentTinyFragmentDoc}` as unknown as DocumentNode<Types.PreviewEnvironmentInstanceFragment, unknown>;
export const PreviewEnvironmentInstanceConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment PreviewEnvironmentInstanceConnection on PreviewEnvironmentInstanceConnection {
  pageInfo {
    ...PageInfo
  }
  edges {
    node {
      ...PreviewEnvironmentInstance
    }
  }
}
    ${PageInfoFragmentDoc}
${PreviewEnvironmentInstanceFragmentDoc}` as unknown as DocumentNode<Types.PreviewEnvironmentInstanceConnectionFragment, unknown>;
export const PreviewEnvironmentTemplateFragmentDoc = /*#__PURE__*/ gql`
    fragment PreviewEnvironmentTemplate on PreviewEnvironmentTemplate {
  id
  name
  commentTemplate
  referenceService {
    id
    name
    cluster {
      id
    }
  }
  template {
    ...ServiceTemplateWithoutConfiguration
  }
}
    ${ServiceTemplateWithoutConfigurationFragmentDoc}` as unknown as DocumentNode<Types.PreviewEnvironmentTemplateFragment, unknown>;
export const PreviewEnvironmentTemplateConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment PreviewEnvironmentTemplateConnection on PreviewEnvironmentTemplateConnection {
  pageInfo {
    ...PageInfo
  }
  edges {
    node {
      ...PreviewEnvironmentTemplate
    }
  }
}
    ${PageInfoFragmentDoc}
${PreviewEnvironmentTemplateFragmentDoc}` as unknown as DocumentNode<Types.PreviewEnvironmentTemplateConnectionFragment, unknown>;
export const FlowAlertFragmentDoc = /*#__PURE__*/ gql`
    fragment FlowAlert on Alert {
  ...Alert
  workbench {
    id
  }
  workbenchJob {
    id
    status
  }
}
    ${AlertFragmentDoc}` as unknown as DocumentNode<Types.FlowAlertFragment, unknown>;
export const GroupFragmentDoc = /*#__PURE__*/ gql`
    fragment Group on Group {
  id
  name
  description
  global
  memberCount
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.GroupFragment, unknown>;
export const GroupMemberFragmentDoc = /*#__PURE__*/ gql`
    fragment GroupMember on GroupMember {
  user {
    ...User
  }
  group {
    ...Group
  }
}
    ${UserFragmentDoc}
${GroupFragmentDoc}` as unknown as DocumentNode<Types.GroupMemberFragment, unknown>;
export const UpgradeStatisticsFragmentDoc = /*#__PURE__*/ gql`
    fragment UpgradeStatistics on UpgradeStatistics {
  upgradeable
  count
  latest
  compliant
}
    ` as unknown as DocumentNode<Types.UpgradeStatisticsFragment, unknown>;
export const CloudAddonInformationFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudAddonInformation on CloudAddonInformation {
  name
  publisher
}
    ` as unknown as DocumentNode<Types.CloudAddonInformationFragment, unknown>;
export const RuntimeServiceFragmentDoc = /*#__PURE__*/ gql`
    fragment RuntimeService on RuntimeService {
  id
  name
  version
  addon {
    icon
    versions {
      ...AddonVersion
    }
  }
  service {
    git {
      ref
      folder
    }
    repository {
      httpsPath
      urlFormat
    }
    helm {
      version
    }
  }
  addonVersion {
    ...AddonVersionBlocking @include(if: $hasKubeVersion)
    ...AddonVersion
  }
}
    ${AddonVersionFragmentDoc}
${AddonVersionBlockingFragmentDoc}` as unknown as DocumentNode<Types.RuntimeServiceFragment, unknown>;
export const InsightClientInfoFragmentDoc = /*#__PURE__*/ gql`
    fragment InsightClientInfo on InsightClientInfo {
  userAgent
  count
  lastRequestAt
}
    ` as unknown as DocumentNode<Types.InsightClientInfoFragment, unknown>;
export const UpgradeInsightDetailFragmentDoc = /*#__PURE__*/ gql`
    fragment UpgradeInsightDetail on UpgradeInsightDetail {
  id
  removedIn
  replacedIn
  replacement
  status
  used
  clientInfo {
    ...InsightClientInfo
  }
}
    ${InsightClientInfoFragmentDoc}` as unknown as DocumentNode<Types.UpgradeInsightDetailFragment, unknown>;
export const UpgradeInsightFragmentDoc = /*#__PURE__*/ gql`
    fragment UpgradeInsight on UpgradeInsight {
  id
  name
  description
  details {
    ...UpgradeInsightDetail
  }
  refreshedAt
  transitionedAt
  version
  status
}
    ${UpgradeInsightDetailFragmentDoc}` as unknown as DocumentNode<Types.UpgradeInsightFragment, unknown>;
export const CloudAddonVersionInformationFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudAddonVersionInformation on CloudAddonVersionInformation {
  blocking(kubeVersion: $kubeVersion)
}
    ` as unknown as DocumentNode<Types.CloudAddonVersionInformationFragment, unknown>;
export const CloudAddonFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudAddon on CloudAddon {
  id
  insertedAt
  updatedAt
  name
  distro
  info {
    name
    publisher
    versions {
      version
      compatibilities
      ...CloudAddonVersionInformation @include(if: $hasKubeVersion)
    }
  }
  version
  versionInfo {
    version
    compatibilities
    ...CloudAddonVersionInformation @include(if: $hasKubeVersion)
  }
}
    ${CloudAddonVersionInformationFragmentDoc}` as unknown as DocumentNode<Types.CloudAddonFragment, unknown>;
export const ClusterRuntimeServicesFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterRuntimeServices on Cluster {
  id
  name
  currentVersion
  version
  runtimeServices {
    ...RuntimeService
  }
  apiDeprecations {
    ...ApiDeprecation
  }
  upgradeInsights {
    ...UpgradeInsight
  }
  cloudAddons {
    ...CloudAddon
  }
}
    ${RuntimeServiceFragmentDoc}
${ApiDeprecationFragmentDoc}
${UpgradeInsightFragmentDoc}
${CloudAddonFragmentDoc}` as unknown as DocumentNode<Types.ClusterRuntimeServicesFragment, unknown>;
export const ClusterUpgradeDeprecatedCustomResourceFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUpgradeDeprecatedCustomResource on DeprecatedCustomResource {
  name
  group
  kind
  namespace
  version
  nextVersion
}
    ` as unknown as DocumentNode<Types.ClusterUpgradeDeprecatedCustomResourceFragment, unknown>;
export const RuntimeAddonVersionFragmentDoc = /*#__PURE__*/ gql`
    fragment RuntimeAddonVersion on AddonVersion {
  version
  chartVersion
  images
  releaseUrl
}
    ` as unknown as DocumentNode<Types.RuntimeAddonVersionFragment, unknown>;
export const AddonVersionSummaryFragmentDoc = /*#__PURE__*/ gql`
    fragment AddonVersionSummary on AddonVersionSummary {
  breakingChanges
  chartUpdates
  features
  helmChanges
}
    ` as unknown as DocumentNode<Types.AddonVersionSummaryFragment, unknown>;
export const RuntimeAddonVersionWithSummaryFragmentDoc = /*#__PURE__*/ gql`
    fragment RuntimeAddonVersionWithSummary on AddonVersion {
  ...RuntimeAddonVersion
  summary {
    ...AddonVersionSummary
  }
}
    ${RuntimeAddonVersionFragmentDoc}
${AddonVersionSummaryFragmentDoc}` as unknown as DocumentNode<Types.RuntimeAddonVersionWithSummaryFragment, unknown>;
export const RuntimeAddonUpgradeFragmentDoc = /*#__PURE__*/ gql`
    fragment RuntimeAddonUpgrade on RuntimeAddonUpgrade {
  addon {
    name
    icon
  }
  callout
  current {
    ...RuntimeAddonVersion
  }
  fix {
    ...RuntimeAddonVersionWithSummary
  }
}
    ${RuntimeAddonVersionFragmentDoc}
${RuntimeAddonVersionWithSummaryFragmentDoc}` as unknown as DocumentNode<Types.RuntimeAddonUpgradeFragment, unknown>;
export const CloudAddonVersionFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudAddonVersion on CloudAddonVersionInformation {
  version
}
    ` as unknown as DocumentNode<Types.CloudAddonVersionFragment, unknown>;
export const CloudAddonUpgradeFragmentDoc = /*#__PURE__*/ gql`
    fragment CloudAddonUpgrade on CloudAddonUpgrade {
  addon {
    ...CloudAddon
  }
  current {
    ...CloudAddonVersion
  }
  fix {
    ...CloudAddonVersion
  }
}
    ${CloudAddonFragmentDoc}
${CloudAddonVersionFragmentDoc}` as unknown as DocumentNode<Types.CloudAddonUpgradeFragment, unknown>;
export const ClusterWithUpgradeFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterWithUpgrade on Cluster {
  ...ClusterRuntimeServices
  deprecatedCustomResources {
    ...ClusterUpgradeDeprecatedCustomResource
  }
  upgradePlanSummary {
    blockingAddons {
      ...RuntimeAddonUpgrade
    }
    blockingCloudAddons {
      ...CloudAddonUpgrade
    }
  }
}
    ${ClusterRuntimeServicesFragmentDoc}
${ClusterUpgradeDeprecatedCustomResourceFragmentDoc}
${RuntimeAddonUpgradeFragmentDoc}
${CloudAddonUpgradeFragmentDoc}` as unknown as DocumentNode<Types.ClusterWithUpgradeFragment, unknown>;
export const ClusterInsightFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterInsight on Cluster {
  id
  insightComponents {
    ...ClusterInsightComponent
  }
}
    ${ClusterInsightComponentFragmentDoc}` as unknown as DocumentNode<Types.ClusterInsightFragment, unknown>;
export const ClusterUpgradeStepFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUpgradeStep on ClusterUpgradeStep {
  id
  name
  prompt
  status
  type
  error
  agentRun {
    ...AgentRunTiny
  }
}
    ${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterUpgradeStepFragment, unknown>;
export const ClusterUpgradeFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterUpgrade on ClusterUpgrade {
  id
  status
  steps {
    ...ClusterUpgradeStep
  }
  cluster {
    ...ClusterMinimal
  }
  runtime {
    type
    name
  }
  version
}
    ${ClusterUpgradeStepFragmentDoc}
${ClusterMinimalFragmentDoc}` as unknown as DocumentNode<Types.ClusterUpgradeFragment, unknown>;
export const NodeStatisticFragmentDoc = /*#__PURE__*/ gql`
    fragment NodeStatistic on NodeStatistic {
  id
  name
  pendingPods
  health
  cluster {
    id
  }
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.NodeStatisticFragment, unknown>;
export const ClusterOverviewDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterOverviewDetails on Cluster {
  ...ClustersRow
  ...ClusterWithUpgrade
  ...ClusterInsight
  currentUpgrade {
    ...ClusterUpgrade
  }
  nodeStatistics {
    ...NodeStatistic
  }
}
    ${ClustersRowFragmentDoc}
${ClusterWithUpgradeFragmentDoc}
${ClusterInsightFragmentDoc}
${ClusterUpgradeFragmentDoc}
${NodeStatisticFragmentDoc}` as unknown as DocumentNode<Types.ClusterOverviewDetailsFragment, unknown>;
export const ClusterHealthScoreFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterHealthScore on Cluster {
  id
  name
  healthScore
  distro
  provider {
    cloud
  }
}
    ` as unknown as DocumentNode<Types.ClusterHealthScoreFragment, unknown>;
export const KubernetesChangelogFragmentDoc = /*#__PURE__*/ gql`
    fragment KubernetesChangelog on KubernetesChangelog {
  version
  apiUpdates
  bugFixes
  breakingChanges
  deprecations
  features
  majorChanges
  removals
}
    ` as unknown as DocumentNode<Types.KubernetesChangelogFragment, unknown>;
export const PinnedCustomResourceFragmentDoc = /*#__PURE__*/ gql`
    fragment PinnedCustomResource on PinnedCustomResource {
  id
  name
  kind
  version
  group
  cluster {
    ...ClusterTiny
  }
  displayName
  namespaced
}
    ${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.PinnedCustomResourceFragment, unknown>;
export const KubernetesClusterFragmentDoc = /*#__PURE__*/ gql`
    fragment KubernetesCluster on Cluster {
  ...ClusterTiny
  project {
    ...ProjectTiny
  }
  pinnedCustomResources {
    ...PinnedCustomResource
  }
}
    ${ClusterTinyFragmentDoc}
${ProjectTinyFragmentDoc}
${PinnedCustomResourceFragmentDoc}` as unknown as DocumentNode<Types.KubernetesClusterFragment, unknown>;
export const ArgoRolloutStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment ArgoRolloutStatus on ArgoRolloutStatus {
  abort
  phase
  replicas
  readyReplicas
  pauseConditions {
    reason
    startTime
  }
  conditions {
    message
    reason
    status
    type
  }
}
    ` as unknown as DocumentNode<Types.ArgoRolloutStatusFragment, unknown>;
export const ArgoRolloutSpecFragmentDoc = /*#__PURE__*/ gql`
    fragment ArgoRolloutSpec on ArgoRolloutSpec {
  replicas
  strategy {
    blueGreen {
      activeService
      autoPromotionEnabled
      autoPromotionSeconds
    }
    canary {
      steps {
        analysis {
          templates {
            templateName
          }
        }
        experiment {
          templates {
            name
          }
        }
        pause {
          duration
        }
        setWeight
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.ArgoRolloutSpecFragment, unknown>;
export const EventFragmentDoc = /*#__PURE__*/ gql`
    fragment Event on Event {
  action
  lastTimestamp
  count
  message
  reason
  type
}
    ` as unknown as DocumentNode<Types.EventFragment, unknown>;
export const ArgoRolloutFragmentDoc = /*#__PURE__*/ gql`
    fragment ArgoRollout on ArgoRollout {
  metadata {
    ...Metadata
  }
  status {
    ...ArgoRolloutStatus
  }
  spec {
    ...ArgoRolloutSpec
  }
  raw
  events {
    ...Event
  }
  pods {
    ...Pod
  }
}
    ${MetadataFragmentDoc}
${ArgoRolloutStatusFragmentDoc}
${ArgoRolloutSpecFragmentDoc}
${EventFragmentDoc}
${PodFragmentDoc}` as unknown as DocumentNode<Types.ArgoRolloutFragment, unknown>;
export const StatusConditionFragmentDoc = /*#__PURE__*/ gql`
    fragment StatusCondition on StatusCondition {
  message
  reason
  status
  type
}
    ` as unknown as DocumentNode<Types.StatusConditionFragment, unknown>;
export const CanaryStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment CanaryStatus on CanaryStatus {
  failedChecks
  canaryWeight
  iterations
  phase
  conditions {
    ...StatusCondition
  }
}
    ${StatusConditionFragmentDoc}` as unknown as DocumentNode<Types.CanaryStatusFragment, unknown>;
export const CanarySpecFragmentDoc = /*#__PURE__*/ gql`
    fragment CanarySpec on CanarySpec {
  provider
  analysis {
    interval
    maxWeight
    stepWeight
    stepWeights
    threshold
  }
}
    ` as unknown as DocumentNode<Types.CanarySpecFragment, unknown>;
export const DeploymentFragmentDoc = /*#__PURE__*/ gql`
    fragment Deployment on Deployment {
  metadata {
    ...Metadata
  }
  status {
    availableReplicas
    replicas
    unavailableReplicas
    conditions {
      ...StatusCondition
    }
  }
  spec {
    replicas
    selector {
      matchLabels
      matchExpressions {
        key
        operator
        values
      }
    }
    strategy {
      type
    }
  }
  raw
  pods {
    ...Pod
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${StatusConditionFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.DeploymentFragment, unknown>;
export const CertificateStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment CertificateStatus on CertificateStatus {
  renewalTime
  notBefore
  notAfter
  conditions {
    ...StatusCondition
  }
}
    ${StatusConditionFragmentDoc}` as unknown as DocumentNode<Types.CertificateStatusFragment, unknown>;
export const CertificateSpecFragmentDoc = /*#__PURE__*/ gql`
    fragment CertificateSpec on CertificateSpec {
  dnsNames
  secretName
  issuerRef {
    group
    kind
    name
  }
}
    ` as unknown as DocumentNode<Types.CertificateSpecFragment, unknown>;
export const CertificateFragmentDoc = /*#__PURE__*/ gql`
    fragment Certificate on Certificate {
  metadata {
    ...Metadata
  }
  status {
    ...CertificateStatus
  }
  spec {
    ...CertificateSpec
  }
  raw
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${CertificateStatusFragmentDoc}
${CertificateSpecFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.CertificateFragment, unknown>;
export const IngressFragmentDoc = /*#__PURE__*/ gql`
    fragment Ingress on Ingress {
  metadata {
    ...Metadata
  }
  status {
    loadBalancer {
      ingress {
        ip
        hostname
      }
    }
  }
  spec {
    ingressClassName
    tls {
      hosts
    }
    rules {
      host
      http {
        paths {
          path
          pathType
          backend {
            serviceName
            servicePort
          }
        }
      }
    }
  }
  certificates {
    ...Certificate
  }
  raw
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${CertificateFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.IngressFragment, unknown>;
export const CanaryFragmentDoc = /*#__PURE__*/ gql`
    fragment Canary on Canary {
  metadata {
    ...Metadata
  }
  status {
    ...CanaryStatus
  }
  spec {
    ...CanarySpec
  }
  raw
  canaryDeployment {
    ...Deployment
  }
  primaryDeployment {
    ...Deployment
  }
  ingress {
    ...Ingress
  }
  ingressCanary {
    ...Ingress
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${CanaryStatusFragmentDoc}
${CanarySpecFragmentDoc}
${DeploymentFragmentDoc}
${IngressFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.CanaryFragment, unknown>;
export const JobStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment JobStatus on JobStatus {
  active
  completionTime
  succeeded
  failed
  startTime
  conditions {
    type
    status
    reason
    message
  }
}
    ` as unknown as DocumentNode<Types.JobStatusFragment, unknown>;
export const CronJobJobFragmentDoc = /*#__PURE__*/ gql`
    fragment CronJobJob on Job {
  metadata {
    name
    namespace
  }
  status {
    ...JobStatus
  }
}
    ${JobStatusFragmentDoc}` as unknown as DocumentNode<Types.CronJobJobFragment, unknown>;
export const CronJobFragmentDoc = /*#__PURE__*/ gql`
    fragment CronJob on CronJob {
  metadata {
    ...Metadata
  }
  status {
    lastScheduleTime
  }
  spec {
    schedule
    suspend
    concurrencyPolicy
    startingDeadlineSeconds
  }
  raw
  events {
    ...Event
  }
  jobs {
    ...CronJobJob
  }
}
    ${MetadataFragmentDoc}
${EventFragmentDoc}
${CronJobJobFragmentDoc}` as unknown as DocumentNode<Types.CronJobFragment, unknown>;
export const DaemonSetStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment DaemonSetStatus on DaemonSetStatus {
  currentNumberScheduled
  desiredNumberScheduled
  numberReady
}
    ` as unknown as DocumentNode<Types.DaemonSetStatusFragment, unknown>;
export const DaemonSetSpecFragmentDoc = /*#__PURE__*/ gql`
    fragment DaemonSetSpec on DaemonSetSpec {
  strategy {
    type
  }
}
    ` as unknown as DocumentNode<Types.DaemonSetSpecFragment, unknown>;
export const DaemonSetFragmentDoc = /*#__PURE__*/ gql`
    fragment DaemonSet on DaemonSet {
  metadata {
    ...Metadata
  }
  status {
    ...DaemonSetStatus
  }
  spec {
    ...DaemonSetSpec
  }
  pods {
    ...Pod
  }
  raw
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${DaemonSetStatusFragmentDoc}
${DaemonSetSpecFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.DaemonSetFragment, unknown>;
export const JobFragmentDoc = /*#__PURE__*/ gql`
    fragment Job on Job {
  metadata {
    ...Metadata
  }
  status {
    ...JobStatus
  }
  spec {
    backoffLimit
    parallelism
    activeDeadlineSeconds
    completions
  }
  pods {
    ...Pod
  }
  raw
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${JobStatusFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.JobFragment, unknown>;
export const NodeFragmentDoc = /*#__PURE__*/ gql`
    fragment Node on Node {
  metadata {
    ...Metadata
  }
  status {
    phase
    allocatable
    capacity
    conditions {
      type
      status
      message
    }
  }
  spec {
    podCidr
    providerId
  }
  raw
  pods {
    ...Pod
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.NodeFragment, unknown>;
export const PluralObjectStatusFragmentDoc = /*#__PURE__*/ gql`
    fragment PluralObjectStatus on PluralObjectStatus {
  id
  conditions {
    ...StatusCondition
  }
}
    ${StatusConditionFragmentDoc}` as unknown as DocumentNode<Types.PluralObjectStatusFragment, unknown>;
export const PluralServiceDeploymentFragmentDoc = /*#__PURE__*/ gql`
    fragment PluralServiceDeployment on PluralServiceDeployment {
  events {
    ...Event
  }
  metadata {
    ...Metadata
  }
  reference {
    id
    name
    cluster {
      id
    }
  }
  status {
    ...PluralObjectStatus
  }
  raw
}
    ${EventFragmentDoc}
${MetadataFragmentDoc}
${PluralObjectStatusFragmentDoc}` as unknown as DocumentNode<Types.PluralServiceDeploymentFragment, unknown>;
export const PodWithEventsFragmentDoc = /*#__PURE__*/ gql`
    fragment PodWithEvents on Pod {
  ...Pod
  events {
    ...Event
  }
}
    ${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.PodWithEventsFragment, unknown>;
export const PodMetricsFragmentDoc = /*#__PURE__*/ gql`
    fragment PodMetrics on PodMetrics {
  cpu {
    ...MetricResponse
  }
  cpuRequests {
    ...MetricResponse
  }
  cpuLimits {
    ...MetricResponse
  }
  cpuThrottling {
    ...MetricResponse
  }
  memory {
    ...MetricResponse
  }
  memoryRequests {
    ...MetricResponse
  }
  memoryLimits {
    ...MetricResponse
  }
  ephemeralStorage {
    ...MetricResponse
  }
  ephemeralStorageRequests {
    ...MetricResponse
  }
  ephemeralStorageLimits {
    ...MetricResponse
  }
  fsReads {
    ...MetricResponse
  }
  fsWrites {
    ...MetricResponse
  }
  networkReceive {
    ...MetricResponse
  }
  networkTransmit {
    ...MetricResponse
  }
  networkReceiveDropped {
    ...MetricResponse
  }
  networkTransmitDropped {
    ...MetricResponse
  }
  restarts {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.PodMetricsFragment, unknown>;
export const ServiceFragmentDoc = /*#__PURE__*/ gql`
    fragment Service on Service {
  metadata {
    ...Metadata
  }
  status {
    loadBalancer {
      ingress {
        ip
        hostname
      }
    }
  }
  spec {
    type
    clusterIp
    sessionAffinity
    selector
    ports {
      name
      protocol
      port
      targetPort
    }
  }
  raw
  pods {
    ...Pod
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.ServiceFragment, unknown>;
export const StatefulSetFragmentDoc = /*#__PURE__*/ gql`
    fragment StatefulSet on StatefulSet {
  metadata {
    ...Metadata
  }
  status {
    replicas
    currentReplicas
    readyReplicas
    updatedReplicas
    conditions {
      ...StatusCondition
    }
  }
  spec {
    replicas
    serviceName
  }
  raw
  pods {
    ...Pod
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${StatusConditionFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.StatefulSetFragment, unknown>;
export const UnstructuredResourceFragmentDoc = /*#__PURE__*/ gql`
    fragment UnstructuredResource on KubernetesUnstructured {
  raw
  metadata {
    ...Metadata
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${EventFragmentDoc}` as unknown as DocumentNode<Types.UnstructuredResourceFragment, unknown>;
export const RefreshTokenFragmentDoc = /*#__PURE__*/ gql`
    fragment RefreshToken on RefreshToken {
  id
  token
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.RefreshTokenFragment, unknown>;
export const AccountFragmentDoc = /*#__PURE__*/ gql`
    fragment Account on Account {
  grandfatheredUntil
  delinquentAt
  availableFeatures {
    audits
    userManagement
    databaseManagement
  }
  subscription {
    id
    plan {
      id
      name
      period
    }
  }
}
    ` as unknown as DocumentNode<Types.AccountFragment, unknown>;
export const LogFacetDetailFragmentDoc = /*#__PURE__*/ gql`
    fragment LogFacetDetail on LogFacetDetail {
  label
  count
}
    ` as unknown as DocumentNode<Types.LogFacetDetailFragment, unknown>;
export const LogAggregationBucketFragmentDoc = /*#__PURE__*/ gql`
    fragment LogAggregationBucket on LogAggregationBucket {
  timestamp
  count
  level
}
    ` as unknown as DocumentNode<Types.LogAggregationBucketFragment, unknown>;
export const MetricPointResponseFragmentDoc = /*#__PURE__*/ gql`
    fragment MetricPointResponse on MetricPointResponse {
  metric
  value {
    timestamp
    value
  }
}
    ` as unknown as DocumentNode<Types.MetricPointResponseFragment, unknown>;
export const UtilizationHeatMapFragmentDoc = /*#__PURE__*/ gql`
    fragment UtilizationHeatMap on UtilizationHeatMap {
  cpu {
    ...MetricPointResponse
  }
  memory {
    ...MetricPointResponse
  }
}
    ${MetricPointResponseFragmentDoc}` as unknown as DocumentNode<Types.UtilizationHeatMapFragment, unknown>;
export const MonitorThresholdFragmentDoc = /*#__PURE__*/ gql`
    fragment MonitorThreshold on MonitorThreshold {
  aggregate
  value
}
    ` as unknown as DocumentNode<Types.MonitorThresholdFragment, unknown>;
export const MonitorTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment MonitorTiny on Monitor {
  id
  name
  state
  evaluationCron
  threshold {
    ...MonitorThreshold
  }
  query {
    log {
      query
    }
  }
}
    ${MonitorThresholdFragmentDoc}` as unknown as DocumentNode<Types.MonitorTinyFragment, unknown>;
export const MonitorLogQueryFragmentDoc = /*#__PURE__*/ gql`
    fragment MonitorLogQuery on MonitorLogQuery {
  bucketSize
  duration
  facets {
    key
    value
  }
  operator
  query
}
    ` as unknown as DocumentNode<Types.MonitorLogQueryFragment, unknown>;
export const MonitorFragmentDoc = /*#__PURE__*/ gql`
    fragment Monitor on Monitor {
  ...MonitorTiny
  alertTemplate
  description
  evaluationCron
  query {
    log {
      ...MonitorLogQuery
    }
  }
  service {
    id
  }
  severity
  type
  workbench {
    id
  }
}
    ${MonitorTinyFragmentDoc}
${MonitorLogQueryFragmentDoc}` as unknown as DocumentNode<Types.MonitorFragment, unknown>;
export const UrlSinkConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment UrlSinkConfiguration on UrlSinkConfiguration {
  url
}
    ` as unknown as DocumentNode<Types.UrlSinkConfigurationFragment, unknown>;
export const SinkConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment SinkConfiguration on SinkConfiguration {
  id
  slack {
    ...UrlSinkConfiguration
  }
  teams {
    ...UrlSinkConfiguration
  }
}
    ${UrlSinkConfigurationFragmentDoc}` as unknown as DocumentNode<Types.SinkConfigurationFragment, unknown>;
export const NotificationSinkFragmentDoc = /*#__PURE__*/ gql`
    fragment NotificationSink on NotificationSink {
  id
  name
  type
  insertedAt
  updatedAt
  configuration {
    ...SinkConfiguration
  }
}
    ${SinkConfigurationFragmentDoc}` as unknown as DocumentNode<Types.NotificationSinkFragment, unknown>;
export const NotificationFilterFragmentDoc = /*#__PURE__*/ gql`
    fragment NotificationFilter on NotificationFilter {
  id
  cluster {
    id
    name
  }
  pipeline {
    id
    name
  }
  regex
  service {
    id
    name
  }
}
    ` as unknown as DocumentNode<Types.NotificationFilterFragment, unknown>;
export const NotificationRouterFragmentDoc = /*#__PURE__*/ gql`
    fragment NotificationRouter on NotificationRouter {
  id
  name
  sinks {
    ...NotificationSink
  }
  events
  filters {
    ...NotificationFilter
  }
  insertedAt
  updatedAt
}
    ${NotificationSinkFragmentDoc}
${NotificationFilterFragmentDoc}` as unknown as DocumentNode<Types.NotificationRouterFragment, unknown>;
export const AppNotificationFragmentDoc = /*#__PURE__*/ gql`
    fragment AppNotification on AppNotification {
  id
  insertedAt
  updatedAt
  readAt
  priority
  text
}
    ` as unknown as DocumentNode<Types.AppNotificationFragment, unknown>;
export const OidcProviderFragmentDoc = /*#__PURE__*/ gql`
    fragment OidcProvider on OidcProvider {
  id
  name
  description
  authMethod
  redirectUris
  clientId
  clientSecret
  bindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.OidcProviderFragment, unknown>;
export const PolicyConstraintFragmentDoc = /*#__PURE__*/ gql`
    fragment PolicyConstraint on PolicyConstraint {
  cluster {
    ...ClusterBasic
  }
  description
  id
  insertedAt
  name
  recommendation
  ref {
    kind
    name
  }
  updatedAt
  violationCount
}
    ${ClusterBasicFragmentDoc}` as unknown as DocumentNode<Types.PolicyConstraintFragment, unknown>;
export const ComplianceReportGeneratorFragmentDoc = /*#__PURE__*/ gql`
    fragment ComplianceReportGenerator on ComplianceReportGenerator {
  id
  name
  format
  readBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.ComplianceReportGeneratorFragment, unknown>;
export const ComplianceReportFragmentDoc = /*#__PURE__*/ gql`
    fragment ComplianceReport on ComplianceReports {
  insertedAt
  id
  name
  sha256
}
    ` as unknown as DocumentNode<Types.ComplianceReportFragment, unknown>;
export const PolicyTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment PolicyTiny on Policy {
  id
  name
  type
  description
  matchCount
  project {
    ...ProjectTiny
  }
  insertedAt
  updatedAt
}
    ${ProjectTinyFragmentDoc}` as unknown as DocumentNode<Types.PolicyTinyFragment, unknown>;
export const PolicyFragmentDoc = /*#__PURE__*/ gql`
    fragment Policy on Policy {
  ...PolicyTiny
  policy
  evaluationCount
  workbenchAttachmentCount
  stackAttachmentCount
}
    ${PolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.PolicyFragment, unknown>;
export const PolicyEvaluationFragmentDoc = /*#__PURE__*/ gql`
    fragment PolicyEvaluation on PolicyEvaluation {
  id
  policyIds
  input
  output
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.PolicyEvaluationFragment, unknown>;
export const BindingPolicyTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment BindingPolicyTiny on BindingPolicy {
  id
  type
  insertedAt
  updatedAt
  policy {
    ...PolicyTiny
  }
  bindPolicy {
    ...PolicyTiny
  }
}
    ${PolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.BindingPolicyTinyFragment, unknown>;
export const BindingPolicyFragmentDoc = /*#__PURE__*/ gql`
    fragment BindingPolicy on BindingPolicy {
  ...BindingPolicyTiny
  interval
  matches {
    workbench {
      regexes
    }
    stack {
      type
    }
  }
}
    ${BindingPolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.BindingPolicyFragment, unknown>;
export const ProjectFragmentDoc = /*#__PURE__*/ gql`
    fragment Project on Project {
  id
  insertedAt
  updatedAt
  name
  default
  description
  disableInsights
}
    ` as unknown as DocumentNode<Types.ProjectFragment, unknown>;
export const ProjectBindingsFragmentDoc = /*#__PURE__*/ gql`
    fragment ProjectBindings on Project {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.ProjectBindingsFragment, unknown>;
export const PublicWorkbenchDashboardGraphFragmentDoc = /*#__PURE__*/ gql`
    fragment PublicWorkbenchDashboardGraph on PublicWorkbenchDashboardGraph {
  identifier
  title
  description
  type
  unit
  sectionId
  markdown
  options
  layout {
    x
    y
    w
    h
  }
  hasDatasource
}
    ` as unknown as DocumentNode<Types.PublicWorkbenchDashboardGraphFragment, unknown>;
export const StackInfracostResourceFragmentDoc = /*#__PURE__*/ gql`
    fragment StackInfracostResource on StackInfracostResource {
  id
  resourceScope
  projectName
  name
  resourceType
  hourlyCost
  monthlyCost
  monthlyUsageCost
  rawResource
}
    ` as unknown as DocumentNode<Types.StackInfracostResourceFragment, unknown>;
export const StackRunFragmentDoc = /*#__PURE__*/ gql`
    fragment StackRun on StackRun {
  id
  insertedAt
  git {
    ref
  }
  message
  committer
  status
  approval
  approvedAt
  approver {
    name
    email
  }
  insight {
    ...AiInsight
  }
  infracostResources(limit: 5) {
    ...StackInfracostResource
  }
}
    ${AiInsightFragmentDoc}
${StackInfracostResourceFragmentDoc}` as unknown as DocumentNode<Types.StackRunFragment, unknown>;
export const StackFragmentDoc = /*#__PURE__*/ gql`
    fragment Stack on InfrastructureStack {
  id
  insertedAt
  deletedAt
  name
  type
  deleteRun {
    ...StackRun
  }
  configuration {
    image
    version
    terraform {
      parallelism
      refresh
    }
    terragrunt {
      parallelism
      refresh
    }
    pulumi {
      parallel
      refresh
      stack
      backendUrl
    }
  }
  repository {
    id
    url
    pulledAt
  }
  git {
    ref
    folder
  }
  cluster {
    ...ClusterTiny
  }
  paused
  status
  approval
  variables
  environment {
    name
    value
    secret
  }
  jobSpec {
    namespace
    raw
    annotations
    labels
    serviceAccount
    containers {
      image
      args
      env {
        value
        name
      }
      envFrom {
        secret
        configMap
      }
    }
  }
  tags {
    name
    value
  }
  insight {
    ...AiInsight
  }
  policyEngine {
    type
    maxSeverity
  }
}
    ${StackRunFragmentDoc}
${ClusterTinyFragmentDoc}
${AiInsightFragmentDoc}` as unknown as DocumentNode<Types.StackFragment, unknown>;
export const ObservableMetricFragmentDoc = /*#__PURE__*/ gql`
    fragment ObservableMetric on ObservableMetric {
  provider {
    name
    type
  }
  identifier
}
    ` as unknown as DocumentNode<Types.ObservableMetricFragment, unknown>;
export const StackConfigurationFragmentDoc = /*#__PURE__*/ gql`
    fragment StackConfiguration on StackConfiguration {
  version
  image
  terraform {
    parallelism
    refresh
  }
  terragrunt {
    parallelism
    refresh
  }
  pulumi {
    parallel
    refresh
    stack
    backendUrl
  }
  aiApproval {
    enabled
    file
    ignoreCancel
    git {
      files
      folder
      ref
    }
  }
}
    ` as unknown as DocumentNode<Types.StackConfigurationFragment, unknown>;
export const StackStateResourceFragmentDoc = /*#__PURE__*/ gql`
    fragment StackStateResource on StackStateResource {
  name
  resource
  identifier
  links
  configuration
}
    ` as unknown as DocumentNode<Types.StackStateResourceFragment, unknown>;
export const StackStateFragmentDoc = /*#__PURE__*/ gql`
    fragment StackState on StackState {
  id
  plan
  planJson
  state {
    ...StackStateResource
  }
}
    ${StackStateResourceFragmentDoc}` as unknown as DocumentNode<Types.StackStateFragment, unknown>;
export const StackOutputFragmentDoc = /*#__PURE__*/ gql`
    fragment StackOutput on StackOutput {
  name
  value
  secret
}
    ` as unknown as DocumentNode<Types.StackOutputFragment, unknown>;
export const StackEnvironmentFragmentDoc = /*#__PURE__*/ gql`
    fragment StackEnvironment on StackEnvironment {
  name
  value
  secret
}
    ` as unknown as DocumentNode<Types.StackEnvironmentFragment, unknown>;
export const ServiceErrorsFragmentDoc = /*#__PURE__*/ gql`
    fragment ServiceErrors on ServiceError {
  source
  message
  warning
}
    ` as unknown as DocumentNode<Types.ServiceErrorsFragment, unknown>;
export const StackFileFragmentDoc = /*#__PURE__*/ gql`
    fragment StackFile on StackFile {
  path
  content
}
    ` as unknown as DocumentNode<Types.StackFileFragment, unknown>;
export const RunStepFragmentDoc = /*#__PURE__*/ gql`
    fragment RunStep on RunStep {
  id
  name
  insertedAt
  updatedAt
  status
  stage
  args
  cmd
  index
  logs {
    id
    updatedAt
    insertedAt
    logs
  }
}
    ` as unknown as DocumentNode<Types.RunStepFragment, unknown>;
export const StackPolicyViolationFragmentDoc = /*#__PURE__*/ gql`
    fragment StackPolicyViolation on StackPolicyViolation {
  id
  insertedAt
  resolution
  severity
  policyUrl
  policyModule
  policyId
  description
  title
  causes {
    filename
    resource
    start
    end
    lines {
      line
      content
      first
      last
    }
  }
}
    ` as unknown as DocumentNode<Types.StackPolicyViolationFragment, unknown>;
export const StackRunDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment StackRunDetails on StackRun {
  id
  status
  updatedAt
  insertedAt
  type
  message
  committer
  approval
  approvedAt
  approver {
    ...User
  }
  approvalResult {
    reason
    result
  }
  cancellationReason
  stack {
    name
    deleteRun {
      id
    }
    observableMetrics {
      ...ObservableMetric
    }
  }
  configuration {
    ...StackConfiguration
  }
  state {
    ...StackState
  }
  repository {
    ...GitRepository
  }
  git {
    files
    ref
    folder
  }
  pullRequest {
    ...PullRequest
  }
  output {
    ...StackOutput
  }
  cluster {
    ...ClusterTiny
  }
  environment {
    ...StackEnvironment
  }
  errors {
    ...ServiceErrors
  }
  files {
    ...StackFile
  }
  jobSpec {
    ...JobGateSpec
  }
  steps {
    ...RunStep
  }
  insight {
    ...AiInsight
  }
  violations {
    ...StackPolicyViolation
  }
  policyEngine {
    type
    maxSeverity
  }
  infracostResources(limit: 10) {
    ...StackInfracostResource
  }
}
    ${UserFragmentDoc}
${ObservableMetricFragmentDoc}
${StackConfigurationFragmentDoc}
${StackStateFragmentDoc}
${GitRepositoryFragmentDoc}
${PullRequestFragmentDoc}
${StackOutputFragmentDoc}
${ClusterTinyFragmentDoc}
${StackEnvironmentFragmentDoc}
${ServiceErrorsFragmentDoc}
${StackFileFragmentDoc}
${JobGateSpecFragmentDoc}
${RunStepFragmentDoc}
${AiInsightFragmentDoc}
${StackPolicyViolationFragmentDoc}
${StackInfracostResourceFragmentDoc}` as unknown as DocumentNode<Types.StackRunDetailsFragment, unknown>;
export const CustomStackRunFragmentDoc = /*#__PURE__*/ gql`
    fragment CustomStackRun on CustomStackRun {
  id
  name
  documentation
  commands {
    args
    cmd
  }
  configuration {
    ...PrConfiguration
  }
}
    ${PrConfigurationFragmentDoc}` as unknown as DocumentNode<Types.CustomStackRunFragment, unknown>;
export const AccessTokenFragmentDoc = /*#__PURE__*/ gql`
    fragment AccessToken on AccessToken {
  id
  insertedAt
  updatedAt
  scopes {
    api
    apis
    identifier
    ids
  }
}
    ` as unknown as DocumentNode<Types.AccessTokenFragment, unknown>;
export const AccessTokenAuditFragmentDoc = /*#__PURE__*/ gql`
    fragment AccessTokenAudit on AccessTokenAudit {
  id
  city
  count
  country
  insertedAt
  ip
  latitude
  longitude
  timestamp
  updatedAt
}
    ` as unknown as DocumentNode<Types.AccessTokenAuditFragment, unknown>;
export const SharedSecretFragmentDoc = /*#__PURE__*/ gql`
    fragment SharedSecret on SharedSecret {
  secret
  handle
  name
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.SharedSecretFragment, unknown>;
export const UserWithGroupsFragmentDoc = /*#__PURE__*/ gql`
    fragment UserWithGroups on User {
  ...User
  groups {
    id
    name
    description
  }
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.UserWithGroupsFragment, unknown>;
export const InviteFragmentDoc = /*#__PURE__*/ gql`
    fragment Invite on Invite {
  secureId
}
    ` as unknown as DocumentNode<Types.InviteFragment, unknown>;
export const RoleBindingFragmentDoc = /*#__PURE__*/ gql`
    fragment RoleBinding on RoleBinding {
  id
  user {
    ...User
  }
  group {
    ...Group
  }
}
    ${UserFragmentDoc}
${GroupFragmentDoc}` as unknown as DocumentNode<Types.RoleBindingFragment, unknown>;
export const RoleFragmentDoc = /*#__PURE__*/ gql`
    fragment Role on Role {
  id
  name
  description
  repositories
  permissions
  roleBindings {
    ...RoleBinding
  }
}
    ${RoleBindingFragmentDoc}` as unknown as DocumentNode<Types.RoleFragment, unknown>;
export const AvailableFeaturesFragmentDoc = /*#__PURE__*/ gql`
    fragment AvailableFeatures on AvailableFeatures {
  audits
  cd
  databaseManagement
  userManagement
}
    ` as unknown as DocumentNode<Types.AvailableFeaturesFragment, unknown>;
export const ManifestFragmentDoc = /*#__PURE__*/ gql`
    fragment Manifest on PluralManifest {
  network {
    pluralDns
    subdomain
  }
  cluster
  bucketPrefix
}
    ` as unknown as DocumentNode<Types.ManifestFragment, unknown>;
export const VulnerabilityReportTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment VulnerabilityReportTiny on VulnerabilityReport {
  id
  artifactUrl
  services {
    service {
      id
      name
      cluster {
        id
      }
    }
  }
  namespaces {
    namespace
  }
  summary {
    criticalCount
    highCount
    mediumCount
    lowCount
    unknownCount
    noneCount
  }
  artifactRepoUrl
}
    ` as unknown as DocumentNode<Types.VulnerabilityReportTinyFragment, unknown>;
export const CvssBundleFragmentDoc = /*#__PURE__*/ gql`
    fragment CvssBundle on CvssBundle {
  attackComplexity
  attackVector
  availability
  confidentiality
  integrity
  privilegesRequired
  userInteraction
  nvidia {
    v2Score
    v2Vector
    v3Score
    v3Vector
    v40Score
    v40Vector
  }
  redhat {
    v2Score
    v2Vector
    v3Score
    v3Vector
    v40Score
    v40Vector
  }
}
    ` as unknown as DocumentNode<Types.CvssBundleFragment, unknown>;
export const VulnerabilityFragmentDoc = /*#__PURE__*/ gql`
    fragment Vulnerability on Vulnerability {
  id
  vulnId
  title
  description
  severity
  score
  primaryLink
  links
  target
  class
  packageType
  pkgPath
  publishedDate
  installedVersion
  fixedVersion
  lastModifiedDate
  cvss {
    ...CvssBundle
  }
  cvssSource
  resource
  insertedAt
  updatedAt
}
    ${CvssBundleFragmentDoc}` as unknown as DocumentNode<Types.VulnerabilityFragment, unknown>;
export const VulnerabilityReportFragmentDoc = /*#__PURE__*/ gql`
    fragment VulnerabilityReport on VulnerabilityReport {
  ...VulnerabilityReportTiny
  vulnerabilities {
    ...Vulnerability
  }
}
    ${VulnerabilityReportTinyFragmentDoc}
${VulnerabilityFragmentDoc}` as unknown as DocumentNode<Types.VulnerabilityReportFragment, unknown>;
export const VulnerabilityStatisticFragmentDoc = /*#__PURE__*/ gql`
    fragment VulnerabilityStatistic on VulnerabilityStatistic {
  count
  grade
}
    ` as unknown as DocumentNode<Types.VulnerabilityStatisticFragment, unknown>;
export const ClusterVulnAggregateFragmentDoc = /*#__PURE__*/ gql`
    fragment ClusterVulnAggregate on ClusterVulnAggregate {
  cluster {
    id
    name
    handle
    project {
      name
    }
  }
  count
}
    ` as unknown as DocumentNode<Types.ClusterVulnAggregateFragment, unknown>;
export const VulnerabilityReportConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment VulnerabilityReportConnection on VulnerabilityReportConnection {
  pageInfo {
    ...PageInfo
  }
  edges {
    node {
      ...VulnerabilityReportTiny
    }
  }
}
    ${PageInfoFragmentDoc}
${VulnerabilityReportTinyFragmentDoc}` as unknown as DocumentNode<Types.VulnerabilityReportConnectionFragment, unknown>;
export const WorkbenchToolTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchToolTiny on WorkbenchTool {
  id
  name
  tool
  categories
  approval
  cloudConnection {
    ...CloudConnectionTiny
  }
  mcpServer {
    id
    name
    url
  }
}
    ${CloudConnectionTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchToolTinyFragment, unknown>;
export const IssueWebhookTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment IssueWebhookTiny on IssueWebhook {
  id
  provider
}
    ` as unknown as DocumentNode<Types.IssueWebhookTinyFragment, unknown>;
export const WorkbenchWebhookTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchWebhookTiny on WorkbenchWebhook {
  id
  name
  priority
  webhook {
    id
    type
  }
  issueWebhook {
    ...IssueWebhookTiny
  }
}
    ${IssueWebhookTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchWebhookTinyFragment, unknown>;
export const WorkbenchTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchTiny on Workbench {
  id
  name
  description
  insertedAt
  updatedAt
  agentRuntime {
    id
    name
    type
  }
  tools {
    ...WorkbenchToolTiny
  }
  webhooks(first: 50) {
    edges {
      node {
        ...WorkbenchWebhookTiny
      }
    }
  }
}
    ${WorkbenchToolTinyFragmentDoc}
${WorkbenchWebhookTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchTinyFragment, unknown>;
export const WorkbenchJobModesFieldsFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobModesFields on WorkbenchJobModes {
  plan
  verification
  model {
    provider
    model
  }
  coding {
    approval
    babysit
    review
  }
  budget {
    cost
    tokens
  }
  kubernetes {
    update
    delete
    exec
    drain
    excludeNamespaces
    requireNamespaces
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobModesFieldsFragment, unknown>;
export const WorkbenchToolConfigurationFieldsFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchToolConfigurationFields on WorkbenchToolConfiguration {
  http {
    url
    method
    headers {
      name
      value
    }
    body
    inputSchema
  }
  datadog {
    site
  }
  elastic {
    index
    url
    username
  }
  opensearch {
    host
    index
    awsAccessKeyId
    awsRegion
    assumeRoleArn
    usePodIdentity
  }
  loki {
    url
    username
    tenantId
  }
  victoriaLogs {
    url
    username
    accountId
    projectId
  }
  prometheus {
    url
    username
    tenantId
    awsSigv4
    awsAccessKeyId
    awsRegion
  }
  tempo {
    url
    username
    tenantId
  }
  jaeger {
    url
    username
  }
  atlassian {
    email
    url
  }
  jira {
    email
    url
  }
  jiraDatacenter {
    url
  }
  serviceNow {
    url
    username
  }
  linear {
    url
  }
  slack {
    url
  }
  pagerduty {
    url
  }
  teams {
    clientId
    tenantId
  }
  splunk {
    url
    tokenType
    username
  }
  cloudwatch {
    logGroupNames
    region
    roleArn
    roleSessionName
  }
  azure {
    subscriptionId
    tenantId
    clientId
    prometheusUrl
  }
  dynatrace {
    url
  }
  sentry {
    url
  }
  github {
    url
    toolset
    appId
    installationId
  }
  gitlab {
    url
  }
  bitbucket {
    url
  }
  bitbucketDatacenter {
    url
  }
  azureDevops {
    url
  }
  lambda {
    lambdaArn
    description
    inputSchema
  }
  cloudRun {
    identifier
    description
    inputSchema
  }
  azureFunction {
    identifier
    description
    inputSchema
  }
  docker {
    url
    provider
    proxy {
      enabled
      url
      noproxy
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchToolConfigurationFieldsFragment, unknown>;
export const WorkbenchToolFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchTool on WorkbenchTool {
  ...WorkbenchToolTiny
  scmConnection {
    id
    name
    type
  }
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  oauth {
    enabled
    type
    tokenUrl
    clientId
    keyId
    audience
    resource
    scopes
  }
  configuration {
    ...WorkbenchToolConfigurationFields
  }
}
    ${WorkbenchToolTinyFragmentDoc}
${PolicyBindingFragmentDoc}
${WorkbenchToolConfigurationFieldsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchToolFragment, unknown>;
export const WorkbenchFragmentDoc = /*#__PURE__*/ gql`
    fragment Workbench on Workbench {
  ...WorkbenchTiny
  systemPrompt
  filesystemEnabled
  agentRuntime {
    id
    name
    allowedRepositories
  }
  repository {
    id
  }
  configuration {
    infrastructure {
      selfService
      services
      stacks
      kubernetes
      podLogs
      vulnerabilities
      sentinels
    }
    observability {
      logs
      metrics
    }
    coding {
      mode
      repositories
      enableBabysitting
    }
  }
  modes {
    ...WorkbenchJobModesFields
  }
  budget {
    enabled
    maximum
    minFree
    unit
    last
    lastUpdated
  }
  skills {
    ref {
      ref
      folder
    }
    files
  }
  workbenchSkills(first: 500) {
    edges {
      node {
        id
        name
        description
        contents
        subagents
      }
    }
  }
  workbenchKnowledge(first: 50) {
    edges {
      node {
        id
        name
        description
        knowledge
        labels
        usages
        lastUsedAt
      }
    }
  }
  tools {
    ...WorkbenchTool
  }
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  botUser {
    id
    name
    email
    profile
  }
}
    ${WorkbenchTinyFragmentDoc}
${WorkbenchJobModesFieldsFragmentDoc}
${WorkbenchToolFragmentDoc}
${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchFragment, unknown>;
export const WorkbenchJobActivityMetricFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobActivityMetric on WorkbenchJobActivityMetric {
  timestamp
  name
  value
  labels
}
    ` as unknown as DocumentNode<Types.WorkbenchJobActivityMetricFragment, unknown>;
export const AttachmentFragmentDoc = /*#__PURE__*/ gql`
    fragment Attachment on Attachment {
  id
  filename
  filetype
  path
  size
  downloadUrl
}
    ` as unknown as DocumentNode<Types.AttachmentFragment, unknown>;
export const WorkbenchToolQueryDataFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchToolQueryData on WorkbenchToolQueryData {
  toolName
  toolArgs
  summary
}
    ` as unknown as DocumentNode<Types.WorkbenchToolQueryDataFragment, unknown>;
export const WorkbenchJobActivityLogFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobActivityLog on WorkbenchJobActivityLog {
  timestamp
  message
  labels
}
    ` as unknown as DocumentNode<Types.WorkbenchJobActivityLogFragment, unknown>;
export const WorkbenchJobActivityTraceFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobActivityTrace on WorkbenchJobActivityTrace {
  traceId
  spanId
  parentId
  name
  service
  start
  end
  tags
}
    ` as unknown as DocumentNode<Types.WorkbenchJobActivityTraceFragment, unknown>;
export const WorkbenchCanvasToolGraphFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchCanvasToolGraph on WorkbenchCanvasToolGraph {
  title
  summary
  query {
    ...WorkbenchToolQueryData
  }
}
    ${WorkbenchToolQueryDataFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchCanvasToolGraphFragment, unknown>;
export const WorkbenchCanvasBlockGraphFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchCanvasBlockGraph on WorkbenchCanvasBlockGraph {
  title
  data {
    label
    value
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchCanvasBlockGraphFragment, unknown>;
export const WorkbenchCanvasBlockFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchCanvasBlock on WorkbenchCanvasBlock {
  identifier
  type
  title
  description
  sectionId
  collapsed
  layout {
    x
    y
    w
    h
  }
  content {
    markdown
    metrics {
      ...WorkbenchCanvasToolGraph
    }
    logs {
      ...WorkbenchCanvasToolGraph
    }
    traces {
      ...WorkbenchCanvasToolGraph
    }
    pie {
      ...WorkbenchCanvasBlockGraph
    }
    bar {
      ...WorkbenchCanvasBlockGraph
    }
  }
}
    ${WorkbenchCanvasToolGraphFragmentDoc}
${WorkbenchCanvasBlockGraphFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchCanvasBlockFragment, unknown>;
export const WorkbenchJobActivityResultFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobActivityResult on WorkbenchJobActivityResult {
  output
  error
  explanation
  functionCall {
    name
    input
    toolId
    tool {
      id
      name
      tool
      configuration {
        lambda {
          description
        }
        cloudRun {
          description
        }
        azureFunction {
          description
        }
      }
    }
  }
  kubeRequest {
    handle
    method
    path
    queryParams
    contentType
  }
  kubeDrain {
    handle
    node
    explanation
  }
  kubeExec {
    handle
    command
    namespace
    pod
    container
    explanation
  }
  jobUpdate {
    diff
    workingTheory
    criticism
    conclusion
  }
  metricsQuery {
    ...WorkbenchToolQueryData
  }
  logs {
    ...WorkbenchJobActivityLog
  }
  traces {
    ...WorkbenchJobActivityTrace
  }
  tracesQuery {
    ...WorkbenchToolQueryData
  }
  canvas {
    ...WorkbenchCanvasBlock
  }
}
    ${WorkbenchToolQueryDataFragmentDoc}
${WorkbenchJobActivityLogFragmentDoc}
${WorkbenchJobActivityTraceFragmentDoc}
${WorkbenchCanvasBlockFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActivityResultFragment, unknown>;
export const WorkbenchJobActivityFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobActivity on WorkbenchJobActivity {
  id
  type
  status
  prompt
  insertedAt
  attachments {
    ...Attachment
  }
  user {
    ...UserTiny
  }
  result {
    ...WorkbenchJobActivityResult
  }
  agentRun {
    ...AgentRunTiny
  }
  agentRuns {
    ...AgentRunTiny
  }
}
    ${AttachmentFragmentDoc}
${UserTinyFragmentDoc}
${WorkbenchJobActivityResultFragmentDoc}
${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActivityFragment, unknown>;
export const MetricSeriesFragmentDoc = /*#__PURE__*/ gql`
    fragment MetricSeries on MetricResponse {
  name
  metric
  values {
    timestamp
    value
  }
}
    ` as unknown as DocumentNode<Types.MetricSeriesFragment, unknown>;
export const WorkbenchJobThoughtFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobThought on WorkbenchJobThought {
  id
  content
  toolName
  toolArgs
  tool {
    ...WorkbenchToolTiny
  }
  activity {
    id
  }
  attributes {
    logs {
      ...WorkbenchJobActivityLog
    }
    series {
      ...MetricSeries
    }
    traces {
      ...WorkbenchJobActivityTrace
    }
  }
}
    ${WorkbenchToolTinyFragmentDoc}
${WorkbenchJobActivityLogFragmentDoc}
${MetricSeriesFragmentDoc}
${WorkbenchJobActivityTraceFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobThoughtFragment, unknown>;
export const WorkbenchJobActivityWithThoughtsFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobActivityWithThoughts on WorkbenchJobActivity {
  ...WorkbenchJobActivity
  thoughts {
    ...WorkbenchJobThought
  }
}
    ${WorkbenchJobActivityFragmentDoc}
${WorkbenchJobThoughtFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActivityWithThoughtsFragment, unknown>;
export const WorkbenchJobProgressFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobProgress on WorkbenchJobProgress {
  activityId
  tool
  text
  arguments
}
    ` as unknown as DocumentNode<Types.WorkbenchJobProgressFragment, unknown>;
export const WorkbenchTextStreamFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchTextStream on WorkbenchTextStream {
  activityId
  text
}
    ` as unknown as DocumentNode<Types.WorkbenchTextStreamFragment, unknown>;
export const WorkbenchCronFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchCron on WorkbenchCron {
  id
  crontab
  prompt
  userId
  modes {
    ...WorkbenchJobModesFields
  }
  lastRunAt
  nextRunAt
  insertedAt
  updatedAt
}
    ${WorkbenchJobModesFieldsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchCronFragment, unknown>;
export const WorkbenchPromptFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchPrompt on WorkbenchPrompt {
  id
  title
  category
  prompt
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.WorkbenchPromptFragment, unknown>;
export const IssueWebhookFragmentDoc = /*#__PURE__*/ gql`
    fragment IssueWebhook on IssueWebhook {
  id
  name
  provider
  url
  insertedAt
  updatedAt
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.IssueWebhookFragment, unknown>;
export const WorkbenchWebhookFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchWebhook on WorkbenchWebhook {
  id
  name
  prompt
  priority
  userId
  modes {
    ...WorkbenchJobModesFields
  }
  matches {
    regex
    substring
    caseInsensitive
  }
  insertedAt
  updatedAt
  webhook {
    id
    name
    type
    url
  }
  issueWebhook {
    ...IssueWebhook
  }
}
    ${WorkbenchJobModesFieldsFragmentDoc}
${IssueWebhookFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchWebhookFragment, unknown>;
export const ChatProviderConnectionFragmentDoc = /*#__PURE__*/ gql`
    fragment ChatProviderConnection on ChatProviderConnection {
  id
  name
  type
  configuration {
    slack {
      botId
    }
    teams {
      clientId
      tenantId
    }
  }
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.ChatProviderConnectionFragment, unknown>;
export const WorkbenchChatbotFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchChatbot on WorkbenchChatbot {
  id
  channel
  prompt
  messageBehavior
  userId
  modes {
    ...WorkbenchJobModesFields
  }
  insertedAt
  updatedAt
  chatConnection {
    ...ChatProviderConnection
  }
  user {
    id
    name
    email
    profile
  }
}
    ${WorkbenchJobModesFieldsFragmentDoc}
${ChatProviderConnectionFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchChatbotFragment, unknown>;
export const WorkbenchIssueFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchIssue on Issue {
  id
  title
  externalId
  provider
  status
  url
  insertedAt
  updatedAt
  workbench {
    id
  }
  workbenchJob {
    id
    status
    pullRequests {
      ...PullRequestBasic
    }
  }
}
    ${PullRequestBasicFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchIssueFragment, unknown>;
export const QueuedPromptTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment QueuedPromptTiny on QueuedPrompt {
  id
  prompt
  dequeableAt
  insertedAt
  user {
    id
    name
  }
}
    ` as unknown as DocumentNode<Types.QueuedPromptTinyFragment, unknown>;
export const WorkbenchJobUsageTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobUsageTiny on WorkbenchJobUsage {
  cachedTokens
  inputTokens
  outputTokens
  totalCost
  totalTokens
}
    ` as unknown as DocumentNode<Types.WorkbenchJobUsageTinyFragment, unknown>;
export const WorkbenchJobPullRequestFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobPullRequest on PullRequest {
  ...PullRequestBasic
  patch
}
    ${PullRequestBasicFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobPullRequestFragment, unknown>;
export const WorkbenchJobTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobTiny on WorkbenchJob {
  id
  prompt
  status
  error
  insertedAt
  queuedPromptCount
  queuedPromptSummary {
    readyCount
    pendingCount
    nextAt
  }
  usage {
    ...WorkbenchJobUsageTiny
  }
  modes {
    budget {
      cost
      tokens
    }
  }
  user {
    id
    name
    profile
  }
  workbench {
    id
    name
  }
  alert {
    id
    state
    url
  }
  issue {
    id
    status
    url
  }
  pullRequests {
    ...WorkbenchJobPullRequest
  }
  result {
    id
    conclusion
  }
  evalResult {
    id
    grade
  }
  chatbotMessage {
    id
    channel
    message
    chatConnection {
      id
      name
      type
    }
  }
}
    ${WorkbenchJobUsageTinyFragmentDoc}
${WorkbenchJobPullRequestFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobTinyFragment, unknown>;
export const WorkbenchJobUsageFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobUsage on WorkbenchJobUsage {
  cachedTokens
  inputCost
  inputTokens
  outputCost
  outputTokens
  reasoningTokens
  totalCost
  totalTokens
}
    ` as unknown as DocumentNode<Types.WorkbenchJobUsageFragment, unknown>;
export const WorkbenchJobResultTodoFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobResultTodo on WorkbenchJobResultTodo {
  name
  description
  done
}
    ` as unknown as DocumentNode<Types.WorkbenchJobResultTodoFragment, unknown>;
export const WorkbenchJobResultFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobResult on WorkbenchJobResult {
  id
  workingTheory
  criticism
  conclusion
  topology
  todos {
    ...WorkbenchJobResultTodo
  }
  canvas {
    ...WorkbenchCanvasBlock
  }
}
    ${WorkbenchJobResultTodoFragmentDoc}
${WorkbenchCanvasBlockFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobResultFragment, unknown>;
export const WorkbenchJobFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJob on WorkbenchJob {
  ...WorkbenchJobTiny
  updatedAt
  usage {
    ...WorkbenchJobUsage
  }
  workbench {
    id
    name
    filesystemEnabled
    tools {
      ...WorkbenchToolTiny
    }
  }
  alert {
    ...Alert
  }
  issue {
    id
    title
    externalId
    insertedAt
    status
    url
    provider
  }
  result {
    ...WorkbenchJobResult
  }
  evalResult {
    feedback {
      summary
      prompt
      result
      logic
    }
  }
}
    ${WorkbenchJobTinyFragmentDoc}
${WorkbenchJobUsageFragmentDoc}
${WorkbenchToolTinyFragmentDoc}
${AlertFragmentDoc}
${WorkbenchJobResultFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobFragment, unknown>;
export const WorkbenchEvalResultRowFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchEvalResultRow on WorkbenchEvalResult {
  id
  grade
  feedback {
    summary
    prompt
    result
    logic
  }
  workbenchJob {
    id
    prompt
    insertedAt
    startedAt
    completedAt
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchEvalResultRowFragment, unknown>;
export const WorkbenchAccessibleUserFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchAccessibleUser on User {
  id
  name
  email
  profile
}
    ` as unknown as DocumentNode<Types.WorkbenchAccessibleUserFragment, unknown>;
export const WorkbenchAlertFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchAlert on Alert {
  ...Alert
  workbenchJob {
    error
    pullRequests {
      ...PullRequestBasic
    }
  }
  cluster {
    id
    name
  }
  serviceDeployment {
    id
    name
    cluster {
      id
    }
  }
  value
  silenceUrl
}
    ${AlertFragmentDoc}
${PullRequestBasicFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchAlertFragment, unknown>;
export const UnifiedWorkbenchSkillTinyFragmentDoc = /*#__PURE__*/ gql`
    fragment UnifiedWorkbenchSkillTiny on UnifiedWorkbenchSkill {
  id
  name
  description
  subagents
}
    ` as unknown as DocumentNode<Types.UnifiedWorkbenchSkillTinyFragment, unknown>;
export const WorkbenchJobActionFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchJobAction on WorkbenchJobActivity {
  id
  type
  status
  prompt
  insertedAt
  user {
    ...UserTiny
  }
  result {
    output
    error
    explanation
    functionCall {
      name
      input
      toolId
      tool {
        id
        name
        tool
        configuration {
          lambda {
            description
          }
          cloudRun {
            description
          }
          azureFunction {
            description
          }
        }
      }
    }
    kubeRequest {
      handle
      method
      path
      queryParams
      contentType
    }
    kubeDrain {
      handle
      node
      explanation
    }
    kubeExec {
      handle
      command
      namespace
      pod
      container
      explanation
    }
  }
}
    ${UserTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActionFragment, unknown>;
export const WorkbenchFileFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchFile on WorkbenchFile {
  path
  name
  kind
  size
  modifiedAt
  sandboxPath
}
    ` as unknown as DocumentNode<Types.WorkbenchFileFragment, unknown>;
export const WorkbenchLinkCardFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchLinkCard on Workbench {
  id
  name
  repository {
    url
    httpsPath
  }
  botUser {
    name
  }
  agentRuntime {
    id
    cluster {
      id
      name
      handle
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchLinkCardFragment, unknown>;
export const WorkbenchDashboardSummaryFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchDashboardSummary on WorkbenchDashboard {
  id
  name
  description
  publicId
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.WorkbenchDashboardSummaryFragment, unknown>;
export const WorkbenchDashboardDatasourceFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchDashboardDatasource on WorkbenchDashboardDatasource {
  type
  tool
  input
}
    ` as unknown as DocumentNode<Types.WorkbenchDashboardDatasourceFragment, unknown>;
export const WorkbenchDashboardDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchDashboardDetails on WorkbenchDashboard {
  ...WorkbenchDashboardSummary
  workbench {
    id
  }
  graphs {
    identifier
    title
    description
    type
    unit
    sectionId
    toolId
    workbenchTool {
      id
      name
      tool
    }
    markdown
    options
    layout {
      x
      y
      w
      h
    }
    datasource {
      ...WorkbenchDashboardDatasource
    }
  }
  inputs {
    name
    label
    description
    type
    default
    options
    required
    datasource {
      ...WorkbenchDashboardDatasource
    }
  }
}
    ${WorkbenchDashboardSummaryFragmentDoc}
${WorkbenchDashboardDatasourceFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchDashboardDetailsFragment, unknown>;
export const WorkbenchMonitorSummaryFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchMonitorSummary on Monitor {
  id
  name
  description
  type
  state
  severity
  insertedAt
  updatedAt
}
    ` as unknown as DocumentNode<Types.WorkbenchMonitorSummaryFragment, unknown>;
export const WorkbenchMonitorDetailsFragmentDoc = /*#__PURE__*/ gql`
    fragment WorkbenchMonitorDetails on Monitor {
  ...WorkbenchMonitorSummary
  alertTemplate
  evaluationCron
  nextRunAt
  prompt
  modes {
    ...WorkbenchJobModesFields
  }
  threshold {
    ...MonitorThreshold
  }
  query {
    log {
      ...MonitorLogQuery
      tool
      options {
        azure {
          resourceId
        }
      }
    }
    metrics {
      tool
      query
      step
      duration
      options {
        azure {
          resourceId
          metricsNamespace
          aggregation
          filter
          orderBy
          rollUpBy
          metricsEndpoint
        }
      }
    }
  }
  workbench {
    id
  }
  service {
    id
  }
}
    ${WorkbenchMonitorSummaryFragmentDoc}
${WorkbenchJobModesFieldsFragmentDoc}
${MonitorThresholdFragmentDoc}
${MonitorLogQueryFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchMonitorDetailsFragment, unknown>;
export const AgentRunsDocument = /*#__PURE__*/ gql`
    query AgentRuns($after: String, $first: Int = 100, $runtimeId: ID) {
  agentRuns(after: $after, first: $first, runtimeId: $runtimeId) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...AgentRunTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.AgentRunsQuery, Types.AgentRunsQueryVariables>;
export const AgentRunTinyDocument = /*#__PURE__*/ gql`
    query AgentRunTiny($id: ID!) {
  agentRun(id: $id) {
    ...AgentRunTiny
  }
}
    ${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.AgentRunTinyQuery, Types.AgentRunTinyQueryVariables>;
export const AgentRunDocument = /*#__PURE__*/ gql`
    query AgentRun($id: ID!) {
  agentRun(id: $id) {
    ...AgentRun
  }
}
    ${AgentRunFragmentDoc}` as unknown as DocumentNode<Types.AgentRunQuery, Types.AgentRunQueryVariables>;
export const AgentRunPodDocument = /*#__PURE__*/ gql`
    query AgentRunPod($id: ID!) {
  agentRun(id: $id) {
    id
    prompt
    pod {
      ...Pod
    }
  }
}
    ${PodFragmentDoc}` as unknown as DocumentNode<Types.AgentRunPodQuery, Types.AgentRunPodQueryVariables>;
export const AgentRuntimesDocument = /*#__PURE__*/ gql`
    query AgentRuntimes($after: String, $first: Int = 100) {
  agentRuntimes(after: $after, first: $first) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...AgentRuntime
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AgentRuntimeFragmentDoc}` as unknown as DocumentNode<Types.AgentRuntimesQuery, Types.AgentRuntimesQueryVariables>;
export const AgentRuntimeDocument = /*#__PURE__*/ gql`
    query AgentRuntime($id: ID!) {
  agentRuntime(id: $id) {
    ...AgentRuntime
  }
}
    ${AgentRuntimeFragmentDoc}` as unknown as DocumentNode<Types.AgentRuntimeQuery, Types.AgentRuntimeQueryVariables>;
export const AgentRuntimeReposDocument = /*#__PURE__*/ gql`
    query AgentRuntimeRepos($id: ID!) {
  agentRuntime(id: $id) {
    ...AgentRuntimeRepos
  }
}
    ${AgentRuntimeReposFragmentDoc}` as unknown as DocumentNode<Types.AgentRuntimeReposQuery, Types.AgentRuntimeReposQueryVariables>;
export const AgentRunPodLogsDocument = /*#__PURE__*/ gql`
    query AgentRunPodLogs($runId: ID!, $container: String!, $sinceSeconds: Int!) {
  agentRun(id: $runId) {
    pod {
      logs(container: $container, sinceSeconds: $sinceSeconds)
    }
  }
}
    ` as unknown as DocumentNode<Types.AgentRunPodLogsQuery, Types.AgentRunPodLogsQueryVariables>;
export const AgentRunRepositoriesDocument = /*#__PURE__*/ gql`
    query AgentRunRepositories($after: String, $first: Int = 100, $q: String) {
  agentRunRepositories(after: $after, first: $first, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...AgentRunRepository
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AgentRunRepositoryFragmentDoc}` as unknown as DocumentNode<Types.AgentRunRepositoriesQuery, Types.AgentRunRepositoriesQueryVariables>;
export const CreateAgentRunDocument = /*#__PURE__*/ gql`
    mutation CreateAgentRun($runtimeId: ID!, $attributes: AgentRunAttributes!) {
  createAgentRun(runtimeId: $runtimeId, attributes: $attributes) {
    ...AgentRun
  }
}
    ${AgentRunFragmentDoc}` as unknown as DocumentNode<Types.CreateAgentRunMutation, Types.CreateAgentRunMutationVariables>;
export const CreateAgentRunPromptDocument = /*#__PURE__*/ gql`
    mutation CreateAgentRunPrompt($id: ID!, $prompt: String!) {
  createAgentRunPrompt(id: $id, prompt: $prompt) {
    id
    prompt
    insertedAt
  }
}
    ` as unknown as DocumentNode<Types.CreateAgentRunPromptMutation, Types.CreateAgentRunPromptMutationVariables>;
export const CancelAgentRunDocument = /*#__PURE__*/ gql`
    mutation CancelAgentRun($id: ID!) {
  cancelAgentRun(id: $id) {
    ...AgentRunTiny
  }
}
    ${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.CancelAgentRunMutation, Types.CancelAgentRunMutationVariables>;
export const ApproveAgentRunDocument = /*#__PURE__*/ gql`
    mutation ApproveAgentRun($id: ID!) {
  approveAgentRun(id: $id) {
    ...AgentRunTiny
  }
}
    ${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.ApproveAgentRunMutation, Types.ApproveAgentRunMutationVariables>;
export const UpsertAgentRuntimeDocument = /*#__PURE__*/ gql`
    mutation UpsertAgentRuntime($attributes: AgentRuntimeAttributes!) {
  upsertAgentRuntime(attributes: $attributes) {
    ...AgentRuntime
  }
}
    ${AgentRuntimeFragmentDoc}` as unknown as DocumentNode<Types.UpsertAgentRuntimeMutation, Types.UpsertAgentRuntimeMutationVariables>;
export const ShareAgentRunDocument = /*#__PURE__*/ gql`
    mutation ShareAgentRun($id: ID!, $shared: Boolean!) {
  shareAgentRun(id: $id, shared: $shared) {
    ...AgentRunTiny
  }
}
    ${AgentRunTinyFragmentDoc}` as unknown as DocumentNode<Types.ShareAgentRunMutation, Types.ShareAgentRunMutationVariables>;
export const CreateClusterUpgradeDocument = /*#__PURE__*/ gql`
    mutation CreateClusterUpgrade($id: ID!, $attributes: ClusterUpgradeAttributes!) {
  createClusterUpgrade(id: $id, attributes: $attributes) {
    ...ClusterUpgrade
  }
}
    ${ClusterUpgradeFragmentDoc}` as unknown as DocumentNode<Types.CreateClusterUpgradeMutation, Types.CreateClusterUpgradeMutationVariables>;
export const AgentRunChatDocument = /*#__PURE__*/ gql`
    subscription AgentRunChat($runId: ID!) {
  agentMessageDelta(runId: $runId) {
    delta
    payload {
      ...AgentMessage
    }
  }
}
    ${AgentMessageFragmentDoc}` as unknown as DocumentNode<Types.AgentRunChatSubscription, Types.AgentRunChatSubscriptionVariables>;
export const AgentMessageOutputDeltaDocument = /*#__PURE__*/ gql`
    subscription AgentMessageOutputDelta($runId: ID!) {
  agentMessageOutputDelta(runId: $runId) {
    delta
    payload {
      messageId
      agentRunId
      stdout
      stderr
    }
  }
}
    ` as unknown as DocumentNode<Types.AgentMessageOutputDeltaSubscription, Types.AgentMessageOutputDeltaSubscriptionVariables>;
export const AgentRunDeltaDocument = /*#__PURE__*/ gql`
    subscription AgentRunDelta($runId: ID!) {
  agentRunDelta(id: $runId) {
    delta
    payload {
      ...AgentRunTiny
      todos {
        title
        description
        done
      }
      analysis {
        ...AgentAnalysis
      }
      podReference {
        name
        namespace
      }
    }
  }
}
    ${AgentRunTinyFragmentDoc}
${AgentAnalysisFragmentDoc}` as unknown as DocumentNode<Types.AgentRunDeltaSubscription, Types.AgentRunDeltaSubscriptionVariables>;
export const ChatThreadsDocument = /*#__PURE__*/ gql`
    query ChatThreads($first: Int = 100, $last: Int, $after: String, $before: String, $q: String) {
  chatThreads(first: $first, last: $last, after: $after, before: $before, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ChatThreadTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ChatThreadTinyFragmentDoc}` as unknown as DocumentNode<Types.ChatThreadsQuery, Types.ChatThreadsQueryVariables>;
export const ChatAgentSessionDocument = /*#__PURE__*/ gql`
    query ChatAgentSession($id: ID!) {
  chatThread(id: $id) {
    id
    session {
      id
      done
      pullRequest {
        ...PullRequest
      }
      service {
        ...ServiceDeploymentChat
      }
      stack {
        ...StackChat
      }
      pullRequests(first: 100) {
        edges {
          node {
            ...PullRequest
          }
        }
      }
      serviceDeployments(first: 100) {
        edges {
          node {
            ...ServiceDeploymentTiny
          }
        }
      }
      stacks(first: 100) {
        edges {
          node {
            ...StackTiny
          }
        }
      }
    }
  }
}
    ${PullRequestFragmentDoc}
${ServiceDeploymentChatFragmentDoc}
${StackChatFragmentDoc}
${ServiceDeploymentTinyFragmentDoc}
${StackTinyFragmentDoc}` as unknown as DocumentNode<Types.ChatAgentSessionQuery, Types.ChatAgentSessionQueryVariables>;
export const ChatThreadDetailsDocument = /*#__PURE__*/ gql`
    query ChatThreadDetails($id: ID!) {
  chatThread(id: $id) {
    ...ChatThreadDetails
  }
}
    ${ChatThreadDetailsFragmentDoc}` as unknown as DocumentNode<Types.ChatThreadDetailsQuery, Types.ChatThreadDetailsQueryVariables>;
export const ChatThreadMessagesDocument = /*#__PURE__*/ gql`
    query ChatThreadMessages($id: ID!, $first: Int = 25, $last: Int, $after: String, $before: String, $reverse: Boolean = true) {
  chatThread(id: $id) {
    ...ChatThreadMessages
  }
}
    ${ChatThreadMessagesFragmentDoc}` as unknown as DocumentNode<Types.ChatThreadMessagesQuery, Types.ChatThreadMessagesQueryVariables>;
export const CloudConnectionsDocument = /*#__PURE__*/ gql`
    query CloudConnections($first: Int = 100, $last: Int, $after: String, $before: String, $q: String, $provider: Provider) {
  cloudConnections(
    first: $first
    last: $last
    after: $after
    before: $before
    q: $q
    provider: $provider
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...CloudConnectionTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${CloudConnectionTinyFragmentDoc}` as unknown as DocumentNode<Types.CloudConnectionsQuery, Types.CloudConnectionsQueryVariables>;
export const UpsertCloudConnectionDocument = /*#__PURE__*/ gql`
    mutation UpsertCloudConnection($attributes: CloudConnectionAttributes!) {
  upsertCloudConnection(attributes: $attributes) {
    ...CloudConnectionTiny
  }
}
    ${CloudConnectionTinyFragmentDoc}` as unknown as DocumentNode<Types.UpsertCloudConnectionMutation, Types.UpsertCloudConnectionMutationVariables>;
export const CloudConnectionDocument = /*#__PURE__*/ gql`
    query CloudConnection($id: ID!) {
  cloudConnection(id: $id) {
    ...CloudConnection
  }
}
    ${CloudConnectionFragmentDoc}` as unknown as DocumentNode<Types.CloudConnectionQuery, Types.CloudConnectionQueryVariables>;
export const UpdateCloudConnectionDocument = /*#__PURE__*/ gql`
    mutation UpdateCloudConnection($id: ID!, $attributes: CloudConnectionAttributes!) {
  updateCloudConnection(id: $id, attributes: $attributes) {
    ...CloudConnectionTiny
  }
}
    ${CloudConnectionTinyFragmentDoc}` as unknown as DocumentNode<Types.UpdateCloudConnectionMutation, Types.UpdateCloudConnectionMutationVariables>;
export const DeleteCloudConnectionDocument = /*#__PURE__*/ gql`
    mutation DeleteCloudConnection($id: ID!) {
  deleteCloudConnection(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteCloudConnectionMutation, Types.DeleteCloudConnectionMutationVariables>;
export const HybridChatDocument = /*#__PURE__*/ gql`
    mutation HybridChat($messages: [ChatMessage], $threadId: ID) {
  hybridChat(messages: $messages, threadId: $threadId) {
    ...Chat
  }
}
    ${ChatFragmentDoc}` as unknown as DocumentNode<Types.HybridChatMutation, Types.HybridChatMutationVariables>;
export const ConfirmChatDocument = /*#__PURE__*/ gql`
    mutation ConfirmChat($id: ID!) {
  confirmChat(id: $id) {
    ...Chat
  }
}
    ${ChatFragmentDoc}` as unknown as DocumentNode<Types.ConfirmChatMutation, Types.ConfirmChatMutationVariables>;
export const ConfirmChatPlanDocument = /*#__PURE__*/ gql`
    mutation ConfirmChatPlan($threadId: ID!) {
  confirmPlan(threadId: $threadId) {
    ...Chat
  }
}
    ${ChatFragmentDoc}` as unknown as DocumentNode<Types.ConfirmChatPlanMutation, Types.ConfirmChatPlanMutationVariables>;
export const DeleteChatDocument = /*#__PURE__*/ gql`
    mutation DeleteChat($id: ID!) {
  deleteChat(id: $id) {
    ...Chat
  }
}
    ${ChatFragmentDoc}` as unknown as DocumentNode<Types.DeleteChatMutation, Types.DeleteChatMutationVariables>;
export const CreateChatThreadDocument = /*#__PURE__*/ gql`
    mutation CreateChatThread($attributes: ChatThreadAttributes!) {
  createThread(attributes: $attributes) {
    ...ChatThreadDetails
  }
}
    ${ChatThreadDetailsFragmentDoc}` as unknown as DocumentNode<Types.CreateChatThreadMutation, Types.CreateChatThreadMutationVariables>;
export const UpdateChatThreadDocument = /*#__PURE__*/ gql`
    mutation UpdateChatThread($id: ID!, $attributes: ChatThreadAttributes!) {
  updateThread(id: $id, attributes: $attributes) {
    ...ChatThreadDetails
  }
}
    ${ChatThreadDetailsFragmentDoc}` as unknown as DocumentNode<Types.UpdateChatThreadMutation, Types.UpdateChatThreadMutationVariables>;
export const DeleteChatThreadDocument = /*#__PURE__*/ gql`
    mutation DeleteChatThread($id: ID!) {
  deleteThread(id: $id) {
    ...ChatThreadTiny
  }
}
    ${ChatThreadTinyFragmentDoc}` as unknown as DocumentNode<Types.DeleteChatThreadMutation, Types.DeleteChatThreadMutationVariables>;
export const CloneChatThreadDocument = /*#__PURE__*/ gql`
    mutation CloneChatThread($id: ID!, $seq: Int) {
  cloneThread(id: $id, seq: $seq) {
    ...ChatThreadDetails
  }
}
    ${ChatThreadDetailsFragmentDoc}` as unknown as DocumentNode<Types.CloneChatThreadMutation, Types.CloneChatThreadMutationVariables>;
export const AddChatContextDocument = /*#__PURE__*/ gql`
    mutation AddChatContext($source: ContextSource!, $sourceId: ID, $threadId: ID!) {
  addChatContext(source: $source, sourceId: $sourceId, threadId: $threadId) {
    ...Chat
  }
}
    ${ChatFragmentDoc}` as unknown as DocumentNode<Types.AddChatContextMutation, Types.AddChatContextMutationVariables>;
export const CreateAgentSessionDocument = /*#__PURE__*/ gql`
    mutation CreateAgentSession($attributes: AgentSessionAttributes!) {
  createAgentSession(attributes: $attributes) {
    ...ChatThreadTiny
  }
}
    ${ChatThreadTinyFragmentDoc}` as unknown as DocumentNode<Types.CreateAgentSessionMutation, Types.CreateAgentSessionMutationVariables>;
export const AiChatStreamDocument = /*#__PURE__*/ gql`
    subscription AIChatStream($threadId: ID, $insightId: ID, $scopeId: String, $recommendationId: ID) {
  aiStream(
    threadId: $threadId
    insightId: $insightId
    scopeId: $scopeId
    recommendationId: $recommendationId
  ) {
    ...AiDelta
  }
}
    ${AiDeltaFragmentDoc}` as unknown as DocumentNode<Types.AiChatStreamSubscription, Types.AiChatStreamSubscriptionVariables>;
export const InfraResearchDocument = /*#__PURE__*/ gql`
    query InfraResearch($id: ID!) {
  infraResearch(id: $id) {
    ...InfraResearch
  }
}
    ${InfraResearchFragmentDoc}` as unknown as DocumentNode<Types.InfraResearchQuery, Types.InfraResearchQueryVariables>;
export const InfraResearchesDocument = /*#__PURE__*/ gql`
    query InfraResearches($first: Int = 100, $last: Int, $after: String, $before: String, $published: Boolean) {
  infraResearches(
    first: $first
    last: $last
    after: $after
    before: $before
    published: $published
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...InfraResearch
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${InfraResearchFragmentDoc}` as unknown as DocumentNode<Types.InfraResearchesQuery, Types.InfraResearchesQueryVariables>;
export const CreateInfraResearchDocument = /*#__PURE__*/ gql`
    mutation CreateInfraResearch($attributes: InfraResearchAttributes!) {
  createInfraResearch(attributes: $attributes) {
    ...InfraResearch
  }
}
    ${InfraResearchFragmentDoc}` as unknown as DocumentNode<Types.CreateInfraResearchMutation, Types.CreateInfraResearchMutationVariables>;
export const UpdateInfraResearchDocument = /*#__PURE__*/ gql`
    mutation UpdateInfraResearch($id: ID!, $attributes: InfraResearchUpdateAttributes!) {
  updateInfraResearch(id: $id, attributes: $attributes) {
    ...InfraResearch
  }
}
    ${InfraResearchFragmentDoc}` as unknown as DocumentNode<Types.UpdateInfraResearchMutation, Types.UpdateInfraResearchMutationVariables>;
export const FixResearchDiagramDocument = /*#__PURE__*/ gql`
    mutation FixResearchDiagram($id: ID!, $error: String!) {
  fixResearchDiagram(id: $id, error: $error) {
    ...InfraResearch
  }
}
    ${InfraResearchFragmentDoc}` as unknown as DocumentNode<Types.FixResearchDiagramMutation, Types.FixResearchDiagramMutationVariables>;
export const ServiceComponentIdentitiesDocument = /*#__PURE__*/ gql`
    query ServiceComponentIdentities($id: ID!) {
  serviceDeployment(id: $id) {
    id
    components {
      id
      group
      version
      kind
      namespace
      name
    }
  }
}
    ` as unknown as DocumentNode<Types.ServiceComponentIdentitiesQuery, Types.ServiceComponentIdentitiesQueryVariables>;
export const AiInsightDocument = /*#__PURE__*/ gql`
    query AiInsight($id: ID!) {
  aiInsight(id: $id) {
    ...AiInsight
  }
}
    ${AiInsightFragmentDoc}` as unknown as DocumentNode<Types.AiInsightQuery, Types.AiInsightQueryVariables>;
export const AiCompletionDocument = /*#__PURE__*/ gql`
    query AICompletion($system: String!, $input: String, $chat: [ChatMessage], $scopeId: String) {
  aiCompletion(system: $system, input: $input, chat: $chat, scopeId: $scopeId)
}
    ` as unknown as DocumentNode<Types.AiCompletionQuery, Types.AiCompletionQueryVariables>;
export const AiSuggestedFixDocument = /*#__PURE__*/ gql`
    query AISuggestedFix($insightID: ID!) {
  aiSuggestedFix(insightId: $insightID)
}
    ` as unknown as DocumentNode<Types.AiSuggestedFixQuery, Types.AiSuggestedFixQueryVariables>;
export const ClusterInsightComponentDocument = /*#__PURE__*/ gql`
    query ClusterInsightComponent($id: ID!) {
  clusterInsightComponent(id: $id) {
    ...ClusterInsightComponentDetail
  }
}
    ${ClusterInsightComponentDetailFragmentDoc}` as unknown as DocumentNode<Types.ClusterInsightComponentQuery, Types.ClusterInsightComponentQueryVariables>;
export const AiFixPrDocument = /*#__PURE__*/ gql`
    mutation AiFixPr($insightId: ID!, $messages: [ChatMessage]) {
  aiFixPr(insightId: $insightId, messages: $messages) {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.AiFixPrMutation, Types.AiFixPrMutationVariables>;
export const RefreshInsightDocument = /*#__PURE__*/ gql`
    mutation RefreshInsight($id: ID!) {
  refreshInsight(insightId: $id) {
    ...AiInsight
  }
}
    ${AiInsightFragmentDoc}` as unknown as DocumentNode<Types.RefreshInsightMutation, Types.RefreshInsightMutationVariables>;
export const McpServersDocument = /*#__PURE__*/ gql`
    query McpServers($first: Int = 100, $after: String, $q: String) {
  mcpServers(first: $first, after: $after, q: $q) {
    ...McpServerConnection
  }
}
    ${McpServerConnectionFragmentDoc}` as unknown as DocumentNode<Types.McpServersQuery, Types.McpServersQueryVariables>;
export const McpServerDocument = /*#__PURE__*/ gql`
    query McpServer($id: ID!) {
  mcpServer(id: $id) {
    ...McpServer
  }
}
    ${McpServerFragmentDoc}` as unknown as DocumentNode<Types.McpServerQuery, Types.McpServerQueryVariables>;
export const McpServerAuditsDocument = /*#__PURE__*/ gql`
    query McpServerAudits($id: ID!, $first: Int = 100, $after: String) {
  mcpServer(id: $id) {
    id
    audits(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...McpServerAudit
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${McpServerAuditFragmentDoc}` as unknown as DocumentNode<Types.McpServerAuditsQuery, Types.McpServerAuditsQueryVariables>;
export const GenerateMcpTokenDocument = /*#__PURE__*/ gql`
    query GenerateMcpToken {
  mcpToken
}
    ` as unknown as DocumentNode<Types.GenerateMcpTokenQuery, Types.GenerateMcpTokenQueryVariables>;
export const UpsertMcpServerDocument = /*#__PURE__*/ gql`
    mutation UpsertMcpServer($attributes: McpServerAttributes!) {
  upsertMcpServer(attributes: $attributes) {
    ...McpServer
  }
}
    ${McpServerFragmentDoc}` as unknown as DocumentNode<Types.UpsertMcpServerMutation, Types.UpsertMcpServerMutationVariables>;
export const UpdateMcpServerDocument = /*#__PURE__*/ gql`
    mutation UpdateMcpServer($id: ID!, $attributes: McpServerAttributes!) {
  updateMcpServer(id: $id, attributes: $attributes) {
    ...McpServer
  }
}
    ${McpServerFragmentDoc}` as unknown as DocumentNode<Types.UpdateMcpServerMutation, Types.UpdateMcpServerMutationVariables>;
export const DeleteMcpServerDocument = /*#__PURE__*/ gql`
    mutation DeleteMcpServer($id: ID!) {
  deleteMcpServer(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteMcpServerMutation, Types.DeleteMcpServerMutationVariables>;
export const SentinelsDocument = /*#__PURE__*/ gql`
    query Sentinels($first: Int = 100, $after: String, $q: String, $status: SentinelRunStatus) {
  sentinels(first: $first, after: $after, q: $q, status: $status) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Sentinel
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${SentinelFragmentDoc}` as unknown as DocumentNode<Types.SentinelsQuery, Types.SentinelsQueryVariables>;
export const SentinelDocument = /*#__PURE__*/ gql`
    query Sentinel($id: ID, $name: String) {
  sentinel(id: $id, name: $name) {
    ...Sentinel
  }
}
    ${SentinelFragmentDoc}` as unknown as DocumentNode<Types.SentinelQuery, Types.SentinelQueryVariables>;
export const SentinelRunsDocument = /*#__PURE__*/ gql`
    query SentinelRuns($id: ID, $name: String, $first: Int = 100, $after: String) {
  sentinel(id: $id, name: $name) {
    id
    runs(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...SentinelRunTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${SentinelRunTinyFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunsQuery, Types.SentinelRunsQueryVariables>;
export const SentinelRunDocument = /*#__PURE__*/ gql`
    query SentinelRun($id: ID!) {
  sentinelRun(id: $id) {
    ...SentinelRun
  }
}
    ${SentinelRunFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunQuery, Types.SentinelRunQueryVariables>;
export const SentinelStatisticsDocument = /*#__PURE__*/ gql`
    query SentinelStatistics($q: String) {
  sentinelStatistics(q: $q) {
    ...SentinelStatistic
  }
}
    ${SentinelStatisticFragmentDoc}` as unknown as DocumentNode<Types.SentinelStatisticsQuery, Types.SentinelStatisticsQueryVariables>;
export const SentinelRunJobsDocument = /*#__PURE__*/ gql`
    query SentinelRunJobs($id: ID!, $first: Int = 100, $after: String, $status: SentinelRunJobStatus, $check: String) {
  sentinelRun(id: $id) {
    id
    jobs(first: $first, after: $after, status: $status, check: $check) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...SentinelRunJobTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${SentinelRunJobTinyFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunJobsQuery, Types.SentinelRunJobsQueryVariables>;
export const SentinelRunJobDocument = /*#__PURE__*/ gql`
    query SentinelRunJob($id: ID!) {
  sentinelRunJob(id: $id) {
    ...SentinelRunJob
  }
}
    ${SentinelRunJobFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunJobQuery, Types.SentinelRunJobQueryVariables>;
export const SentinelRunJobK8sJobDocument = /*#__PURE__*/ gql`
    query SentinelRunJobK8sJob($id: ID!) {
  sentinelRunJob(id: $id) {
    id
    cluster {
      id
    }
    job {
      ...Job
    }
  }
}
    ${JobFragmentDoc}` as unknown as DocumentNode<Types.SentinelRunJobK8sJobQuery, Types.SentinelRunJobK8sJobQueryVariables>;
export const SentinelRunJobK8sJobLogsDocument = /*#__PURE__*/ gql`
    query SentinelRunJobK8sJobLogs($id: ID!, $container: String!, $sinceSeconds: Int!) {
  sentinelRunJob(id: $id) {
    job {
      logs(container: $container, sinceSeconds: $sinceSeconds)
    }
  }
}
    ` as unknown as DocumentNode<Types.SentinelRunJobK8sJobLogsQuery, Types.SentinelRunJobK8sJobLogsQueryVariables>;
export const RunSentinelDocument = /*#__PURE__*/ gql`
    mutation RunSentinel($id: ID!) {
  runSentinel(id: $id) {
    ...SentinelRunTiny
  }
}
    ${SentinelRunTinyFragmentDoc}` as unknown as DocumentNode<Types.RunSentinelMutation, Types.RunSentinelMutationVariables>;
export const ClusterAlertsDocument = /*#__PURE__*/ gql`
    query ClusterAlerts($clusterId: ID!, $after: String, $first: Int, $before: String, $last: Int) {
  cluster(id: $clusterId) {
    id
    alerts(after: $after, first: $first, before: $before, last: $last) {
      ...AlertConnection
    }
  }
}
    ${AlertConnectionFragmentDoc}` as unknown as DocumentNode<Types.ClusterAlertsQuery, Types.ClusterAlertsQueryVariables>;
export const ServiceAlertsDocument = /*#__PURE__*/ gql`
    query ServiceAlerts($serviceId: ID!, $after: String, $first: Int, $before: String, $last: Int) {
  serviceDeployment(id: $serviceId) {
    id
    alerts(after: $after, first: $first, before: $before, last: $last) {
      ...AlertConnection
    }
  }
}
    ${AlertConnectionFragmentDoc}` as unknown as DocumentNode<Types.ServiceAlertsQuery, Types.ServiceAlertsQueryVariables>;
export const UpsertAlertResolutionDocument = /*#__PURE__*/ gql`
    mutation UpsertAlertResolution($id: ID!, $attributes: AlertResolutionAttributes!) {
  createAlertResolution(id: $id, attributes: $attributes) {
    ...AlertResolution
  }
}
    ${AlertResolutionFragmentDoc}` as unknown as DocumentNode<Types.UpsertAlertResolutionMutation, Types.UpsertAlertResolutionMutationVariables>;
export const AuditsDocument = /*#__PURE__*/ gql`
    query Audits($repo: String, $cursor: String) {
  audits(repo: $repo, after: $cursor, first: 50) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Audit
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AuditFragmentDoc}` as unknown as DocumentNode<Types.AuditsQuery, Types.AuditsQueryVariables>;
export const AuditMetricsDocument = /*#__PURE__*/ gql`
    query AuditMetrics {
  auditMetrics {
    country
    count
  }
}
    ` as unknown as DocumentNode<Types.AuditMetricsQuery, Types.AuditMetricsQueryVariables>;
export const PrAutomationsDocument = /*#__PURE__*/ gql`
    query PrAutomations($first: Int = 100, $after: String, $catalogId: ID, $role: PrRole, $q: String) {
  prAutomations(
    first: $first
    after: $after
    catalogId: $catalogId
    role: $role
    q: $q
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...PrAutomation
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PrAutomationFragmentDoc}` as unknown as DocumentNode<Types.PrAutomationsQuery, Types.PrAutomationsQueryVariables>;
export const PrAutomationDocument = /*#__PURE__*/ gql`
    query PrAutomation($id: ID, $name: String) {
  prAutomation(id: $id, name: $name) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}` as unknown as DocumentNode<Types.PrAutomationQuery, Types.PrAutomationQueryVariables>;
export const CreatePrAutomationDocument = /*#__PURE__*/ gql`
    mutation CreatePrAutomation($attributes: PrAutomationAttributes!) {
  createPrAutomation(attributes: $attributes) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}` as unknown as DocumentNode<Types.CreatePrAutomationMutation, Types.CreatePrAutomationMutationVariables>;
export const UpdatePrAutomationDocument = /*#__PURE__*/ gql`
    mutation UpdatePrAutomation($id: ID!, $attributes: PrAutomationAttributes!) {
  updatePrAutomation(id: $id, attributes: $attributes) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}` as unknown as DocumentNode<Types.UpdatePrAutomationMutation, Types.UpdatePrAutomationMutationVariables>;
export const DeletePrAutomationDocument = /*#__PURE__*/ gql`
    mutation DeletePrAutomation($id: ID!) {
  deletePrAutomation(id: $id) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}` as unknown as DocumentNode<Types.DeletePrAutomationMutation, Types.DeletePrAutomationMutationVariables>;
export const ScmConnectionsDocument = /*#__PURE__*/ gql`
    query ScmConnections($first: Int = 100, $after: String, $type: ScmType) {
  scmConnections(first: $first, after: $after, type: $type) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ScmConnection
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ScmConnectionFragmentDoc}` as unknown as DocumentNode<Types.ScmConnectionsQuery, Types.ScmConnectionsQueryVariables>;
export const ScmConnectionDocument = /*#__PURE__*/ gql`
    query ScmConnection($id: ID, $name: String) {
  scmConnection(id: $id, name: $name) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}` as unknown as DocumentNode<Types.ScmConnectionQuery, Types.ScmConnectionQueryVariables>;
export const CreateScmConnectionDocument = /*#__PURE__*/ gql`
    mutation CreateScmConnection($attributes: ScmConnectionAttributes!) {
  createScmConnection(attributes: $attributes) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}` as unknown as DocumentNode<Types.CreateScmConnectionMutation, Types.CreateScmConnectionMutationVariables>;
export const UpdateScmConnectionDocument = /*#__PURE__*/ gql`
    mutation UpdateScmConnection($id: ID!, $attributes: ScmConnectionAttributes!) {
  updateScmConnection(id: $id, attributes: $attributes) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}` as unknown as DocumentNode<Types.UpdateScmConnectionMutation, Types.UpdateScmConnectionMutationVariables>;
export const DeleteScmConnectionDocument = /*#__PURE__*/ gql`
    mutation DeleteScmConnection($id: ID!) {
  deleteScmConnection(id: $id) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}` as unknown as DocumentNode<Types.DeleteScmConnectionMutation, Types.DeleteScmConnectionMutationVariables>;
export const SetupRenovateDocument = /*#__PURE__*/ gql`
    mutation SetupRenovate($connectionId: ID!, $repos: [String]!, $name: String, $namespace: String) {
  setupRenovate(
    connectionId: $connectionId
    repos: $repos
    name: $name
    namespace: $namespace
  ) {
    id
  }
}
    ` as unknown as DocumentNode<Types.SetupRenovateMutation, Types.SetupRenovateMutationVariables>;
export const ScmWebhooksDocument = /*#__PURE__*/ gql`
    query ScmWebhooks($after: String, $before: String, $first: Int, $last: Int) {
  scmWebhooks(after: $after, before: $before, first: $first, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ScmWebhook
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ScmWebhookFragmentDoc}` as unknown as DocumentNode<Types.ScmWebhooksQuery, Types.ScmWebhooksQueryVariables>;
export const CreateScmWebhookDocument = /*#__PURE__*/ gql`
    mutation CreateScmWebhook($connectionId: ID!, $owner: String!) {
  createScmWebhook(connectionId: $connectionId, owner: $owner) {
    ...ScmWebhook
  }
}
    ${ScmWebhookFragmentDoc}` as unknown as DocumentNode<Types.CreateScmWebhookMutation, Types.CreateScmWebhookMutationVariables>;
export const DeleteScmWebhookDocument = /*#__PURE__*/ gql`
    mutation DeleteScmWebhook($id: ID!) {
  deleteScmWebhook(id: $id) {
    ...ScmWebhook
  }
}
    ${ScmWebhookFragmentDoc}` as unknown as DocumentNode<Types.DeleteScmWebhookMutation, Types.DeleteScmWebhookMutationVariables>;
export const CreateScmWebhookPointerDocument = /*#__PURE__*/ gql`
    mutation CreateScmWebhookPointer($attributes: ScmWebhookAttributes!) {
  createScmWebhookPointer(attributes: $attributes) {
    ...ScmWebhook
  }
}
    ${ScmWebhookFragmentDoc}` as unknown as DocumentNode<Types.CreateScmWebhookPointerMutation, Types.CreateScmWebhookPointerMutationVariables>;
export const RegisterGitHubAppDocument = /*#__PURE__*/ gql`
    mutation RegisterGitHubApp($installationId: String!, $name: String!) {
  registerGithubApp(installationId: $installationId, name: $name) {
    id
  }
}
    ` as unknown as DocumentNode<Types.RegisterGitHubAppMutation, Types.RegisterGitHubAppMutationVariables>;
export const PendingApprovalStacksDocument = /*#__PURE__*/ gql`
    query PendingApprovalStacks($first: Int = 50) {
  infrastructureStacks(first: $first, status: PENDING_APPROVAL) {
    edges {
      node {
        ...AwaitingReviewStack
      }
    }
  }
}
    ${AwaitingReviewStackFragmentDoc}` as unknown as DocumentNode<Types.PendingApprovalStacksQuery, Types.PendingApprovalStacksQueryVariables>;
export const PendingApprovalAgentRunsDocument = /*#__PURE__*/ gql`
    query PendingApprovalAgentRuns($first: Int = 100) {
  agentRuns(first: $first, status: PENDING_APPROVAL) {
    edges {
      node {
        ...AwaitingReviewAgentRun
      }
    }
  }
}
    ${AwaitingReviewAgentRunFragmentDoc}` as unknown as DocumentNode<Types.PendingApprovalAgentRunsQuery, Types.PendingApprovalAgentRunsQueryVariables>;
export const PendingApprovalWorkbenchActivitiesDocument = /*#__PURE__*/ gql`
    query PendingApprovalWorkbenchActivities($first: Int = 100) {
  workbenchJobActivities(first: $first, status: NEEDS_APPROVAL) {
    edges {
      node {
        ...AwaitingReviewWorkbenchActivity
      }
    }
  }
}
    ${AwaitingReviewWorkbenchActivityFragmentDoc}` as unknown as DocumentNode<Types.PendingApprovalWorkbenchActivitiesQuery, Types.PendingApprovalWorkbenchActivitiesQueryVariables>;
export const ObjectStoresDocument = /*#__PURE__*/ gql`
    query ObjectStores($after: String, $first: Int = 100, $before: String, $last: Int) {
  objectStores(after: $after, first: $first, before: $before, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ObjectStore
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ObjectStoreFragmentDoc}` as unknown as DocumentNode<Types.ObjectStoresQuery, Types.ObjectStoresQueryVariables>;
export const ClustersObjectStoresDocument = /*#__PURE__*/ gql`
    query ClustersObjectStores($after: String, $first: Int = 100, $before: String, $last: Int, $backups: Boolean) {
  clusters(
    after: $after
    first: $first
    before: $before
    last: $last
    backups: $backups
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClustersObjectStores
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClustersObjectStoresFragmentDoc}` as unknown as DocumentNode<Types.ClustersObjectStoresQuery, Types.ClustersObjectStoresQueryVariables>;
export const ClusterBackupDocument = /*#__PURE__*/ gql`
    query ClusterBackup($id: ID, $clusterId: ID, $namespace: String, $name: String) {
  clusterBackup(
    id: $id
    clusterId: $clusterId
    namespace: $namespace
    name: $name
  ) {
    ...ClusterBackup
  }
}
    ${ClusterBackupFragmentDoc}` as unknown as DocumentNode<Types.ClusterBackupQuery, Types.ClusterBackupQueryVariables>;
export const ClusterBackupsDocument = /*#__PURE__*/ gql`
    query ClusterBackups($after: String, $first: Int = 100, $before: String, $last: Int, $clusterId: ID!) {
  clusterBackups(
    last: $last
    first: $first
    before: $before
    after: $after
    clusterId: $clusterId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClusterBackup
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterBackupFragmentDoc}` as unknown as DocumentNode<Types.ClusterBackupsQuery, Types.ClusterBackupsQueryVariables>;
export const ClusterRestoresDocument = /*#__PURE__*/ gql`
    query ClusterRestores($after: String, $first: Int = 100, $before: String, $last: Int, $clusterId: ID!) {
  clusterRestores(
    last: $last
    first: $first
    before: $before
    after: $after
    clusterId: $clusterId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClusterRestore
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterRestoreFragmentDoc}` as unknown as DocumentNode<Types.ClusterRestoresQuery, Types.ClusterRestoresQueryVariables>;
export const CreateObjectStoreDocument = /*#__PURE__*/ gql`
    mutation CreateObjectStore($attributes: ObjectStoreAttributes!) {
  createObjectStore(attributes: $attributes) {
    ...ObjectStore
  }
}
    ${ObjectStoreFragmentDoc}` as unknown as DocumentNode<Types.CreateObjectStoreMutation, Types.CreateObjectStoreMutationVariables>;
export const UpdateObjectStoreDocument = /*#__PURE__*/ gql`
    mutation UpdateObjectStore($id: ID!, $attributes: ObjectStoreAttributes!) {
  updateObjectStore(id: $id, attributes: $attributes) {
    ...ObjectStore
  }
}
    ${ObjectStoreFragmentDoc}` as unknown as DocumentNode<Types.UpdateObjectStoreMutation, Types.UpdateObjectStoreMutationVariables>;
export const DeleteObjectStoreDocument = /*#__PURE__*/ gql`
    mutation DeleteObjectStore($id: ID!) {
  deleteObjectStore(id: $id) {
    ...ObjectStore
  }
}
    ${ObjectStoreFragmentDoc}` as unknown as DocumentNode<Types.DeleteObjectStoreMutation, Types.DeleteObjectStoreMutationVariables>;
export const ConfigureBackupsDocument = /*#__PURE__*/ gql`
    mutation ConfigureBackups($clusterId: ID!, $storeId: ID!) {
  configureBackups(clusterId: $clusterId, storeId: $storeId) {
    ...ClusterTiny
  }
}
    ${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.ConfigureBackupsMutation, Types.ConfigureBackupsMutationVariables>;
export const DelinkBackupsDocument = /*#__PURE__*/ gql`
    mutation DelinkBackups($clusterId: ID!) {
  delinkBackups(clusterId: $clusterId) {
    ...ClusterTiny
  }
}
    ${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.DelinkBackupsMutation, Types.DelinkBackupsMutationVariables>;
export const CreateClusterRestoreDocument = /*#__PURE__*/ gql`
    mutation CreateClusterRestore($backupId: ID!) {
  createClusterRestore(backupId: $backupId) {
    ...ClusterRestore
  }
}
    ${ClusterRestoreFragmentDoc}` as unknown as DocumentNode<Types.CreateClusterRestoreMutation, Types.CreateClusterRestoreMutationVariables>;
export const CatalogsDocument = /*#__PURE__*/ gql`
    query Catalogs($after: String, $before: String, $first: Int, $last: Int) {
  catalogs(after: $after, before: $before, first: $first, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Catalog
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${CatalogFragmentDoc}` as unknown as DocumentNode<Types.CatalogsQuery, Types.CatalogsQueryVariables>;
export const CatalogDocument = /*#__PURE__*/ gql`
    query Catalog($id: ID, $name: String) {
  catalog(id: $id, name: $name) {
    ...Catalog
  }
}
    ${CatalogFragmentDoc}` as unknown as DocumentNode<Types.CatalogQuery, Types.CatalogQueryVariables>;
export const CatalogSearchDocument = /*#__PURE__*/ gql`
    query CatalogSearch($q: String!) {
  catalogSearch(q: $q) {
    catalog {
      ...CatalogSearchItem
    }
    prAutomation {
      ...PrAutomationSearchItem
    }
  }
}
    ${CatalogSearchItemFragmentDoc}
${PrAutomationSearchItemFragmentDoc}` as unknown as DocumentNode<Types.CatalogSearchQuery, Types.CatalogSearchQueryVariables>;
export const UpsertCatalogDocument = /*#__PURE__*/ gql`
    mutation UpsertCatalog($attributes: CatalogAttributes) {
  upsertCatalog(attributes: $attributes) {
    ...Catalog
  }
}
    ${CatalogFragmentDoc}` as unknown as DocumentNode<Types.UpsertCatalogMutation, Types.UpsertCatalogMutationVariables>;
export const DeleteCatalogDocument = /*#__PURE__*/ gql`
    mutation DeleteCatalog($id: ID!) {
  deleteCatalog(id: $id) {
    ...Catalog
  }
}
    ${CatalogFragmentDoc}` as unknown as DocumentNode<Types.DeleteCatalogMutation, Types.DeleteCatalogMutationVariables>;
export const ClustersDocument = /*#__PURE__*/ gql`
    query Clusters($first: Int, $after: String, $q: String, $healthy: Boolean, $tagQuery: TagQuery, $projectId: ID, $upgradeable: Boolean, $compliance: VersionCompliance, $healthRange: HealthRange) {
  clusters(
    first: $first
    after: $after
    q: $q
    healthy: $healthy
    tagQuery: $tagQuery
    projectId: $projectId
    upgradeable: $upgradeable
    compliance: $compliance
    healthRange: $healthRange
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClustersRow
      }
    }
  }
  tags
}
    ${PageInfoFragmentDoc}
${ClustersRowFragmentDoc}` as unknown as DocumentNode<Types.ClustersQuery, Types.ClustersQueryVariables>;
export const ClustersTinyDocument = /*#__PURE__*/ gql`
    query ClustersTiny($projectId: ID, $first: Int, $q: String) {
  clusters(first: $first, projectId: $projectId, q: $q) {
    edges {
      node {
        ...ClusterTiny
      }
    }
  }
}
    ${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.ClustersTinyQuery, Types.ClustersTinyQueryVariables>;
export const VClustersDocument = /*#__PURE__*/ gql`
    query VClusters($parentId: ID!, $first: Int, $after: String, $q: String, $healthy: Boolean, $projectId: ID) {
  clusters(
    first: $first
    after: $after
    q: $q
    healthy: $healthy
    projectId: $projectId
    parentId: $parentId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClustersRow
      }
    }
  }
  tags
}
    ${PageInfoFragmentDoc}
${ClustersRowFragmentDoc}` as unknown as DocumentNode<Types.VClustersQuery, Types.VClustersQueryVariables>;
export const ClusterSelectorDocument = /*#__PURE__*/ gql`
    query ClusterSelector($first: Int, $after: String, $q: String, $currentClusterId: ID, $projectId: ID) {
  clusters(first: $first, after: $after, q: $q, projectId: $projectId) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClusterTiny
      }
    }
  }
  cluster(id: $currentClusterId) {
    ...ClusterTiny
  }
}
    ${PageInfoFragmentDoc}
${ClusterTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterSelectorQuery, Types.ClusterSelectorQueryVariables>;
export const ClusterDocument = /*#__PURE__*/ gql`
    query Cluster($id: ID, $handle: String) {
  cluster(id: $id, handle: $handle) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}` as unknown as DocumentNode<Types.ClusterQuery, Types.ClusterQueryVariables>;
export const ClusterBasicDocument = /*#__PURE__*/ gql`
    query ClusterBasic($id: ID!) {
  cluster(id: $id) {
    ...ClusterBasic
  }
}
    ${ClusterBasicFragmentDoc}` as unknown as DocumentNode<Types.ClusterBasicQuery, Types.ClusterBasicQueryVariables>;
export const ClusterInsightDocument = /*#__PURE__*/ gql`
    query ClusterInsight($id: ID!) {
  cluster(id: $id) {
    ...ClusterInsight
  }
}
    ${ClusterInsightFragmentDoc}` as unknown as DocumentNode<Types.ClusterInsightQuery, Types.ClusterInsightQueryVariables>;
export const ClusterNodesDocument = /*#__PURE__*/ gql`
    query ClusterNodes($id: ID!) {
  cluster(id: $id) {
    ...ClusterWithNodes
  }
}
    ${ClusterWithNodesFragmentDoc}` as unknown as DocumentNode<Types.ClusterNodesQuery, Types.ClusterNodesQueryVariables>;
export const ClusterPodsDocument = /*#__PURE__*/ gql`
    query ClusterPods($clusterId: ID, $namespace: String, $first: Int, $after: String, $before: String, $last: Int) {
  pods(
    first: $first
    after: $after
    before: $before
    last: $last
    clusterId: $clusterId
    namespace: $namespace
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Pod
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PodFragmentDoc}` as unknown as DocumentNode<Types.ClusterPodsQuery, Types.ClusterPodsQueryVariables>;
export const ClusterNamespacesDocument = /*#__PURE__*/ gql`
    query ClusterNamespaces($clusterId: ID) {
  namespaces(clusterId: $clusterId) {
    metadata {
      ...Metadata
    }
  }
}
    ${MetadataFragmentDoc}` as unknown as DocumentNode<Types.ClusterNamespacesQuery, Types.ClusterNamespacesQueryVariables>;
export const ClusterBindingsDocument = /*#__PURE__*/ gql`
    query ClusterBindings($id: ID!) {
  cluster(id: $id) {
    ...ClusterBindings
  }
}
    ${ClusterBindingsFragmentDoc}` as unknown as DocumentNode<Types.ClusterBindingsQuery, Types.ClusterBindingsQueryVariables>;
export const RuntimeServicesDocument = /*#__PURE__*/ gql`
    query RuntimeServices($id: ID!, $kubeVersion: String!, $hasKubeVersion: Boolean!) {
  cluster(id: $id) {
    ...ClusterRuntimeServices
  }
}
    ${ClusterRuntimeServicesFragmentDoc}` as unknown as DocumentNode<Types.RuntimeServicesQuery, Types.RuntimeServicesQueryVariables>;
export const RuntimeServiceDocument = /*#__PURE__*/ gql`
    query RuntimeService($id: ID!, $version: String!, $kubeVersion: String!, $hasKubeVersion: Boolean!) {
  runtimeService(id: $id) {
    ...RuntimeServiceDetails
  }
}
    ${RuntimeServiceDetailsFragmentDoc}` as unknown as DocumentNode<Types.RuntimeServiceQuery, Types.RuntimeServiceQueryVariables>;
export const UpdateClusterBindingsDocument = /*#__PURE__*/ gql`
    mutation UpdateClusterBindings($id: ID!, $rbac: RbacAttributes!) {
  updateRbac(clusterId: $id, rbac: $rbac)
}
    ` as unknown as DocumentNode<Types.UpdateClusterBindingsMutation, Types.UpdateClusterBindingsMutationVariables>;
export const UpdateClusterDocument = /*#__PURE__*/ gql`
    mutation UpdateCluster($id: ID!, $attributes: ClusterUpdateAttributes!) {
  updateCluster(id: $id, attributes: $attributes) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}` as unknown as DocumentNode<Types.UpdateClusterMutation, Types.UpdateClusterMutationVariables>;
export const CreateClusterDocument = /*#__PURE__*/ gql`
    mutation CreateCluster($attributes: ClusterAttributes!) {
  createCluster(attributes: $attributes) {
    ...Cluster
    deployToken
  }
}
    ${ClusterFragmentDoc}` as unknown as DocumentNode<Types.CreateClusterMutation, Types.CreateClusterMutationVariables>;
export const DeleteClusterDocument = /*#__PURE__*/ gql`
    mutation DeleteCluster($id: ID!) {
  deleteCluster(id: $id) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}` as unknown as DocumentNode<Types.DeleteClusterMutation, Types.DeleteClusterMutationVariables>;
export const DetachClusterDocument = /*#__PURE__*/ gql`
    mutation DetachCluster($id: ID!) {
  detachCluster(id: $id) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}` as unknown as DocumentNode<Types.DetachClusterMutation, Types.DetachClusterMutationVariables>;
export const ClusterStatusesDocument = /*#__PURE__*/ gql`
    query ClusterStatuses($q: String, $projectId: ID, $tagQuery: TagQuery) {
  clusterStatuses(q: $q, projectId: $projectId, tagQuery: $tagQuery) {
    ...ClusterStatusInfo
  }
  upgradeStatistics(q: $q, projectId: $projectId, tagQuery: $tagQuery) {
    upgradeable
    count
  }
}
    ${ClusterStatusInfoFragmentDoc}` as unknown as DocumentNode<Types.ClusterStatusesQuery, Types.ClusterStatusesQueryVariables>;
export const TagPairsDocument = /*#__PURE__*/ gql`
    query TagPairs($first: Int = 30, $q: String, $tag: String, $type: TagType) {
  tagPairs(first: $first, q: $q, tag: $tag, type: $type) {
    edges {
      node {
        name
        value
        id
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.TagPairsQuery, Types.TagPairsQueryVariables>;
export const ClusterMetricsDocument = /*#__PURE__*/ gql`
    query ClusterMetrics($clusterId: ID!, $start: DateTime, $stop: DateTime, $step: String) {
  cluster(id: $clusterId) {
    ...ClusterWithMetrics
  }
}
    ${ClusterWithMetricsFragmentDoc}` as unknown as DocumentNode<Types.ClusterMetricsQuery, Types.ClusterMetricsQueryVariables>;
export const ClusterUsageMetricsDocument = /*#__PURE__*/ gql`
    query ClusterUsageMetrics($clusterId: ID!, $groupBy: ClusterMetricsGrouping, $start: DateTime, $stop: DateTime, $step: String, $cpu: Boolean! = false, $cpuRequests: Boolean! = false, $cpuLimits: Boolean! = false, $cpuAllocatable: Boolean! = false, $cpuThrottling: Boolean! = false, $memory: Boolean! = false, $memoryRequests: Boolean! = false, $memoryLimits: Boolean! = false, $memoryAllocatable: Boolean! = false, $oomKills: Boolean! = false, $networkReceive: Boolean! = false, $networkTransmit: Boolean! = false, $networkReceiveDropped: Boolean! = false, $networkTransmitDropped: Boolean! = false, $ephemeralStorage: Boolean! = false, $fsReads: Boolean! = false, $fsWrites: Boolean! = false, $volumeUsage: Boolean! = false, $volumeCapacity: Boolean! = false, $volumeFullness: Boolean! = false, $podsRunning: Boolean! = false, $podsPending: Boolean! = false, $restarts: Boolean! = false) {
  cluster(id: $clusterId) {
    id
    clusterUsageMetrics(groupBy: $groupBy, start: $start, stop: $stop, step: $step) {
      ...ClusterUsageMetrics
    }
  }
}
    ${ClusterUsageMetricsFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsageMetricsQuery, Types.ClusterUsageMetricsQueryVariables>;
export const ServiceUsageMetricsDocument = /*#__PURE__*/ gql`
    query ServiceUsageMetrics($serviceId: ID!, $groupBy: ServiceMetricsGrouping, $start: DateTime, $stop: DateTime, $step: String, $cpu: Boolean! = false, $cpuRequests: Boolean! = false, $cpuLimits: Boolean! = false, $cpuAllocatable: Boolean! = false, $cpuThrottling: Boolean! = false, $memory: Boolean! = false, $memoryRequests: Boolean! = false, $memoryLimits: Boolean! = false, $memoryAllocatable: Boolean! = false, $oomKills: Boolean! = false, $networkReceive: Boolean! = false, $networkTransmit: Boolean! = false, $networkReceiveDropped: Boolean! = false, $networkTransmitDropped: Boolean! = false, $ephemeralStorage: Boolean! = false, $fsReads: Boolean! = false, $fsWrites: Boolean! = false, $volumeUsage: Boolean! = false, $volumeCapacity: Boolean! = false, $volumeFullness: Boolean! = false, $podsRunning: Boolean! = false, $podsPending: Boolean! = false, $restarts: Boolean! = false) {
  serviceDeployment(id: $serviceId) {
    id
    serviceUsageMetrics(groupBy: $groupBy, start: $start, stop: $stop, step: $step) {
      ...ClusterUsageMetrics
    }
  }
}
    ${ClusterUsageMetricsFragmentDoc}` as unknown as DocumentNode<Types.ServiceUsageMetricsQuery, Types.ServiceUsageMetricsQueryVariables>;
export const ClusterNodeMetricsDocument = /*#__PURE__*/ gql`
    query ClusterNodeMetrics($clusterId: ID!, $node: String!, $start: DateTime, $stop: DateTime, $step: String) {
  cluster(id: $clusterId) {
    ...ClusterNodeMetrics
  }
}
    ${ClusterNodeMetricsFragmentDoc}` as unknown as DocumentNode<Types.ClusterNodeMetricsQuery, Types.ClusterNodeMetricsQueryVariables>;
export const ClusterNetworkGraphDocument = /*#__PURE__*/ gql`
    query ClusterNetworkGraph($clusterId: ID!, $time: DateTime) {
  cluster(id: $clusterId) {
    id
    networkGraph(time: $time) {
      ...NetworkMeshEdge
    }
  }
}
    ${NetworkMeshEdgeFragmentDoc}` as unknown as DocumentNode<Types.ClusterNetworkGraphQuery, Types.ClusterNetworkGraphQueryVariables>;
export const ClusterKubernetesMetricsDocument = /*#__PURE__*/ gql`
    query ClusterKubernetesMetrics($clusterId: ID!, $group: String!, $version: String!, $kind: String!, $name: String!, $namespace: String!, $start: DateTime, $stop: DateTime, $step: String) {
  cluster(id: $clusterId) {
    ...ClusterKubernetesMetrics
  }
}
    ${ClusterKubernetesMetricsFragmentDoc}` as unknown as DocumentNode<Types.ClusterKubernetesMetricsQuery, Types.ClusterKubernetesMetricsQueryVariables>;
export const NodeUsageMetricsDocument = /*#__PURE__*/ gql`
    query NodeUsageMetrics($clusterId: ID!, $node: String!, $start: DateTime, $stop: DateTime, $step: String, $groupBy: NodeMetricsGrouping, $cpuUtilization: Boolean! = false, $cpuModes: Boolean! = false, $cpuCores: Boolean! = false, $load1: Boolean! = false, $load5: Boolean! = false, $load15: Boolean! = false, $memoryTotal: Boolean! = false, $memoryUsed: Boolean! = false, $memoryCached: Boolean! = false, $majorPageFaults: Boolean! = false, $filesystemFullness: Boolean! = false, $diskRead: Boolean! = false, $diskWrite: Boolean! = false, $diskBusy: Boolean! = false, $networkReceive: Boolean! = false, $networkTransmit: Boolean! = false, $networkErrors: Boolean! = false, $networkDropped: Boolean! = false, $cpu: Boolean! = false, $cpuRequests: Boolean! = false, $cpuLimits: Boolean! = false, $cpuAllocatable: Boolean! = false, $memory: Boolean! = false, $memoryRequests: Boolean! = false, $memoryLimits: Boolean! = false, $memoryAllocatable: Boolean! = false, $oomKills: Boolean! = false, $podsRunning: Boolean! = false, $podsAllocatable: Boolean! = false, $restarts: Boolean! = false, $conditions: Boolean! = false) {
  cluster(id: $clusterId) {
    id
    nodeUsageMetrics(
      node: $node
      start: $start
      stop: $stop
      step: $step
      groupBy: $groupBy
    ) {
      ...NodeUsageMetrics
    }
  }
}
    ${NodeUsageMetricsFragmentDoc}` as unknown as DocumentNode<Types.NodeUsageMetricsQuery, Types.NodeUsageMetricsQueryVariables>;
export const ClusterDeltaDocument = /*#__PURE__*/ gql`
    subscription ClusterDelta($id: ID) {
  clusterDelta(id: $id) {
    delta
    payload {
      id
      name
      handle
      self
      virtual
      protect
      distro
      version
      currentVersion
      kubeletVersion
      installed
      healthy
      healthScore
      pingedAt
      deletedAt
      nodeCount
      podCount
      namespaceCount
      cpuTotal
      memoryTotal
      cpuUtil
      memoryUtil
      availabilityZones
    }
  }
}
    ` as unknown as DocumentNode<Types.ClusterDeltaSubscription, Types.ClusterDeltaSubscriptionVariables>;
export const ServiceDeploymentComponentMetricsDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentComponentMetrics($id: ID, $name: String, $cluster: String, $componentId: ID!, $start: DateTime, $stop: DateTime, $step: String) {
  serviceDeployment(id: $id, name: $name, cluster: $cluster) {
    ...ComponentMetricsFragment
  }
}
    ${ComponentMetricsFragmentFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentComponentMetricsQuery, Types.ServiceDeploymentComponentMetricsQueryVariables>;
export const UsageDocument = /*#__PURE__*/ gql`
    query Usage($cpu: String!, $mem: String!, $podCpu: String!, $podMem: String!, $step: String!, $offset: Int!, $clusterId: ID) {
  cpu: metric(clusterId: $clusterId, query: $cpu, offset: $offset, step: $step) {
    ...MetricResponse
  }
  mem: metric(clusterId: $clusterId, query: $mem, offset: $offset, step: $step) {
    ...MetricResponse
  }
  podCpu: metric(
    clusterId: $clusterId
    query: $podCpu
    offset: $offset
    step: $step
  ) {
    ...MetricResponse
  }
  podMem: metric(
    clusterId: $clusterId
    query: $podMem
    offset: $offset
    step: $step
  ) {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.UsageQuery, Types.UsageQueryVariables>;
export const ServiceTarballDocument = /*#__PURE__*/ gql`
    query ServiceTarball($id: ID!) {
  serviceTarball(id: $id) {
    ...ServiceFile
  }
}
    ${ServiceFileFragmentDoc}` as unknown as DocumentNode<Types.ServiceTarballQuery, Types.ServiceTarballQueryVariables>;
export const GitRepositoriesDocument = /*#__PURE__*/ gql`
    query GitRepositories($first: Int = 200, $after: String, $q: String, $health: GitHealth) {
  gitRepositories(first: $first, after: $after, q: $q, health: $health) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...GitRepository
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GitRepositoryFragmentDoc}` as unknown as DocumentNode<Types.GitRepositoriesQuery, Types.GitRepositoriesQueryVariables>;
export const HelmRepositoriesDocument = /*#__PURE__*/ gql`
    query HelmRepositories($first: Int = 200, $after: String, $q: String, $health: GitHealth) {
  helmRepositories(first: $first, after: $after, q: $q, health: $health) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...HelmRepository
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${HelmRepositoryFragmentDoc}` as unknown as DocumentNode<Types.HelmRepositoriesQuery, Types.HelmRepositoriesQueryVariables>;
export const GitPullabilityStatisticsDocument = /*#__PURE__*/ gql`
    query GitPullabilityStatistics {
  gitPullabilityStatistics {
    health
    count
  }
}
    ` as unknown as DocumentNode<Types.GitPullabilityStatisticsQuery, Types.GitPullabilityStatisticsQueryVariables>;
export const HelmPullabilityStatisticsDocument = /*#__PURE__*/ gql`
    query HelmPullabilityStatistics {
  helmPullabilityStatistics {
    health
    count
  }
}
    ` as unknown as DocumentNode<Types.HelmPullabilityStatisticsQuery, Types.HelmPullabilityStatisticsQueryVariables>;
export const FluxHelmRepositoriesDocument = /*#__PURE__*/ gql`
    query FluxHelmRepositories {
  fluxHelmRepositories {
    ...FluxHelmRepository
  }
}
    ${FluxHelmRepositoryFragmentDoc}` as unknown as DocumentNode<Types.FluxHelmRepositoriesQuery, Types.FluxHelmRepositoriesQueryVariables>;
export const FluxHelmRepositoryDocument = /*#__PURE__*/ gql`
    query FluxHelmRepository($namespace: String!, $name: String!) {
  fluxHelmRepository(namespace: $namespace, name: $name) {
    ...FluxHelmRepository
    charts {
      name
      versions {
        ...HelmChartVersion
      }
    }
  }
}
    ${FluxHelmRepositoryFragmentDoc}
${HelmChartVersionFragmentDoc}` as unknown as DocumentNode<Types.FluxHelmRepositoryQuery, Types.FluxHelmRepositoryQueryVariables>;
export const GitRepositoryDocument = /*#__PURE__*/ gql`
    query GitRepository($id: ID!) {
  gitRepository(id: $id) {
    refs
  }
}
    ` as unknown as DocumentNode<Types.GitRepositoryQuery, Types.GitRepositoryQueryVariables>;
export const CreateGitRepositoryDocument = /*#__PURE__*/ gql`
    mutation CreateGitRepository($attributes: GitAttributes!) {
  createGitRepository(attributes: $attributes) {
    ...GitRepository
  }
}
    ${GitRepositoryFragmentDoc}` as unknown as DocumentNode<Types.CreateGitRepositoryMutation, Types.CreateGitRepositoryMutationVariables>;
export const DeleteGitRepositoryDocument = /*#__PURE__*/ gql`
    mutation DeleteGitRepository($id: ID!) {
  deleteGitRepository(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteGitRepositoryMutation, Types.DeleteGitRepositoryMutationVariables>;
export const UpdateGitRepositoryDocument = /*#__PURE__*/ gql`
    mutation UpdateGitRepository($id: ID!, $attributes: GitAttributes!) {
  updateGitRepository(id: $id, attributes: $attributes) {
    ...GitRepository
  }
}
    ${GitRepositoryFragmentDoc}` as unknown as DocumentNode<Types.UpdateGitRepositoryMutation, Types.UpdateGitRepositoryMutationVariables>;
export const CreateGlobalServiceDocument = /*#__PURE__*/ gql`
    mutation CreateGlobalService($attributes: GlobalServiceAttributes!, $cluster: String, $name: String, $serviceId: ID) {
  createGlobalService(
    attributes: $attributes
    cluster: $cluster
    name: $name
    serviceId: $serviceId
  ) {
    ...GlobalService
  }
}
    ${GlobalServiceFragmentDoc}` as unknown as DocumentNode<Types.CreateGlobalServiceMutation, Types.CreateGlobalServiceMutationVariables>;
export const UpdateGlobalServiceDocument = /*#__PURE__*/ gql`
    mutation UpdateGlobalService($id: ID!, $attributes: GlobalServiceAttributes!) {
  updateGlobalService(id: $id, attributes: $attributes) {
    id
  }
}
    ` as unknown as DocumentNode<Types.UpdateGlobalServiceMutation, Types.UpdateGlobalServiceMutationVariables>;
export const DeleteGlobalServiceDocument = /*#__PURE__*/ gql`
    mutation DeleteGlobalService($id: ID!) {
  deleteGlobalService(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteGlobalServiceMutation, Types.DeleteGlobalServiceMutationVariables>;
export const GlobalServicesDocument = /*#__PURE__*/ gql`
    query GlobalServices($first: Int, $after: String, $projectId: ID, $q: String) {
  globalServices(first: $first, after: $after, projectId: $projectId, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...GlobalService
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GlobalServiceFragmentDoc}` as unknown as DocumentNode<Types.GlobalServicesQuery, Types.GlobalServicesQueryVariables>;
export const GetGlobalServiceDocument = /*#__PURE__*/ gql`
    query GetGlobalService($serviceId: ID!) {
  globalService(id: $serviceId) {
    ...GlobalService
  }
}
    ${GlobalServiceFragmentDoc}` as unknown as DocumentNode<Types.GetGlobalServiceQuery, Types.GetGlobalServiceQueryVariables>;
export const GetGlobalServiceServicesDocument = /*#__PURE__*/ gql`
    query GetGlobalServiceServices($serviceId: ID!, $first: Int, $after: String) {
  globalService(id: $serviceId) {
    id
    services(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...ServiceDeploymentsRow
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ServiceDeploymentsRowFragmentDoc}` as unknown as DocumentNode<Types.GetGlobalServiceServicesQuery, Types.GetGlobalServiceServicesQueryVariables>;
export const SyncGlobalServiceDocument = /*#__PURE__*/ gql`
    mutation SyncGlobalService($id: ID!) {
  syncGlobalService(id: $id) {
    ...GlobalService
  }
}
    ${GlobalServiceFragmentDoc}` as unknown as DocumentNode<Types.SyncGlobalServiceMutation, Types.SyncGlobalServiceMutationVariables>;
export const DeploymentSettingsDocument = /*#__PURE__*/ gql`
    query DeploymentSettings {
  deploymentSettings {
    ...DeploymentSettings
  }
  availableModels {
    provider
    model
  }
  defaultModels {
    provider
    model
    toolModel
    embeddingModel
  }
}
    ${DeploymentSettingsFragmentDoc}` as unknown as DocumentNode<Types.DeploymentSettingsQuery, Types.DeploymentSettingsQueryVariables>;
export const ObservabilityProvidersDocument = /*#__PURE__*/ gql`
    query ObservabilityProviders($first: Int, $after: String) {
  observabilityProviders(first: $first, after: $after) {
    edges {
      node {
        ...ObservabilityProvider
      }
    }
    pageInfo {
      ...PageInfo
    }
  }
}
    ${ObservabilityProviderFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.ObservabilityProvidersQuery, Types.ObservabilityProvidersQueryVariables>;
export const ObservabilityWebhooksDocument = /*#__PURE__*/ gql`
    query ObservabilityWebhooks($first: Int, $after: String) {
  observabilityWebhooks(first: $first, after: $after) {
    edges {
      node {
        ...ObservabilityWebhook
      }
    }
    pageInfo {
      ...PageInfo
    }
  }
}
    ${ObservabilityWebhookFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.ObservabilityWebhooksQuery, Types.ObservabilityWebhooksQueryVariables>;
export const ObservabilityWebhookDocument = /*#__PURE__*/ gql`
    query ObservabilityWebhook($id: ID, $name: String) {
  observabilityWebhook(id: $id, name: $name) {
    ...ObservabilityWebhook
  }
}
    ${ObservabilityWebhookFragmentDoc}` as unknown as DocumentNode<Types.ObservabilityWebhookQuery, Types.ObservabilityWebhookQueryVariables>;
export const UpdateDeploymentSettingsDocument = /*#__PURE__*/ gql`
    mutation UpdateDeploymentSettings($attributes: DeploymentSettingsAttributes!) {
  updateDeploymentSettings(attributes: $attributes) {
    ...DeploymentSettings
  }
}
    ${DeploymentSettingsFragmentDoc}` as unknown as DocumentNode<Types.UpdateDeploymentSettingsMutation, Types.UpdateDeploymentSettingsMutationVariables>;
export const UpsertObservabilityProviderDocument = /*#__PURE__*/ gql`
    mutation UpsertObservabilityProvider($attributes: ObservabilityProviderAttributes!) {
  upsertObservabilityProvider(attributes: $attributes) {
    ...ObservabilityProvider
  }
}
    ${ObservabilityProviderFragmentDoc}` as unknown as DocumentNode<Types.UpsertObservabilityProviderMutation, Types.UpsertObservabilityProviderMutationVariables>;
export const UpsertObservabilityWebhookDocument = /*#__PURE__*/ gql`
    mutation UpsertObservabilityWebhook($attributes: ObservabilityWebhookAttributes!) {
  upsertObservabilityWebhook(attributes: $attributes) {
    ...ObservabilityWebhook
  }
}
    ${ObservabilityWebhookFragmentDoc}` as unknown as DocumentNode<Types.UpsertObservabilityWebhookMutation, Types.UpsertObservabilityWebhookMutationVariables>;
export const DeleteObservabilityProviderDocument = /*#__PURE__*/ gql`
    mutation DeleteObservabilityProvider($id: ID!) {
  deleteObservabilityProvider(id: $id) {
    ...ObservabilityProvider
  }
}
    ${ObservabilityProviderFragmentDoc}` as unknown as DocumentNode<Types.DeleteObservabilityProviderMutation, Types.DeleteObservabilityProviderMutationVariables>;
export const DeleteObservabilityWebhookDocument = /*#__PURE__*/ gql`
    mutation DeleteObservabilityWebhook($id: ID!) {
  deleteObservabilityWebhook(id: $id) {
    ...ObservabilityWebhook
  }
}
    ${ObservabilityWebhookFragmentDoc}` as unknown as DocumentNode<Types.DeleteObservabilityWebhookMutation, Types.DeleteObservabilityWebhookMutationVariables>;
export const DissmissOnboardingDocument = /*#__PURE__*/ gql`
    mutation DissmissOnboarding {
  dismissOnboarding {
    onboarded
  }
}
    ` as unknown as DocumentNode<Types.DissmissOnboardingMutation, Types.DissmissOnboardingMutationVariables>;
export const ObserversDocument = /*#__PURE__*/ gql`
    query Observers($first: Int, $last: Int, $before: String, $after: String, $projectId: ID) {
  observers(
    first: $first
    last: $last
    before: $before
    after: $after
    projectId: $projectId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Observer
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ObserverFragmentDoc}` as unknown as DocumentNode<Types.ObserversQuery, Types.ObserversQueryVariables>;
export const ObserverDocument = /*#__PURE__*/ gql`
    query Observer($id: ID, $name: String) {
  observer(id: $id, name: $name) {
    ...Observer
  }
}
    ${ObserverFragmentDoc}` as unknown as DocumentNode<Types.ObserverQuery, Types.ObserverQueryVariables>;
export const UpsertObserverDocument = /*#__PURE__*/ gql`
    mutation UpsertObserver($attrs: ObserverAttributes) {
  upsertObserver(attributes: $attrs) {
    ...Observer
  }
}
    ${ObserverFragmentDoc}` as unknown as DocumentNode<Types.UpsertObserverMutation, Types.UpsertObserverMutationVariables>;
export const DeleteObserverDocument = /*#__PURE__*/ gql`
    mutation DeleteObserver($id: ID!) {
  deleteObserver(id: $id) {
    ...Observer
  }
}
    ${ObserverFragmentDoc}` as unknown as DocumentNode<Types.DeleteObserverMutation, Types.DeleteObserverMutationVariables>;
export const KickObserverDocument = /*#__PURE__*/ gql`
    mutation KickObserver($id: ID!) {
  kickObserver(id: $id) {
    ...Observer
  }
}
    ${ObserverFragmentDoc}` as unknown as DocumentNode<Types.KickObserverMutation, Types.KickObserverMutationVariables>;
export const PipelinesDocument = /*#__PURE__*/ gql`
    query Pipelines($q: String, $first: Int = 50, $after: String, $projectId: ID) {
  pipelines(q: $q, first: $first, after: $after, projectId: $projectId) {
    ...PipelineConnection
  }
}
    ${PipelineConnectionFragmentDoc}` as unknown as DocumentNode<Types.PipelinesQuery, Types.PipelinesQueryVariables>;
export const PipelineBindingsDocument = /*#__PURE__*/ gql`
    query PipelineBindings($id: ID!) {
  pipeline(id: $id) {
    ...PipelineBindings
  }
}
    ${PipelineBindingsFragmentDoc}` as unknown as DocumentNode<Types.PipelineBindingsQuery, Types.PipelineBindingsQueryVariables>;
export const JobGateDocument = /*#__PURE__*/ gql`
    query JobGate($id: ID!) {
  pipelineGate(id: $id) {
    ...PipelineGate
    job {
      ...PipelineGateJob
    }
  }
}
    ${PipelineGateFragmentDoc}
${PipelineGateJobFragmentDoc}` as unknown as DocumentNode<Types.JobGateQuery, Types.JobGateQueryVariables>;
export const JobGateLogsDocument = /*#__PURE__*/ gql`
    query JobGateLogs($id: ID!, $container: String!, $sinceSeconds: Int!) {
  pipelineGate(id: $id) {
    job {
      logs(container: $container, sinceSeconds: $sinceSeconds)
    }
  }
}
    ` as unknown as DocumentNode<Types.JobGateLogsQuery, Types.JobGateLogsQueryVariables>;
export const PipelineDocument = /*#__PURE__*/ gql`
    query Pipeline($id: ID!) {
  pipeline(id: $id) {
    ...Pipeline
  }
}
    ${PipelineFragmentDoc}` as unknown as DocumentNode<Types.PipelineQuery, Types.PipelineQueryVariables>;
export const PipelineContextsDocument = /*#__PURE__*/ gql`
    query PipelineContexts($id: ID!, $before: String, $after: String, $first: Int = 100, $last: Int) {
  pipeline(id: $id) {
    id
    contexts(after: $after, before: $before, first: $first, last: $last) {
      edges {
        node {
          ...PipelineContext
        }
      }
    }
  }
}
    ${PipelineContextFragmentDoc}` as unknown as DocumentNode<Types.PipelineContextsQuery, Types.PipelineContextsQueryVariables>;
export const PipelineContextDocument = /*#__PURE__*/ gql`
    query PipelineContext($id: ID!) {
  pipelineContext(id: $id) {
    ...PipelineContext
    pipeline {
      ...Pipeline
    }
  }
}
    ${PipelineContextFragmentDoc}
${PipelineFragmentDoc}` as unknown as DocumentNode<Types.PipelineContextQuery, Types.PipelineContextQueryVariables>;
export const DeletePipelineDocument = /*#__PURE__*/ gql`
    mutation deletePipeline($id: ID!) {
  deletePipeline(id: $id) {
    ...Pipeline
  }
}
    ${PipelineFragmentDoc}` as unknown as DocumentNode<Types.DeletePipelineMutation, Types.DeletePipelineMutationVariables>;
export const ApproveGateDocument = /*#__PURE__*/ gql`
    mutation ApproveGate($id: ID!) {
  approveGate(id: $id) {
    ...PipelineGate
  }
}
    ${PipelineGateFragmentDoc}` as unknown as DocumentNode<Types.ApproveGateMutation, Types.ApproveGateMutationVariables>;
export const CreatePipelineContextDocument = /*#__PURE__*/ gql`
    mutation CreatePipelineContext($pipelineId: ID!, $attributes: PipelineContextAttributes!) {
  createPipelineContext(pipelineId: $pipelineId, attributes: $attributes) {
    ...PipelineContext
    pipeline {
      id
    }
  }
}
    ${PipelineContextFragmentDoc}` as unknown as DocumentNode<Types.CreatePipelineContextMutation, Types.CreatePipelineContextMutationVariables>;
export const ForceGateDocument = /*#__PURE__*/ gql`
    mutation ForceGate($id: ID!, $state: GateState) {
  forceGate(id: $id, state: $state) {
    ...PipelineGate
  }
}
    ${PipelineGateFragmentDoc}` as unknown as DocumentNode<Types.ForceGateMutation, Types.ForceGateMutationVariables>;
export const ClusterProvidersDocument = /*#__PURE__*/ gql`
    query ClusterProviders {
  clusterProviders(first: 100) {
    edges {
      node {
        ...ClusterProvider
      }
    }
  }
}
    ${ClusterProviderFragmentDoc}` as unknown as DocumentNode<Types.ClusterProvidersQuery, Types.ClusterProvidersQueryVariables>;
export const CreateClusterProviderDocument = /*#__PURE__*/ gql`
    mutation CreateClusterProvider($attributes: ClusterProviderAttributes!) {
  createClusterProvider(attributes: $attributes) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}` as unknown as DocumentNode<Types.CreateClusterProviderMutation, Types.CreateClusterProviderMutationVariables>;
export const UpdateClusterProviderDocument = /*#__PURE__*/ gql`
    mutation UpdateClusterProvider($id: ID!, $attributes: ClusterProviderUpdateAttributes!) {
  updateClusterProvider(id: $id, attributes: $attributes) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}` as unknown as DocumentNode<Types.UpdateClusterProviderMutation, Types.UpdateClusterProviderMutationVariables>;
export const DeleteClusterProviderDocument = /*#__PURE__*/ gql`
    mutation DeleteClusterProvider($id: ID!) {
  deleteClusterProvider(id: $id) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}` as unknown as DocumentNode<Types.DeleteClusterProviderMutation, Types.DeleteClusterProviderMutationVariables>;
export const CreatePullRequestDocument = /*#__PURE__*/ gql`
    mutation CreatePullRequest($id: ID!, $branch: String!, $identifier: String, $context: Json!, $threadId: ID) {
  createPullRequest(
    id: $id
    branch: $branch
    identifier: $identifier
    context: $context
    threadId: $threadId
  ) {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.CreatePullRequestMutation, Types.CreatePullRequestMutationVariables>;
export const UpdatePullRequestDocument = /*#__PURE__*/ gql`
    mutation UpdatePullRequest($id: ID!, $attributes: PullRequestUpdateAttributes) {
  updatePullRequest(id: $id, attributes: $attributes) {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.UpdatePullRequestMutation, Types.UpdatePullRequestMutationVariables>;
export const DeletePullRequestDocument = /*#__PURE__*/ gql`
    mutation DeletePullRequest($id: ID!) {
  deletePullRequest(id: $id) {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.DeletePullRequestMutation, Types.DeletePullRequestMutationVariables>;
export const PullRequestsDocument = /*#__PURE__*/ gql`
    query PullRequests($q: String, $first: Int = 100, $after: String, $clusterId: ID, $serviceId: ID, $open: Boolean) {
  pullRequests(
    q: $q
    first: $first
    after: $after
    clusterId: $clusterId
    serviceId: $serviceId
    open: $open
  ) {
    ...PullRequestConnection
  }
}
    ${PullRequestConnectionFragmentDoc}` as unknown as DocumentNode<Types.PullRequestsQuery, Types.PullRequestsQueryVariables>;
export const ServiceDeploymentsDocument = /*#__PURE__*/ gql`
    query ServiceDeployments($first: Int = 100, $after: String, $q: String, $cluster: String, $clusterId: ID, $status: ServiceDeploymentStatus, $projectId: ID, $flowId: ID) {
  serviceDeployments(
    first: $first
    after: $after
    q: $q
    cluster: $cluster
    clusterId: $clusterId
    status: $status
    projectId: $projectId
    flowId: $flowId
  ) {
    ...ServiceDeploymentsConnection
  }
}
    ${ServiceDeploymentsConnectionFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentsQuery, Types.ServiceDeploymentsQueryVariables>;
export const ServiceDeploymentsTinyDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentsTiny($clusterId: ID, $projectId: ID) {
  serviceDeployments(first: 100, clusterId: $clusterId, projectId: $projectId) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ServiceDeploymentTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ServiceDeploymentTinyFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentsTinyQuery, Types.ServiceDeploymentsTinyQueryVariables>;
export const ServiceTreeDocument = /*#__PURE__*/ gql`
    query ServiceTree($first: Int = 100, $status: ServiceDeploymentStatus, $clusterId: ID, $projectId: ID) {
  serviceTree(
    first: $first
    status: $status
    clusterId: $clusterId
    projectId: $projectId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ServiceTreeNode
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ServiceTreeNodeFragmentDoc}` as unknown as DocumentNode<Types.ServiceTreeQuery, Types.ServiceTreeQueryVariables>;
export const ServiceDeploymentDocument = /*#__PURE__*/ gql`
    query ServiceDeployment($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentQuery, Types.ServiceDeploymentQueryVariables>;
export const ServiceDeploymentDeltaDocument = /*#__PURE__*/ gql`
    subscription ServiceDeploymentDelta($id: ID, $clusterId: ID) {
  serviceDeploymentDelta(id: $id, clusterId: $clusterId) {
    delta
    payload {
      id
      name
      namespace
      status
      componentStatus
      message
      version
      promotion
      protect
      dryRun
      deletedAt
      updatedAt
      errors {
        source
        message
        warning
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.ServiceDeploymentDeltaSubscription, Types.ServiceDeploymentDeltaSubscriptionVariables>;
export const ServiceDeploymentTinyDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentTiny($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentTiny
  }
}
    ${ServiceDeploymentTinyFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentTinyQuery, Types.ServiceDeploymentTinyQueryVariables>;
export const ServiceDeploymentComponentsDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentComponents($id: ID!) {
  serviceDeployment(id: $id) {
    id
    name
    cluster {
      id
      name
      handle
    }
    components {
      ...ServiceDeploymentComponent
    }
  }
}
    ${ServiceDeploymentComponentFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentComponentsQuery, Types.ServiceDeploymentComponentsQueryVariables>;
export const ServiceDeploymentComponentsWithChildrenDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentComponentsWithChildren($id: ID!) {
  serviceDeployment(id: $id) {
    id
    name
    cluster {
      id
      name
      handle
    }
    components {
      ...ServiceDeploymentComponentWithChildren
    }
  }
}
    ${ServiceDeploymentComponentWithChildrenFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentComponentsWithChildrenQuery, Types.ServiceDeploymentComponentsWithChildrenQueryVariables>;
export const ServiceDeploymentSecretsDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentSecrets($id: ID!) {
  serviceDeployment(id: $id) {
    configuration {
      name
      value
    }
    helm {
      values
    }
  }
}
    ` as unknown as DocumentNode<Types.ServiceDeploymentSecretsQuery, Types.ServiceDeploymentSecretsQueryVariables>;
export const ServiceDeploymentHelmSettingsDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentHelmSettings($id: ID!) {
  serviceDeployment(id: $id) {
    helm {
      values
      valuesFiles
    }
  }
}
    ` as unknown as DocumentNode<Types.ServiceDeploymentHelmSettingsQuery, Types.ServiceDeploymentHelmSettingsQueryVariables>;
export const ServiceDeploymentRevisionsDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentRevisions($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentRevisions
  }
}
    ${ServiceDeploymentRevisionsFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentRevisionsQuery, Types.ServiceDeploymentRevisionsQueryVariables>;
export const CreateServiceDeploymentDocument = /*#__PURE__*/ gql`
    mutation CreateServiceDeployment($attributes: ServiceDeploymentAttributes!, $cluster: String, $clusterId: ID) {
  createServiceDeployment(
    attributes: $attributes
    cluster: $cluster
    clusterId: $clusterId
  ) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}` as unknown as DocumentNode<Types.CreateServiceDeploymentMutation, Types.CreateServiceDeploymentMutationVariables>;
export const UpdateServiceDeploymentDocument = /*#__PURE__*/ gql`
    mutation UpdateServiceDeployment($id: ID!, $attributes: ServiceUpdateAttributes!) {
  updateServiceDeployment(id: $id, attributes: $attributes) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}` as unknown as DocumentNode<Types.UpdateServiceDeploymentMutation, Types.UpdateServiceDeploymentMutationVariables>;
export const MergeServiceDocument = /*#__PURE__*/ gql`
    mutation MergeService($id: ID!, $configuration: [ConfigAttributes]) {
  mergeService(id: $id, configuration: $configuration) {
    configuration {
      name
      value
    }
  }
}
    ` as unknown as DocumentNode<Types.MergeServiceMutation, Types.MergeServiceMutationVariables>;
export const DeleteServiceDeploymentDocument = /*#__PURE__*/ gql`
    mutation DeleteServiceDeployment($id: ID!) {
  deleteServiceDeployment(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteServiceDeploymentMutation, Types.DeleteServiceDeploymentMutationVariables>;
export const DetachServiceDeploymentDocument = /*#__PURE__*/ gql`
    mutation DetachServiceDeployment($id: ID!) {
  detachServiceDeployment(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DetachServiceDeploymentMutation, Types.DetachServiceDeploymentMutationVariables>;
export const RollbackServiceDocument = /*#__PURE__*/ gql`
    mutation RollbackService($id: ID, $revisionId: ID!) {
  rollbackService(id: $id, revisionId: $revisionId) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}` as unknown as DocumentNode<Types.RollbackServiceMutation, Types.RollbackServiceMutationVariables>;
export const ProceedServiceDocument = /*#__PURE__*/ gql`
    mutation ProceedService($id: ID!, $promotion: ServicePromotion) {
  proceed(id: $id, promotion: $promotion) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}` as unknown as DocumentNode<Types.ProceedServiceMutation, Types.ProceedServiceMutationVariables>;
export const SelfManageDocument = /*#__PURE__*/ gql`
    mutation SelfManage($values: String!) {
  selfManage(values: $values) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}` as unknown as DocumentNode<Types.SelfManageMutation, Types.SelfManageMutationVariables>;
export const KickServiceDocument = /*#__PURE__*/ gql`
    mutation KickService($id: ID!) {
  kickService(serviceId: $id) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}` as unknown as DocumentNode<Types.KickServiceMutation, Types.KickServiceMutationVariables>;
export const ServiceDeploymentBindingsDocument = /*#__PURE__*/ gql`
    query ServiceDeploymentBindings($id: ID!) {
  serviceDeployment(id: $id) {
    id
    ...ServiceDeploymentBindings
  }
}
    ${ServiceDeploymentBindingsFragmentDoc}` as unknown as DocumentNode<Types.ServiceDeploymentBindingsQuery, Types.ServiceDeploymentBindingsQueryVariables>;
export const ServiceStatusesDocument = /*#__PURE__*/ gql`
    query ServiceStatuses($clusterId: ID) {
  serviceStatuses(clusterId: $clusterId) {
    ...ServiceStatusCount
  }
}
    ${ServiceStatusCountFragmentDoc}` as unknown as DocumentNode<Types.ServiceStatusesQuery, Types.ServiceStatusesQueryVariables>;
export const ServiceNetworkGraphDocument = /*#__PURE__*/ gql`
    query ServiceNetworkGraph($serviceId: ID!, $time: DateTime) {
  serviceDeployment(id: $serviceId) {
    id
    networkGraph(time: $time) {
      ...NetworkMeshEdge
    }
  }
}
    ${NetworkMeshEdgeFragmentDoc}` as unknown as DocumentNode<Types.ServiceNetworkGraphQuery, Types.ServiceNetworkGraphQueryVariables>;
export const ServiceComponentRawDocument = /*#__PURE__*/ gql`
    query ServiceComponentRaw($serviceId: ID!, $componentId: ID, $childId: ID) {
  serviceDeployment(id: $serviceId) {
    id
    rawResource(childId: $childId, componentId: $componentId) {
      ...UnstructuredResource
    }
  }
}
    ${UnstructuredResourceFragmentDoc}` as unknown as DocumentNode<Types.ServiceComponentRawQuery, Types.ServiceComponentRawQueryVariables>;
export const ComponentTreeDocument = /*#__PURE__*/ gql`
    query ComponentTree($id: ID!) {
  componentTree(id: $id) {
    ...ComponentTree
  }
}
    ${ComponentTreeFragmentDoc}` as unknown as DocumentNode<Types.ComponentTreeQuery, Types.ComponentTreeQueryVariables>;
export const ClusterUsagesDocument = /*#__PURE__*/ gql`
    query ClusterUsages($after: String, $first: Int = 500, $before: String, $last: Int, $q: String, $tagQuery: TagQuery, $projectId: ID) {
  clusterUsages(
    after: $after
    first: $first
    before: $before
    last: $last
    q: $q
    tagQuery: $tagQuery
    projectId: $projectId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClusterUsageTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterUsageTinyFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsagesQuery, Types.ClusterUsagesQueryVariables>;
export const ClusterUsageHistoryDocument = /*#__PURE__*/ gql`
    query ClusterUsageHistory($id: ID!, $after: String, $first: Int, $before: String, $last: Int) {
  clusterUsage(id: $id) {
    id
    cpuCost
    memoryCost
    storageCost
    history(after: $after, first: $first, before: $before, last: $last) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...ClusterUsageHistory
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterUsageHistoryFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsageHistoryQuery, Types.ClusterUsageHistoryQueryVariables>;
export const ClusterUsageNamespacesDocument = /*#__PURE__*/ gql`
    query ClusterUsageNamespaces($id: ID!, $after: String, $first: Int, $before: String, $last: Int, $q: String) {
  clusterUsage(id: $id) {
    id
    cluster {
      id
      name
    }
    namespaces(after: $after, first: $first, before: $before, last: $last, q: $q) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...ClusterNamespaceUsage
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterNamespaceUsageFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsageNamespacesQuery, Types.ClusterUsageNamespacesQueryVariables>;
export const ClusterUsageScalingRecommendationsDocument = /*#__PURE__*/ gql`
    query ClusterUsageScalingRecommendations($id: ID!, $after: String, $first: Int, $before: String, $last: Int, $q: String, $type: ScalingRecommendationType) {
  clusterUsage(id: $id) {
    id
    cluster {
      id
      name
      distro
    }
    recommendations(
      after: $after
      first: $first
      before: $before
      last: $last
      q: $q
      type: $type
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...ClusterScalingRecommendation
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterScalingRecommendationFragmentDoc}` as unknown as DocumentNode<Types.ClusterUsageScalingRecommendationsQuery, Types.ClusterUsageScalingRecommendationsQueryVariables>;
export const ProjectUsageHistoryDocument = /*#__PURE__*/ gql`
    query ProjectUsageHistory($after: String, $first: Int = 365, $before: String, $last: Int) {
  projectUsageHistory(after: $after, first: $first, before: $before, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ProjectUsageHistory
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ProjectUsageHistoryFragmentDoc}` as unknown as DocumentNode<Types.ProjectUsageHistoryQuery, Types.ProjectUsageHistoryQueryVariables>;
export const SuggestScalingRecommendationDocument = /*#__PURE__*/ gql`
    mutation SuggestScalingRecommendation($id: ID!) {
  suggestScalingRecommendation(id: $id)
}
    ` as unknown as DocumentNode<Types.SuggestScalingRecommendationMutation, Types.SuggestScalingRecommendationMutationVariables>;
export const ApplyScalingRecommendationDocument = /*#__PURE__*/ gql`
    mutation ApplyScalingRecommendation($id: ID!) {
  applyScalingRecommendation(id: $id) {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.ApplyScalingRecommendationMutation, Types.ApplyScalingRecommendationMutationVariables>;
export const ClusterRegistrationDocument = /*#__PURE__*/ gql`
    query ClusterRegistration($id: ID, $machineId: String) {
  clusterRegistration(id: $id, machineId: $machineId) {
    ...ClusterRegistration
  }
}
    ${ClusterRegistrationFragmentDoc}` as unknown as DocumentNode<Types.ClusterRegistrationQuery, Types.ClusterRegistrationQueryVariables>;
export const ClusterRegistrationsDocument = /*#__PURE__*/ gql`
    query ClusterRegistrations($after: String, $first: Int, $before: String, $last: Int) {
  clusterRegistrations(after: $after, first: $first, before: $before, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClusterRegistration
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClusterRegistrationFragmentDoc}` as unknown as DocumentNode<Types.ClusterRegistrationsQuery, Types.ClusterRegistrationsQueryVariables>;
export const CreateClusterRegistrationDocument = /*#__PURE__*/ gql`
    mutation CreateClusterRegistration($attributes: ClusterRegistrationCreateAttributes!) {
  createClusterRegistration(attributes: $attributes) {
    ...ClusterRegistration
  }
}
    ${ClusterRegistrationFragmentDoc}` as unknown as DocumentNode<Types.CreateClusterRegistrationMutation, Types.CreateClusterRegistrationMutationVariables>;
export const UpdateClusterRegistrationDocument = /*#__PURE__*/ gql`
    mutation UpdateClusterRegistration($id: ID!, $attributes: ClusterRegistrationUpdateAttributes!) {
  updateClusterRegistration(id: $id, attributes: $attributes) {
    ...ClusterRegistration
  }
}
    ${ClusterRegistrationFragmentDoc}` as unknown as DocumentNode<Types.UpdateClusterRegistrationMutation, Types.UpdateClusterRegistrationMutationVariables>;
export const DeleteClusterRegistrationDocument = /*#__PURE__*/ gql`
    mutation DeleteClusterRegistration($id: ID!) {
  deleteClusterRegistration(id: $id) {
    ...ClusterRegistration
  }
}
    ${ClusterRegistrationFragmentDoc}` as unknown as DocumentNode<Types.DeleteClusterRegistrationMutation, Types.DeleteClusterRegistrationMutationVariables>;
export const ClusterIsoImagesDocument = /*#__PURE__*/ gql`
    query ClusterISOImages($after: String, $first: Int, $before: String, $last: Int) {
  clusterIsoImages(after: $after, first: $first, before: $before, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...IsoImage
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${IsoImageFragmentDoc}` as unknown as DocumentNode<Types.ClusterIsoImagesQuery, Types.ClusterIsoImagesQueryVariables>;
export const FlowsDocument = /*#__PURE__*/ gql`
    query Flows($first: Int = 100, $after: String, $q: String, $statuses: [ServiceDeploymentStatus], $sort: FlowSort, $direction: SortDirection, $favoriteIds: [ID]) {
  flows(
    first: $first
    after: $after
    q: $q
    statuses: $statuses
    sort: $sort
    direction: $direction
    favoriteIds: $favoriteIds
  ) {
    edges {
      node {
        ...FlowBasicWithBindings
      }
    }
    pageInfo {
      ...PageInfo
    }
  }
  flowServiceCounts(q: $q) {
    ...ServiceStatusCount
  }
}
    ${FlowBasicWithBindingsFragmentDoc}
${PageInfoFragmentDoc}
${ServiceStatusCountFragmentDoc}` as unknown as DocumentNode<Types.FlowsQuery, Types.FlowsQueryVariables>;
export const FlowDocument = /*#__PURE__*/ gql`
    query Flow($id: ID, $name: String) {
  flow(id: $id, name: $name) {
    ...FlowBasicWithBindings
  }
}
    ${FlowBasicWithBindingsFragmentDoc}` as unknown as DocumentNode<Types.FlowQuery, Types.FlowQueryVariables>;
export const FlowServicesDocument = /*#__PURE__*/ gql`
    query FlowServices($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    name
    services(first: $first, after: $after) {
      ...ServiceDeploymentsConnection
    }
  }
}
    ${ServiceDeploymentsConnectionFragmentDoc}` as unknown as DocumentNode<Types.FlowServicesQuery, Types.FlowServicesQueryVariables>;
export const FlowWorkbenchesDocument = /*#__PURE__*/ gql`
    query FlowWorkbenches($id: ID!) {
  flow(id: $id) {
    id
    workbenches {
      ...WorkbenchTiny
    }
  }
}
    ${WorkbenchTinyFragmentDoc}` as unknown as DocumentNode<Types.FlowWorkbenchesQuery, Types.FlowWorkbenchesQueryVariables>;
export const FlowWorkbenchJobsDocument = /*#__PURE__*/ gql`
    query FlowWorkbenchJobs($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    workbenchJobs(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchJobTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchJobTinyFragmentDoc}` as unknown as DocumentNode<Types.FlowWorkbenchJobsQuery, Types.FlowWorkbenchJobsQueryVariables>;
export const FlowPipelinesDocument = /*#__PURE__*/ gql`
    query FlowPipelines($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    pipelines(first: $first, after: $after) {
      ...PipelineConnection
    }
  }
}
    ${PipelineConnectionFragmentDoc}` as unknown as DocumentNode<Types.FlowPipelinesQuery, Types.FlowPipelinesQueryVariables>;
export const FlowAlertsDocument = /*#__PURE__*/ gql`
    query FlowAlerts($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    alerts(first: $first, after: $after) {
      edges {
        node {
          ...FlowAlert
        }
      }
      pageInfo {
        ...PageInfo
      }
    }
  }
}
    ${FlowAlertFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.FlowAlertsQuery, Types.FlowAlertsQueryVariables>;
export const FlowPreviewEnvironmentInstancesDocument = /*#__PURE__*/ gql`
    query FlowPreviewEnvironmentInstances($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    previewEnvironmentInstances(first: $first, after: $after) {
      ...PreviewEnvironmentInstanceConnection
    }
  }
}
    ${PreviewEnvironmentInstanceConnectionFragmentDoc}` as unknown as DocumentNode<Types.FlowPreviewEnvironmentInstancesQuery, Types.FlowPreviewEnvironmentInstancesQueryVariables>;
export const FlowPreviewEnvironmentTemplatesDocument = /*#__PURE__*/ gql`
    query FlowPreviewEnvironmentTemplates($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    previewEnvironmentTemplates(first: $first, after: $after) {
      ...PreviewEnvironmentTemplateConnection
    }
  }
}
    ${PreviewEnvironmentTemplateConnectionFragmentDoc}` as unknown as DocumentNode<Types.FlowPreviewEnvironmentTemplatesQuery, Types.FlowPreviewEnvironmentTemplatesQueryVariables>;
export const FlowVulnerabilityReportsDocument = /*#__PURE__*/ gql`
    query FlowVulnerabilityReports($id: ID!, $first: Int = 100, $after: String) {
  flow(id: $id) {
    id
    vulnerabilityReports(first: $first, after: $after) {
      ...VulnerabilityReportConnection
    }
  }
}
    ${VulnerabilityReportConnectionFragmentDoc}` as unknown as DocumentNode<Types.FlowVulnerabilityReportsQuery, Types.FlowVulnerabilityReportsQueryVariables>;
export const UpsertFlowDocument = /*#__PURE__*/ gql`
    mutation UpsertFlow($attributes: FlowAttributes!) {
  upsertFlow(attributes: $attributes) {
    ...FlowBasicWithBindings
  }
}
    ${FlowBasicWithBindingsFragmentDoc}` as unknown as DocumentNode<Types.UpsertFlowMutation, Types.UpsertFlowMutationVariables>;
export const GroupsDocument = /*#__PURE__*/ gql`
    query Groups($q: String, $first: Int = 20, $after: String) {
  groups(q: $q, first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Group
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GroupFragmentDoc}` as unknown as DocumentNode<Types.GroupsQuery, Types.GroupsQueryVariables>;
export const SearchGroupsDocument = /*#__PURE__*/ gql`
    query SearchGroups($q: String, $cursor: String) {
  groups(q: $q, after: $cursor, first: 5) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Group
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GroupFragmentDoc}` as unknown as DocumentNode<Types.SearchGroupsQuery, Types.SearchGroupsQueryVariables>;
export const GroupMembersDocument = /*#__PURE__*/ gql`
    query GroupMembers($id: ID!, $first: Int = 20, $after: String) {
  groupMembers(groupId: $id, after: $after, first: $first) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...GroupMember
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GroupMemberFragmentDoc}` as unknown as DocumentNode<Types.GroupMembersQuery, Types.GroupMembersQueryVariables>;
export const CreateGroupMemberDocument = /*#__PURE__*/ gql`
    mutation CreateGroupMember($groupId: ID!, $userId: ID!) {
  createGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}` as unknown as DocumentNode<Types.CreateGroupMemberMutation, Types.CreateGroupMemberMutationVariables>;
export const DeleteGroupMemberDocument = /*#__PURE__*/ gql`
    mutation DeleteGroupMember($groupId: ID!, $userId: ID!) {
  deleteGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}` as unknown as DocumentNode<Types.DeleteGroupMemberMutation, Types.DeleteGroupMemberMutationVariables>;
export const CreateGroupDocument = /*#__PURE__*/ gql`
    mutation CreateGroup($attributes: GroupAttributes!, $userIds: [ID!]) {
  createGroup(attributes: $attributes, userIds: $userIds) {
    ...Group
  }
}
    ${GroupFragmentDoc}` as unknown as DocumentNode<Types.CreateGroupMutation, Types.CreateGroupMutationVariables>;
export const UpdateGroupDocument = /*#__PURE__*/ gql`
    mutation UpdateGroup($id: ID!, $attributes: GroupAttributes!) {
  updateGroup(groupId: $id, attributes: $attributes) {
    ...Group
  }
}
    ${GroupFragmentDoc}` as unknown as DocumentNode<Types.UpdateGroupMutation, Types.UpdateGroupMutationVariables>;
export const DeleteGroupDocument = /*#__PURE__*/ gql`
    mutation DeleteGroup($id: ID!) {
  deleteGroup(groupId: $id) {
    ...Group
  }
}
    ${GroupFragmentDoc}` as unknown as DocumentNode<Types.DeleteGroupMutation, Types.DeleteGroupMutationVariables>;
export const ClusterOverviewDetailsDocument = /*#__PURE__*/ gql`
    query ClusterOverviewDetails($id: ID!, $kubeVersion: String!, $nextKubeVersion: String!, $hasKubeVersion: Boolean!) {
  cluster(id: $id) {
    ...ClusterOverviewDetails
  }
  kubernetesChangelog(version: $nextKubeVersion) @include(if: $hasKubeVersion) {
    ...KubernetesChangelog
  }
}
    ${ClusterOverviewDetailsFragmentDoc}
${KubernetesChangelogFragmentDoc}` as unknown as DocumentNode<Types.ClusterOverviewDetailsQuery, Types.ClusterOverviewDetailsQueryVariables>;
export const UpgradeStatisticsDocument = /*#__PURE__*/ gql`
    query UpgradeStatistics($projectId: ID, $tag: TagInput) {
  upgradeStatistics(projectId: $projectId, tag: $tag) {
    ...UpgradeStatistics
  }
}
    ${UpgradeStatisticsFragmentDoc}` as unknown as DocumentNode<Types.UpgradeStatisticsQuery, Types.UpgradeStatisticsQueryVariables>;
export const ClusterHealthScoresDocument = /*#__PURE__*/ gql`
    query ClusterHealthScores($projectId: ID, $first: Int, $healthRange: HealthRange) {
  clusters(projectId: $projectId, first: $first, healthRange: $healthRange) {
    edges {
      node {
        ...ClusterHealthScore
      }
    }
  }
}
    ${ClusterHealthScoreFragmentDoc}` as unknown as DocumentNode<Types.ClusterHealthScoresQuery, Types.ClusterHealthScoresQueryVariables>;
export const KubernetesClustersDocument = /*#__PURE__*/ gql`
    query KubernetesClusters($projectId: ID, $currentClusterId: ID, $hasCurrentClusterId: Boolean!) {
  clusters(first: 200, projectId: $projectId) {
    edges {
      node {
        ...KubernetesCluster
      }
    }
  }
  cluster(id: $currentClusterId) @include(if: $hasCurrentClusterId) {
    ...KubernetesCluster
  }
}
    ${KubernetesClusterFragmentDoc}` as unknown as DocumentNode<Types.KubernetesClustersQuery, Types.KubernetesClustersQueryVariables>;
export const KubernetesClusterAuditLogsDocument = /*#__PURE__*/ gql`
    query KubernetesClusterAuditLogs($clusterId: ID, $first: Int, $after: String, $before: String, $last: Int) {
  cluster(id: $clusterId) {
    auditLogs(first: $first, last: $last, after: $after, before: $before) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          insertedAt
          method
          path
          actor {
            name
            email
          }
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.KubernetesClusterAuditLogsQuery, Types.KubernetesClusterAuditLogsQueryVariables>;
export const PinCustomResourceDocument = /*#__PURE__*/ gql`
    mutation PinCustomResource($attributes: PinnedCustomResourceAttributes!) {
  createPinnedCustomResource(attributes: $attributes) {
    ...PinnedCustomResource
  }
}
    ${PinnedCustomResourceFragmentDoc}` as unknown as DocumentNode<Types.PinCustomResourceMutation, Types.PinCustomResourceMutationVariables>;
export const UnpinCustomResourceDocument = /*#__PURE__*/ gql`
    mutation UnpinCustomResource($id: ID!) {
  deletePinnedCustomResource(id: $id) {
    ...PinnedCustomResource
  }
}
    ${PinnedCustomResourceFragmentDoc}` as unknown as DocumentNode<Types.UnpinCustomResourceMutation, Types.UnpinCustomResourceMutationVariables>;
export const ArgoRolloutDocument = /*#__PURE__*/ gql`
    query ArgoRollout($name: String!, $namespace: String!, $serviceId: ID) {
  argoRollout(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...ArgoRollout
  }
}
    ${ArgoRolloutFragmentDoc}` as unknown as DocumentNode<Types.ArgoRolloutQuery, Types.ArgoRolloutQueryVariables>;
export const CanaryDocument = /*#__PURE__*/ gql`
    query Canary($name: String!, $namespace: String!, $serviceId: ID) {
  canary(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Canary
  }
}
    ${CanaryFragmentDoc}` as unknown as DocumentNode<Types.CanaryQuery, Types.CanaryQueryVariables>;
export const CertificateDocument = /*#__PURE__*/ gql`
    query Certificate($name: String!, $namespace: String!, $serviceId: ID) {
  certificate(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Certificate
  }
}
    ${CertificateFragmentDoc}` as unknown as DocumentNode<Types.CertificateQuery, Types.CertificateQueryVariables>;
export const CronJobDocument = /*#__PURE__*/ gql`
    query CronJob($name: String!, $namespace: String!, $serviceId: ID) {
  cronJob(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...CronJob
  }
}
    ${CronJobFragmentDoc}` as unknown as DocumentNode<Types.CronJobQuery, Types.CronJobQueryVariables>;
export const DaemonSetDocument = /*#__PURE__*/ gql`
    query DaemonSet($name: String!, $namespace: String!, $serviceId: ID) {
  daemonSet(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...DaemonSet
  }
}
    ${DaemonSetFragmentDoc}` as unknown as DocumentNode<Types.DaemonSetQuery, Types.DaemonSetQueryVariables>;
export const DeploymentDocument = /*#__PURE__*/ gql`
    query Deployment($name: String!, $namespace: String!, $serviceId: ID) {
  deployment(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Deployment
  }
}
    ${DeploymentFragmentDoc}` as unknown as DocumentNode<Types.DeploymentQuery, Types.DeploymentQueryVariables>;
export const IngressDocument = /*#__PURE__*/ gql`
    query Ingress($name: String!, $namespace: String!, $serviceId: ID) {
  ingress(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Ingress
  }
}
    ${IngressFragmentDoc}` as unknown as DocumentNode<Types.IngressQuery, Types.IngressQueryVariables>;
export const JobDocument = /*#__PURE__*/ gql`
    query Job($name: String!, $namespace: String!, $serviceId: ID) {
  job(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Job
  }
}
    ${JobFragmentDoc}` as unknown as DocumentNode<Types.JobQuery, Types.JobQueryVariables>;
export const DeleteJobDocument = /*#__PURE__*/ gql`
    mutation DeleteJob($name: String!, $namespace: String!) {
  deleteJob(name: $name, namespace: $namespace) {
    ...Job
  }
}
    ${JobFragmentDoc}` as unknown as DocumentNode<Types.DeleteJobMutation, Types.DeleteJobMutationVariables>;
export const NodeDocument = /*#__PURE__*/ gql`
    query Node($name: String!, $clusterId: ID) {
  node(name: $name, clusterId: $clusterId) {
    ...Node
  }
}
    ${NodeFragmentDoc}` as unknown as DocumentNode<Types.NodeQuery, Types.NodeQueryVariables>;
export const NodeMetricDocument = /*#__PURE__*/ gql`
    query NodeMetric($name: String!, $clusterId: ID) {
  nodeMetric(name: $name, clusterId: $clusterId) {
    ...NodeMetric
  }
}
    ${NodeMetricFragmentDoc}` as unknown as DocumentNode<Types.NodeMetricQuery, Types.NodeMetricQueryVariables>;
export const PluralServiceDeploymentDocument = /*#__PURE__*/ gql`
    query PluralServiceDeployment($name: String!, $namespace: String!, $serviceId: ID) {
  pluralServiceDeployment(
    name: $name
    namespace: $namespace
    serviceId: $serviceId
  ) {
    ...PluralServiceDeployment
  }
}
    ${PluralServiceDeploymentFragmentDoc}` as unknown as DocumentNode<Types.PluralServiceDeploymentQuery, Types.PluralServiceDeploymentQueryVariables>;
export const PodDocument = /*#__PURE__*/ gql`
    query Pod($name: String!, $namespace: String!, $clusterId: ID, $serviceId: ID) {
  pod(
    name: $name
    namespace: $namespace
    clusterId: $clusterId
    serviceId: $serviceId
  ) {
    ...PodWithEvents
  }
}
    ${PodWithEventsFragmentDoc}` as unknown as DocumentNode<Types.PodQuery, Types.PodQueryVariables>;
export const PodLogsDocument = /*#__PURE__*/ gql`
    query PodLogs($name: String!, $namespace: String!, $clusterId: ID, $serviceId: ID, $container: String!, $sinceSeconds: Int!) {
  pod(
    name: $name
    namespace: $namespace
    clusterId: $clusterId
    serviceId: $serviceId
  ) {
    logs(container: $container, sinceSeconds: $sinceSeconds)
  }
}
    ` as unknown as DocumentNode<Types.PodLogsQuery, Types.PodLogsQueryVariables>;
export const PodMetricsDocument = /*#__PURE__*/ gql`
    query PodMetrics($name: String!, $namespace: String!, $clusterId: ID, $serviceId: ID, $start: DateTime, $stop: DateTime, $step: String) {
  pod(
    name: $name
    namespace: $namespace
    clusterId: $clusterId
    serviceId: $serviceId
  ) {
    metrics(start: $start, stop: $stop, step: $step) {
      ...PodMetrics
    }
  }
}
    ${PodMetricsFragmentDoc}` as unknown as DocumentNode<Types.PodMetricsQuery, Types.PodMetricsQueryVariables>;
export const DeletePodDocument = /*#__PURE__*/ gql`
    mutation DeletePod($name: String!, $namespace: String!, $serviceId: ID) {
  deletePod(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Pod
  }
}
    ${PodFragmentDoc}` as unknown as DocumentNode<Types.DeletePodMutation, Types.DeletePodMutationVariables>;
export const ServiceDocument = /*#__PURE__*/ gql`
    query Service($name: String!, $namespace: String!, $serviceId: ID) {
  service(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Service
  }
}
    ${ServiceFragmentDoc}` as unknown as DocumentNode<Types.ServiceQuery, Types.ServiceQueryVariables>;
export const StatefulSetDocument = /*#__PURE__*/ gql`
    query StatefulSet($name: String!, $namespace: String!, $serviceId: ID) {
  statefulSet(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...StatefulSet
  }
}
    ${StatefulSetFragmentDoc}` as unknown as DocumentNode<Types.StatefulSetQuery, Types.StatefulSetQueryVariables>;
export const UnstructuredResourceDocument = /*#__PURE__*/ gql`
    query UnstructuredResource($group: String, $kind: String!, $name: String!, $namespace: String, $serviceId: ID!, $version: String!) {
  unstructuredResource(
    group: $group
    kind: $kind
    name: $name
    namespace: $namespace
    serviceId: $serviceId
    version: $version
  ) {
    ...UnstructuredResource
  }
}
    ${UnstructuredResourceFragmentDoc}` as unknown as DocumentNode<Types.UnstructuredResourceQuery, Types.UnstructuredResourceQueryVariables>;
export const SubscriptionDocument = /*#__PURE__*/ gql`
    query Subscription {
  account {
    ...Account
  }
  configuration {
    licenseExpiry
  }
}
    ${AccountFragmentDoc}` as unknown as DocumentNode<Types.SubscriptionQuery, Types.SubscriptionQueryVariables>;
export const MeGroupsDocument = /*#__PURE__*/ gql`
    query MeGroups {
  me {
    id
    groups {
      ...Group
    }
  }
}
    ${GroupFragmentDoc}` as unknown as DocumentNode<Types.MeGroupsQuery, Types.MeGroupsQueryVariables>;
export const MeDocument = /*#__PURE__*/ gql`
    query Me {
  me {
    ...User
    unreadNotifications
  }
  configuration {
    gitCommit
    isDemoProject
    isSandbox
    pluralLogin
    byok
    externalOidc
    cloud
    installed
    consoleVersion
    sentryEnabled
    objectStoreEnabled
    healthmapClusterCount
    manifest {
      ...Manifest
    }
    gitStatus {
      cloned
      output
    }
    features {
      ...AvailableFeatures
    }
    details {
      assumeRoleArn
      egressIps
    }
    qoveKey
  }
}
    ${UserFragmentDoc}
${ManifestFragmentDoc}
${AvailableFeaturesFragmentDoc}` as unknown as DocumentNode<Types.MeQuery, Types.MeQueryVariables>;
export const LoginInfoDocument = /*#__PURE__*/ gql`
    query LoginInfo($redirect: String) {
  loginInfo(redirect: $redirect) {
    oidcUri
    external
    oidcName
  }
}
    ` as unknown as DocumentNode<Types.LoginInfoQuery, Types.LoginInfoQueryVariables>;
export const InviteDocument = /*#__PURE__*/ gql`
    query Invite($id: String!) {
  invite(id: $id) {
    email
  }
}
    ` as unknown as DocumentNode<Types.InviteQuery, Types.InviteQueryVariables>;
export const RefreshDocument = /*#__PURE__*/ gql`
    query Refresh($token: String!) {
  refresh(token: $token) {
    ...User
    jwt
    refreshToken {
      ...RefreshToken
    }
  }
}
    ${UserFragmentDoc}
${RefreshTokenFragmentDoc}` as unknown as DocumentNode<Types.RefreshQuery, Types.RefreshQueryVariables>;
export const TemporaryTokenDocument = /*#__PURE__*/ gql`
    query TemporaryToken {
  temporaryToken
}
    ` as unknown as DocumentNode<Types.TemporaryTokenQuery, Types.TemporaryTokenQueryVariables>;
export const SignInDocument = /*#__PURE__*/ gql`
    mutation signIn($email: String!, $password: String!) {
  signIn(email: $email, password: $password) {
    ...User
    jwt
    refreshToken {
      ...RefreshToken
    }
  }
}
    ${UserFragmentDoc}
${RefreshTokenFragmentDoc}` as unknown as DocumentNode<Types.SignInMutation, Types.SignInMutationVariables>;
export const OauthCallbackDocument = /*#__PURE__*/ gql`
    mutation OauthCallback($code: String!, $redirect: String, $state: String) {
  oauthCallback(code: $code, redirect: $redirect, state: $state) {
    jwt
    refreshToken {
      ...RefreshToken
    }
  }
}
    ${RefreshTokenFragmentDoc}` as unknown as DocumentNode<Types.OauthCallbackMutation, Types.OauthCallbackMutationVariables>;
export const LogoutDocument = /*#__PURE__*/ gql`
    mutation Logout {
  logout {
    ...User
  }
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.LogoutMutation, Types.LogoutMutationVariables>;
export const SignUpDocument = /*#__PURE__*/ gql`
    mutation SignUp($inviteId: String!, $attributes: UserAttributes!) {
  signup(inviteId: $inviteId, attributes: $attributes) {
    ...User
    jwt
    refreshToken {
      ...RefreshToken
    }
  }
}
    ${UserFragmentDoc}
${RefreshTokenFragmentDoc}` as unknown as DocumentNode<Types.SignUpMutation, Types.SignUpMutationVariables>;
export const LoginLinkDocument = /*#__PURE__*/ gql`
    mutation LoginLink($key: String!) {
  loginLink(key: $key) {
    ...User
    jwt
    refreshToken {
      ...RefreshToken
    }
  }
}
    ${UserFragmentDoc}
${RefreshTokenFragmentDoc}` as unknown as DocumentNode<Types.LoginLinkMutation, Types.LoginLinkMutationVariables>;
export const LogAggregationDocument = /*#__PURE__*/ gql`
    query LogAggregation($clusterId: ID, $limit: Int, $query: String, $serviceId: ID, $time: LogTimeRange, $operator: LogQueryOperator, $facets: [LogFacetInput], $node: String, $levels: [LogLevel]) {
  logAggregation(
    clusterId: $clusterId
    limit: $limit
    query: $query
    serviceId: $serviceId
    time: $time
    facets: $facets
    operator: $operator
    node: $node
    levels: $levels
  ) {
    ...LogLine
  }
}
    ${LogLineFragmentDoc}` as unknown as DocumentNode<Types.LogAggregationQuery, Types.LogAggregationQueryVariables>;
export const LogLabelsDocument = /*#__PURE__*/ gql`
    query LogLabels($field: String!, $clusterId: ID, $serviceId: ID, $query: String, $time: LogTimeRange, $node: String, $levels: [LogLevel]) {
  logLabels(
    field: $field
    clusterId: $clusterId
    serviceId: $serviceId
    query: $query
    time: $time
    node: $node
    levels: $levels
  ) {
    ...LogFacetDetail
  }
}
    ${LogFacetDetailFragmentDoc}` as unknown as DocumentNode<Types.LogLabelsQuery, Types.LogLabelsQueryVariables>;
export const LogAggregationBucketsDocument = /*#__PURE__*/ gql`
    query LogAggregationBuckets($serviceId: ID, $clusterId: ID, $query: String, $time: LogTimeRange, $operator: LogQueryOperator, $aggregation: LogAggregationInput, $facets: [LogFacetInput], $node: String, $levels: [LogLevel]) {
  logAggregationBuckets(
    serviceId: $serviceId
    clusterId: $clusterId
    query: $query
    time: $time
    aggregation: $aggregation
    operator: $operator
    facets: $facets
    node: $node
    levels: $levels
  ) {
    ...LogAggregationBucket
  }
}
    ${LogAggregationBucketFragmentDoc}` as unknown as DocumentNode<Types.LogAggregationBucketsQuery, Types.LogAggregationBucketsQueryVariables>;
export const ClusterHeatMapDocument = /*#__PURE__*/ gql`
    query ClusterHeatMap($clusterId: ID!, $flavor: HeatMapFlavor!) {
  cluster(id: $clusterId) {
    id
    heatMap(flavor: $flavor) {
      ...UtilizationHeatMap
    }
  }
}
    ${UtilizationHeatMapFragmentDoc}` as unknown as DocumentNode<Types.ClusterHeatMapQuery, Types.ClusterHeatMapQueryVariables>;
export const ClusterNoisyNeighborsDocument = /*#__PURE__*/ gql`
    query ClusterNoisyNeighbors($clusterId: ID!) {
  cluster(id: $clusterId) {
    id
    noisyNeighbors {
      ...UtilizationHeatMap
    }
  }
}
    ${UtilizationHeatMapFragmentDoc}` as unknown as DocumentNode<Types.ClusterNoisyNeighborsQuery, Types.ClusterNoisyNeighborsQueryVariables>;
export const ServiceHeatMapDocument = /*#__PURE__*/ gql`
    query ServiceHeatMap($serviceId: ID!, $flavor: HeatMapFlavor!) {
  serviceDeployment(id: $serviceId) {
    id
    heatMap(flavor: $flavor) {
      ...UtilizationHeatMap
    }
  }
}
    ${UtilizationHeatMapFragmentDoc}` as unknown as DocumentNode<Types.ServiceHeatMapQuery, Types.ServiceHeatMapQueryVariables>;
export const ServiceMetricsDocument = /*#__PURE__*/ gql`
    query ServiceMetrics($id: ID!, $step: String, $start: DateTime, $stop: DateTime) {
  serviceDeployment(id: $id) {
    id
    serviceMetrics(step: $step, start: $start, stop: $stop) {
      cpu {
        ...MetricResponse
      }
      mem {
        ...MetricResponse
      }
      podCpu {
        ...MetricResponse
      }
      podMem {
        ...MetricResponse
      }
      cpuRequests {
        ...MetricResponse
      }
      memRequests {
        ...MetricResponse
      }
      cpuLimits {
        ...MetricResponse
      }
      memLimits {
        ...MetricResponse
      }
      podCpuRequests {
        ...MetricResponse
      }
      podMemRequests {
        ...MetricResponse
      }
      podCpuLimits {
        ...MetricResponse
      }
      podMemLimits {
        ...MetricResponse
      }
    }
  }
}
    ${MetricResponseFragmentDoc}` as unknown as DocumentNode<Types.ServiceMetricsQuery, Types.ServiceMetricsQueryVariables>;
export const MonitorDetailsDocument = /*#__PURE__*/ gql`
    query MonitorDetails($id: ID!) {
  monitor(id: $id) {
    ...Monitor
  }
}
    ${MonitorFragmentDoc}` as unknown as DocumentNode<Types.MonitorDetailsQuery, Types.MonitorDetailsQueryVariables>;
export const ServiceMonitorsDocument = /*#__PURE__*/ gql`
    query ServiceMonitors($serviceId: ID!, $q: String, $first: Int, $after: String) {
  serviceDeployment(id: $serviceId) {
    id
    monitors(q: $q, first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...MonitorTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${MonitorTinyFragmentDoc}` as unknown as DocumentNode<Types.ServiceMonitorsQuery, Types.ServiceMonitorsQueryVariables>;
export const CreateMonitorDocument = /*#__PURE__*/ gql`
    mutation CreateMonitor($attributes: MonitorAttributes!) {
  createMonitor(attributes: $attributes) {
    ...MonitorTiny
  }
}
    ${MonitorTinyFragmentDoc}` as unknown as DocumentNode<Types.CreateMonitorMutation, Types.CreateMonitorMutationVariables>;
export const UpdateMonitorDocument = /*#__PURE__*/ gql`
    mutation UpdateMonitor($id: ID!, $attributes: MonitorAttributes!) {
  updateMonitor(id: $id, attributes: $attributes) {
    ...MonitorTiny
  }
}
    ${MonitorTinyFragmentDoc}` as unknown as DocumentNode<Types.UpdateMonitorMutation, Types.UpdateMonitorMutationVariables>;
export const DeleteMonitorDocument = /*#__PURE__*/ gql`
    mutation DeleteMonitor($id: ID!) {
  deleteMonitor(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteMonitorMutation, Types.DeleteMonitorMutationVariables>;
export const UpsertNotificationRouterDocument = /*#__PURE__*/ gql`
    mutation UpsertNotificationRouter($attributes: NotificationRouterAttributes!) {
  upsertNotificationRouter(attributes: $attributes) {
    ...NotificationRouter
  }
}
    ${NotificationRouterFragmentDoc}` as unknown as DocumentNode<Types.UpsertNotificationRouterMutation, Types.UpsertNotificationRouterMutationVariables>;
export const NotificationRoutersDocument = /*#__PURE__*/ gql`
    query NotificationRouters($first: Int = 100, $after: String) {
  notificationRouters(first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...NotificationRouter
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${NotificationRouterFragmentDoc}` as unknown as DocumentNode<Types.NotificationRoutersQuery, Types.NotificationRoutersQueryVariables>;
export const DeleteNotificationRouterDocument = /*#__PURE__*/ gql`
    mutation DeleteNotificationRouter($id: ID!) {
  deleteNotificationRouter(id: $id) {
    ...NotificationRouter
  }
}
    ${NotificationRouterFragmentDoc}` as unknown as DocumentNode<Types.DeleteNotificationRouterMutation, Types.DeleteNotificationRouterMutationVariables>;
export const UpsertNotificationSinkDocument = /*#__PURE__*/ gql`
    mutation UpsertNotificationSink($attributes: NotificationSinkAttributes!) {
  upsertNotificationSink(attributes: $attributes) {
    ...NotificationSink
  }
}
    ${NotificationSinkFragmentDoc}` as unknown as DocumentNode<Types.UpsertNotificationSinkMutation, Types.UpsertNotificationSinkMutationVariables>;
export const DeleteNotificationSinkDocument = /*#__PURE__*/ gql`
    mutation DeleteNotificationSink($id: ID!) {
  deleteNotificationSink(id: $id) {
    ...NotificationSink
  }
}
    ${NotificationSinkFragmentDoc}` as unknown as DocumentNode<Types.DeleteNotificationSinkMutation, Types.DeleteNotificationSinkMutationVariables>;
export const NotificationSinksDocument = /*#__PURE__*/ gql`
    query NotificationSinks($q: String, $first: Int = 100, $after: String) {
  notificationSinks(q: $q, first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...NotificationSink
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${NotificationSinkFragmentDoc}` as unknown as DocumentNode<Types.NotificationSinksQuery, Types.NotificationSinksQueryVariables>;
export const UnreadAppNotificationsDocument = /*#__PURE__*/ gql`
    query UnreadAppNotifications {
  unreadAppNotifications
}
    ` as unknown as DocumentNode<Types.UnreadAppNotificationsQuery, Types.UnreadAppNotificationsQueryVariables>;
export const AppNotificationsDocument = /*#__PURE__*/ gql`
    query AppNotifications($after: String, $first: Int, $before: String, $last: Int) {
  appNotifications(after: $after, first: $first, before: $before, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...AppNotification
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AppNotificationFragmentDoc}` as unknown as DocumentNode<Types.AppNotificationsQuery, Types.AppNotificationsQueryVariables>;
export const ReadAppNotificationsDocument = /*#__PURE__*/ gql`
    mutation ReadAppNotifications {
  readAppNotifications
}
    ` as unknown as DocumentNode<Types.ReadAppNotificationsMutation, Types.ReadAppNotificationsMutationVariables>;
export const OidcConsentDocument = /*#__PURE__*/ gql`
    query OIDCConsent($challenge: String!) {
  oidcConsent(challenge: $challenge) {
    consent {
      requestedScope
      skip
    }
  }
}
    ` as unknown as DocumentNode<Types.OidcConsentQuery, Types.OidcConsentQueryVariables>;
export const ConsentDocument = /*#__PURE__*/ gql`
    mutation Consent($challenge: String!, $scopes: [String]) {
  oauthConsent(challenge: $challenge, scopes: $scopes) {
    redirectTo
  }
}
    ` as unknown as DocumentNode<Types.ConsentMutation, Types.ConsentMutationVariables>;
export const AcceptLoginDocument = /*#__PURE__*/ gql`
    mutation AcceptLogin($challenge: String!) {
  acceptLogin(challenge: $challenge) {
    redirectTo
  }
}
    ` as unknown as DocumentNode<Types.AcceptLoginMutation, Types.AcceptLoginMutationVariables>;
export const OidcProvidersDocument = /*#__PURE__*/ gql`
    query OidcProviders($after: String, $first: Int = 100, $before: String, $last: Int, $q: String) {
  oidcProviders(after: $after, first: $first, before: $before, last: $last, q: $q) {
    edges {
      node {
        ...OidcProvider
      }
    }
    pageInfo {
      ...PageInfo
    }
  }
}
    ${OidcProviderFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.OidcProvidersQuery, Types.OidcProvidersQueryVariables>;
export const CreateOidcProviderDocument = /*#__PURE__*/ gql`
    mutation CreateOidcProvider($type: OidcProviderType!, $attributes: OidcProviderAttributes!) {
  createOidcProvider(type: $type, attributes: $attributes) {
    ...OidcProvider
  }
}
    ${OidcProviderFragmentDoc}` as unknown as DocumentNode<Types.CreateOidcProviderMutation, Types.CreateOidcProviderMutationVariables>;
export const UpdateOidcProviderDocument = /*#__PURE__*/ gql`
    mutation UpdateOidcProvider($type: OidcProviderType!, $id: ID!, $attributes: OidcProviderAttributes!) {
  updateOidcProvider(type: $type, id: $id, attributes: $attributes) {
    ...OidcProvider
  }
}
    ${OidcProviderFragmentDoc}` as unknown as DocumentNode<Types.UpdateOidcProviderMutation, Types.UpdateOidcProviderMutationVariables>;
export const DeleteOidcProviderDocument = /*#__PURE__*/ gql`
    mutation DeleteOidcProvider($type: OidcProviderType!, $id: ID!) {
  deleteOidcProvider(type: $type, id: $id) {
    ...OidcProvider
  }
}
    ${OidcProviderFragmentDoc}` as unknown as DocumentNode<Types.DeleteOidcProviderMutation, Types.DeleteOidcProviderMutationVariables>;
export const PersonasDocument = /*#__PURE__*/ gql`
    query Personas($first: Int = 3, $after: String) {
  personas(first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Persona
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PersonaFragmentDoc}` as unknown as DocumentNode<Types.PersonasQuery, Types.PersonasQueryVariables>;
export const CreatePersonaDocument = /*#__PURE__*/ gql`
    mutation CreatePersona($attributes: PersonaAttributes!) {
  createPersona(attributes: $attributes) {
    ...Persona
  }
}
    ${PersonaFragmentDoc}` as unknown as DocumentNode<Types.CreatePersonaMutation, Types.CreatePersonaMutationVariables>;
export const UpdatePersonaDocument = /*#__PURE__*/ gql`
    mutation UpdatePersona($id: ID!, $attributes: PersonaAttributes!) {
  updatePersona(id: $id, attributes: $attributes) {
    ...Persona
  }
}
    ${PersonaFragmentDoc}` as unknown as DocumentNode<Types.UpdatePersonaMutation, Types.UpdatePersonaMutationVariables>;
export const DeletePersonaDocument = /*#__PURE__*/ gql`
    mutation DeletePersona($id: ID!) {
  deletePersona(id: $id) {
    ...Persona
  }
}
    ${PersonaFragmentDoc}` as unknown as DocumentNode<Types.DeletePersonaMutation, Types.DeletePersonaMutationVariables>;
export const PolicyConstraintsDocument = /*#__PURE__*/ gql`
    query PolicyConstraints($after: String, $before: String, $clusters: [ID], $first: Int, $kind: String, $kinds: [String], $last: Int, $namespace: String, $namespaces: [String], $q: String, $violated: Boolean) {
  policyConstraints(
    after: $after
    before: $before
    clusters: $clusters
    first: $first
    kind: $kind
    kinds: $kinds
    last: $last
    namespace: $namespace
    namespaces: $namespaces
    q: $q
    violated: $violated
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...PolicyConstraint
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PolicyConstraintFragmentDoc}` as unknown as DocumentNode<Types.PolicyConstraintsQuery, Types.PolicyConstraintsQueryVariables>;
export const PolicyConstraintDocument = /*#__PURE__*/ gql`
    query PolicyConstraint($id: ID!) {
  policyConstraint(id: $id) {
    ...PolicyConstraint
    object {
      metadata {
        namespace
      }
      kind
    }
    violations {
      group
      id
      insertedAt
      kind
      message
      name
      namespace
      updatedAt
      version
    }
  }
}
    ${PolicyConstraintFragmentDoc}` as unknown as DocumentNode<Types.PolicyConstraintQuery, Types.PolicyConstraintQueryVariables>;
export const ViolationStatisticsDocument = /*#__PURE__*/ gql`
    query ViolationStatistics($field: ConstraintViolationField!) {
  violationStatistics(field: $field) {
    count
    value
    violations
  }
}
    ` as unknown as DocumentNode<Types.ViolationStatisticsQuery, Types.ViolationStatisticsQueryVariables>;
export const PolicyStatisticsDocument = /*#__PURE__*/ gql`
    query PolicyStatistics($aggregate: PolicyAggregate!, $clusters: [ID], $kind: String, $kinds: [String], $namespace: String, $namespaces: [String], $q: String) {
  policyStatistics(
    aggregate: $aggregate
    clusters: $clusters
    kind: $kind
    kinds: $kinds
    namespace: $namespace
    namespaces: $namespaces
    q: $q
  ) {
    count
    aggregate
  }
}
    ` as unknown as DocumentNode<Types.PolicyStatisticsQuery, Types.PolicyStatisticsQueryVariables>;
export const ComplianceReportGeneratorsDocument = /*#__PURE__*/ gql`
    query ComplianceReportGenerators($after: String, $before: String, $first: Int, $last: Int) {
  complianceReportGenerators(
    after: $after
    before: $before
    first: $first
    last: $last
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ComplianceReportGenerator
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ComplianceReportGeneratorFragmentDoc}` as unknown as DocumentNode<Types.ComplianceReportGeneratorsQuery, Types.ComplianceReportGeneratorsQueryVariables>;
export const ComplianceReportGeneratorDocument = /*#__PURE__*/ gql`
    query ComplianceReportGenerator($id: ID, $name: String) {
  complianceReportGenerator(id: $id, name: $name) {
    ...ComplianceReportGenerator
  }
}
    ${ComplianceReportGeneratorFragmentDoc}` as unknown as DocumentNode<Types.ComplianceReportGeneratorQuery, Types.ComplianceReportGeneratorQueryVariables>;
export const UpsertComplianceReportGeneratorDocument = /*#__PURE__*/ gql`
    mutation UpsertComplianceReportGenerator($attributes: ComplianceReportGeneratorAttributes!) {
  upsertComplianceReportGenerator(attributes: $attributes) {
    ...ComplianceReportGenerator
  }
}
    ${ComplianceReportGeneratorFragmentDoc}` as unknown as DocumentNode<Types.UpsertComplianceReportGeneratorMutation, Types.UpsertComplianceReportGeneratorMutationVariables>;
export const DeleteComplianceReportDocument = /*#__PURE__*/ gql`
    mutation DeleteComplianceReport($id: ID!) {
  deleteComplianceReportGenerator(id: $id) {
    ...ComplianceReportGenerator
  }
}
    ${ComplianceReportGeneratorFragmentDoc}` as unknown as DocumentNode<Types.DeleteComplianceReportMutation, Types.DeleteComplianceReportMutationVariables>;
export const ComplianceReportsDocument = /*#__PURE__*/ gql`
    query ComplianceReports($id: ID, $name: String, $after: String, $before: String, $first: Int, $last: Int) {
  complianceReportGenerator(id: $id, name: $name) {
    complianceReports(after: $after, before: $before, first: $first, last: $last) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...ComplianceReport
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ComplianceReportFragmentDoc}` as unknown as DocumentNode<Types.ComplianceReportsQuery, Types.ComplianceReportsQueryVariables>;
export const PoliciesDocument = /*#__PURE__*/ gql`
    query Policies($after: String, $first: Int, $before: String, $last: Int, $projectId: ID, $q: String) {
  policies(
    after: $after
    first: $first
    before: $before
    last: $last
    projectId: $projectId
    q: $q
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...PolicyTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.PoliciesQuery, Types.PoliciesQueryVariables>;
export const PolicyDocument = /*#__PURE__*/ gql`
    query Policy($id: ID, $name: String) {
  policy(id: $id, name: $name) {
    ...Policy
  }
}
    ${PolicyFragmentDoc}` as unknown as DocumentNode<Types.PolicyQuery, Types.PolicyQueryVariables>;
export const PolicyWorkbenchAttachmentsDocument = /*#__PURE__*/ gql`
    query PolicyWorkbenchAttachments($id: ID!, $first: Int, $after: String) {
  policy(id: $id) {
    id
    workbenchPolicies(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          matches {
            regexes
          }
          workbench {
            id
            name
            description
          }
          updatedAt
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.PolicyWorkbenchAttachmentsQuery, Types.PolicyWorkbenchAttachmentsQueryVariables>;
export const PolicyStackAttachmentsDocument = /*#__PURE__*/ gql`
    query PolicyStackAttachments($id: ID!, $first: Int, $after: String) {
  policy(id: $id) {
    id
    stackPolicies(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          type
          stack {
            id
            name
            type
          }
          updatedAt
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.PolicyStackAttachmentsQuery, Types.PolicyStackAttachmentsQueryVariables>;
export const PolicyEvaluationsDocument = /*#__PURE__*/ gql`
    query PolicyEvaluations($id: ID!, $first: Int, $after: String) {
  policy(id: $id) {
    id
    policyEvaluations(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...PolicyEvaluation
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PolicyEvaluationFragmentDoc}` as unknown as DocumentNode<Types.PolicyEvaluationsQuery, Types.PolicyEvaluationsQueryVariables>;
export const CreatePolicyDocument = /*#__PURE__*/ gql`
    mutation CreatePolicy($attributes: PolicyAttributes!) {
  createPolicy(attributes: $attributes) {
    ...PolicyTiny
  }
}
    ${PolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.CreatePolicyMutation, Types.CreatePolicyMutationVariables>;
export const UpdatePolicyDocument = /*#__PURE__*/ gql`
    mutation UpdatePolicy($id: ID!, $attributes: PolicyAttributes!) {
  updatePolicy(id: $id, attributes: $attributes) {
    ...Policy
  }
}
    ${PolicyFragmentDoc}` as unknown as DocumentNode<Types.UpdatePolicyMutation, Types.UpdatePolicyMutationVariables>;
export const EvaluatePolicyDocument = /*#__PURE__*/ gql`
    query EvaluatePolicy($policyId: ID!, $input: Json!, $policy: String) {
  evaluatePolicy(policyId: $policyId, input: $input, policy: $policy)
}
    ` as unknown as DocumentNode<Types.EvaluatePolicyQuery, Types.EvaluatePolicyQueryVariables>;
export const DeletePolicyDocument = /*#__PURE__*/ gql`
    mutation DeletePolicy($id: ID!) {
  deletePolicy(id: $id) {
    ...PolicyTiny
  }
}
    ${PolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.DeletePolicyMutation, Types.DeletePolicyMutationVariables>;
export const BindingPoliciesDocument = /*#__PURE__*/ gql`
    query BindingPolicies($after: String, $first: Int, $before: String, $last: Int) {
  bindingPolicies(after: $after, first: $first, before: $before, last: $last) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...BindingPolicyTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${BindingPolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.BindingPoliciesQuery, Types.BindingPoliciesQueryVariables>;
export const DeleteBindingPolicyDocument = /*#__PURE__*/ gql`
    mutation DeleteBindingPolicy($id: ID!) {
  deleteBindingPolicy(id: $id) {
    ...BindingPolicyTiny
  }
}
    ${BindingPolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.DeleteBindingPolicyMutation, Types.DeleteBindingPolicyMutationVariables>;
export const BindingPolicyDocument = /*#__PURE__*/ gql`
    query BindingPolicy($id: ID!) {
  bindingPolicy(id: $id) {
    ...BindingPolicy
  }
}
    ${BindingPolicyFragmentDoc}` as unknown as DocumentNode<Types.BindingPolicyQuery, Types.BindingPolicyQueryVariables>;
export const CreateBindingPolicyDocument = /*#__PURE__*/ gql`
    mutation CreateBindingPolicy($attributes: BindingPolicyAttributes!) {
  createBindingPolicy(attributes: $attributes) {
    ...BindingPolicyTiny
  }
}
    ${BindingPolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.CreateBindingPolicyMutation, Types.CreateBindingPolicyMutationVariables>;
export const UpdateBindingPolicyDocument = /*#__PURE__*/ gql`
    mutation UpdateBindingPolicy($id: ID!, $attributes: BindingPolicyUpdateAttributes!) {
  updateBindingPolicy(id: $id, attributes: $attributes) {
    ...BindingPolicyTiny
  }
}
    ${BindingPolicyTinyFragmentDoc}` as unknown as DocumentNode<Types.UpdateBindingPolicyMutation, Types.UpdateBindingPolicyMutationVariables>;
export const ProjectsDocument = /*#__PURE__*/ gql`
    query Projects($after: String, $before: String, $first: Int = 100, $last: Int, $q: String) {
  projects(after: $after, before: $before, first: $first, last: $last, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Project
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ProjectFragmentDoc}` as unknown as DocumentNode<Types.ProjectsQuery, Types.ProjectsQueryVariables>;
export const ProjectsTinyDocument = /*#__PURE__*/ gql`
    query ProjectsTiny($after: String, $before: String, $first: Int = 100, $last: Int, $q: String) {
  projects(after: $after, before: $before, first: $first, last: $last, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ProjectTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ProjectTinyFragmentDoc}` as unknown as DocumentNode<Types.ProjectsTinyQuery, Types.ProjectsTinyQueryVariables>;
export const ProjectDocument = /*#__PURE__*/ gql`
    query Project($id: ID, $name: String) {
  project(id: $id, name: $name) {
    ...Project
  }
}
    ${ProjectFragmentDoc}` as unknown as DocumentNode<Types.ProjectQuery, Types.ProjectQueryVariables>;
export const ProjectBindingsDocument = /*#__PURE__*/ gql`
    query ProjectBindings($id: ID!) {
  project(id: $id) {
    ...ProjectBindings
  }
}
    ${ProjectBindingsFragmentDoc}` as unknown as DocumentNode<Types.ProjectBindingsQuery, Types.ProjectBindingsQueryVariables>;
export const CreateProjectDocument = /*#__PURE__*/ gql`
    mutation CreateProject($attributes: ProjectAttributes!) {
  createProject(attributes: $attributes) {
    ...Project
  }
}
    ${ProjectFragmentDoc}` as unknown as DocumentNode<Types.CreateProjectMutation, Types.CreateProjectMutationVariables>;
export const UpdateProjectDocument = /*#__PURE__*/ gql`
    mutation UpdateProject($id: ID!, $attributes: ProjectAttributes!) {
  updateProject(id: $id, attributes: $attributes) {
    ...Project
  }
}
    ${ProjectFragmentDoc}` as unknown as DocumentNode<Types.UpdateProjectMutation, Types.UpdateProjectMutationVariables>;
export const DeleteProjectDocument = /*#__PURE__*/ gql`
    mutation DeleteProject($id: ID!) {
  deleteProject(id: $id) {
    ...Project
  }
}
    ${ProjectFragmentDoc}` as unknown as DocumentNode<Types.DeleteProjectMutation, Types.DeleteProjectMutationVariables>;
export const PublicWorkbenchDashboardDocument = /*#__PURE__*/ gql`
    query PublicWorkbenchDashboard($publicId: String!) {
  publicWorkbenchDashboard(publicId: $publicId) {
    name
    description
    graphs {
      ...PublicWorkbenchDashboardGraph
    }
  }
}
    ${PublicWorkbenchDashboardGraphFragmentDoc}` as unknown as DocumentNode<Types.PublicWorkbenchDashboardQuery, Types.PublicWorkbenchDashboardQueryVariables>;
export const PublicWorkbenchDashboardGraphDocument = /*#__PURE__*/ gql`
    query PublicWorkbenchDashboardGraph($publicId: String!, $identifier: String!, $timeRange: DashboardTimeRangeAttributes!) {
  publicWorkbenchDashboard(publicId: $publicId) {
    name
    graph(identifier: $identifier, timeRange: $timeRange) {
      series {
        ...MetricSeries
      }
      logs {
        ...WorkbenchJobActivityLog
      }
      traces {
        ...WorkbenchJobActivityTrace
      }
    }
  }
}
    ${MetricSeriesFragmentDoc}
${WorkbenchJobActivityLogFragmentDoc}
${WorkbenchJobActivityTraceFragmentDoc}` as unknown as DocumentNode<Types.PublicWorkbenchDashboardGraphQuery, Types.PublicWorkbenchDashboardGraphQueryVariables>;
export const UpdateRbacDocument = /*#__PURE__*/ gql`
    mutation UpdateRbac($serviceId: ID, $clusterId: ID, $pipelineId: ID, $stackId: ID, $projectId: ID, $flowId: ID, $serverId: ID, $rbac: RbacAttributes!) {
  updateRbac(
    serviceId: $serviceId
    clusterId: $clusterId
    pipelineId: $pipelineId
    stackId: $stackId
    projectId: $projectId
    flowId: $flowId
    serverId: $serverId
    rbac: $rbac
  )
}
    ` as unknown as DocumentNode<Types.UpdateRbacMutation, Types.UpdateRbacMutationVariables>;
export const ServiceAccountsDocument = /*#__PURE__*/ gql`
    query ServiceAccounts($q: String, $first: Int = 100, $after: String) {
  serviceAccounts(q: $q, first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...User
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${UserFragmentDoc}` as unknown as DocumentNode<Types.ServiceAccountsQuery, Types.ServiceAccountsQueryVariables>;
export const CreateServiceAccountDocument = /*#__PURE__*/ gql`
    mutation CreateServiceAccount($attributes: ServiceAccountAttributes!) {
  createServiceAccount(attributes: $attributes) {
    ...User
  }
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.CreateServiceAccountMutation, Types.CreateServiceAccountMutationVariables>;
export const UpdateServiceAccountDocument = /*#__PURE__*/ gql`
    mutation UpdateServiceAccount($id: ID!, $attributes: ServiceAccountAttributes!) {
  updateServiceAccount(id: $id, attributes: $attributes) {
    ...User
  }
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.UpdateServiceAccountMutation, Types.UpdateServiceAccountMutationVariables>;
export const ImpersonateServiceAccountDocument = /*#__PURE__*/ gql`
    mutation ImpersonateServiceAccount($email: String!) {
  impersonateServiceAccount(email: $email) {
    id
    email
    jwt
  }
}
    ` as unknown as DocumentNode<Types.ImpersonateServiceAccountMutation, Types.ImpersonateServiceAccountMutationVariables>;
export const ServiceAccountAccessTokenDocument = /*#__PURE__*/ gql`
    mutation ServiceAccountAccessToken($id: ID!, $attributes: AccessTokenAttributes!, $refresh: Boolean) {
  serviceAccountAccessToken(id: $id, attributes: $attributes, refresh: $refresh) {
    ...AccessToken
    token
  }
}
    ${AccessTokenFragmentDoc}` as unknown as DocumentNode<Types.ServiceAccountAccessTokenMutation, Types.ServiceAccountAccessTokenMutationVariables>;
export const StackPrsDocument = /*#__PURE__*/ gql`
    query StackPrs($id: ID!, $after: String, $before: String, $first: Int = 100, $last: Int) {
  infrastructureStack(id: $id) {
    id
    pullRequests(after: $after, before: $before, first: $first, last: $last) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...PullRequest
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PullRequestFragmentDoc}` as unknown as DocumentNode<Types.StackPrsQuery, Types.StackPrsQueryVariables>;
export const StacksDocument = /*#__PURE__*/ gql`
    query Stacks($q: String, $after: String, $before: String, $first: Int = 100, $last: Int, $projectId: ID, $tagQuery: TagQuery) {
  infrastructureStacks(
    q: $q
    after: $after
    before: $before
    first: $first
    last: $last
    projectId: $projectId
    tagQuery: $tagQuery
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...StackTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${StackTinyFragmentDoc}` as unknown as DocumentNode<Types.StacksQuery, Types.StacksQueryVariables>;
export const StackDocument = /*#__PURE__*/ gql`
    query Stack($id: ID!) {
  infrastructureStack(id: $id) {
    ...Stack
  }
}
    ${StackFragmentDoc}` as unknown as DocumentNode<Types.StackQuery, Types.StackQueryVariables>;
export const StackTinyDocument = /*#__PURE__*/ gql`
    query StackTiny($id: ID!) {
  infrastructureStack(id: $id) {
    ...StackTiny
  }
}
    ${StackTinyFragmentDoc}` as unknown as DocumentNode<Types.StackTinyQuery, Types.StackTinyQueryVariables>;
export const StackStateDocument = /*#__PURE__*/ gql`
    query StackState($id: ID!) {
  infrastructureStack(id: $id) {
    state {
      id
      plan
      state {
        name
        identifier
        configuration
        links
        resource
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.StackStateQuery, Types.StackStateQueryVariables>;
export const StackOutputDocument = /*#__PURE__*/ gql`
    query StackOutput($id: ID!) {
  infrastructureStack(id: $id) {
    output {
      name
      secret
      value
    }
  }
}
    ` as unknown as DocumentNode<Types.StackOutputQuery, Types.StackOutputQueryVariables>;
export const StackFilesDocument = /*#__PURE__*/ gql`
    query StackFiles($id: ID!) {
  infrastructureStack(id: $id) {
    files {
      path
      content
    }
  }
}
    ` as unknown as DocumentNode<Types.StackFilesQuery, Types.StackFilesQueryVariables>;
export const StackBindingsDocument = /*#__PURE__*/ gql`
    query StackBindings($id: ID!) {
  infrastructureStack(id: $id) {
    writeBindings {
      ...PolicyBinding
    }
    readBindings {
      ...PolicyBinding
    }
  }
}
    ${PolicyBindingFragmentDoc}` as unknown as DocumentNode<Types.StackBindingsQuery, Types.StackBindingsQueryVariables>;
export const StackRunsDocument = /*#__PURE__*/ gql`
    query StackRuns($id: ID!, $after: String, $before: String, $first: Int = 100, $last: Int, $pullRequestId: ID) {
  infrastructureStack(id: $id) {
    id
    runs(
      after: $after
      before: $before
      first: $first
      last: $last
      pullRequestId: $pullRequestId
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...StackRun
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${StackRunFragmentDoc}` as unknown as DocumentNode<Types.StackRunsQuery, Types.StackRunsQueryVariables>;
export const StackRunDocument = /*#__PURE__*/ gql`
    query StackRun($id: ID!) {
  stackRun(id: $id) {
    ...StackRunDetails
  }
}
    ${StackRunDetailsFragmentDoc}` as unknown as DocumentNode<Types.StackRunQuery, Types.StackRunQueryVariables>;
export const StackRunJobDocument = /*#__PURE__*/ gql`
    query StackRunJob($id: ID!) {
  stackRun(id: $id) {
    id
    cluster {
      id
    }
    job {
      ...PipelineGateJob
    }
  }
}
    ${PipelineGateJobFragmentDoc}` as unknown as DocumentNode<Types.StackRunJobQuery, Types.StackRunJobQueryVariables>;
export const StackRunJobLogsDocument = /*#__PURE__*/ gql`
    query StackRunJobLogs($id: ID!, $container: String!, $sinceSeconds: Int!) {
  stackRun(id: $id) {
    id
    job {
      logs(container: $container, sinceSeconds: $sinceSeconds)
    }
  }
}
    ` as unknown as DocumentNode<Types.StackRunJobLogsQuery, Types.StackRunJobLogsQueryVariables>;
export const CustomStackRunsDocument = /*#__PURE__*/ gql`
    query CustomStackRuns($id: ID!, $after: String, $before: String, $first: Int = 100, $last: Int) {
  infrastructureStack(id: $id) {
    id
    customStackRuns(after: $after, before: $before, first: $first, last: $last) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...CustomStackRun
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${CustomStackRunFragmentDoc}` as unknown as DocumentNode<Types.CustomStackRunsQuery, Types.CustomStackRunsQueryVariables>;
export const CreateStackDocument = /*#__PURE__*/ gql`
    mutation CreateStack($attributes: StackAttributes!) {
  createStack(attributes: $attributes) {
    id
  }
}
    ` as unknown as DocumentNode<Types.CreateStackMutation, Types.CreateStackMutationVariables>;
export const CreateOnDemandRunDocument = /*#__PURE__*/ gql`
    mutation CreateOnDemandRun($stackId: ID!, $context: Json, $commands: [CommandAttributes], $runName: String) {
  onDemandRun(
    stackId: $stackId
    context: $context
    commands: $commands
    runName: $runName
  ) {
    ...StackRun
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.CreateOnDemandRunMutation, Types.CreateOnDemandRunMutationVariables>;
export const UpdateStackDocument = /*#__PURE__*/ gql`
    mutation UpdateStack($id: ID!, $attributes: StackAttributes!) {
  updateStack(id: $id, attributes: $attributes) {
    id
  }
}
    ` as unknown as DocumentNode<Types.UpdateStackMutation, Types.UpdateStackMutationVariables>;
export const DetachStackDocument = /*#__PURE__*/ gql`
    mutation DetachStack($id: ID!) {
  detachStack(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DetachStackMutation, Types.DetachStackMutationVariables>;
export const DeleteStackDocument = /*#__PURE__*/ gql`
    mutation DeleteStack($id: ID!) {
  deleteStack(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteStackMutation, Types.DeleteStackMutationVariables>;
export const KickStackDocument = /*#__PURE__*/ gql`
    mutation KickStack($id: ID!) {
  kickStack(id: $id) {
    ...StackRun
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.KickStackMutation, Types.KickStackMutationVariables>;
export const KickStackPullRequestDocument = /*#__PURE__*/ gql`
    mutation kickStackPullRequest($id: ID!) {
  kickStackPullRequest(id: $id) {
    ...StackRun
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.KickStackPullRequestMutation, Types.KickStackPullRequestMutationVariables>;
export const UpdateStackRunDocument = /*#__PURE__*/ gql`
    mutation UpdateStackRun($id: ID!, $attributes: StackRunAttributes!) {
  updateStackRun(id: $id, attributes: $attributes) {
    ...StackRun
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.UpdateStackRunMutation, Types.UpdateStackRunMutationVariables>;
export const CompleteStackRunDocument = /*#__PURE__*/ gql`
    mutation CompleteStackRun($id: ID!, $attributes: StackRunAttributes!) {
  completeStackRun(id: $id, attributes: $attributes) {
    ...StackRunDetails
  }
}
    ${StackRunDetailsFragmentDoc}` as unknown as DocumentNode<Types.CompleteStackRunMutation, Types.CompleteStackRunMutationVariables>;
export const ApproveStackRunDocument = /*#__PURE__*/ gql`
    mutation ApproveStackRun($id: ID!) {
  approveStackRun(id: $id) {
    ...StackRunDetails
  }
}
    ${StackRunDetailsFragmentDoc}` as unknown as DocumentNode<Types.ApproveStackRunMutation, Types.ApproveStackRunMutationVariables>;
export const RestartStackRunDocument = /*#__PURE__*/ gql`
    mutation RestartStackRun($id: ID!) {
  restartStackRun(id: $id) {
    ...StackRun
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.RestartStackRunMutation, Types.RestartStackRunMutationVariables>;
export const RestoreStackDocument = /*#__PURE__*/ gql`
    mutation RestoreStack($id: ID!) {
  restoreStack(id: $id) {
    ...StackTiny
  }
}
    ${StackTinyFragmentDoc}` as unknown as DocumentNode<Types.RestoreStackMutation, Types.RestoreStackMutationVariables>;
export const TriggerStackRunDocument = /*#__PURE__*/ gql`
    mutation TriggerStackRun($id: ID!) {
  triggerRun(id: $id) {
    ...StackRun
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.TriggerStackRunMutation, Types.TriggerStackRunMutationVariables>;
export const InfrastructureStackDeltaDocument = /*#__PURE__*/ gql`
    subscription InfrastructureStackDelta {
  infrastructureStackDelta {
    delta
    payload {
      id
      name
      status
      paused
      deletedAt
      updatedAt
    }
  }
}
    ` as unknown as DocumentNode<Types.InfrastructureStackDeltaSubscription, Types.InfrastructureStackDeltaSubscriptionVariables>;
export const StackRunDeltaDocument = /*#__PURE__*/ gql`
    subscription StackRunDelta($stackId: ID!) {
  stackRunDelta(stackId: $stackId) {
    delta
    payload {
      ...StackRun
      pullRequest {
        id
      }
    }
  }
}
    ${StackRunFragmentDoc}` as unknown as DocumentNode<Types.StackRunDeltaSubscription, Types.StackRunDeltaSubscriptionVariables>;
export const StackListEntryDocument = /*#__PURE__*/ gql`
    query StackListEntry($id: ID!) {
  infrastructureStack(id: $id) {
    ...StackTiny
    project {
      id
    }
  }
}
    ${StackTinyFragmentDoc}` as unknown as DocumentNode<Types.StackListEntryQuery, Types.StackListEntryQueryVariables>;
export const RunStepDeltaDocument = /*#__PURE__*/ gql`
    subscription RunStepDelta($runId: ID!) {
  runStepDelta(runId: $runId) {
    delta
    payload {
      id
      status
      updatedAt
    }
  }
}
    ` as unknown as DocumentNode<Types.RunStepDeltaSubscription, Types.RunStepDeltaSubscriptionVariables>;
export const LogsDeltaDocument = /*#__PURE__*/ gql`
    subscription LogsDelta($id: ID!) {
  runLogsDelta(stepId: $id) {
    delta
    payload {
      id
      logs
      insertedAt
      updatedAt
    }
  }
}
    ` as unknown as DocumentNode<Types.LogsDeltaSubscription, Types.LogsDeltaSubscriptionVariables>;
export const AccessTokensDocument = /*#__PURE__*/ gql`
    query AccessTokens {
  accessTokens(first: 500) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...AccessToken
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AccessTokenFragmentDoc}` as unknown as DocumentNode<Types.AccessTokensQuery, Types.AccessTokensQueryVariables>;
export const TokenAuditsDocument = /*#__PURE__*/ gql`
    query TokenAudits($id: ID!, $cursor: String) {
  accessToken(id: $id) {
    id
    audits(first: 500, after: $cursor) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...AccessTokenAudit
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AccessTokenAuditFragmentDoc}` as unknown as DocumentNode<Types.TokenAuditsQuery, Types.TokenAuditsQueryVariables>;
export const CreateAccessTokenDocument = /*#__PURE__*/ gql`
    mutation CreateAccessToken($scopes: [ScopeAttributes]) {
  createAccessToken(scopes: $scopes) {
    ...AccessToken
    token
  }
}
    ${AccessTokenFragmentDoc}` as unknown as DocumentNode<Types.CreateAccessTokenMutation, Types.CreateAccessTokenMutationVariables>;
export const DeleteAccessTokenDocument = /*#__PURE__*/ gql`
    mutation DeleteAccessToken($id: ID!) {
  deleteAccessToken(id: $id) {
    ...AccessToken
  }
}
    ${AccessTokenFragmentDoc}` as unknown as DocumentNode<Types.DeleteAccessTokenMutation, Types.DeleteAccessTokenMutationVariables>;
export const ShareSecretDocument = /*#__PURE__*/ gql`
    mutation ShareSecret($attributes: SharedSecretAttributes!) {
  shareSecret(attributes: $attributes) {
    ...SharedSecret
  }
}
    ${SharedSecretFragmentDoc}` as unknown as DocumentNode<Types.ShareSecretMutation, Types.ShareSecretMutationVariables>;
export const ConsumeSecretDocument = /*#__PURE__*/ gql`
    mutation ConsumeSecret($handle: String!) {
  consumeSecret(handle: $handle) {
    ...SharedSecret
  }
}
    ${SharedSecretFragmentDoc}` as unknown as DocumentNode<Types.ConsumeSecretMutation, Types.ConsumeSecretMutationVariables>;
export const UsersDocument = /*#__PURE__*/ gql`
    query Users($q: String, $after: String) {
  users(q: $q, first: 20, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...UserWithGroups
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${UserWithGroupsFragmentDoc}` as unknown as DocumentNode<Types.UsersQuery, Types.UsersQueryVariables>;
export const SearchUsersDocument = /*#__PURE__*/ gql`
    query SearchUsers($q: String, $cursor: String) {
  users(q: $q, after: $cursor, first: 5) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...User
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${UserFragmentDoc}` as unknown as DocumentNode<Types.SearchUsersQuery, Types.SearchUsersQueryVariables>;
export const UpdateUserDocument = /*#__PURE__*/ gql`
    mutation UpdateUser($id: ID, $attributes: UserAttributes!) {
  updateUser(id: $id, attributes: $attributes) {
    ...User
  }
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>;
export const DeleteUserDocument = /*#__PURE__*/ gql`
    mutation DeleteUser($id: ID!) {
  deleteUser(id: $id) {
    ...User
  }
}
    ${UserFragmentDoc}` as unknown as DocumentNode<Types.DeleteUserMutation, Types.DeleteUserMutationVariables>;
export const CreateInviteDocument = /*#__PURE__*/ gql`
    mutation CreateInvite($attributes: InviteAttributes!) {
  createInvite(attributes: $attributes) {
    ...Invite
  }
}
    ${InviteFragmentDoc}` as unknown as DocumentNode<Types.CreateInviteMutation, Types.CreateInviteMutationVariables>;
export const VulnerabilityReportsDocument = /*#__PURE__*/ gql`
    query VulnerabilityReports($clusters: [ID], $namespaces: [String], $q: String, $grade: VulnReportGrade, $first: Int, $after: String) {
  vulnerabilityReports(
    clusters: $clusters
    namespaces: $namespaces
    q: $q
    grade: $grade
    first: $first
    after: $after
  ) {
    ...VulnerabilityReportConnection
  }
}
    ${VulnerabilityReportConnectionFragmentDoc}` as unknown as DocumentNode<Types.VulnerabilityReportsQuery, Types.VulnerabilityReportsQueryVariables>;
export const VulnerabilityReportDocument = /*#__PURE__*/ gql`
    query VulnerabilityReport($id: ID!) {
  vulnerabilityReport(id: $id) {
    ...VulnerabilityReport
  }
}
    ${VulnerabilityReportFragmentDoc}` as unknown as DocumentNode<Types.VulnerabilityReportQuery, Types.VulnerabilityReportQueryVariables>;
export const VulnerabilityStatisticsDocument = /*#__PURE__*/ gql`
    query VulnerabilityStatistics($clusters: [ID], $namespaces: [String], $q: String) {
  vulnerabilityStatistics(clusters: $clusters, namespaces: $namespaces, q: $q) {
    ...VulnerabilityStatistic
  }
}
    ${VulnerabilityStatisticFragmentDoc}` as unknown as DocumentNode<Types.VulnerabilityStatisticsQuery, Types.VulnerabilityStatisticsQueryVariables>;
export const ClusterVulnerabilityAggregateDocument = /*#__PURE__*/ gql`
    query ClusterVulnerabilityAggregate($grade: VulnReportGrade!) {
  clusterVulnerabilityAggregate(grade: $grade) {
    ...ClusterVulnAggregate
  }
}
    ${ClusterVulnAggregateFragmentDoc}` as unknown as DocumentNode<Types.ClusterVulnerabilityAggregateQuery, Types.ClusterVulnerabilityAggregateQueryVariables>;
export const WorkbenchesDocument = /*#__PURE__*/ gql`
    query Workbenches($first: Int = 100, $after: String, $q: String, $projectId: ID, $sort: WorkbenchSort, $direction: SortDirection, $favoriteIds: [ID]) {
  workbenches(
    first: $first
    after: $after
    q: $q
    projectId: $projectId
    sort: $sort
    direction: $direction
    favoriteIds: $favoriteIds
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...WorkbenchTiny
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchesQuery, Types.WorkbenchesQueryVariables>;
export const WorkbenchDashboardDocument = /*#__PURE__*/ gql`
    query WorkbenchDashboard {
  workbenchAggregates {
    pullRequests
    pullRequestMergeRate
    evalResults
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchDashboardQuery, Types.WorkbenchDashboardQueryVariables>;
export const WorkbenchesSummaryDocument = /*#__PURE__*/ gql`
    query WorkbenchesSummary($projectId: ID) {
  workbenchAggregates(projectId: $projectId) {
    pullRequests
    pullRequestMergeRate
    hoursSaved
    totalTokens
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchesSummaryQuery, Types.WorkbenchesSummaryQueryVariables>;
export const WorkbenchesEvalsMergeRateGraphDocument = /*#__PURE__*/ gql`
    query WorkbenchesEvalsMergeRateGraph($period: EvalResultsPeriod = WEEK) {
  workbenchPrMergeRates(period: $period) {
    timestamp
    mergeRate
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchesEvalsMergeRateGraphQuery, Types.WorkbenchesEvalsMergeRateGraphQueryVariables>;
export const WorkbenchesEvalsAvgGraphDocument = /*#__PURE__*/ gql`
    query WorkbenchesEvalsAvgGraph($period: EvalResultsPeriod = WEEK) {
  averageWorkbenchEvalResults(period: $period) {
    average
    workbench {
      id
      name
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchesEvalsAvgGraphQuery, Types.WorkbenchesEvalsAvgGraphQueryVariables>;
export const WorkbenchesEvalsAvgTimelineGraphDocument = /*#__PURE__*/ gql`
    query WorkbenchesEvalsAvgTimelineGraph($period: EvalResultsPeriod = WEEK) {
  averageWorkbenchEvalResults(period: $period) {
    timestamp
    average
    workbench {
      id
      name
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchesEvalsAvgTimelineGraphQuery, Types.WorkbenchesEvalsAvgTimelineGraphQueryVariables>;
export const WorkbenchesUsageDocument = /*#__PURE__*/ gql`
    query WorkbenchesUsage($period: EvalResultsPeriod = WEEK) {
  workbenchUsage(period: $period) {
    timestamp
    inputTokens
    outputTokens
    totalTokens
    totalCost
    workbench {
      id
      name
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchesUsageQuery, Types.WorkbenchesUsageQueryVariables>;
export const WorkbenchesAlertsDocument = /*#__PURE__*/ gql`
    query WorkbenchesAlerts($first: Int = 100, $after: String) {
  workbenchAlerts(first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Alert
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AlertFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchesAlertsQuery, Types.WorkbenchesAlertsQueryVariables>;
export const WorkbenchDocument = /*#__PURE__*/ gql`
    query Workbench($id: ID, $name: String) {
  workbench(id: $id, name: $name) {
    ...Workbench
  }
}
    ${WorkbenchFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchQuery, Types.WorkbenchQueryVariables>;
export const WorkbenchAccessibleUsersDocument = /*#__PURE__*/ gql`
    query WorkbenchAccessibleUsers($id: ID!) {
  workbench(id: $id) {
    id
    users {
      ...WorkbenchAccessibleUser
    }
  }
}
    ${WorkbenchAccessibleUserFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchAccessibleUsersQuery, Types.WorkbenchAccessibleUsersQueryVariables>;
export const WorkbenchEvalSettingsDocument = /*#__PURE__*/ gql`
    query WorkbenchEvalSettings($id: ID!) {
  workbench(id: $id) {
    id
    eval {
      id
      promptRules
      conclusionRules
      progressRules
      automation {
        enabled
        maxScore
        maxSkills
        instructions
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchEvalSettingsQuery, Types.WorkbenchEvalSettingsQueryVariables>;
export const WorkbenchJobsDocument = /*#__PURE__*/ gql`
    query WorkbenchJobs($id: ID!, $first: Int = 100, $after: String, $statuses: [WorkbenchJobStatus], $prStates: [WorkbenchJobPrState], $userIds: [ID], $direction: SortDirection, $withTotal: Boolean = false) {
  workbench(id: $id) {
    id
    runs(
      first: $first
      after: $after
      statuses: $statuses
      prStates: $prStates
      userIds: $userIds
      direction: $direction
    ) {
      totalCount @include(if: $withTotal)
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchJobTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchJobTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobsQuery, Types.WorkbenchJobsQueryVariables>;
export const WorkbenchJobCountsDocument = /*#__PURE__*/ gql`
    query WorkbenchJobCounts($id: ID!) {
  workbench(id: $id) {
    id
    runCounts {
      statuses {
        status
        count
      }
      pullRequests {
        state
        count
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobCountsQuery, Types.WorkbenchJobCountsQueryVariables>;
export const WorkbenchJobStatusCountsDocument = /*#__PURE__*/ gql`
    query WorkbenchJobStatusCounts($id: ID!, $q: String, $prStates: [WorkbenchJobPrState], $userIds: [ID], $insertedAfter: DateTime) {
  workbench(id: $id) {
    id
    runCounts(
      q: $q
      prStates: $prStates
      userIds: $userIds
      insertedAfter: $insertedAfter
    ) {
      statuses {
        status
        count
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobStatusCountsQuery, Types.WorkbenchJobStatusCountsQueryVariables>;
export const WorkbenchJobsForStatusDocument = /*#__PURE__*/ gql`
    query WorkbenchJobsForStatus($id: ID!, $status: WorkbenchJobStatus!, $q: String, $prStates: [WorkbenchJobPrState], $userIds: [ID], $direction: SortDirection, $insertedAfter: DateTime, $first: Int = 50, $after: String) {
  workbench(id: $id) {
    id
    runs(
      first: $first
      after: $after
      q: $q
      statuses: [$status]
      prStates: $prStates
      userIds: $userIds
      direction: $direction
      insertedAfter: $insertedAfter
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchJobTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchJobTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobsForStatusQuery, Types.WorkbenchJobsForStatusQueryVariables>;
export const WorkbenchJobSearchDocument = /*#__PURE__*/ gql`
    query WorkbenchJobSearch($workbenchId: ID!, $q: String!, $limit: Int, $statuses: [WorkbenchJobStatus], $prStates: [WorkbenchJobPrState], $userIds: [ID]) {
  workbenchJobSearch(
    workbenchId: $workbenchId
    q: $q
    limit: $limit
    statuses: $statuses
    prStates: $prStates
    userIds: $userIds
  ) {
    ...WorkbenchJobTiny
  }
}
    ${WorkbenchJobTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobSearchQuery, Types.WorkbenchJobSearchQueryVariables>;
export const WorkbenchEvalsDocument = /*#__PURE__*/ gql`
    query WorkbenchEvals($id: ID!, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    evalResults(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchEvalResultRow
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchEvalResultRowFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchEvalsQuery, Types.WorkbenchEvalsQueryVariables>;
export const RecentWorkbenchJobsDocument = /*#__PURE__*/ gql`
    query RecentWorkbenchJobs($count: Int) {
  recentWorkbenchJobs(count: $count) {
    ...WorkbenchJobTiny
  }
}
    ${WorkbenchJobTinyFragmentDoc}` as unknown as DocumentNode<Types.RecentWorkbenchJobsQuery, Types.RecentWorkbenchJobsQueryVariables>;
export const WorkbenchAlertCountsDocument = /*#__PURE__*/ gql`
    query WorkbenchAlertCounts($id: ID!) {
  workbench(id: $id) {
    id
    alertCounts {
      types {
        type
        count
      }
      severities {
        severity
        count
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchAlertCountsQuery, Types.WorkbenchAlertCountsQueryVariables>;
export const WorkbenchAlertsDocument = /*#__PURE__*/ gql`
    query WorkbenchAlerts($id: ID!, $first: Int = 100, $after: String, $q: String, $types: [ObservabilityWebhookType], $severities: [AlertSeverity], $sort: AlertSort, $direction: SortDirection) {
  workbench(id: $id) {
    id
    alerts(
      first: $first
      after: $after
      q: $q
      types: $types
      severities: $severities
      sort: $sort
      direction: $direction
    ) {
      totalCount
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchAlert
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchAlertFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchAlertsQuery, Types.WorkbenchAlertsQueryVariables>;
export const WorkbenchesIssuesDocument = /*#__PURE__*/ gql`
    query WorkbenchesIssues($first: Int = 100, $after: String) {
  workbenchIssues(first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...WorkbenchIssue
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchIssueFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchesIssuesQuery, Types.WorkbenchesIssuesQueryVariables>;
export const WorkbenchIssuesDocument = /*#__PURE__*/ gql`
    query WorkbenchIssues($id: ID!, $q: String, $providers: [IssueWebhookProvider], $statuses: [IssueStatus], $sort: IssueSort, $direction: SortDirection, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    issueCounts {
      providers {
        provider
        count
      }
      statuses {
        status
        count
      }
    }
    issues(
      q: $q
      providers: $providers
      statuses: $statuses
      sort: $sort
      direction: $direction
      first: $first
      after: $after
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchIssue
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchIssueFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchIssuesQuery, Types.WorkbenchIssuesQueryVariables>;
export const WorkbenchIssueStatusCountsDocument = /*#__PURE__*/ gql`
    query WorkbenchIssueStatusCounts($id: ID!, $q: String, $providers: [IssueWebhookProvider]) {
  workbench(id: $id) {
    id
    issueCounts(q: $q, providers: $providers) {
      statuses {
        status
        count
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchIssueStatusCountsQuery, Types.WorkbenchIssueStatusCountsQueryVariables>;
export const WorkbenchIssuesForStatusDocument = /*#__PURE__*/ gql`
    query WorkbenchIssuesForStatus($id: ID!, $status: IssueStatus!, $q: String, $providers: [IssueWebhookProvider], $sort: IssueSort, $direction: SortDirection, $first: Int = 50, $after: String) {
  workbench(id: $id) {
    id
    issues(
      q: $q
      providers: $providers
      statuses: [$status]
      sort: $sort
      direction: $direction
      first: $first
      after: $after
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchIssue
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchIssueFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchIssuesForStatusQuery, Types.WorkbenchIssuesForStatusQueryVariables>;
export const GetWorkbenchCronDocument = /*#__PURE__*/ gql`
    mutation GetWorkbenchCron($id: ID!) {
  workbenchCron(id: $id) {
    ...WorkbenchCron
  }
}
    ${WorkbenchCronFragmentDoc}` as unknown as DocumentNode<Types.GetWorkbenchCronMutation, Types.GetWorkbenchCronMutationVariables>;
export const WorkbenchCronsDocument = /*#__PURE__*/ gql`
    query WorkbenchCrons($id: ID!, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    crons(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchCron
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchCronFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchCronsQuery, Types.WorkbenchCronsQueryVariables>;
export const WorkbenchSkillsDocument = /*#__PURE__*/ gql`
    query WorkbenchSkills($id: ID!) {
  workbench(id: $id) {
    id
    allSkills {
      ...UnifiedWorkbenchSkillTiny
    }
  }
}
    ${UnifiedWorkbenchSkillTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchSkillsQuery, Types.WorkbenchSkillsQueryVariables>;
export const WorkbenchPromptsDocument = /*#__PURE__*/ gql`
    query WorkbenchPrompts($id: ID!, $first: Int = 500, $after: String) {
  workbench(id: $id) {
    id
    prompts(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchPrompt
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchPromptFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchPromptsQuery, Types.WorkbenchPromptsQueryVariables>;
export const WorkbenchWebhooksDocument = /*#__PURE__*/ gql`
    query WorkbenchWebhooks($id: ID!, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    webhooks(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchWebhook
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchWebhookFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchWebhooksQuery, Types.WorkbenchWebhooksQueryVariables>;
export const WorkbenchChatbotsDocument = /*#__PURE__*/ gql`
    query WorkbenchChatbots($id: ID!, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    chatbots(first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchChatbot
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchChatbotFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchChatbotsQuery, Types.WorkbenchChatbotsQueryVariables>;
export const WorkbenchChatbotDocument = /*#__PURE__*/ gql`
    query WorkbenchChatbot($id: ID!) {
  workbenchChatbot(id: $id) {
    ...WorkbenchChatbot
  }
}
    ${WorkbenchChatbotFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchChatbotQuery, Types.WorkbenchChatbotQueryVariables>;
export const SearchConversationsDocument = /*#__PURE__*/ gql`
    query SearchConversations($chatConnectionId: ID!, $query: String) {
  searchConversations(chatConnectionId: $chatConnectionId, query: $query) {
    id
    name
  }
}
    ` as unknown as DocumentNode<Types.SearchConversationsQuery, Types.SearchConversationsQueryVariables>;
export const ChatProviderConnectionsDocument = /*#__PURE__*/ gql`
    query ChatProviderConnections($first: Int = 100, $after: String, $q: String) {
  chatProviderConnections(first: $first, after: $after, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ChatProviderConnection
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ChatProviderConnectionFragmentDoc}` as unknown as DocumentNode<Types.ChatProviderConnectionsQuery, Types.ChatProviderConnectionsQueryVariables>;
export const ChatProviderConnectionDocument = /*#__PURE__*/ gql`
    query ChatProviderConnection($id: ID!) {
  chatProviderConnection(id: $id) {
    ...ChatProviderConnection
  }
}
    ${ChatProviderConnectionFragmentDoc}` as unknown as DocumentNode<Types.ChatProviderConnectionQuery, Types.ChatProviderConnectionQueryVariables>;
export const GetWorkbenchWebhookDocument = /*#__PURE__*/ gql`
    mutation GetWorkbenchWebhook($id: ID!) {
  getWorkbenchWebhook(id: $id) {
    ...WorkbenchWebhook
  }
}
    ${WorkbenchWebhookFragmentDoc}` as unknown as DocumentNode<Types.GetWorkbenchWebhookMutation, Types.GetWorkbenchWebhookMutationVariables>;
export const IssueWebhooksDocument = /*#__PURE__*/ gql`
    query IssueWebhooks($first: Int, $after: String) {
  issueWebhooks(first: $first, after: $after) {
    edges {
      node {
        ...IssueWebhook
      }
    }
    pageInfo {
      ...PageInfo
    }
  }
}
    ${IssueWebhookFragmentDoc}
${PageInfoFragmentDoc}` as unknown as DocumentNode<Types.IssueWebhooksQuery, Types.IssueWebhooksQueryVariables>;
export const IssueWebhookDocument = /*#__PURE__*/ gql`
    query IssueWebhook($id: ID, $name: String) {
  issueWebhook(id: $id, name: $name) {
    ...IssueWebhook
  }
}
    ${IssueWebhookFragmentDoc}` as unknown as DocumentNode<Types.IssueWebhookQuery, Types.IssueWebhookQueryVariables>;
export const WorkbenchTriggersSummaryDocument = /*#__PURE__*/ gql`
    query WorkbenchTriggersSummary($id: ID!) {
  workbench(id: $id) {
    id
    name
    description
    tools {
      ...WorkbenchToolTiny
    }
    crons(first: 30) {
      edges {
        node {
          id
          crontab
          prompt
          nextRunAt
        }
      }
    }
    webhooks(first: 30) {
      edges {
        node {
          id
          name
          prompt
          webhook {
            id
            name
            type
            url
          }
          issueWebhook {
            ...IssueWebhook
          }
        }
      }
    }
    chatbots(first: 30) {
      edges {
        node {
          id
          channel
          chatConnection {
            ...ChatProviderConnection
          }
        }
      }
    }
  }
}
    ${WorkbenchToolTinyFragmentDoc}
${IssueWebhookFragmentDoc}
${ChatProviderConnectionFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchTriggersSummaryQuery, Types.WorkbenchTriggersSummaryQueryVariables>;
export const WorkbenchJobDocument = /*#__PURE__*/ gql`
    query WorkbenchJob($id: ID!) {
  workbenchJob(id: $id) {
    ...WorkbenchJob
  }
}
    ${WorkbenchJobFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobQuery, Types.WorkbenchJobQueryVariables>;
export const WorkbenchJobMetricsSeriesToolDocument = /*#__PURE__*/ gql`
    query WorkbenchJobMetricsSeriesTool($id: ID!, $name: String, $arguments: Json) {
  workbenchJob(id: $id) {
    id
    metricsSeriesTool(name: $name, arguments: $arguments) {
      ...MetricSeries
    }
  }
}
    ${MetricSeriesFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobMetricsSeriesToolQuery, Types.WorkbenchJobMetricsSeriesToolQueryVariables>;
export const WorkbenchJobLogsToolDocument = /*#__PURE__*/ gql`
    query WorkbenchJobLogsTool($id: ID!, $name: String, $arguments: Json) {
  workbenchJob(id: $id) {
    id
    logsTool(name: $name, arguments: $arguments) {
      ...WorkbenchJobActivityLog
    }
  }
}
    ${WorkbenchJobActivityLogFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobLogsToolQuery, Types.WorkbenchJobLogsToolQueryVariables>;
export const WorkbenchJobTracesToolDocument = /*#__PURE__*/ gql`
    query WorkbenchJobTracesTool($id: ID!, $name: String, $arguments: Json) {
  workbenchJob(id: $id) {
    id
    tracesTool(name: $name, arguments: $arguments) {
      ...WorkbenchJobActivityTrace
    }
  }
}
    ${WorkbenchJobActivityTraceFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobTracesToolQuery, Types.WorkbenchJobTracesToolQueryVariables>;
export const WorkbenchJobActivitiesDocument = /*#__PURE__*/ gql`
    query WorkbenchJobActivities($id: ID!) {
  workbenchJob(id: $id) {
    id
    status
    prompt
    insertedAt
    attachments {
      ...Attachment
    }
    modes {
      ...WorkbenchJobModesFields
    }
    workbench {
      id
      agentRuntime {
        allowedRepositories
      }
      configuration {
        coding {
          repositories
        }
      }
    }
    referencedJob {
      id
      prompt
      status
      workbench {
        id
      }
      evalResult {
        id
        grade
      }
    }
    activities(first: 1000) {
      edges {
        node {
          ...WorkbenchJobActivity
        }
      }
    }
    queuedPrompts(first: 100) {
      edges {
        node {
          ...QueuedPromptTiny
        }
      }
    }
  }
}
    ${AttachmentFragmentDoc}
${WorkbenchJobModesFieldsFragmentDoc}
${WorkbenchJobActivityFragmentDoc}
${QueuedPromptTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActivitiesQuery, Types.WorkbenchJobActivitiesQueryVariables>;
export const WorkbenchJobActionSummaryDocument = /*#__PURE__*/ gql`
    query WorkbenchJobActionSummary($id: ID!, $first: Int = 1) {
  workbenchJob(id: $id) {
    id
    pendingActions: activities(first: $first, status: NEEDS_APPROVAL) {
      edges {
        node {
          id
        }
      }
    }
    functionActions: activities(first: $first, type: FUNCTION) {
      edges {
        node {
          id
        }
      }
    }
    kubernetesActions: activities(first: $first, type: KUBERNETES) {
      edges {
        node {
          id
        }
      }
    }
    execActions: activities(first: $first, type: EXEC) {
      edges {
        node {
          id
        }
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobActionSummaryQuery, Types.WorkbenchJobActionSummaryQueryVariables>;
export const WorkbenchJobActionsDocument = /*#__PURE__*/ gql`
    query WorkbenchJobActions($id: ID!) {
  workbenchJob(id: $id) {
    id
    functionActions: activities(first: 100, type: FUNCTION) {
      edges {
        node {
          ...WorkbenchJobAction
        }
      }
    }
    kubernetesActions: activities(first: 100, type: KUBERNETES) {
      edges {
        node {
          ...WorkbenchJobAction
        }
      }
    }
    execActions: activities(first: 100, type: EXEC) {
      edges {
        node {
          ...WorkbenchJobAction
        }
      }
    }
  }
}
    ${WorkbenchJobActionFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActionsQuery, Types.WorkbenchJobActionsQueryVariables>;
export const ApproveWorkbenchJobActivityDocument = /*#__PURE__*/ gql`
    mutation ApproveWorkbenchJobActivity($id: ID!) {
  approveWorkbenchJobActivity(id: $id) {
    ...WorkbenchJobAction
  }
}
    ${WorkbenchJobActionFragmentDoc}` as unknown as DocumentNode<Types.ApproveWorkbenchJobActivityMutation, Types.ApproveWorkbenchJobActivityMutationVariables>;
export const RejectWorkbenchJobActivityDocument = /*#__PURE__*/ gql`
    mutation RejectWorkbenchJobActivity($id: ID!, $reason: String) {
  rejectWorkbenchJobActivity(id: $id, reason: $reason) {
    ...WorkbenchJobAction
  }
}
    ${WorkbenchJobActionFragmentDoc}` as unknown as DocumentNode<Types.RejectWorkbenchJobActivityMutation, Types.RejectWorkbenchJobActivityMutationVariables>;
export const WorkbenchJobWhimseyTextDocument = /*#__PURE__*/ gql`
    query WorkbenchJobWhimseyText($id: ID!) {
  workbenchJob(id: $id) {
    id
    whimsey
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobWhimseyTextQuery, Types.WorkbenchJobWhimseyTextQueryVariables>;
export const WorkbenchJobActivityWhimseyTextDocument = /*#__PURE__*/ gql`
    query WorkbenchJobActivityWhimseyText($id: ID!) {
  workbenchJobActivity(id: $id) {
    id
    whimsey
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobActivityWhimseyTextQuery, Types.WorkbenchJobActivityWhimseyTextQueryVariables>;
export const WorkbenchJobActivityDocument = /*#__PURE__*/ gql`
    query WorkbenchJobActivity($id: ID!) {
  workbenchJobActivity(id: $id) {
    ...WorkbenchJobActivityWithThoughts
  }
}
    ${WorkbenchJobActivityWithThoughtsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActivityQuery, Types.WorkbenchJobActivityQueryVariables>;
export const WorkbenchJobKubeRequestDiffDocument = /*#__PURE__*/ gql`
    query WorkbenchJobKubeRequestDiff($id: ID!) {
  workbenchJobActivity(id: $id) {
    id
    result {
      kubeRequest {
        handle
        method
        path
        body
        contentType
        current
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchJobKubeRequestDiffQuery, Types.WorkbenchJobKubeRequestDiffQueryVariables>;
export const WorkbenchToolsDocument = /*#__PURE__*/ gql`
    query WorkbenchTools($first: Int = 100, $after: String, $q: String) {
  workbenchTools(first: $first, after: $after, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...WorkbenchToolTiny
        configuration {
          ...WorkbenchToolConfigurationFields
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchToolTinyFragmentDoc}
${WorkbenchToolConfigurationFieldsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchToolsQuery, Types.WorkbenchToolsQueryVariables>;
export const WorkbenchToolDocument = /*#__PURE__*/ gql`
    query WorkbenchTool($id: ID, $name: String) {
  workbenchTool(id: $id, name: $name) {
    ...WorkbenchTool
  }
}
    ${WorkbenchToolFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchToolQuery, Types.WorkbenchToolQueryVariables>;
export const CreateWorkbenchDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbench($attributes: WorkbenchAttributes!) {
  createWorkbench(attributes: $attributes) {
    ...Workbench
  }
}
    ${WorkbenchFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchMutation, Types.CreateWorkbenchMutationVariables>;
export const UpdateWorkbenchDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbench($id: ID!, $attributes: WorkbenchAttributes!) {
  updateWorkbench(id: $id, attributes: $attributes) {
    ...Workbench
  }
}
    ${WorkbenchFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchMutation, Types.UpdateWorkbenchMutationVariables>;
export const CreateWorkbenchSkillDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchSkill($workbenchId: ID!, $attributes: WorkbenchSkillAttributes!) {
  createWorkbenchSkill(workbenchId: $workbenchId, attributes: $attributes) {
    id
    name
    description
    contents
    subagents
  }
}
    ` as unknown as DocumentNode<Types.CreateWorkbenchSkillMutation, Types.CreateWorkbenchSkillMutationVariables>;
export const UpdateWorkbenchSkillDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchSkill($id: ID!, $attributes: WorkbenchSkillAttributes!) {
  updateWorkbenchSkill(id: $id, attributes: $attributes) {
    id
    name
    description
    contents
    subagents
  }
}
    ` as unknown as DocumentNode<Types.UpdateWorkbenchSkillMutation, Types.UpdateWorkbenchSkillMutationVariables>;
export const DeleteWorkbenchSkillDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchSkill($id: ID!) {
  deleteWorkbenchSkill(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchSkillMutation, Types.DeleteWorkbenchSkillMutationVariables>;
export const UpdateWorkbenchKnowledgeDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchKnowledge($id: ID!, $attributes: WorkbenchKnowledgeAttributes!) {
  updateWorkbenchKnowledge(id: $id, attributes: $attributes) {
    id
    name
    description
    knowledge
    labels
    usages
    lastUsedAt
  }
}
    ` as unknown as DocumentNode<Types.UpdateWorkbenchKnowledgeMutation, Types.UpdateWorkbenchKnowledgeMutationVariables>;
export const DeleteWorkbenchKnowledgeDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchKnowledge($id: ID!) {
  deleteWorkbenchKnowledge(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchKnowledgeMutation, Types.DeleteWorkbenchKnowledgeMutationVariables>;
export const CreateWorkbenchEvalDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchEval($workbenchId: ID!, $attributes: WorkbenchEvalAttributes!) {
  createWorkbenchEval(workbenchId: $workbenchId, attributes: $attributes) {
    id
    promptRules
    conclusionRules
    progressRules
    automation {
      enabled
      maxScore
      maxSkills
      instructions
    }
  }
}
    ` as unknown as DocumentNode<Types.CreateWorkbenchEvalMutation, Types.CreateWorkbenchEvalMutationVariables>;
export const UpdateWorkbenchEvalDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchEval($id: ID!, $attributes: WorkbenchEvalAttributes!) {
  updateWorkbenchEval(id: $id, attributes: $attributes) {
    id
    promptRules
    conclusionRules
    progressRules
    automation {
      enabled
      maxScore
      maxSkills
      instructions
    }
  }
}
    ` as unknown as DocumentNode<Types.UpdateWorkbenchEvalMutation, Types.UpdateWorkbenchEvalMutationVariables>;
export const DeleteWorkbenchEvalDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchEval($id: ID!) {
  deleteWorkbenchEval(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchEvalMutation, Types.DeleteWorkbenchEvalMutationVariables>;
export const WorkbenchEvalSkillDocument = /*#__PURE__*/ gql`
    mutation WorkbenchEvalSkill($id: ID!, $prompt: String) {
  workbenchEvalSkill(id: $id, prompt: $prompt) {
    ...WorkbenchJob
  }
}
    ${WorkbenchJobFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchEvalSkillMutation, Types.WorkbenchEvalSkillMutationVariables>;
export const DeleteWorkbenchDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbench($id: ID!) {
  deleteWorkbench(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchMutation, Types.DeleteWorkbenchMutationVariables>;
export const CreateWorkbenchToolDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchTool($attributes: WorkbenchToolAttributes!) {
  createWorkbenchTool(attributes: $attributes) {
    ...WorkbenchTool
  }
}
    ${WorkbenchToolFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchToolMutation, Types.CreateWorkbenchToolMutationVariables>;
export const UpdateWorkbenchToolDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchTool($id: ID!, $attributes: WorkbenchToolAttributes!) {
  updateWorkbenchTool(id: $id, attributes: $attributes) {
    ...WorkbenchTool
  }
}
    ${WorkbenchToolFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchToolMutation, Types.UpdateWorkbenchToolMutationVariables>;
export const DeleteWorkbenchToolDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchTool($id: ID!) {
  deleteWorkbenchTool(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchToolMutation, Types.DeleteWorkbenchToolMutationVariables>;
export const CreateWorkbenchJobDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchJob($workbenchId: ID!, $attributes: WorkbenchJobAttributes!) {
  createWorkbenchJob(workbenchId: $workbenchId, attributes: $attributes) {
    ...WorkbenchJob
  }
}
    ${WorkbenchJobFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchJobMutation, Types.CreateWorkbenchJobMutationVariables>;
export const CancelWorkbenchJobDocument = /*#__PURE__*/ gql`
    mutation CancelWorkbenchJob($jobId: ID!) {
  cancelWorkbenchJob(jobId: $jobId) {
    id
    status
  }
}
    ` as unknown as DocumentNode<Types.CancelWorkbenchJobMutation, Types.CancelWorkbenchJobMutationVariables>;
export const CreateWorkbenchMessageDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchMessage($jobId: ID!, $attributes: WorkbenchMessageAttributes!) {
  createWorkbenchMessage(jobId: $jobId, attributes: $attributes) {
    ...WorkbenchJobActivity
  }
}
    ${WorkbenchJobActivityFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchMessageMutation, Types.CreateWorkbenchMessageMutationVariables>;
export const CreateQueuedPromptDocument = /*#__PURE__*/ gql`
    mutation CreateQueuedPrompt($jobId: ID!, $attributes: QueuedPromptAttributes!) {
  createQueuedPrompt(jobId: $jobId, attributes: $attributes) {
    ...QueuedPromptTiny
  }
}
    ${QueuedPromptTinyFragmentDoc}` as unknown as DocumentNode<Types.CreateQueuedPromptMutation, Types.CreateQueuedPromptMutationVariables>;
export const DeleteQueuedPromptDocument = /*#__PURE__*/ gql`
    mutation DeleteQueuedPrompt($id: ID!) {
  deleteQueuedPrompt(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteQueuedPromptMutation, Types.DeleteQueuedPromptMutationVariables>;
export const CreateWorkbenchPromptDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchPrompt($workbenchId: ID!, $attributes: WorkbenchPromptAttributes!) {
  createWorkbenchPrompt(workbenchId: $workbenchId, attributes: $attributes) {
    ...WorkbenchPrompt
  }
}
    ${WorkbenchPromptFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchPromptMutation, Types.CreateWorkbenchPromptMutationVariables>;
export const UpdateWorkbenchPromptDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchPrompt($id: ID!, $attributes: WorkbenchPromptAttributes!) {
  updateWorkbenchPrompt(id: $id, attributes: $attributes) {
    ...WorkbenchPrompt
  }
}
    ${WorkbenchPromptFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchPromptMutation, Types.UpdateWorkbenchPromptMutationVariables>;
export const DeleteWorkbenchPromptDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchPrompt($id: ID!) {
  deleteWorkbenchPrompt(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchPromptMutation, Types.DeleteWorkbenchPromptMutationVariables>;
export const CreateWorkbenchCronDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchCron($workbenchId: ID!, $attributes: WorkbenchCronAttributes!) {
  createWorkbenchCron(workbenchId: $workbenchId, attributes: $attributes) {
    ...WorkbenchCron
  }
}
    ${WorkbenchCronFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchCronMutation, Types.CreateWorkbenchCronMutationVariables>;
export const UpdateWorkbenchCronDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchCron($id: ID!, $attributes: WorkbenchCronAttributes!) {
  updateWorkbenchCron(id: $id, attributes: $attributes) {
    ...WorkbenchCron
  }
}
    ${WorkbenchCronFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchCronMutation, Types.UpdateWorkbenchCronMutationVariables>;
export const DeleteWorkbenchCronDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchCron($id: ID!) {
  deleteWorkbenchCron(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchCronMutation, Types.DeleteWorkbenchCronMutationVariables>;
export const CreateWorkbenchWebhookDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchWebhook($workbenchId: ID!, $attributes: WorkbenchWebhookAttributes!) {
  createWorkbenchWebhook(workbenchId: $workbenchId, attributes: $attributes) {
    ...WorkbenchWebhook
  }
}
    ${WorkbenchWebhookFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchWebhookMutation, Types.CreateWorkbenchWebhookMutationVariables>;
export const UpdateWorkbenchWebhookDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchWebhook($id: ID!, $attributes: WorkbenchWebhookAttributes!) {
  updateWorkbenchWebhook(id: $id, attributes: $attributes) {
    ...WorkbenchWebhook
  }
}
    ${WorkbenchWebhookFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchWebhookMutation, Types.UpdateWorkbenchWebhookMutationVariables>;
export const DeleteWorkbenchWebhookDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchWebhook($id: ID!) {
  deleteWorkbenchWebhook(id: $id) {
    id
    name
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchWebhookMutation, Types.DeleteWorkbenchWebhookMutationVariables>;
export const CreateWorkbenchChatbotDocument = /*#__PURE__*/ gql`
    mutation CreateWorkbenchChatbot($workbenchId: ID!, $attributes: WorkbenchChatbotAttributes!) {
  createWorkbenchChatbot(workbenchId: $workbenchId, attributes: $attributes) {
    ...WorkbenchChatbot
  }
}
    ${WorkbenchChatbotFragmentDoc}` as unknown as DocumentNode<Types.CreateWorkbenchChatbotMutation, Types.CreateWorkbenchChatbotMutationVariables>;
export const UpdateWorkbenchChatbotDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchChatbot($id: ID!, $attributes: WorkbenchChatbotAttributes!) {
  updateWorkbenchChatbot(id: $id, attributes: $attributes) {
    ...WorkbenchChatbot
  }
}
    ${WorkbenchChatbotFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchChatbotMutation, Types.UpdateWorkbenchChatbotMutationVariables>;
export const DeleteWorkbenchChatbotDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchChatbot($id: ID!) {
  deleteWorkbenchChatbot(id: $id) {
    id
    channel
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchChatbotMutation, Types.DeleteWorkbenchChatbotMutationVariables>;
export const UpsertChatProviderConnectionDocument = /*#__PURE__*/ gql`
    mutation UpsertChatProviderConnection($attributes: ChatProviderConnectionAttributes!) {
  upsertChatProviderConnection(attributes: $attributes) {
    ...ChatProviderConnection
  }
}
    ${ChatProviderConnectionFragmentDoc}` as unknown as DocumentNode<Types.UpsertChatProviderConnectionMutation, Types.UpsertChatProviderConnectionMutationVariables>;
export const DeleteChatProviderConnectionDocument = /*#__PURE__*/ gql`
    mutation DeleteChatProviderConnection($id: ID!) {
  deleteChatProviderConnection(id: $id) {
    ...ChatProviderConnection
  }
}
    ${ChatProviderConnectionFragmentDoc}` as unknown as DocumentNode<Types.DeleteChatProviderConnectionMutation, Types.DeleteChatProviderConnectionMutationVariables>;
export const CreateIssueWebhookDocument = /*#__PURE__*/ gql`
    mutation CreateIssueWebhook($attributes: IssueWebhookAttributes!) {
  createIssueWebhook(attributes: $attributes) {
    ...IssueWebhook
  }
}
    ${IssueWebhookFragmentDoc}` as unknown as DocumentNode<Types.CreateIssueWebhookMutation, Types.CreateIssueWebhookMutationVariables>;
export const UpdateIssueWebhookDocument = /*#__PURE__*/ gql`
    mutation UpdateIssueWebhook($id: ID!, $attributes: IssueWebhookAttributes!) {
  updateIssueWebhook(id: $id, attributes: $attributes) {
    ...IssueWebhook
  }
}
    ${IssueWebhookFragmentDoc}` as unknown as DocumentNode<Types.UpdateIssueWebhookMutation, Types.UpdateIssueWebhookMutationVariables>;
export const DeleteIssueWebhookDocument = /*#__PURE__*/ gql`
    mutation DeleteIssueWebhook($id: ID!) {
  deleteIssueWebhook(id: $id) {
    ...IssueWebhook
  }
}
    ${IssueWebhookFragmentDoc}` as unknown as DocumentNode<Types.DeleteIssueWebhookMutation, Types.DeleteIssueWebhookMutationVariables>;
export const WorkbenchJobDeltaDocument = /*#__PURE__*/ gql`
    subscription WorkbenchJobDelta($id: ID, $workbenchId: ID) {
  workbenchJobDelta(id: $id, workbenchId: $workbenchId) {
    delta
    payload {
      ...WorkbenchJobTiny
      error
      result {
        ...WorkbenchJobResult
      }
    }
  }
}
    ${WorkbenchJobTinyFragmentDoc}
${WorkbenchJobResultFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobDeltaSubscription, Types.WorkbenchJobDeltaSubscriptionVariables>;
export const WorkbenchJobActivityDeltaDocument = /*#__PURE__*/ gql`
    subscription WorkbenchJobActivityDelta($jobId: ID!) {
  workbenchJobActivityDelta(jobId: $jobId) {
    delta
    payload {
      ...WorkbenchJobActivity
    }
  }
}
    ${WorkbenchJobActivityFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobActivityDeltaSubscription, Types.WorkbenchJobActivityDeltaSubscriptionVariables>;
export const WorkbenchJobThoughtDeltaDocument = /*#__PURE__*/ gql`
    subscription WorkbenchJobThoughtDelta($jobId: ID!) {
  workbenchJobThoughtDelta(jobId: $jobId) {
    delta
    payload {
      ...WorkbenchJobThought
    }
  }
}
    ${WorkbenchJobThoughtFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobThoughtDeltaSubscription, Types.WorkbenchJobThoughtDeltaSubscriptionVariables>;
export const WorkbenchJobProgressDocument = /*#__PURE__*/ gql`
    subscription WorkbenchJobProgress($jobId: ID!) {
  workbenchJobProgress(jobId: $jobId) {
    ...WorkbenchJobProgress
  }
}
    ${WorkbenchJobProgressFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchJobProgressSubscription, Types.WorkbenchJobProgressSubscriptionVariables>;
export const WorkbenchTextStreamDocument = /*#__PURE__*/ gql`
    subscription WorkbenchTextStream($jobId: ID!) {
  workbenchTextStream(jobId: $jobId) {
    ...WorkbenchTextStream
  }
}
    ${WorkbenchTextStreamFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchTextStreamSubscription, Types.WorkbenchTextStreamSubscriptionVariables>;
export const WorkbenchCanvasStreamDocument = /*#__PURE__*/ gql`
    subscription WorkbenchCanvasStream($jobId: ID!, $activityId: ID) {
  workbenchCanvasStream(jobId: $jobId, activityId: $activityId) {
    ...WorkbenchCanvasBlock
  }
}
    ${WorkbenchCanvasBlockFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchCanvasStreamSubscription, Types.WorkbenchCanvasStreamSubscriptionVariables>;
export const WorkbenchExecStreamDocument = /*#__PURE__*/ gql`
    subscription WorkbenchExecStream($activityId: ID!) {
  workbenchExecStream(activityId: $activityId) {
    activityId
    text
    seq
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchExecStreamSubscription, Types.WorkbenchExecStreamSubscriptionVariables>;
export const WorkbenchFilesDocument = /*#__PURE__*/ gql`
    query WorkbenchFiles($id: ID!, $path: String) {
  workbench(id: $id) {
    id
    files(path: $path) {
      ...WorkbenchFile
    }
  }
}
    ${WorkbenchFileFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchFilesQuery, Types.WorkbenchFilesQueryVariables>;
export const WorkbenchFileDocument = /*#__PURE__*/ gql`
    query WorkbenchFile($id: ID!, $path: String!) {
  workbench(id: $id) {
    id
    file(path: $path) {
      ...WorkbenchFile
      downloadUrl
    }
  }
}
    ${WorkbenchFileFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchFileQuery, Types.WorkbenchFileQueryVariables>;
export const WorkbenchFileContentsDocument = /*#__PURE__*/ gql`
    query WorkbenchFileContents($id: ID!, $path: String!) {
  workbench(id: $id) {
    id
    fileContents(path: $path)
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchFileContentsQuery, Types.WorkbenchFileContentsQueryVariables>;
export const DeleteWorkbenchFileDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchFile($workbenchId: ID!, $path: String!) {
  deleteWorkbenchFile(workbenchId: $workbenchId, path: $path) {
    ...WorkbenchFile
  }
}
    ${WorkbenchFileFragmentDoc}` as unknown as DocumentNode<Types.DeleteWorkbenchFileMutation, Types.DeleteWorkbenchFileMutationVariables>;
export const WorkbenchLinkCardDocument = /*#__PURE__*/ gql`
    query WorkbenchLinkCard($id: ID!) {
  workbench(id: $id) {
    ...WorkbenchLinkCard
  }
}
    ${WorkbenchLinkCardFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchLinkCardQuery, Types.WorkbenchLinkCardQueryVariables>;
export const WorkbenchLinkCardPendingAgentRunsDocument = /*#__PURE__*/ gql`
    query WorkbenchLinkCardPendingAgentRuns($first: Int = 100) {
  agentRuns(first: $first, status: PENDING_APPROVAL) {
    edges {
      node {
        id
        workbenchJob {
          workbench {
            id
          }
        }
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchLinkCardPendingAgentRunsQuery, Types.WorkbenchLinkCardPendingAgentRunsQueryVariables>;
export const WorkbenchDashboardDeltaDocument = /*#__PURE__*/ gql`
    subscription WorkbenchDashboardDelta($id: ID, $workbenchId: ID) {
  workbenchDashboardDelta(id: $id, workbenchId: $workbenchId) {
    delta
    payload {
      ...WorkbenchDashboardDetails
    }
  }
}
    ${WorkbenchDashboardDetailsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchDashboardDeltaSubscription, Types.WorkbenchDashboardDeltaSubscriptionVariables>;
export const WorkbenchMonitorDeltaDocument = /*#__PURE__*/ gql`
    subscription WorkbenchMonitorDelta($id: ID, $workbenchId: ID) {
  workbenchMonitorDelta(id: $id, workbenchId: $workbenchId) {
    delta
    payload {
      ...WorkbenchMonitorDetails
    }
  }
}
    ${WorkbenchMonitorDetailsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchMonitorDeltaSubscription, Types.WorkbenchMonitorDeltaSubscriptionVariables>;
export const WorkbenchDashboardsDocument = /*#__PURE__*/ gql`
    query WorkbenchDashboards($id: ID!, $q: String, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    workbenchDashboards(q: $q, first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchDashboardSummary
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchDashboardSummaryFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchDashboardsQuery, Types.WorkbenchDashboardsQueryVariables>;
export const WorkbenchMonitorsDocument = /*#__PURE__*/ gql`
    query WorkbenchMonitors($id: ID!, $q: String, $first: Int = 100, $after: String) {
  workbench(id: $id) {
    id
    monitors(q: $q, first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchMonitorSummary
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchMonitorSummaryFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchMonitorsQuery, Types.WorkbenchMonitorsQueryVariables>;
export const WorkbenchMonitoringDashboardDocument = /*#__PURE__*/ gql`
    query WorkbenchMonitoringDashboard($id: ID!) {
  workbenchDashboard(id: $id) {
    ...WorkbenchDashboardDetails
  }
}
    ${WorkbenchDashboardDetailsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchMonitoringDashboardQuery, Types.WorkbenchMonitoringDashboardQueryVariables>;
export const WorkbenchDashboardGraphDocument = /*#__PURE__*/ gql`
    query WorkbenchDashboardGraph($id: ID!, $identifier: String!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
  workbenchDashboard(id: $id) {
    id
    graph(identifier: $identifier, input: $input, timeRange: $timeRange) {
      series {
        ...MetricSeries
      }
      logs {
        ...WorkbenchJobActivityLog
      }
      traces {
        ...WorkbenchJobActivityTrace
      }
    }
  }
}
    ${MetricSeriesFragmentDoc}
${WorkbenchJobActivityLogFragmentDoc}
${WorkbenchJobActivityTraceFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchDashboardGraphQuery, Types.WorkbenchDashboardGraphQueryVariables>;
export const WorkbenchDashboardInputDocument = /*#__PURE__*/ gql`
    query WorkbenchDashboardInput($id: ID!, $identifier: String!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
  workbenchDashboard(id: $id) {
    id
    input(identifier: $identifier, input: $input, timeRange: $timeRange)
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchDashboardInputQuery, Types.WorkbenchDashboardInputQueryVariables>;
export const WorkbenchMonitorDocument = /*#__PURE__*/ gql`
    query WorkbenchMonitor($id: ID!) {
  monitor(id: $id) {
    ...WorkbenchMonitorDetails
  }
}
    ${WorkbenchMonitorDetailsFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchMonitorQuery, Types.WorkbenchMonitorQueryVariables>;
export const WorkbenchMonitorPreviewDocument = /*#__PURE__*/ gql`
    query WorkbenchMonitorPreview($id: ID!) {
  monitor(id: $id) {
    id
    preview {
      threshold
      metrics {
        timestamp
        value
      }
    }
  }
}
    ` as unknown as DocumentNode<Types.WorkbenchMonitorPreviewQuery, Types.WorkbenchMonitorPreviewQueryVariables>;
export const WorkbenchMonitorJobsDocument = /*#__PURE__*/ gql`
    query WorkbenchMonitorJobs($id: ID!, $monitorId: ID!, $first: Int = 20, $after: String) {
  workbench(id: $id) {
    id
    runs(monitorId: $monitorId, first: $first, after: $after) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...WorkbenchJobTiny
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${WorkbenchJobTinyFragmentDoc}` as unknown as DocumentNode<Types.WorkbenchMonitorJobsQuery, Types.WorkbenchMonitorJobsQueryVariables>;
export const DeleteWorkbenchDashboardDocument = /*#__PURE__*/ gql`
    mutation DeleteWorkbenchDashboard($id: ID!) {
  deleteDashboard(id: $id) {
    id
  }
}
    ` as unknown as DocumentNode<Types.DeleteWorkbenchDashboardMutation, Types.DeleteWorkbenchDashboardMutationVariables>;
export const ShareWorkbenchDashboardDocument = /*#__PURE__*/ gql`
    mutation ShareWorkbenchDashboard($id: ID!, $shared: Boolean!) {
  shareWorkbenchDashboard(id: $id, shared: $shared) {
    ...WorkbenchDashboardDetails
  }
}
    ${WorkbenchDashboardDetailsFragmentDoc}` as unknown as DocumentNode<Types.ShareWorkbenchDashboardMutation, Types.ShareWorkbenchDashboardMutationVariables>;
export const UpdateWorkbenchMonitorDocument = /*#__PURE__*/ gql`
    mutation UpdateWorkbenchMonitor($id: ID!, $attributes: MonitorAttributes!) {
  updateMonitor(id: $id, attributes: $attributes) {
    ...WorkbenchMonitorDetails
  }
}
    ${WorkbenchMonitorDetailsFragmentDoc}` as unknown as DocumentNode<Types.UpdateWorkbenchMonitorMutation, Types.UpdateWorkbenchMonitorMutationVariables>;