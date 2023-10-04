/* eslint-disable */
/* prettier-ignore */
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string | number; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * The `DateTime` scalar type represents a date and time in the UTC
   * timezone. The DateTime appears in a JSON response as an ISO8601 formatted
   * string, including UTC timezone ("Z"). The parsed date and time string will
   * be converted to UTC if there is an offset.
   */
  DateTime: { input: string; output: string; }
  Long: { input: any; output: any; }
  Map: { input: Map<string, unknown>; output: Map<string, unknown>; }
};

export type AccessToken = {
  __typename?: 'AccessToken';
  audits?: Maybe<AccessTokenAuditConnection>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  token?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type AccessTokenAuditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type AccessTokenAudit = {
  __typename?: 'AccessTokenAudit';
  city?: Maybe<Scalars['String']['output']>;
  count?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type AccessTokenAuditConnection = {
  __typename?: 'AccessTokenAuditConnection';
  edges?: Maybe<Array<Maybe<AccessTokenAuditEdge>>>;
  pageInfo: PageInfo;
};

export type AccessTokenAuditEdge = {
  __typename?: 'AccessTokenAuditEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<AccessTokenAudit>;
};

export type AccessTokenConnection = {
  __typename?: 'AccessTokenConnection';
  edges?: Maybe<Array<Maybe<AccessTokenEdge>>>;
  pageInfo: PageInfo;
};

export type AccessTokenEdge = {
  __typename?: 'AccessTokenEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<AccessToken>;
};

export type Account = {
  __typename?: 'Account';
  availableFeatures?: Maybe<AvailableFeatures>;
  delinquentAt?: Maybe<Scalars['DateTime']['output']>;
  grandfatheredUntil?: Maybe<Scalars['DateTime']['output']>;
  subscription?: Maybe<PluralSubscription>;
};

/** a representation of a kubernetes api deprecation */
export type ApiDeprecation = {
  __typename?: 'ApiDeprecation';
  /** the kubernetes version the replacement api was created in */
  availableIn?: Maybe<Scalars['String']['output']>;
  /** whether you cannot safely upgrade to the next kubernetes version if this deprecation exists */
  blocking?: Maybe<Scalars['Boolean']['output']>;
  /** the component of this deprecation */
  component?: Maybe<ServiceComponent>;
  /** the kubernetes version the deprecation was posted */
  deprecatedIn?: Maybe<Scalars['String']['output']>;
  /** the kubernetes version the api version will be removed and unusable in */
  removedIn?: Maybe<Scalars['String']['output']>;
  /** the api you can replace this resource with */
  replacement?: Maybe<Scalars['String']['output']>;
};

export type Application = {
  __typename?: 'Application';
  configuration?: Maybe<Configuration>;
  cost?: Maybe<CostAnalysis>;
  info?: Maybe<Scalars['String']['output']>;
  license?: Maybe<License>;
  name: Scalars['String']['output'];
  spec: ApplicationSpec;
  status: ApplicationStatus;
};

export type ApplicationDelta = {
  __typename?: 'ApplicationDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Application>;
};

export type ApplicationDescriptor = {
  __typename?: 'ApplicationDescriptor';
  description?: Maybe<Scalars['String']['output']>;
  icons?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  links?: Maybe<Array<Maybe<ApplicationLink>>>;
  type: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type ApplicationInfoItem = {
  __typename?: 'ApplicationInfoItem';
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type ApplicationLink = {
  __typename?: 'ApplicationLink';
  description?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type ApplicationSpec = {
  __typename?: 'ApplicationSpec';
  components?: Maybe<Array<Maybe<Component>>>;
  descriptor: ApplicationDescriptor;
  info?: Maybe<Array<Maybe<ApplicationInfoItem>>>;
};

export type ApplicationStatus = {
  __typename?: 'ApplicationStatus';
  components?: Maybe<Array<Maybe<StatusComponent>>>;
  componentsReady: Scalars['String']['output'];
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
};

export type Audit = {
  __typename?: 'Audit';
  action: AuditAction;
  actor?: Maybe<User>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Scalars['String']['output']>;
  type: AuditType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export enum AuditAction {
  Approve = 'APPROVE',
  Cancel = 'CANCEL',
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type AuditConnection = {
  __typename?: 'AuditConnection';
  edges?: Maybe<Array<Maybe<AuditEdge>>>;
  pageInfo: PageInfo;
};

export type AuditEdge = {
  __typename?: 'AuditEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Audit>;
};

export type AuditMetric = {
  __typename?: 'AuditMetric';
  count?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Scalars['String']['output']>;
};

export enum AuditType {
  Build = 'BUILD',
  Cluster = 'CLUSTER',
  ClusterProvider = 'CLUSTER_PROVIDER',
  Configuration = 'CONFIGURATION',
  DeploymentSettings = 'DEPLOYMENT_SETTINGS',
  GitRepository = 'GIT_REPOSITORY',
  Group = 'GROUP',
  GroupMember = 'GROUP_MEMBER',
  Pod = 'POD',
  Policy = 'POLICY',
  Role = 'ROLE',
  Service = 'SERVICE',
  TempToken = 'TEMP_TOKEN',
  User = 'USER'
}

export enum AuthMethod {
  Basic = 'BASIC',
  Ssh = 'SSH'
}

export enum AutoscalingTarget {
  Deployment = 'DEPLOYMENT',
  Statefulset = 'STATEFULSET'
}

export type AvailableFeatures = {
  __typename?: 'AvailableFeatures';
  audits?: Maybe<Scalars['Boolean']['output']>;
  databaseManagement?: Maybe<Scalars['Boolean']['output']>;
  userManagement?: Maybe<Scalars['Boolean']['output']>;
  vpn?: Maybe<Scalars['Boolean']['output']>;
};

/** aws node customizations */
export type AwsCloud = {
  __typename?: 'AwsCloud';
  /** custom launch template for your nodes, useful for Golden AMI setups */
  launchTemplateId?: Maybe<Scalars['String']['output']>;
};

export type AwsCloudAttributes = {
  launchTemplateId?: InputMaybe<Scalars['String']['input']>;
};

export type AwsSettingsAttributes = {
  accessKeyId: Scalars['String']['input'];
  secretAccessKey: Scalars['String']['input'];
};

export type BindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Build = {
  __typename?: 'Build';
  approver?: Maybe<User>;
  changelogs?: Maybe<Array<Maybe<Changelog>>>;
  commands?: Maybe<CommandConnection>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  repository: Scalars['String']['output'];
  sha?: Maybe<Scalars['String']['output']>;
  status: Status;
  type: BuildType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type BuildCommandsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type BuildAttributes = {
  message?: InputMaybe<Scalars['String']['input']>;
  repository: Scalars['String']['input'];
  type?: InputMaybe<BuildType>;
};

export type BuildConnection = {
  __typename?: 'BuildConnection';
  edges?: Maybe<Array<Maybe<BuildEdge>>>;
  pageInfo: PageInfo;
};

export type BuildDelta = {
  __typename?: 'BuildDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Build>;
};

export type BuildEdge = {
  __typename?: 'BuildEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Build>;
};

export type BuildInfo = {
  __typename?: 'BuildInfo';
  all?: Maybe<Scalars['Int']['output']>;
  failed?: Maybe<Scalars['Int']['output']>;
  queued?: Maybe<Scalars['Int']['output']>;
  running?: Maybe<Scalars['Int']['output']>;
  successful?: Maybe<Scalars['Int']['output']>;
};

export enum BuildType {
  Approval = 'APPROVAL',
  Bounce = 'BOUNCE',
  Config = 'CONFIG',
  Dedicated = 'DEDICATED',
  Deploy = 'DEPLOY',
  Destroy = 'DESTROY',
  Install = 'INSTALL'
}

export type Certificate = {
  __typename?: 'Certificate';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: CertificateSpec;
  status: CertificateStatus;
};

export type CertificateSpec = {
  __typename?: 'CertificateSpec';
  dnsNames?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  issuerRef?: Maybe<IssuerRef>;
  secretName: Scalars['String']['output'];
};

export type CertificateStatus = {
  __typename?: 'CertificateStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  notAfter?: Maybe<Scalars['String']['output']>;
  notBefore?: Maybe<Scalars['String']['output']>;
  renewalTime?: Maybe<Scalars['String']['output']>;
};

export type Changelog = {
  __typename?: 'Changelog';
  content?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  repo: Scalars['String']['output'];
  tool: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CloneAttributes = {
  s3AccessKeyId?: InputMaybe<Scalars['String']['input']>;
  s3Endpoint?: InputMaybe<Scalars['String']['input']>;
  s3SecretAccessKey?: InputMaybe<Scalars['String']['input']>;
  s3WalPath?: InputMaybe<Scalars['String']['input']>;
  uid?: InputMaybe<Scalars['String']['input']>;
};

export type CloudProviderSettingsAttributes = {
  aws?: InputMaybe<AwsSettingsAttributes>;
  gcp?: InputMaybe<GcpSettingsAttributes>;
};

/** cloud specific settings for a node pool */
export type CloudSettings = {
  __typename?: 'CloudSettings';
  aws?: Maybe<AwsCloud>;
};

export type CloudSettingsAttributes = {
  aws?: InputMaybe<AwsCloudAttributes>;
};

/** a representation of a cluster you can deploy to */
export type Cluster = {
  __typename?: 'Cluster';
  /** all api deprecations for all services in this cluster */
  apiDeprecations?: Maybe<Array<Maybe<ApiDeprecation>>>;
  /** current k8s version as told to us by the deployment operator */
  currentVersion?: Maybe<Scalars['String']['output']>;
  /** when this cluster was scheduled for deletion */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a auth token to be used by the deploy operator, only readable on create */
  deployToken?: Maybe<Scalars['String']['output']>;
  /** whether the current user can edit this cluster */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: Maybe<Scalars['String']['output']>;
  /** internal id of this cluster */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** human readable name of this cluster, will also translate to cloud k8s name */
  name: Scalars['String']['output'];
  /** list of node pool specs managed by CAPI */
  nodePools?: Maybe<Array<Maybe<NodePool>>>;
  /** last time the deploy operator pinged this cluster */
  pingedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the provider we use to create this cluster (null if BYOK) */
  provider?: Maybe<ClusterProvider>;
  /** read policy for this cluster */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** a relay connection of all revisions of this service, these are periodically pruned up to a history limit */
  revisions?: Maybe<RevisionConnection>;
  /** whether this is the management cluster itself */
  self?: Maybe<Scalars['Boolean']['output']>;
  /** the service used to deploy the CAPI resources of this cluster */
  service?: Maybe<ServiceDeployment>;
  /** key/value tags to filter clusters */
  tags?: Maybe<Array<Maybe<Tag>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** desired k8s version for the cluster */
  version?: Maybe<Scalars['String']['output']>;
  /** write policy for this cluster */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};


/** a representation of a cluster you can deploy to */
export type ClusterRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ClusterAttributes = {
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: InputMaybe<Scalars['String']['input']>;
  kubeconfig?: InputMaybe<KubeconfigAttributes>;
  name: Scalars['String']['input'];
  nodePools?: InputMaybe<Array<InputMaybe<NodePoolAttributes>>>;
  providerId?: InputMaybe<Scalars['ID']['input']>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  version: Scalars['String']['input'];
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type ClusterConnection = {
  __typename?: 'ClusterConnection';
  edges?: Maybe<Array<Maybe<ClusterEdge>>>;
  pageInfo: PageInfo;
};

export type ClusterEdge = {
  __typename?: 'ClusterEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Cluster>;
};

export type ClusterInfo = {
  __typename?: 'ClusterInfo';
  gitCommit?: Maybe<Scalars['String']['output']>;
  gitVersion?: Maybe<Scalars['String']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type ClusterPing = {
  currentVersion: Scalars['String']['input'];
};

/** a CAPI provider for a cluster, cloud is inferred from name if not provided manually */
export type ClusterProvider = {
  __typename?: 'ClusterProvider';
  /** the name of the cloud service for this provider */
  cloud: Scalars['String']['output'];
  /** whether the current user can edit this resource */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** the details of how cluster manifests will be synced from git when created with this provider */
  git: GitRef;
  /** the id of this provider */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a human readable name for the provider, globally unique */
  name: Scalars['String']['output'];
  /** the namespace the CAPI resources are deployed into */
  namespace: Scalars['String']['output'];
  /** the repository used to serve cluster manifests */
  repository?: Maybe<GitRepository>;
  /** the service of the CAPI controller itself */
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ClusterProviderAttributes = {
  cloud?: InputMaybe<Scalars['String']['input']>;
  cloudSettings?: InputMaybe<CloudProviderSettingsAttributes>;
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

export type ClusterProviderConnection = {
  __typename?: 'ClusterProviderConnection';
  edges?: Maybe<Array<Maybe<ClusterProviderEdge>>>;
  pageInfo: PageInfo;
};

export type ClusterProviderEdge = {
  __typename?: 'ClusterProviderEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ClusterProvider>;
};

export type ClusterProviderUpdateAttributes = {
  cloudSettings?: InputMaybe<CloudProviderSettingsAttributes>;
};

export type ClusterUpdateAttributes = {
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: InputMaybe<Scalars['String']['input']>;
  nodePools?: InputMaybe<Array<InputMaybe<NodePoolAttributes>>>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  version: Scalars['String']['input'];
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type Command = {
  __typename?: 'Command';
  build?: Maybe<Build>;
  command: Scalars['String']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  exitCode?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  stdout?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CommandConnection = {
  __typename?: 'CommandConnection';
  edges?: Maybe<Array<Maybe<CommandEdge>>>;
  pageInfo: PageInfo;
};

export type CommandDelta = {
  __typename?: 'CommandDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Command>;
};

export type CommandEdge = {
  __typename?: 'CommandEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Command>;
};

export type Component = {
  __typename?: 'Component';
  group: Scalars['String']['output'];
  kind: Scalars['String']['output'];
};

export type ComponentAttributes = {
  group: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  state?: InputMaybe<ComponentState>;
  synced: Scalars['Boolean']['input'];
  version: Scalars['String']['input'];
};

export enum ComponentState {
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING'
}

export type ConfigAttributes = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type ConfigMap = {
  __typename?: 'ConfigMap';
  data: Scalars['Map']['output'];
  metadata: Metadata;
  raw: Scalars['String']['output'];
};

export type Configuration = {
  __typename?: 'Configuration';
  helm?: Maybe<Scalars['String']['output']>;
  terraform?: Maybe<Scalars['String']['output']>;
};

export type ConfigurationAction = {
  __typename?: 'ConfigurationAction';
  updates?: Maybe<Array<Maybe<PathUpdate>>>;
};

export type ConfigurationCondition = {
  __typename?: 'ConfigurationCondition';
  field?: Maybe<Scalars['String']['output']>;
  operation?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type ConfigurationItem = {
  __typename?: 'ConfigurationItem';
  condition?: Maybe<ConfigurationCondition>;
  default?: Maybe<Scalars['String']['output']>;
  documentation?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  optional?: Maybe<Scalars['Boolean']['output']>;
  placeholder?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  validation?: Maybe<ConfigurationValidation>;
};

export type ConfigurationOverlay = {
  __typename?: 'ConfigurationOverlay';
  metadata: Metadata;
  spec: ConfigurationOverlaySpec;
};

export type ConfigurationOverlaySpec = {
  __typename?: 'ConfigurationOverlaySpec';
  documentation?: Maybe<Scalars['String']['output']>;
  folder?: Maybe<Scalars['String']['output']>;
  inputType?: Maybe<Scalars['String']['output']>;
  inputValues?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  name?: Maybe<Scalars['String']['output']>;
  subfolder?: Maybe<Scalars['String']['output']>;
  updates?: Maybe<Array<Maybe<OverlayUpdate>>>;
};

export type ConfigurationValidation = {
  __typename?: 'ConfigurationValidation';
  message?: Maybe<Scalars['String']['output']>;
  regex?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type ConsoleConfiguration = {
  __typename?: 'ConsoleConfiguration';
  features?: Maybe<AvailableFeatures>;
  gitCommit?: Maybe<Scalars['String']['output']>;
  gitStatus?: Maybe<GitStatus>;
  isDemoProject?: Maybe<Scalars['Boolean']['output']>;
  isSandbox?: Maybe<Scalars['Boolean']['output']>;
  manifest?: Maybe<PluralManifest>;
  pluralLogin?: Maybe<Scalars['Boolean']['output']>;
  vpnEnabled?: Maybe<Scalars['Boolean']['output']>;
};

export type Container = {
  __typename?: 'Container';
  image?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  ports?: Maybe<Array<Maybe<Port>>>;
  resources?: Maybe<Resources>;
};

export type ContainerRecommendation = {
  __typename?: 'ContainerRecommendation';
  containerName?: Maybe<Scalars['String']['output']>;
  lowerBound?: Maybe<ContainerResources>;
  name?: Maybe<Scalars['String']['output']>;
  target?: Maybe<ContainerResources>;
  uncappedTarget?: Maybe<ContainerResources>;
  upperBound?: Maybe<ContainerResources>;
};

export type ContainerResources = {
  __typename?: 'ContainerResources';
  cpu?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<Scalars['String']['output']>;
};

export type ContainerState = {
  __typename?: 'ContainerState';
  running?: Maybe<RunningState>;
  terminated?: Maybe<TerminatedState>;
  waiting?: Maybe<WaitingState>;
};

export type ContainerStatus = {
  __typename?: 'ContainerStatus';
  image?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  ready?: Maybe<Scalars['Boolean']['output']>;
  restartCount?: Maybe<Scalars['Int']['output']>;
  state?: Maybe<ContainerState>;
};

export type ContextAttributes = {
  buckets?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  configuration: Scalars['Map']['input'];
  domain?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  protect?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type CostAnalysis = {
  __typename?: 'CostAnalysis';
  cpuCost?: Maybe<Scalars['Float']['output']>;
  cpuEfficiency?: Maybe<Scalars['Float']['output']>;
  efficiency?: Maybe<Scalars['Float']['output']>;
  gpuCost?: Maybe<Scalars['Float']['output']>;
  minutes?: Maybe<Scalars['Float']['output']>;
  networkCost?: Maybe<Scalars['Float']['output']>;
  pvCost?: Maybe<Scalars['Float']['output']>;
  ramCost?: Maybe<Scalars['Float']['output']>;
  ramEfficiency?: Maybe<Scalars['Float']['output']>;
  sharedCost?: Maybe<Scalars['Float']['output']>;
  totalCost?: Maybe<Scalars['Float']['output']>;
};

export type CronJob = {
  __typename?: 'CronJob';
  events?: Maybe<Array<Maybe<Event>>>;
  jobs?: Maybe<Array<Maybe<Job>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: CronSpec;
  status: CronStatus;
};

export type CronSpec = {
  __typename?: 'CronSpec';
  concurrencyPolicy?: Maybe<Scalars['String']['output']>;
  schedule: Scalars['String']['output'];
  suspend?: Maybe<Scalars['Boolean']['output']>;
};

export type CronStatus = {
  __typename?: 'CronStatus';
  active?: Maybe<Array<Maybe<JobReference>>>;
  lastScheduleTime?: Maybe<Scalars['String']['output']>;
};

export type CrossVersionResourceTarget = {
  __typename?: 'CrossVersionResourceTarget';
  apiVersion?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type Dashboard = {
  __typename?: 'Dashboard';
  id: Scalars['String']['output'];
  spec: DashboardSpec;
};

export type DashboardGraph = {
  __typename?: 'DashboardGraph';
  format?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  queries?: Maybe<Array<Maybe<DashboardMetric>>>;
};

export type DashboardLabel = {
  __typename?: 'DashboardLabel';
  name: Scalars['String']['output'];
  values?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type DashboardMetric = {
  __typename?: 'DashboardMetric';
  legend?: Maybe<Scalars['String']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  results?: Maybe<Array<Maybe<MetricResult>>>;
};

export type DashboardSpec = {
  __typename?: 'DashboardSpec';
  description?: Maybe<Scalars['String']['output']>;
  graphs?: Maybe<Array<Maybe<DashboardGraph>>>;
  labels?: Maybe<Array<Maybe<DashboardLabel>>>;
  name?: Maybe<Scalars['String']['output']>;
  timeslices?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type DatabaseVolume = {
  __typename?: 'DatabaseVolume';
  size?: Maybe<Scalars['String']['output']>;
};

export enum Delta {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type Deployment = {
  __typename?: 'Deployment';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: DeploymentSpec;
  status: DeploymentStatus;
};

/** global settings for CD, these specify global read/write policies and also allow for customization of the repos for CAPI resources and the deploy operator */
export type DeploymentSettings = {
  __typename?: 'DeploymentSettings';
  /** the repo to fetch CAPI manifests from, for both providers and clusters */
  artifactRepository?: Maybe<GitRepository>;
  /** policy for creation of new clusters */
  createBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** the repo to fetch the deploy operators manifests from */
  deployerRepository?: Maybe<GitRepository>;
  /** whether you've yet to enable CD for this instance */
  enabled: Scalars['Boolean']['output'];
  /** policy for managing git repos */
  gitBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  /** read policy across all clusters */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** write policy across all clusters */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};

export type DeploymentSettingsAttributes = {
  artifactRepositoryId?: InputMaybe<Scalars['ID']['input']>;
  createBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  deployerRepositoryId?: InputMaybe<Scalars['ID']['input']>;
  gitBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type DeploymentSpec = {
  __typename?: 'DeploymentSpec';
  replicas?: Maybe<Scalars['Int']['output']>;
  strategy?: Maybe<DeploymentStrategy>;
};

export type DeploymentStatus = {
  __typename?: 'DeploymentStatus';
  availableReplicas?: Maybe<Scalars['Int']['output']>;
  readyReplicas?: Maybe<Scalars['Int']['output']>;
  replicas?: Maybe<Scalars['Int']['output']>;
  unavailableReplicas?: Maybe<Scalars['Int']['output']>;
};

export type DeploymentStrategy = {
  __typename?: 'DeploymentStrategy';
  rollingUpdate?: Maybe<RollingUpdate>;
  type?: Maybe<Scalars['String']['output']>;
};

/** specification for ignoring diffs for subfields of manifests, to avoid admission controllers and other mutations */
export type DiffNormalizer = {
  __typename?: 'DiffNormalizer';
  group: Scalars['String']['output'];
  jsonPatches?: Maybe<Array<Scalars['String']['output']>>;
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
};

export type DiffNormalizerAttributes = {
  group: Scalars['String']['input'];
  jsonPatches?: InputMaybe<Array<Scalars['String']['input']>>;
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

export type Event = {
  __typename?: 'Event';
  action?: Maybe<Scalars['String']['output']>;
  count?: Maybe<Scalars['Int']['output']>;
  eventTime?: Maybe<Scalars['String']['output']>;
  lastTimestamp?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type FileContent = {
  __typename?: 'FileContent';
  content?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

export type GcpSettingsAttributes = {
  applicationCredentials: Scalars['String']['input'];
};

export type GitAttributes = {
  /** a passphrase to decrypt the given private key */
  passphrase?: InputMaybe<Scalars['String']['input']>;
  /** the http password for http authenticated repos */
  password?: InputMaybe<Scalars['String']['input']>;
  /** an ssh private key to use with this repo if an ssh url was given */
  privateKey?: InputMaybe<Scalars['String']['input']>;
  /** the url of this repository */
  url: Scalars['String']['input'];
  /** the http username for authenticated http repos, defaults to apiKey for github */
  username?: InputMaybe<Scalars['String']['input']>;
};

/** a file fetched from a git repository, eg a docs .md file */
export type GitFile = {
  __typename?: 'GitFile';
  content: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export enum GitHealth {
  Failed = 'FAILED',
  Pullable = 'PULLABLE'
}

/** a representation of where to pull manifests from git */
export type GitRef = {
  __typename?: 'GitRef';
  /** the folder manifests live under */
  folder: Scalars['String']['output'];
  /** a general git ref, either a branch name or commit sha understandable by `git checkout <ref>` */
  ref: Scalars['String']['output'];
};

export type GitRefAttributes = {
  folder: Scalars['String']['input'];
  ref: Scalars['String']['input'];
};

/** a git repository available for deployments */
export type GitRepository = {
  __typename?: 'GitRepository';
  /** whether its a http or ssh url */
  authMethod?: Maybe<AuthMethod>;
  /** whether the current user can edit this repo */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** the error message if there were any pull errors */
  error?: Maybe<Scalars['String']['output']>;
  /** whether we can currently pull this repo with the provided credentials */
  health?: Maybe<GitHealth>;
  /** internal id of this repository */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last successsful git pull timestamp */
  pulledAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the git url of the repository, either https or ssh supported */
  url: Scalars['String']['output'];
};

export type GitRepositoryConnection = {
  __typename?: 'GitRepositoryConnection';
  edges?: Maybe<Array<Maybe<GitRepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type GitRepositoryEdge = {
  __typename?: 'GitRepositoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<GitRepository>;
};

export type GitStatus = {
  __typename?: 'GitStatus';
  cloned?: Maybe<Scalars['Boolean']['output']>;
  output?: Maybe<Scalars['String']['output']>;
};

/** a rules based mechanism to redeploy a service across a fleet of clusters */
export type GlobalService = {
  __typename?: 'GlobalService';
  /** internal id of this global service */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a human readable name for this global service */
  name: Scalars['String']['output'];
  /** whether to only apply to clusters with this provider */
  provider?: Maybe<ClusterProvider>;
  /** the service to replicate across clusters */
  service?: Maybe<ServiceDeployment>;
  /** a set of tags to select clusters for this global service */
  tags?: Maybe<Array<Maybe<Tag>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type GlobalServiceAttributes = {
  name: Scalars['String']['input'];
  providerId?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
};

export type Group = {
  __typename?: 'Group';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type GroupAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type GroupConnection = {
  __typename?: 'GroupConnection';
  edges?: Maybe<Array<Maybe<GroupEdge>>>;
  pageInfo: PageInfo;
};

export type GroupEdge = {
  __typename?: 'GroupEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Group>;
};

export type GroupMember = {
  __typename?: 'GroupMember';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type GroupMemberConnection = {
  __typename?: 'GroupMemberConnection';
  edges?: Maybe<Array<Maybe<GroupMemberEdge>>>;
  pageInfo: PageInfo;
};

export type GroupMemberEdge = {
  __typename?: 'GroupMemberEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<GroupMember>;
};

export type HttpIngressRule = {
  __typename?: 'HttpIngressRule';
  paths?: Maybe<Array<Maybe<IngressPath>>>;
};

export type Ingress = {
  __typename?: 'Ingress';
  certificates?: Maybe<Array<Maybe<Certificate>>>;
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: IngressSpec;
  status: ServiceStatus;
};

export type IngressBackend = {
  __typename?: 'IngressBackend';
  serviceName?: Maybe<Scalars['String']['output']>;
  servicePort?: Maybe<Scalars['String']['output']>;
};

export type IngressPath = {
  __typename?: 'IngressPath';
  backend?: Maybe<IngressBackend>;
  path?: Maybe<Scalars['String']['output']>;
};

export type IngressRule = {
  __typename?: 'IngressRule';
  host?: Maybe<Scalars['String']['output']>;
  http?: Maybe<HttpIngressRule>;
};

export type IngressSpec = {
  __typename?: 'IngressSpec';
  rules?: Maybe<Array<Maybe<IngressRule>>>;
  tls?: Maybe<Array<Maybe<IngressTls>>>;
};

export type IngressTls = {
  __typename?: 'IngressTls';
  hosts?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Installation = {
  __typename?: 'Installation';
  id: Scalars['ID']['output'];
  repository?: Maybe<Repository>;
};

export type InstallationConnection = {
  __typename?: 'InstallationConnection';
  edges?: Maybe<Array<Maybe<InstallationEdge>>>;
  pageInfo: PageInfo;
};

export type InstallationEdge = {
  __typename?: 'InstallationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Installation>;
};

export type Invite = {
  __typename?: 'Invite';
  email?: Maybe<Scalars['String']['output']>;
  secureId: Scalars['String']['output'];
};

export type InviteAttributes = {
  email?: InputMaybe<Scalars['String']['input']>;
};

export type IssuerRef = {
  __typename?: 'IssuerRef';
  group?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type Job = {
  __typename?: 'Job';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: JobSpec;
  status: JobStatus;
};

export type JobReference = {
  __typename?: 'JobReference';
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
};

export type JobSpec = {
  __typename?: 'JobSpec';
  activeDeadlineSeconds?: Maybe<Scalars['Int']['output']>;
  backoffLimit?: Maybe<Scalars['Int']['output']>;
  parallelism?: Maybe<Scalars['Int']['output']>;
};

export type JobStatus = {
  __typename?: 'JobStatus';
  active?: Maybe<Scalars['Int']['output']>;
  completionTime?: Maybe<Scalars['String']['output']>;
  failed?: Maybe<Scalars['Int']['output']>;
  startTime?: Maybe<Scalars['String']['output']>;
  succeeded?: Maybe<Scalars['Int']['output']>;
};

export type KubeconfigAttributes = {
  raw?: InputMaybe<Scalars['String']['input']>;
};

/** supported kubernetes objects fetchable in runbooks */
export type KubernetesData = Deployment | StatefulSet;

export type KubernetesDatasource = {
  __typename?: 'KubernetesDatasource';
  name: Scalars['String']['output'];
  resource: Scalars['String']['output'];
};

export type LabelInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type LabelPair = {
  __typename?: 'LabelPair';
  name?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type License = {
  __typename?: 'License';
  metadata: Metadata;
  spec: LicenseSpec;
  status?: Maybe<LicenseStatus>;
};

export type LicenseFeature = {
  __typename?: 'LicenseFeature';
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type LicenseSpec = {
  __typename?: 'LicenseSpec';
  secretRef: SecretKeySelector;
};

export type LicenseStatus = {
  __typename?: 'LicenseStatus';
  features?: Maybe<Array<Maybe<LicenseFeature>>>;
  free?: Maybe<Scalars['Boolean']['output']>;
  limits?: Maybe<Scalars['Map']['output']>;
  plan?: Maybe<Scalars['String']['output']>;
  secrets?: Maybe<Scalars['Map']['output']>;
};

export type LoadBalancerIngressStatus = {
  __typename?: 'LoadBalancerIngressStatus';
  hostname?: Maybe<Scalars['String']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
};

export type LoadBalancerStatus = {
  __typename?: 'LoadBalancerStatus';
  ingress?: Maybe<Array<Maybe<LoadBalancerIngressStatus>>>;
};

export type LogFilter = {
  __typename?: 'LogFilter';
  metadata: Metadata;
  spec: LogFilterSpec;
};

export type LogFilterSpec = {
  __typename?: 'LogFilterSpec';
  description?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Array<Maybe<LogLabel>>>;
  name?: Maybe<Scalars['String']['output']>;
  query?: Maybe<Scalars['String']['output']>;
};

export type LogLabel = {
  __typename?: 'LogLabel';
  name?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type LogStream = {
  __typename?: 'LogStream';
  stream?: Maybe<Scalars['Map']['output']>;
  values?: Maybe<Array<Maybe<MetricResult>>>;
};

export type LoginInfo = {
  __typename?: 'LoginInfo';
  oidcUri?: Maybe<Scalars['String']['output']>;
};

export type ManifestNetwork = {
  __typename?: 'ManifestNetwork';
  pluralDns?: Maybe<Scalars['Boolean']['output']>;
  subdomain?: Maybe<Scalars['String']['output']>;
};

export type Metadata = {
  __typename?: 'Metadata';
  annotations?: Maybe<Array<Maybe<LabelPair>>>;
  creationTimestamp?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Array<Maybe<LabelPair>>>;
  name: Scalars['String']['output'];
  namespace?: Maybe<Scalars['String']['output']>;
};

export type MetadataAttributes = {
  annotations?: InputMaybe<Scalars['Map']['input']>;
  labels?: InputMaybe<Scalars['Map']['input']>;
};

export type MetricResponse = {
  __typename?: 'MetricResponse';
  metric?: Maybe<Scalars['Map']['output']>;
  values?: Maybe<Array<Maybe<MetricResult>>>;
};

export type MetricResult = {
  __typename?: 'MetricResult';
  timestamp?: Maybe<Scalars['Int']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type Namespace = {
  __typename?: 'Namespace';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: NamespaceSpec;
  status: NamespaceStatus;
};

/** metadata fields for created namespaces */
export type NamespaceMetadata = {
  __typename?: 'NamespaceMetadata';
  annotations?: Maybe<Scalars['Map']['output']>;
  labels?: Maybe<Scalars['Map']['output']>;
};

export type NamespaceSpec = {
  __typename?: 'NamespaceSpec';
  finalizers?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type NamespaceStatus = {
  __typename?: 'NamespaceStatus';
  phase?: Maybe<Scalars['String']['output']>;
};

export type Node = {
  __typename?: 'Node';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: NodeSpec;
  status: NodeStatus;
};

export type NodeCondition = {
  __typename?: 'NodeCondition';
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type NodeMetric = {
  __typename?: 'NodeMetric';
  metadata: Metadata;
  timestamp?: Maybe<Scalars['String']['output']>;
  usage?: Maybe<NodeUsage>;
  window?: Maybe<Scalars['String']['output']>;
};

/** a specification for a node pool to be created in this cluster */
export type NodePool = {
  __typename?: 'NodePool';
  /** cloud specific settings for the node groups */
  cloudSettings?: Maybe<CloudSettings>;
  /** internal id for this node pool */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the type of node to use (usually cloud-specific) */
  instanceType: Scalars['String']['output'];
  /** kubernetes labels to apply to the nodes in this pool, useful for node selectors */
  labels?: Maybe<Scalars['Map']['output']>;
  /** maximum number of instances in this node pool */
  maxSize: Scalars['Int']['output'];
  /** minimum number of instances in this node pool */
  minSize: Scalars['Int']['output'];
  /** name of this node pool (must be unique) */
  name: Scalars['String']['output'];
  /** any taints you'd want to apply to a node, for eg preventing scheduling on spot instances */
  taints?: Maybe<Array<Maybe<Taint>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type NodePoolAttributes = {
  cloudSettings?: InputMaybe<CloudSettingsAttributes>;
  instanceType: Scalars['String']['input'];
  labels?: InputMaybe<Scalars['Map']['input']>;
  maxSize: Scalars['Int']['input'];
  minSize: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  taints?: InputMaybe<Array<InputMaybe<TaintAttributes>>>;
};

export type NodeSpec = {
  __typename?: 'NodeSpec';
  podCidr?: Maybe<Scalars['String']['output']>;
  providerId?: Maybe<Scalars['String']['output']>;
  unschedulable?: Maybe<Scalars['Boolean']['output']>;
};

export type NodeStatus = {
  __typename?: 'NodeStatus';
  allocatable?: Maybe<Scalars['Map']['output']>;
  capacity?: Maybe<Scalars['Map']['output']>;
  conditions?: Maybe<Array<Maybe<NodeCondition>>>;
  phase?: Maybe<Scalars['String']['output']>;
};

export type NodeUsage = {
  __typename?: 'NodeUsage';
  cpu?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<Scalars['String']['output']>;
};

export type Notification = {
  __typename?: 'Notification';
  annotations?: Maybe<Scalars['Map']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  fingerprint: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  labels?: Maybe<Scalars['Map']['output']>;
  repository: Scalars['String']['output'];
  seenAt?: Maybe<Scalars['DateTime']['output']>;
  severity?: Maybe<Severity>;
  status?: Maybe<NotificationStatus>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges?: Maybe<Array<Maybe<NotificationEdge>>>;
  pageInfo: PageInfo;
};

export type NotificationDelta = {
  __typename?: 'NotificationDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Notification>;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Notification>;
};

export enum NotificationStatus {
  Firing = 'FIRING',
  Resolved = 'RESOLVED'
}

export type OverlayUpdate = {
  __typename?: 'OverlayUpdate';
  path?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PathUpdate = {
  __typename?: 'PathUpdate';
  path?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  valueFrom: Scalars['String']['output'];
};

export enum Permission {
  Configure = 'CONFIGURE',
  Deploy = 'DEPLOY',
  Operate = 'OPERATE',
  Read = 'READ'
}

export type Plan = {
  __typename?: 'Plan';
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  period?: Maybe<Scalars['String']['output']>;
};

export type PluralContext = {
  __typename?: 'PluralContext';
  buckets?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  configuration: Scalars['Map']['output'];
  domains?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type PluralManifest = {
  __typename?: 'PluralManifest';
  bucketPrefix?: Maybe<Scalars['String']['output']>;
  cluster?: Maybe<Scalars['String']['output']>;
  network?: Maybe<ManifestNetwork>;
};

export type PluralSubscription = {
  __typename?: 'PluralSubscription';
  id?: Maybe<Scalars['ID']['output']>;
  plan?: Maybe<Plan>;
};

export type Pod = {
  __typename?: 'Pod';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: PodSpec;
  status: PodStatus;
};

export type PodCondition = {
  __typename?: 'PodCondition';
  lastProbeTime?: Maybe<Scalars['String']['output']>;
  lastTransitionTime?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type PodConnection = {
  __typename?: 'PodConnection';
  edges?: Maybe<Array<Maybe<PodEdge>>>;
  pageInfo: PageInfo;
};

export type PodDelta = {
  __typename?: 'PodDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Pod>;
};

export type PodEdge = {
  __typename?: 'PodEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Pod>;
};

export type PodSpec = {
  __typename?: 'PodSpec';
  containers?: Maybe<Array<Maybe<Container>>>;
  initContainers?: Maybe<Array<Maybe<Container>>>;
  nodeName?: Maybe<Scalars['String']['output']>;
  serviceAccountName?: Maybe<Scalars['String']['output']>;
};

export type PodStatus = {
  __typename?: 'PodStatus';
  conditions?: Maybe<Array<Maybe<PodCondition>>>;
  containerStatuses?: Maybe<Array<Maybe<ContainerStatus>>>;
  hostIp?: Maybe<Scalars['String']['output']>;
  initContainerStatuses?: Maybe<Array<Maybe<ContainerStatus>>>;
  message?: Maybe<Scalars['String']['output']>;
  phase?: Maybe<Scalars['String']['output']>;
  podIp?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
};

export type PolicyBinding = {
  __typename?: 'PolicyBinding';
  group?: Maybe<Group>;
  id?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<User>;
};

export type PolicyBindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Port = {
  __typename?: 'Port';
  containerPort?: Maybe<Scalars['Int']['output']>;
  hostPort?: Maybe<Scalars['Int']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
};

export type PostgresInstance = {
  __typename?: 'PostgresInstance';
  uid: Scalars['String']['output'];
};

export type PostgresSettings = {
  __typename?: 'PostgresSettings';
  version?: Maybe<Scalars['String']['output']>;
};

export type Postgresql = {
  __typename?: 'Postgresql';
  instances?: Maybe<Array<Maybe<PostgresInstance>>>;
  metadata: Metadata;
  spec: PostgresqlSpec;
  status?: Maybe<PostgresqlStatus>;
};

export type PostgresqlSpec = {
  __typename?: 'PostgresqlSpec';
  databases?: Maybe<Scalars['Map']['output']>;
  numberOfInstances?: Maybe<Scalars['Int']['output']>;
  pods?: Maybe<Array<Maybe<Pod>>>;
  postgresql?: Maybe<PostgresSettings>;
  resources?: Maybe<Resources>;
  teamId?: Maybe<Scalars['String']['output']>;
  users?: Maybe<Scalars['Map']['output']>;
  volume?: Maybe<DatabaseVolume>;
};

export type PostgresqlStatus = {
  __typename?: 'PostgresqlStatus';
  clusterStatus?: Maybe<Scalars['String']['output']>;
};

export type PrometheusDatasource = {
  __typename?: 'PrometheusDatasource';
  format?: Maybe<Scalars['String']['output']>;
  legend?: Maybe<Scalars['String']['output']>;
  query: Scalars['String']['output'];
};

export type RbacAttributes = {
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export enum ReadType {
  Build = 'BUILD',
  Notification = 'NOTIFICATION'
}

export type Recipe = {
  __typename?: 'Recipe';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  oidcEnabled?: Maybe<Scalars['Boolean']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  recipeSections?: Maybe<Array<Maybe<RecipeSection>>>;
  restricted?: Maybe<Scalars['Boolean']['output']>;
};

export type RecipeConnection = {
  __typename?: 'RecipeConnection';
  edges?: Maybe<Array<Maybe<RecipeEdge>>>;
  pageInfo: PageInfo;
};

export type RecipeEdge = {
  __typename?: 'RecipeEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Recipe>;
};

export type RecipeItem = {
  __typename?: 'RecipeItem';
  configuration?: Maybe<Array<Maybe<ConfigurationItem>>>;
  id: Scalars['ID']['output'];
};

export type RecipeSection = {
  __typename?: 'RecipeSection';
  configuration?: Maybe<Array<Maybe<ConfigurationItem>>>;
  id: Scalars['ID']['output'];
  recipeItems?: Maybe<Array<Maybe<RecipeItem>>>;
  repository?: Maybe<Repository>;
};

export type Recommendation = {
  __typename?: 'Recommendation';
  containerRecommendations?: Maybe<Array<Maybe<ContainerRecommendation>>>;
};

export type Repository = {
  __typename?: 'Repository';
  configuration?: Maybe<Configuration>;
  description?: Maybe<Scalars['String']['output']>;
  docs?: Maybe<Array<Maybe<FileContent>>>;
  grafanaDns?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type RepositoryConnection = {
  __typename?: 'RepositoryConnection';
  edges?: Maybe<Array<Maybe<RepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type RepositoryContext = {
  __typename?: 'RepositoryContext';
  context?: Maybe<Scalars['Map']['output']>;
  repository: Scalars['String']['output'];
};

export type RepositoryEdge = {
  __typename?: 'RepositoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Repository>;
};

export type ResourceSpec = {
  __typename?: 'ResourceSpec';
  cpu?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<Scalars['String']['output']>;
};

export type Resources = {
  __typename?: 'Resources';
  limits?: Maybe<ResourceSpec>;
  requests?: Maybe<ResourceSpec>;
};

/** a representation of a past revision of a service */
export type Revision = {
  __typename?: 'Revision';
  /** git spec of the prior revision */
  git: GitRef;
  /** id of this revision */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the sha this service was pulled from */
  sha?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the service's semver */
  version: Scalars['String']['output'];
};

export type RevisionConnection = {
  __typename?: 'RevisionConnection';
  edges?: Maybe<Array<Maybe<RevisionEdge>>>;
  pageInfo: PageInfo;
};

export type RevisionEdge = {
  __typename?: 'RevisionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Revision>;
};

export type Role = {
  __typename?: 'Role';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Maybe<Permission>>>;
  repositories?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  roleBindings?: Maybe<Array<Maybe<RoleBinding>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type RoleAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Array<InputMaybe<Permission>>>;
  repositories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  roleBindings?: InputMaybe<Array<InputMaybe<BindingAttributes>>>;
};

export type RoleBinding = {
  __typename?: 'RoleBinding';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type RoleConnection = {
  __typename?: 'RoleConnection';
  edges?: Maybe<Array<Maybe<RoleEdge>>>;
  pageInfo: PageInfo;
};

export type RoleEdge = {
  __typename?: 'RoleEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Role>;
};

export type RollingUpdate = {
  __typename?: 'RollingUpdate';
  maxSurge?: Maybe<Scalars['Int']['output']>;
  maxUnavailable?: Maybe<Scalars['Int']['output']>;
};

export type RootMutationType = {
  __typename?: 'RootMutationType';
  approveBuild?: Maybe<Build>;
  cancelBuild?: Maybe<Build>;
  /** clones the spec of the given service to be deployed either into a new namespace or new cluster */
  cloneService?: Maybe<ServiceDeployment>;
  createAccessToken?: Maybe<AccessToken>;
  createBuild?: Maybe<Build>;
  createCluster?: Maybe<Cluster>;
  createClusterProvider?: Maybe<ClusterProvider>;
  createGitRepository?: Maybe<GitRepository>;
  createGlobalService?: Maybe<GlobalService>;
  createGroup?: Maybe<Group>;
  createGroupMember?: Maybe<GroupMember>;
  createInvite?: Maybe<Invite>;
  createPeer?: Maybe<WireguardPeer>;
  createRole?: Maybe<Role>;
  createServiceDeployment?: Maybe<ServiceDeployment>;
  createUpgradePolicy?: Maybe<UpgradePolicy>;
  createWebhook?: Maybe<Webhook>;
  deleteAccessToken?: Maybe<AccessToken>;
  deleteCertificate?: Maybe<Scalars['Boolean']['output']>;
  deleteCluster?: Maybe<Cluster>;
  deleteGitRepository?: Maybe<GitRepository>;
  deleteGlobalService?: Maybe<GlobalService>;
  deleteGroup?: Maybe<Group>;
  deleteGroupMember?: Maybe<GroupMember>;
  deleteJob?: Maybe<Job>;
  deleteNode?: Maybe<Node>;
  deletePeer?: Maybe<Scalars['Boolean']['output']>;
  deletePod?: Maybe<Pod>;
  deleteRole?: Maybe<Role>;
  deleteServiceDeployment?: Maybe<ServiceDeployment>;
  deleteUpgradePolicy?: Maybe<UpgradePolicy>;
  deleteUser?: Maybe<User>;
  deleteWebhook?: Maybe<Webhook>;
  enableDeployments?: Maybe<DeploymentSettings>;
  executeRunbook?: Maybe<RunbookActionResponse>;
  installRecipe?: Maybe<Build>;
  installStack?: Maybe<Build>;
  loginLink?: Maybe<User>;
  markRead?: Maybe<User>;
  oauthCallback?: Maybe<User>;
  overlayConfiguration?: Maybe<Build>;
  /** a regular status ping to be sent by the deploy operator */
  pingCluster?: Maybe<Cluster>;
  readNotifications?: Maybe<User>;
  restartBuild?: Maybe<Build>;
  restorePostgres?: Maybe<Postgresql>;
  /** rewires this service to use the given revision id */
  rollbackService?: Maybe<ServiceDeployment>;
  signIn?: Maybe<User>;
  signup?: Maybe<User>;
  updateCluster?: Maybe<Cluster>;
  updateClusterProvider?: Maybe<ClusterProvider>;
  updateConfiguration?: Maybe<Configuration>;
  updateDeploymentSettings?: Maybe<DeploymentSettings>;
  updateGitRepository?: Maybe<GitRepository>;
  updateGroup?: Maybe<Group>;
  /** a reusable mutation for updating rbac settings on core services */
  updateRbac?: Maybe<Scalars['Boolean']['output']>;
  updateRole?: Maybe<Role>;
  /** updates only the components of a given service, to be sent after deploy operator syncs */
  updateServiceComponents?: Maybe<ServiceDeployment>;
  updateServiceDeployment?: Maybe<ServiceDeployment>;
  updateSmtp?: Maybe<Smtp>;
  updateUser?: Maybe<User>;
};


export type RootMutationTypeApproveBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCancelBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCloneServiceArgs = {
  attributes: ServiceCloneAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateBuildArgs = {
  attributes: BuildAttributes;
};


export type RootMutationTypeCreateClusterArgs = {
  attributes: ClusterAttributes;
};


export type RootMutationTypeCreateClusterProviderArgs = {
  attributes: ClusterProviderAttributes;
};


export type RootMutationTypeCreateGitRepositoryArgs = {
  attributes: GitAttributes;
};


export type RootMutationTypeCreateGlobalServiceArgs = {
  attributes: GlobalServiceAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateGroupArgs = {
  attributes: GroupAttributes;
};


export type RootMutationTypeCreateGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateInviteArgs = {
  attributes: InviteAttributes;
};


export type RootMutationTypeCreatePeerArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateRoleArgs = {
  attributes: RoleAttributes;
};


export type RootMutationTypeCreateServiceDeploymentArgs = {
  attributes: ServiceDeploymentAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateUpgradePolicyArgs = {
  attributes: UpgradePolicyAttributes;
};


export type RootMutationTypeCreateWebhookArgs = {
  attributes: WebhookAttributes;
};


export type RootMutationTypeDeleteAccessTokenArgs = {
  token: Scalars['String']['input'];
};


export type RootMutationTypeDeleteCertificateArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypeDeleteClusterArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGitRepositoryArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGlobalServiceArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGroupArgs = {
  groupId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteJobArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeDeleteNodeArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeletePeerArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeletePodArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteServiceDeploymentArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteUpgradePolicyArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeExecuteRunbookArgs = {
  input: RunbookActionInput;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypeInstallRecipeArgs = {
  context: Scalars['Map']['input'];
  id: Scalars['ID']['input'];
  oidc?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootMutationTypeInstallStackArgs = {
  context: ContextAttributes;
  name: Scalars['String']['input'];
  oidc?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootMutationTypeLoginLinkArgs = {
  key: Scalars['String']['input'];
};


export type RootMutationTypeMarkReadArgs = {
  type?: InputMaybe<ReadType>;
};


export type RootMutationTypeOauthCallbackArgs = {
  code: Scalars['String']['input'];
  redirect?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeOverlayConfigurationArgs = {
  context: Scalars['Map']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypePingClusterArgs = {
  attributes: ClusterPing;
};


export type RootMutationTypeRestartBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeRestorePostgresArgs = {
  clone?: InputMaybe<CloneAttributes>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  timestamp: Scalars['DateTime']['input'];
};


export type RootMutationTypeRollbackServiceArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  revisionId: Scalars['ID']['input'];
};


export type RootMutationTypeSignInArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type RootMutationTypeSignupArgs = {
  attributes: UserAttributes;
  inviteId: Scalars['String']['input'];
};


export type RootMutationTypeUpdateClusterArgs = {
  attributes: ClusterUpdateAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateClusterProviderArgs = {
  attributes: ClusterProviderUpdateAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateConfigurationArgs = {
  content: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  repository: Scalars['String']['input'];
  tool?: InputMaybe<Tool>;
};


export type RootMutationTypeUpdateDeploymentSettingsArgs = {
  attributes: DeploymentSettingsAttributes;
};


export type RootMutationTypeUpdateGitRepositoryArgs = {
  attributes: GitAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateGroupArgs = {
  attributes: GroupAttributes;
  groupId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateRbacArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  providerId?: InputMaybe<Scalars['ID']['input']>;
  rbac: RbacAttributes;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeUpdateRoleArgs = {
  attributes: RoleAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateServiceComponentsArgs = {
  components?: InputMaybe<Array<InputMaybe<ComponentAttributes>>>;
  errors?: InputMaybe<Array<InputMaybe<ServiceErrorAttributes>>>;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateServiceDeploymentArgs = {
  attributes: ServiceUpdateAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeUpdateSmtpArgs = {
  smtp: SmtpInput;
};


export type RootMutationTypeUpdateUserArgs = {
  attributes: UserAttributes;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type RootQueryType = {
  __typename?: 'RootQueryType';
  accessToken?: Maybe<AccessToken>;
  accessTokens?: Maybe<AccessTokenConnection>;
  account?: Maybe<Account>;
  ai?: Maybe<Scalars['String']['output']>;
  application?: Maybe<Application>;
  applications?: Maybe<Array<Maybe<Application>>>;
  auditMetrics?: Maybe<Array<Maybe<AuditMetric>>>;
  audits?: Maybe<AuditConnection>;
  build?: Maybe<Build>;
  buildInfo?: Maybe<BuildInfo>;
  builds?: Maybe<BuildConnection>;
  cachedPods?: Maybe<Array<Maybe<Pod>>>;
  certificate?: Maybe<Certificate>;
  /** fetches an individual cluster */
  cluster?: Maybe<Cluster>;
  clusterInfo?: Maybe<ClusterInfo>;
  /** fetches an individual cluster provider */
  clusterProvider?: Maybe<ClusterProvider>;
  /** a relay connection of all providers visible to the current user */
  clusterProviders?: Maybe<ClusterProviderConnection>;
  /** the services deployed in the current cluster, to be polled by the deploy operator */
  clusterServices?: Maybe<Array<Maybe<ServiceDeployment>>>;
  /** a relay connection of all clusters visible to the current user */
  clusters?: Maybe<ClusterConnection>;
  configMap?: Maybe<ConfigMap>;
  configMaps?: Maybe<Array<Maybe<ConfigMap>>>;
  configuration?: Maybe<ConsoleConfiguration>;
  configurationOverlays?: Maybe<Array<Maybe<ConfigurationOverlay>>>;
  context?: Maybe<Array<Maybe<RepositoryContext>>>;
  cronJob?: Maybe<CronJob>;
  dashboard?: Maybe<Dashboard>;
  dashboards?: Maybe<Array<Maybe<Dashboard>>>;
  deployment?: Maybe<Deployment>;
  deploymentSettings?: Maybe<DeploymentSettings>;
  externalToken?: Maybe<Scalars['String']['output']>;
  gitRepositories?: Maybe<GitRepositoryConnection>;
  groupMembers?: Maybe<GroupMemberConnection>;
  groups?: Maybe<GroupConnection>;
  ingress?: Maybe<Ingress>;
  installations?: Maybe<InstallationConnection>;
  invite?: Maybe<Invite>;
  job?: Maybe<Job>;
  logFilters?: Maybe<Array<Maybe<LogFilter>>>;
  loginInfo?: Maybe<LoginInfo>;
  logs?: Maybe<Array<Maybe<LogStream>>>;
  me?: Maybe<User>;
  metric?: Maybe<Array<Maybe<MetricResponse>>>;
  myWireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
  namespaces?: Maybe<Array<Maybe<Namespace>>>;
  node?: Maybe<Node>;
  nodeMetric?: Maybe<NodeMetric>;
  nodeMetrics?: Maybe<Array<Maybe<NodeMetric>>>;
  nodes?: Maybe<Array<Maybe<Node>>>;
  notifications?: Maybe<NotificationConnection>;
  pluralContext?: Maybe<PluralContext>;
  pod?: Maybe<Pod>;
  pods?: Maybe<PodConnection>;
  postgresDatabase?: Maybe<Postgresql>;
  postgresDatabases?: Maybe<Array<Maybe<Postgresql>>>;
  recipe?: Maybe<Recipe>;
  recipes?: Maybe<RecipeConnection>;
  repositories?: Maybe<RepositoryConnection>;
  repository?: Maybe<Repository>;
  role?: Maybe<Role>;
  roles?: Maybe<RoleConnection>;
  runbook?: Maybe<Runbook>;
  runbooks?: Maybe<Array<Maybe<Runbook>>>;
  scalingRecommendation?: Maybe<VerticalPodAutoscaler>;
  secret?: Maybe<Secret>;
  secrets?: Maybe<Array<Maybe<Secret>>>;
  service?: Maybe<Service>;
  /** fetches details of this service deployment, and can be called by the deploy operator */
  serviceDeployment?: Maybe<ServiceDeployment>;
  serviceDeployments?: Maybe<ServiceDeploymentConnection>;
  serviceStatuses?: Maybe<Array<Maybe<ServiceStatusCount>>>;
  smtp?: Maybe<Smtp>;
  stack?: Maybe<Stack>;
  statefulSet?: Maybe<StatefulSet>;
  temporaryToken?: Maybe<Scalars['String']['output']>;
  upgradePolicies?: Maybe<Array<Maybe<UpgradePolicy>>>;
  users?: Maybe<UserConnection>;
  webhooks?: Maybe<WebhookConnection>;
  wireguardPeer?: Maybe<WireguardPeer>;
  wireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
};


export type RootQueryTypeAccessTokenArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeAccessTokensArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeAiArgs = {
  prompt: Scalars['String']['input'];
};


export type RootQueryTypeApplicationArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeAuditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repo?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeBuildsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeCachedPodsArgs = {
  namespaces?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootQueryTypeCertificateArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeClusterArgs = {
  handle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeClusterProviderArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeClusterProvidersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeClustersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeConfigMapArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeConfigMapsArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeConfigurationOverlaysArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeCronJobArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeDashboardArgs = {
  labels?: InputMaybe<Array<InputMaybe<LabelInput>>>;
  name: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  repo: Scalars['String']['input'];
  step?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeDashboardsArgs = {
  repo: Scalars['String']['input'];
};


export type RootQueryTypeDeploymentArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeGitRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeGroupMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  groupId: Scalars['ID']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeIngressArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeInstallationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeInviteArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryTypeJobArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeLogFiltersArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeLoginInfoArgs = {
  redirect?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeLogsArgs = {
  end?: InputMaybe<Scalars['Long']['input']>;
  limit: Scalars['Int']['input'];
  query: Scalars['String']['input'];
  start?: InputMaybe<Scalars['Long']['input']>;
};


export type RootQueryTypeMetricArgs = {
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  step?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeNodeArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeNodeMetricArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePodArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePodsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  namespaces?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootQueryTypePostgresDatabaseArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeRecipesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type RootQueryTypeRepositoryArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeRolesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeRunbookArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeRunbooksArgs = {
  namespace: Scalars['String']['input'];
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTypeScalingRecommendationArgs = {
  kind: AutoscalingTarget;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeSecretArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeSecretsArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeServiceArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeServiceDeploymentArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeServiceDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeServiceStatusesArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeStackArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeStatefulSetArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeWebhooksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeWireguardPeerArgs = {
  name: Scalars['String']['input'];
};

export type RootSubscriptionType = {
  __typename?: 'RootSubscriptionType';
  applicationDelta?: Maybe<ApplicationDelta>;
  buildDelta?: Maybe<BuildDelta>;
  commandDelta?: Maybe<CommandDelta>;
  notificationDelta?: Maybe<NotificationDelta>;
  podDelta?: Maybe<PodDelta>;
};


export type RootSubscriptionTypeBuildDeltaArgs = {
  buildId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootSubscriptionTypeCommandDeltaArgs = {
  buildId: Scalars['ID']['input'];
};

export type Runbook = {
  __typename?: 'Runbook';
  data?: Maybe<Array<Maybe<RunbookData>>>;
  executions?: Maybe<RunbookExecutionConnection>;
  name: Scalars['String']['output'];
  spec: RunbookSpec;
  status?: Maybe<RunbookStatus>;
};


export type RunbookDataArgs = {
  context?: InputMaybe<RunbookContext>;
};


export type RunbookExecutionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type RunbookAction = {
  __typename?: 'RunbookAction';
  configuration?: Maybe<ConfigurationAction>;
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type RunbookActionInput = {
  action: Scalars['String']['input'];
  context: Scalars['Map']['input'];
};

export type RunbookActionResponse = {
  __typename?: 'RunbookActionResponse';
  redirectTo?: Maybe<Scalars['String']['output']>;
};

export type RunbookAlertStatus = {
  __typename?: 'RunbookAlertStatus';
  annotations?: Maybe<Scalars['Map']['output']>;
  fingerprint?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Scalars['Map']['output']>;
  name: Scalars['String']['output'];
  startsAt?: Maybe<Scalars['String']['output']>;
};

export type RunbookContext = {
  timeseriesStart?: InputMaybe<Scalars['Int']['input']>;
  timeseriesStep?: InputMaybe<Scalars['String']['input']>;
};

export type RunbookData = {
  __typename?: 'RunbookData';
  kubernetes?: Maybe<KubernetesData>;
  name: Scalars['String']['output'];
  nodes?: Maybe<Array<Maybe<Node>>>;
  prometheus?: Maybe<Array<Maybe<MetricResponse>>>;
  source?: Maybe<RunbookDatasource>;
};

export type RunbookDatasource = {
  __typename?: 'RunbookDatasource';
  kubernetes?: Maybe<KubernetesDatasource>;
  name: Scalars['String']['output'];
  prometheus?: Maybe<PrometheusDatasource>;
  type: Scalars['String']['output'];
};

export type RunbookExecution = {
  __typename?: 'RunbookExecution';
  context: Scalars['Map']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type RunbookExecutionConnection = {
  __typename?: 'RunbookExecutionConnection';
  edges?: Maybe<Array<Maybe<RunbookExecutionEdge>>>;
  pageInfo: PageInfo;
};

export type RunbookExecutionEdge = {
  __typename?: 'RunbookExecutionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<RunbookExecution>;
};

export type RunbookSpec = {
  __typename?: 'RunbookSpec';
  actions?: Maybe<Array<Maybe<RunbookAction>>>;
  datasources?: Maybe<Array<Maybe<RunbookDatasource>>>;
  description?: Maybe<Scalars['String']['output']>;
  display?: Maybe<Scalars['Map']['output']>;
  name: Scalars['String']['output'];
};

export type RunbookStatus = {
  __typename?: 'RunbookStatus';
  alerts?: Maybe<Array<Maybe<RunbookAlertStatus>>>;
};

export type RunningState = {
  __typename?: 'RunningState';
  startedAt?: Maybe<Scalars['String']['output']>;
};

export type Secret = {
  __typename?: 'Secret';
  data: Scalars['Map']['output'];
  metadata: Metadata;
  type?: Maybe<Scalars['String']['output']>;
};

export type SecretKeySelector = {
  __typename?: 'SecretKeySelector';
  key?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type Service = {
  __typename?: 'Service';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: ServiceSpec;
  status: ServiceStatus;
};

export type ServiceCloneAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/** representation of a kubernetes component deployed by a service */
export type ServiceComponent = {
  __typename?: 'ServiceComponent';
  /** any api deprecations discovered from this component */
  apiDeprecations?: Maybe<Array<Maybe<ApiDeprecation>>>;
  /** api group of this resource */
  group?: Maybe<Scalars['String']['output']>;
  /** internal id */
  id: Scalars['ID']['output'];
  /** api kind of this resource */
  kind: Scalars['String']['output'];
  /** kubernetes name of this resource */
  name: Scalars['String']['output'];
  /** kubernetes namespace of this resource */
  namespace?: Maybe<Scalars['String']['output']>;
  /** the service this component belongs to */
  service?: Maybe<ServiceDeployment>;
  /** kubernetes component health enum */
  state?: Maybe<ComponentState>;
  /** whether this component has been applied to the k8s api */
  synced: Scalars['Boolean']['output'];
  /** api version of this resource */
  version?: Maybe<Scalars['String']['output']>;
};

/** a configuration item k/v pair */
export type ServiceConfiguration = {
  __typename?: 'ServiceConfiguration';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

/** a reference to a service deployed from a git repo into a cluster */
export type ServiceDeployment = {
  __typename?: 'ServiceDeployment';
  /** the cluster this service is deployed into */
  cluster?: Maybe<Cluster>;
  /** a n / m representation of the number of healthy components of this service */
  componentStatus?: Maybe<Scalars['String']['output']>;
  /** the kubernetes component of a service */
  components?: Maybe<Array<Maybe<ServiceComponent>>>;
  /** possibly secret configuration used to template the manifests of this service */
  configuration?: Maybe<Array<Maybe<ServiceConfiguration>>>;
  /** the time this service was scheduled for deletion */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** fetches the /docs directory within this services git tree.  This is a heavy operation and should NOT be used in list queries */
  docs?: Maybe<Array<Maybe<GitFile>>>;
  /** whether this service is editable */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** a list of errors generated by the deployment operator */
  errors?: Maybe<Array<Maybe<ServiceError>>>;
  /** description on where in git the service's manifests should be fetched */
  git: GitRef;
  /** the global service this service is the source for */
  globalService?: Maybe<GlobalService>;
  /** internal id of this service */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** human readable name of this service, must be unique per cluster */
  name: Scalars['String']['output'];
  /** kubernetes namespace this service will be deployed to */
  namespace: Scalars['String']['output'];
  /** whether this service is controlled by a global service */
  owner?: Maybe<GlobalService>;
  /** read policy for this service */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** the git repo of this service */
  repository?: Maybe<GitRepository>;
  /** the current revision of this service */
  revision?: Maybe<Revision>;
  /** a relay connection of all revisions of this service, these are periodically pruned up to a history limit */
  revisions?: Maybe<RevisionConnection>;
  /** latest git sha we pulled from */
  sha?: Maybe<Scalars['String']['output']>;
  /** A summary status enum for the health of this service */
  status: ServiceDeploymentStatus;
  /** settings for advanced tuning of the sync process */
  syncConfig?: Maybe<SyncConfig>;
  /** https url to fetch the latest tarball of kubernetes manifests */
  tarball?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** semver of this service */
  version: Scalars['String']['output'];
  /** write policy of this service */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};


/** a reference to a service deployed from a git repo into a cluster */
export type ServiceDeploymentRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ServiceDeploymentAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  docsPath?: InputMaybe<Scalars['String']['input']>;
  git: GitRefAttributes;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  repositoryId: Scalars['ID']['input'];
  syncConfig?: InputMaybe<SyncConfigAttributes>;
  version?: InputMaybe<Scalars['String']['input']>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type ServiceDeploymentConnection = {
  __typename?: 'ServiceDeploymentConnection';
  edges?: Maybe<Array<Maybe<ServiceDeploymentEdge>>>;
  pageInfo: PageInfo;
};

export type ServiceDeploymentEdge = {
  __typename?: 'ServiceDeploymentEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ServiceDeployment>;
};

export enum ServiceDeploymentStatus {
  Failed = 'FAILED',
  Healthy = 'HEALTHY',
  Stale = 'STALE',
  Synced = 'SYNCED'
}

/** an error sent from the deploy operator about sync progress */
export type ServiceError = {
  __typename?: 'ServiceError';
  message: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type ServiceErrorAttributes = {
  message: Scalars['String']['input'];
  source: Scalars['String']['input'];
};

export type ServicePort = {
  __typename?: 'ServicePort';
  name?: Maybe<Scalars['String']['output']>;
  port?: Maybe<Scalars['Int']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
  targetPort?: Maybe<Scalars['String']['output']>;
};

export type ServiceSpec = {
  __typename?: 'ServiceSpec';
  clusterIp?: Maybe<Scalars['String']['output']>;
  ports?: Maybe<Array<Maybe<ServicePort>>>;
  selector?: Maybe<Scalars['Map']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type ServiceStatus = {
  __typename?: 'ServiceStatus';
  loadBalancer?: Maybe<LoadBalancerStatus>;
};

/** a rollup count of the statuses of services in a query */
export type ServiceStatusCount = {
  __typename?: 'ServiceStatusCount';
  count: Scalars['Int']['output'];
  status: ServiceDeploymentStatus;
};

export type ServiceUpdateAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  git: GitRefAttributes;
  version?: InputMaybe<Scalars['String']['input']>;
};

export enum Severity {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  None = 'NONE'
}

export type Smtp = {
  __typename?: 'Smtp';
  password?: Maybe<Scalars['String']['output']>;
  port?: Maybe<Scalars['Int']['output']>;
  sender?: Maybe<Scalars['String']['output']>;
  server?: Maybe<Scalars['String']['output']>;
  user?: Maybe<Scalars['String']['output']>;
};

export type SmtpInput = {
  password?: InputMaybe<Scalars['String']['input']>;
  port?: InputMaybe<Scalars['Int']['input']>;
  sender?: InputMaybe<Scalars['String']['input']>;
  server?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};

export type Stack = {
  __typename?: 'Stack';
  bundles?: Maybe<Array<Maybe<Recipe>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  sections?: Maybe<Array<Maybe<RecipeSection>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type StatefulSet = {
  __typename?: 'StatefulSet';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: StatefulSetSpec;
  status: StatefulSetStatus;
};

export type StatefulSetSpec = {
  __typename?: 'StatefulSetSpec';
  replicas?: Maybe<Scalars['Int']['output']>;
  serviceName?: Maybe<Scalars['String']['output']>;
};

export type StatefulSetStatus = {
  __typename?: 'StatefulSetStatus';
  currentReplicas?: Maybe<Scalars['Int']['output']>;
  readyReplicas?: Maybe<Scalars['Int']['output']>;
  replicas?: Maybe<Scalars['Int']['output']>;
  updatedReplicas?: Maybe<Scalars['Int']['output']>;
};

export enum Status {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Queued = 'QUEUED',
  Running = 'RUNNING',
  Successful = 'SUCCESSFUL'
}

export type StatusComponent = {
  __typename?: 'StatusComponent';
  group?: Maybe<Scalars['String']['output']>;
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type StatusCondition = {
  __typename?: 'StatusCondition';
  message: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** Advanced configuration of how to sync resources */
export type SyncConfig = {
  __typename?: 'SyncConfig';
  diffNormalizers?: Maybe<Array<Maybe<DiffNormalizer>>>;
  namespaceMetadata?: Maybe<NamespaceMetadata>;
};

export type SyncConfigAttributes = {
  diffNormalizer?: InputMaybe<DiffNormalizerAttributes>;
  namespaceMetadata?: InputMaybe<MetadataAttributes>;
};

export type Tag = {
  __typename?: 'Tag';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type TagAttributes = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/** a kubernetes node taint */
export type Taint = {
  __typename?: 'Taint';
  effect: Scalars['String']['output'];
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type TaintAttributes = {
  effect: Scalars['String']['input'];
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type TerminatedState = {
  __typename?: 'TerminatedState';
  exitCode?: Maybe<Scalars['Int']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
};

export enum Tool {
  Helm = 'HELM',
  Terraform = 'TERRAFORM'
}

export type UpgradePolicy = {
  __typename?: 'UpgradePolicy';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  repositories?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  target: Scalars['String']['output'];
  type: UpgradePolicyType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  weight?: Maybe<Scalars['Int']['output']>;
};

export type UpgradePolicyAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  repositories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  target: Scalars['String']['input'];
  type: UpgradePolicyType;
  weight?: InputMaybe<Scalars['Int']['input']>;
};

export enum UpgradePolicyType {
  Approval = 'APPROVAL',
  Deploy = 'DEPLOY',
  Ignore = 'IGNORE'
}

export type User = {
  __typename?: 'User';
  backgroundColor?: Maybe<Scalars['String']['output']>;
  boundRoles?: Maybe<Array<Maybe<Role>>>;
  buildTimestamp?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  jwt?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pluralId?: Maybe<Scalars['String']['output']>;
  profile?: Maybe<Scalars['String']['output']>;
  readTimestamp?: Maybe<Scalars['DateTime']['output']>;
  roles?: Maybe<UserRoles>;
  unreadNotifications?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type UserAttributes = {
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<UserRoleAttributes>;
};

export type UserConnection = {
  __typename?: 'UserConnection';
  edges?: Maybe<Array<Maybe<UserEdge>>>;
  pageInfo: PageInfo;
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<User>;
};

export type UserRoleAttributes = {
  admin?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UserRoles = {
  __typename?: 'UserRoles';
  admin?: Maybe<Scalars['Boolean']['output']>;
};

export type VerticalPodAutoscaler = {
  __typename?: 'VerticalPodAutoscaler';
  metadata: Metadata;
  spec: VerticalPodAutoscalerSpec;
  status?: Maybe<VerticalPodAutoscalerStatus>;
};

export type VerticalPodAutoscalerSpec = {
  __typename?: 'VerticalPodAutoscalerSpec';
  targetRef: CrossVersionResourceTarget;
  updatePolicy: VerticalPodAutoscalerUpdatePolicy;
};

export type VerticalPodAutoscalerStatus = {
  __typename?: 'VerticalPodAutoscalerStatus';
  recommendation?: Maybe<Recommendation>;
};

export type VerticalPodAutoscalerUpdatePolicy = {
  __typename?: 'VerticalPodAutoscalerUpdatePolicy';
  updateMode?: Maybe<Scalars['String']['output']>;
};

export type WaitingState = {
  __typename?: 'WaitingState';
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  health: WebhookHealth;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  type: WebhookType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};

export type WebhookAttributes = {
  url: Scalars['String']['input'];
};

export type WebhookConnection = {
  __typename?: 'WebhookConnection';
  edges?: Maybe<Array<Maybe<WebhookEdge>>>;
  pageInfo: PageInfo;
};

export type WebhookEdge = {
  __typename?: 'WebhookEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Webhook>;
};

export enum WebhookHealth {
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY'
}

export enum WebhookType {
  Piazza = 'PIAZZA',
  Slack = 'SLACK'
}

export type WireguardPeer = {
  __typename?: 'WireguardPeer';
  config?: Maybe<Scalars['String']['output']>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: WireguardPeerSpec;
  status?: Maybe<WireguardPeerStatus>;
  user?: Maybe<User>;
};

export type WireguardPeerSpec = {
  __typename?: 'WireguardPeerSpec';
  address?: Maybe<Scalars['String']['output']>;
  publicKey?: Maybe<Scalars['String']['output']>;
  wireguardRef?: Maybe<Scalars['String']['output']>;
};

export type WireguardPeerStatus = {
  __typename?: 'WireguardPeerStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  ready?: Maybe<Scalars['Boolean']['output']>;
};

export type CostAnalysisFragmentFragment = { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null };

export type FileContentFragmentFragment = { __typename?: 'FileContent', content?: string | null, path?: string | null };

export type ConfigurationFragmentFragment = { __typename?: 'Configuration', helm?: string | null, terraform?: string | null };

export type ApplicationSpecFragmentFragment = { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null };

export type ApplicationStatusFragmentFragment = { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null };

export type ApplicationFragmentFragment = { __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null };

export type MetadataFragmentFragment = { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null };

export type ConfigurationOverlayFragmentFragment = { __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } };

export type AppQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type AppQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', name: string, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null, configurationOverlays?: Array<{ __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } } | null> | null };

export type AppInfoQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type AppInfoQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', info?: string | null, name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null };

export type RepositoryFragmentFragment = { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null };

export type RepositoryQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type RepositoryQuery = { __typename?: 'RootQueryType', repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null };

export type PageInfoFragment = { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null };

export type PluralContextQueryVariables = Exact<{ [key: string]: never; }>;


export type PluralContextQuery = { __typename?: 'RootQueryType', pluralContext?: { __typename?: 'PluralContext', buckets?: Array<string | null> | null, configuration: Map<string, unknown>, domains?: Array<string | null> | null } | null };

export type CreateBuildMutationVariables = Exact<{
  attributes: BuildAttributes;
}>;


export type CreateBuildMutation = { __typename?: 'RootMutationType', createBuild?: { __typename?: 'Build', id: string } | null };

export type NodePoolFragment = { __typename?: 'NodePool', id: string, name: string };

export type ClustersRowFragment = { __typename?: 'Cluster', id: string, name: string, currentVersion?: string | null, pingedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', folder: string }, repository?: { __typename?: 'GitRepository', url: string } | null } | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string } | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string } | null> | null };

export type ClustersQueryVariables = Exact<{ [key: string]: never; }>;


export type ClustersQuery = { __typename?: 'RootQueryType', clusters?: { __typename?: 'ClusterConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'ClusterEdge', node?: { __typename?: 'Cluster', id: string, name: string, currentVersion?: string | null, pingedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', folder: string }, repository?: { __typename?: 'GitRepository', url: string } | null } | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string } | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string } | null> | null } | null } | null> | null } | null };

export type UpdateClusterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ClusterUpdateAttributes;
}>;


export type UpdateClusterMutation = { __typename?: 'RootMutationType', updateCluster?: { __typename?: 'Cluster', id: string, name: string, currentVersion?: string | null, pingedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', folder: string }, repository?: { __typename?: 'GitRepository', url: string } | null } | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string } | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string } | null> | null } | null };

export type GitRepositoriesRowFragment = { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null };

export type GitRepositoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GitRepositoriesQuery = { __typename?: 'RootQueryType', gitRepositories?: { __typename?: 'GitRepositoryConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GitRepositoryEdge', node?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null };

export type CreateGitRepositoryMutationVariables = Exact<{
  attributes: GitAttributes;
}>;


export type CreateGitRepositoryMutation = { __typename?: 'RootMutationType', createGitRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null } | null };

export type DeleteGitRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGitRepositoryMutation = { __typename?: 'RootMutationType', deleteGitRepository?: { __typename?: 'GitRepository', id: string } | null };

export type UpdateGitRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: GitAttributes;
}>;


export type UpdateGitRepositoryMutation = { __typename?: 'RootMutationType', updateGitRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null } | null };

export type ServiceDeploymentsRowFragment = { __typename?: 'ServiceDeployment', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null };

export type ServiceDeploymentRevisionFragment = { __typename?: 'Revision', id: string, version: string, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } };

export type ServiceDeploymentRevisionsFragment = { __typename?: 'ServiceDeployment', revision?: { __typename?: 'Revision', id: string, version: string, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null, revisions?: { __typename?: 'RevisionConnection', edges?: Array<{ __typename?: 'RevisionEdge', node?: { __typename?: 'Revision', id: string, version: string, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null } | null> | null } | null };

export type ServiceDeploymentsQueryVariables = Exact<{ [key: string]: never; }>;


export type ServiceDeploymentsQuery = { __typename?: 'RootQueryType', serviceDeployments?: { __typename?: 'ServiceDeploymentConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'ServiceDeploymentEdge', node?: { __typename?: 'ServiceDeployment', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null } | null } | null> | null } | null };

export type ServiceDeploymentRevisionsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentRevisionsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', revision?: { __typename?: 'Revision', id: string, version: string, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null, revisions?: { __typename?: 'RevisionConnection', edges?: Array<{ __typename?: 'RevisionEdge', node?: { __typename?: 'Revision', id: string, version: string, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null } | null> | null } | null } | null };

export type CreateServiceDeploymentMutationVariables = Exact<{
  attributes: ServiceDeploymentAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateServiceDeploymentMutation = { __typename?: 'RootMutationType', createServiceDeployment?: { __typename?: 'ServiceDeployment', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null } | null };

export type DeleteServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteServiceDeploymentMutation = { __typename?: 'RootMutationType', deleteServiceDeployment?: { __typename?: 'ServiceDeployment', id: string } | null };

export type UpdateServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ServiceUpdateAttributes;
}>;


export type UpdateServiceDeploymentMutation = { __typename?: 'RootMutationType', updateServiceDeployment?: { __typename?: 'ServiceDeployment', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null } | null };

export type RollbackServiceMutationVariables = Exact<{
  id?: InputMaybe<Scalars['ID']['input']>;
  revisionId: Scalars['ID']['input'];
}>;


export type RollbackServiceMutation = { __typename?: 'RootMutationType', rollbackService?: { __typename?: 'ServiceDeployment', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null } | null };

export type ResourceSpecFragment = { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null };

export type ResourcesFragment = { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null };

export type DatabaseTableRowFragment = { __typename?: 'Postgresql', instances?: Array<{ __typename?: 'PostgresInstance', uid: string } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, creationTimestamp?: string | null }, spec: { __typename?: 'PostgresqlSpec', numberOfInstances?: number | null, databases?: Map<string, unknown> | null, postgresql?: { __typename?: 'PostgresSettings', version?: string | null } | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null, volume?: { __typename?: 'DatabaseVolume', size?: string | null } | null }, status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null };

export type RestorePostgresMutationVariables = Exact<{
  clone?: InputMaybe<CloneAttributes>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  timestamp: Scalars['DateTime']['input'];
}>;


export type RestorePostgresMutation = { __typename?: 'RootMutationType', restorePostgres?: { __typename?: 'Postgresql', status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null } | null };

export type PostgresDatabasesQueryVariables = Exact<{ [key: string]: never; }>;


export type PostgresDatabasesQuery = { __typename?: 'RootQueryType', postgresDatabases?: Array<{ __typename?: 'Postgresql', instances?: Array<{ __typename?: 'PostgresInstance', uid: string } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, creationTimestamp?: string | null }, spec: { __typename?: 'PostgresqlSpec', numberOfInstances?: number | null, databases?: Map<string, unknown> | null, postgresql?: { __typename?: 'PostgresSettings', version?: string | null } | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null, volume?: { __typename?: 'DatabaseVolume', size?: string | null } | null }, status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null } | null> | null, applications?: Array<{ __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', icons?: Array<string | null> | null } } } | null> | null };

export type PostgresDatabaseQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type PostgresDatabaseQuery = { __typename?: 'RootQueryType', postgresDatabase?: { __typename?: 'Postgresql', instances?: Array<{ __typename?: 'PostgresInstance', uid: string } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, creationTimestamp?: string | null }, spec: { __typename?: 'PostgresqlSpec', numberOfInstances?: number | null, databases?: Map<string, unknown> | null, postgresql?: { __typename?: 'PostgresSettings', version?: string | null } | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null, volume?: { __typename?: 'DatabaseVolume', size?: string | null } | null }, status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null } | null };

export type GroupMemberFragment = { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type GroupFragment = { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null };

export type GroupsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GroupsQuery = { __typename?: 'RootQueryType', groups?: { __typename?: 'GroupConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GroupEdge', node?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null };

export type SearchGroupsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type SearchGroupsQuery = { __typename?: 'RootQueryType', groups?: { __typename?: 'GroupConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GroupEdge', node?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null };

export type GroupMembersQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
}>;


export type GroupMembersQuery = { __typename?: 'RootQueryType', groupMembers?: { __typename?: 'GroupMemberConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GroupMemberEdge', node?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null } | null> | null } | null };

export type CreateGroupMemberMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;


export type CreateGroupMemberMutation = { __typename?: 'RootMutationType', createGroupMember?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null };

export type DeleteGroupMemberMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;


export type DeleteGroupMemberMutation = { __typename?: 'RootMutationType', deleteGroupMember?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null };

export type CreateGroupMutationVariables = Exact<{
  attributes: GroupAttributes;
}>;


export type CreateGroupMutation = { __typename?: 'RootMutationType', createGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type UpdateGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: GroupAttributes;
}>;


export type UpdateGroupMutation = { __typename?: 'RootMutationType', updateGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type DeleteGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGroupMutation = { __typename?: 'RootMutationType', deleteGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type AccessTokenFragment = { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, token?: string | null, updatedAt?: string | null };

export type AccessTokenAuditFragment = { __typename?: 'AccessTokenAudit', id?: string | null, city?: string | null, count?: number | null, country?: string | null, insertedAt?: string | null, ip?: string | null, latitude?: string | null, longitude?: string | null, timestamp?: string | null, updatedAt?: string | null };

export type AccessTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type AccessTokensQuery = { __typename?: 'RootQueryType', accessTokens?: { __typename?: 'AccessTokenConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'AccessTokenEdge', node?: { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, token?: string | null, updatedAt?: string | null } | null } | null> | null } | null };

export type TokenAuditsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type TokenAuditsQuery = { __typename?: 'RootQueryType', accessToken?: { __typename?: 'AccessToken', id?: string | null, audits?: { __typename?: 'AccessTokenAuditConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'AccessTokenAuditEdge', node?: { __typename?: 'AccessTokenAudit', id?: string | null, city?: string | null, count?: number | null, country?: string | null, insertedAt?: string | null, ip?: string | null, latitude?: string | null, longitude?: string | null, timestamp?: string | null, updatedAt?: string | null } | null } | null> | null } | null } | null };

export type CreateAccessTokenMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateAccessTokenMutation = { __typename?: 'RootMutationType', createAccessToken?: { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, token?: string | null, updatedAt?: string | null } | null };

export type DeleteAccessTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type DeleteAccessTokenMutation = { __typename?: 'RootMutationType', deleteAccessToken?: { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, token?: string | null, updatedAt?: string | null } | null };

export type UserFragment = { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null };

export type InviteFragment = { __typename?: 'Invite', secureId: string };

export type RoleBindingFragment = { __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type RoleFragment = { __typename?: 'Role', id: string, name: string, description?: string | null, repositories?: Array<string | null> | null, permissions?: Array<Permission | null> | null, roleBindings?: Array<{ __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null };

export type ManifestFragment = { __typename?: 'PluralManifest', cluster?: string | null, bucketPrefix?: string | null, network?: { __typename?: 'ManifestNetwork', pluralDns?: boolean | null, subdomain?: string | null } | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'RootQueryType', externalToken?: string | null, me?: { __typename?: 'User', unreadNotifications?: number | null, id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, boundRoles?: Array<{ __typename?: 'Role', id: string, name: string, description?: string | null, repositories?: Array<string | null> | null, permissions?: Array<Permission | null> | null, roleBindings?: Array<{ __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null> | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, clusterInfo?: { __typename?: 'ClusterInfo', version?: string | null, platform?: string | null, gitCommit?: string | null } | null, configuration?: { __typename?: 'ConsoleConfiguration', vpnEnabled?: boolean | null, gitCommit?: string | null, isDemoProject?: boolean | null, isSandbox?: boolean | null, pluralLogin?: boolean | null, manifest?: { __typename?: 'PluralManifest', cluster?: string | null, bucketPrefix?: string | null, network?: { __typename?: 'ManifestNetwork', pluralDns?: boolean | null, subdomain?: string | null } | null } | null, gitStatus?: { __typename?: 'GitStatus', cloned?: boolean | null, output?: string | null } | null } | null };

export const ApplicationSpecFragmentFragmentDoc = gql`
    fragment ApplicationSpecFragment on ApplicationSpec {
  descriptor {
    type
    icons
    description
    version
    links {
      description
      url
    }
  }
  components {
    group
    kind
  }
}
    `;
export const ApplicationStatusFragmentFragmentDoc = gql`
    fragment ApplicationStatusFragment on ApplicationStatus {
  components {
    group
    kind
    name
    status
  }
  conditions {
    message
    reason
    status
    type
  }
  componentsReady
}
    `;
export const CostAnalysisFragmentFragmentDoc = gql`
    fragment CostAnalysisFragment on CostAnalysis {
  minutes
  cpuCost
  pvCost
  ramCost
  totalCost
}
    `;
export const ApplicationFragmentFragmentDoc = gql`
    fragment ApplicationFragment on Application {
  name
  spec {
    ...ApplicationSpecFragment
  }
  status {
    ...ApplicationStatusFragment
  }
  cost {
    ...CostAnalysisFragment
  }
}
    ${ApplicationSpecFragmentFragmentDoc}
${ApplicationStatusFragmentFragmentDoc}
${CostAnalysisFragmentFragmentDoc}`;
export const MetadataFragmentFragmentDoc = gql`
    fragment MetadataFragment on Metadata {
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
}
    `;
export const ConfigurationOverlayFragmentFragmentDoc = gql`
    fragment ConfigurationOverlayFragment on ConfigurationOverlay {
  metadata {
    ...MetadataFragment
  }
  spec {
    name
    folder
    subfolder
    documentation
    inputType
    inputValues
    updates {
      path
    }
  }
}
    ${MetadataFragmentFragmentDoc}`;
export const ConfigurationFragmentFragmentDoc = gql`
    fragment ConfigurationFragment on Configuration {
  helm
  terraform
}
    `;
export const FileContentFragmentFragmentDoc = gql`
    fragment FileContentFragment on FileContent {
  content
  path
}
    `;
export const RepositoryFragmentFragmentDoc = gql`
    fragment RepositoryFragment on Repository {
  id
  name
  icon
  description
  grafanaDns
  configuration {
    ...ConfigurationFragment
  }
  docs {
    ...FileContentFragment
  }
}
    ${ConfigurationFragmentFragmentDoc}
${FileContentFragmentFragmentDoc}`;
export const PageInfoFragmentDoc = gql`
    fragment PageInfo on PageInfo {
  hasNextPage
  endCursor
}
    `;
export const NodePoolFragmentDoc = gql`
    fragment NodePool on NodePool {
  id
  name
}
    `;
export const ClustersRowFragmentDoc = gql`
    fragment ClustersRow on Cluster {
  apiDeprecations {
    availableIn
    blocking
    component {
      group
      kind
      name
      service {
        git {
          folder
        }
        repository {
          url
        }
      }
    }
    deprecatedIn
    removedIn
    replacement
  }
  id
  name
  currentVersion
  pingedAt
  provider {
    id
    cloud
    name
    namespace
  }
  version
  nodePools {
    ...NodePool
  }
}
    ${NodePoolFragmentDoc}`;
export const GitRepositoriesRowFragmentDoc = gql`
    fragment GitRepositoriesRow on GitRepository {
  id
  url
  health
  authMethod
  editable
  error
  insertedAt
  pulledAt
  updatedAt
}
    `;
export const ServiceDeploymentsRowFragmentDoc = gql`
    fragment ServiceDeploymentsRow on ServiceDeployment {
  id
  name
  cluster {
    id
    name
  }
  repository {
    id
    url
  }
  insertedAt
  updatedAt
  componentStatus
  status
}
    `;
export const ServiceDeploymentRevisionFragmentDoc = gql`
    fragment ServiceDeploymentRevision on Revision {
  id
  version
  updatedAt
  insertedAt
  git {
    folder
    ref
  }
}
    `;
export const ServiceDeploymentRevisionsFragmentDoc = gql`
    fragment ServiceDeploymentRevisions on ServiceDeployment {
  revision {
    ...ServiceDeploymentRevision
  }
  revisions(first: 100) {
    edges {
      node {
        ...ServiceDeploymentRevision
      }
    }
  }
}
    ${ServiceDeploymentRevisionFragmentDoc}`;
export const ResourceSpecFragmentDoc = gql`
    fragment ResourceSpec on ResourceSpec {
  cpu
  memory
}
    `;
export const ResourcesFragmentDoc = gql`
    fragment Resources on Resources {
  limits {
    ...ResourceSpec
  }
  requests {
    ...ResourceSpec
  }
}
    ${ResourceSpecFragmentDoc}`;
export const DatabaseTableRowFragmentDoc = gql`
    fragment DatabaseTableRow on Postgresql {
  instances {
    uid
  }
  metadata {
    name
    namespace
    creationTimestamp
  }
  spec {
    numberOfInstances
    databases
    postgresql {
      version
    }
    resources {
      ...Resources
    }
    databases
    volume {
      size
    }
  }
  status {
    clusterStatus
  }
}
    ${ResourcesFragmentDoc}`;
export const UserFragmentDoc = gql`
    fragment User on User {
  id
  pluralId
  name
  email
  profile
  backgroundColor
  readTimestamp
  roles {
    admin
  }
}
    `;
export const GroupFragmentDoc = gql`
    fragment Group on Group {
  id
  name
  description
  insertedAt
  updatedAt
}
    `;
export const GroupMemberFragmentDoc = gql`
    fragment GroupMember on GroupMember {
  user {
    ...User
  }
  group {
    ...Group
  }
}
    ${UserFragmentDoc}
${GroupFragmentDoc}`;
export const AccessTokenFragmentDoc = gql`
    fragment AccessToken on AccessToken {
  id
  insertedAt
  token
  updatedAt
}
    `;
export const AccessTokenAuditFragmentDoc = gql`
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
    `;
export const InviteFragmentDoc = gql`
    fragment Invite on Invite {
  secureId
}
    `;
export const RoleBindingFragmentDoc = gql`
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
${GroupFragmentDoc}`;
export const RoleFragmentDoc = gql`
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
    ${RoleBindingFragmentDoc}`;
export const ManifestFragmentDoc = gql`
    fragment Manifest on PluralManifest {
  network {
    pluralDns
    subdomain
  }
  cluster
  bucketPrefix
}
    `;
export const AppDocument = gql`
    query App($name: String!) {
  application(name: $name) {
    configuration {
      helm
      terraform
    }
    ...ApplicationFragment
  }
  configurationOverlays(namespace: $name) {
    ...ConfigurationOverlayFragment
  }
}
    ${ApplicationFragmentFragmentDoc}
${ConfigurationOverlayFragmentFragmentDoc}`;

/**
 * __useAppQuery__
 *
 * To run a query within a React component, call `useAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useAppQuery(baseOptions: Apollo.QueryHookOptions<AppQuery, AppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppQuery, AppQueryVariables>(AppDocument, options);
      }
export function useAppLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppQuery, AppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppQuery, AppQueryVariables>(AppDocument, options);
        }
export type AppQueryHookResult = ReturnType<typeof useAppQuery>;
export type AppLazyQueryHookResult = ReturnType<typeof useAppLazyQuery>;
export type AppQueryResult = Apollo.QueryResult<AppQuery, AppQueryVariables>;
export const AppInfoDocument = gql`
    query AppInfo($name: String!) {
  application(name: $name) {
    ...ApplicationFragment
    info
  }
}
    ${ApplicationFragmentFragmentDoc}`;

/**
 * __useAppInfoQuery__
 *
 * To run a query within a React component, call `useAppInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppInfoQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useAppInfoQuery(baseOptions: Apollo.QueryHookOptions<AppInfoQuery, AppInfoQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppInfoQuery, AppInfoQueryVariables>(AppInfoDocument, options);
      }
export function useAppInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppInfoQuery, AppInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppInfoQuery, AppInfoQueryVariables>(AppInfoDocument, options);
        }
export type AppInfoQueryHookResult = ReturnType<typeof useAppInfoQuery>;
export type AppInfoLazyQueryHookResult = ReturnType<typeof useAppInfoLazyQuery>;
export type AppInfoQueryResult = Apollo.QueryResult<AppInfoQuery, AppInfoQueryVariables>;
export const RepositoryDocument = gql`
    query Repository($name: String!) {
  repository(name: $name) {
    ...RepositoryFragment
  }
}
    ${RepositoryFragmentFragmentDoc}`;

/**
 * __useRepositoryQuery__
 *
 * To run a query within a React component, call `useRepositoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepositoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepositoryQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useRepositoryQuery(baseOptions: Apollo.QueryHookOptions<RepositoryQuery, RepositoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RepositoryQuery, RepositoryQueryVariables>(RepositoryDocument, options);
      }
export function useRepositoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RepositoryQuery, RepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RepositoryQuery, RepositoryQueryVariables>(RepositoryDocument, options);
        }
export type RepositoryQueryHookResult = ReturnType<typeof useRepositoryQuery>;
export type RepositoryLazyQueryHookResult = ReturnType<typeof useRepositoryLazyQuery>;
export type RepositoryQueryResult = Apollo.QueryResult<RepositoryQuery, RepositoryQueryVariables>;
export const PluralContextDocument = gql`
    query PluralContext {
  pluralContext {
    buckets
    configuration
    domains
  }
}
    `;

/**
 * __usePluralContextQuery__
 *
 * To run a query within a React component, call `usePluralContextQuery` and pass it any options that fit your needs.
 * When your component renders, `usePluralContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePluralContextQuery({
 *   variables: {
 *   },
 * });
 */
export function usePluralContextQuery(baseOptions?: Apollo.QueryHookOptions<PluralContextQuery, PluralContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PluralContextQuery, PluralContextQueryVariables>(PluralContextDocument, options);
      }
export function usePluralContextLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PluralContextQuery, PluralContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PluralContextQuery, PluralContextQueryVariables>(PluralContextDocument, options);
        }
export type PluralContextQueryHookResult = ReturnType<typeof usePluralContextQuery>;
export type PluralContextLazyQueryHookResult = ReturnType<typeof usePluralContextLazyQuery>;
export type PluralContextQueryResult = Apollo.QueryResult<PluralContextQuery, PluralContextQueryVariables>;
export const CreateBuildDocument = gql`
    mutation CreateBuild($attributes: BuildAttributes!) {
  createBuild(attributes: $attributes) {
    id
  }
}
    `;
export type CreateBuildMutationFn = Apollo.MutationFunction<CreateBuildMutation, CreateBuildMutationVariables>;

/**
 * __useCreateBuildMutation__
 *
 * To run a mutation, you first call `useCreateBuildMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBuildMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBuildMutation, { data, loading, error }] = useCreateBuildMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateBuildMutation(baseOptions?: Apollo.MutationHookOptions<CreateBuildMutation, CreateBuildMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateBuildMutation, CreateBuildMutationVariables>(CreateBuildDocument, options);
      }
export type CreateBuildMutationHookResult = ReturnType<typeof useCreateBuildMutation>;
export type CreateBuildMutationResult = Apollo.MutationResult<CreateBuildMutation>;
export type CreateBuildMutationOptions = Apollo.BaseMutationOptions<CreateBuildMutation, CreateBuildMutationVariables>;
export const ClustersDocument = gql`
    query Clusters {
  clusters(first: 100) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClustersRow
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ClustersRowFragmentDoc}`;

/**
 * __useClustersQuery__
 *
 * To run a query within a React component, call `useClustersQuery` and pass it any options that fit your needs.
 * When your component renders, `useClustersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClustersQuery({
 *   variables: {
 *   },
 * });
 */
export function useClustersQuery(baseOptions?: Apollo.QueryHookOptions<ClustersQuery, ClustersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClustersQuery, ClustersQueryVariables>(ClustersDocument, options);
      }
export function useClustersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClustersQuery, ClustersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClustersQuery, ClustersQueryVariables>(ClustersDocument, options);
        }
export type ClustersQueryHookResult = ReturnType<typeof useClustersQuery>;
export type ClustersLazyQueryHookResult = ReturnType<typeof useClustersLazyQuery>;
export type ClustersQueryResult = Apollo.QueryResult<ClustersQuery, ClustersQueryVariables>;
export const UpdateClusterDocument = gql`
    mutation UpdateCluster($id: ID!, $attributes: ClusterUpdateAttributes!) {
  updateCluster(id: $id, attributes: $attributes) {
    ...ClustersRow
  }
}
    ${ClustersRowFragmentDoc}`;
export type UpdateClusterMutationFn = Apollo.MutationFunction<UpdateClusterMutation, UpdateClusterMutationVariables>;

/**
 * __useUpdateClusterMutation__
 *
 * To run a mutation, you first call `useUpdateClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateClusterMutation, { data, loading, error }] = useUpdateClusterMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateClusterMutation(baseOptions?: Apollo.MutationHookOptions<UpdateClusterMutation, UpdateClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateClusterMutation, UpdateClusterMutationVariables>(UpdateClusterDocument, options);
      }
export type UpdateClusterMutationHookResult = ReturnType<typeof useUpdateClusterMutation>;
export type UpdateClusterMutationResult = Apollo.MutationResult<UpdateClusterMutation>;
export type UpdateClusterMutationOptions = Apollo.BaseMutationOptions<UpdateClusterMutation, UpdateClusterMutationVariables>;
export const GitRepositoriesDocument = gql`
    query GitRepositories {
  gitRepositories(first: 100) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...GitRepositoriesRow
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GitRepositoriesRowFragmentDoc}`;

/**
 * __useGitRepositoriesQuery__
 *
 * To run a query within a React component, call `useGitRepositoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGitRepositoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGitRepositoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGitRepositoriesQuery(baseOptions?: Apollo.QueryHookOptions<GitRepositoriesQuery, GitRepositoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GitRepositoriesQuery, GitRepositoriesQueryVariables>(GitRepositoriesDocument, options);
      }
export function useGitRepositoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GitRepositoriesQuery, GitRepositoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GitRepositoriesQuery, GitRepositoriesQueryVariables>(GitRepositoriesDocument, options);
        }
export type GitRepositoriesQueryHookResult = ReturnType<typeof useGitRepositoriesQuery>;
export type GitRepositoriesLazyQueryHookResult = ReturnType<typeof useGitRepositoriesLazyQuery>;
export type GitRepositoriesQueryResult = Apollo.QueryResult<GitRepositoriesQuery, GitRepositoriesQueryVariables>;
export const CreateGitRepositoryDocument = gql`
    mutation CreateGitRepository($attributes: GitAttributes!) {
  createGitRepository(attributes: $attributes) {
    ...GitRepositoriesRow
  }
}
    ${GitRepositoriesRowFragmentDoc}`;
export type CreateGitRepositoryMutationFn = Apollo.MutationFunction<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>;

/**
 * __useCreateGitRepositoryMutation__
 *
 * To run a mutation, you first call `useCreateGitRepositoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGitRepositoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGitRepositoryMutation, { data, loading, error }] = useCreateGitRepositoryMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateGitRepositoryMutation(baseOptions?: Apollo.MutationHookOptions<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>(CreateGitRepositoryDocument, options);
      }
export type CreateGitRepositoryMutationHookResult = ReturnType<typeof useCreateGitRepositoryMutation>;
export type CreateGitRepositoryMutationResult = Apollo.MutationResult<CreateGitRepositoryMutation>;
export type CreateGitRepositoryMutationOptions = Apollo.BaseMutationOptions<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>;
export const DeleteGitRepositoryDocument = gql`
    mutation DeleteGitRepository($id: ID!) {
  deleteGitRepository(id: $id) {
    id
  }
}
    `;
export type DeleteGitRepositoryMutationFn = Apollo.MutationFunction<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>;

/**
 * __useDeleteGitRepositoryMutation__
 *
 * To run a mutation, you first call `useDeleteGitRepositoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGitRepositoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGitRepositoryMutation, { data, loading, error }] = useDeleteGitRepositoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGitRepositoryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>(DeleteGitRepositoryDocument, options);
      }
export type DeleteGitRepositoryMutationHookResult = ReturnType<typeof useDeleteGitRepositoryMutation>;
export type DeleteGitRepositoryMutationResult = Apollo.MutationResult<DeleteGitRepositoryMutation>;
export type DeleteGitRepositoryMutationOptions = Apollo.BaseMutationOptions<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>;
export const UpdateGitRepositoryDocument = gql`
    mutation UpdateGitRepository($id: ID!, $attributes: GitAttributes!) {
  updateGitRepository(id: $id, attributes: $attributes) {
    ...GitRepositoriesRow
  }
}
    ${GitRepositoriesRowFragmentDoc}`;
export type UpdateGitRepositoryMutationFn = Apollo.MutationFunction<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>;

/**
 * __useUpdateGitRepositoryMutation__
 *
 * To run a mutation, you first call `useUpdateGitRepositoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGitRepositoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGitRepositoryMutation, { data, loading, error }] = useUpdateGitRepositoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateGitRepositoryMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>(UpdateGitRepositoryDocument, options);
      }
export type UpdateGitRepositoryMutationHookResult = ReturnType<typeof useUpdateGitRepositoryMutation>;
export type UpdateGitRepositoryMutationResult = Apollo.MutationResult<UpdateGitRepositoryMutation>;
export type UpdateGitRepositoryMutationOptions = Apollo.BaseMutationOptions<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>;
export const ServiceDeploymentsDocument = gql`
    query ServiceDeployments {
  serviceDeployments(first: 100) {
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
    ${PageInfoFragmentDoc}
${ServiceDeploymentsRowFragmentDoc}`;

/**
 * __useServiceDeploymentsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentsQuery({
 *   variables: {
 *   },
 * });
 */
export function useServiceDeploymentsQuery(baseOptions?: Apollo.QueryHookOptions<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>(ServiceDeploymentsDocument, options);
      }
export function useServiceDeploymentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>(ServiceDeploymentsDocument, options);
        }
export type ServiceDeploymentsQueryHookResult = ReturnType<typeof useServiceDeploymentsQuery>;
export type ServiceDeploymentsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentsLazyQuery>;
export type ServiceDeploymentsQueryResult = Apollo.QueryResult<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>;
export const ServiceDeploymentRevisionsDocument = gql`
    query ServiceDeploymentRevisions($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentRevisions
  }
}
    ${ServiceDeploymentRevisionsFragmentDoc}`;

/**
 * __useServiceDeploymentRevisionsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentRevisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentRevisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentRevisionsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentRevisionsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>(ServiceDeploymentRevisionsDocument, options);
      }
export function useServiceDeploymentRevisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>(ServiceDeploymentRevisionsDocument, options);
        }
export type ServiceDeploymentRevisionsQueryHookResult = ReturnType<typeof useServiceDeploymentRevisionsQuery>;
export type ServiceDeploymentRevisionsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentRevisionsLazyQuery>;
export type ServiceDeploymentRevisionsQueryResult = Apollo.QueryResult<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>;
export const CreateServiceDeploymentDocument = gql`
    mutation CreateServiceDeployment($attributes: ServiceDeploymentAttributes!, $cluster: String, $clusterId: ID) {
  createServiceDeployment(
    attributes: $attributes
    cluster: $cluster
    clusterId: $clusterId
  ) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type CreateServiceDeploymentMutationFn = Apollo.MutationFunction<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>;

/**
 * __useCreateServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useCreateServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createServiceDeploymentMutation, { data, loading, error }] = useCreateServiceDeploymentMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *      cluster: // value for 'cluster'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useCreateServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>(CreateServiceDeploymentDocument, options);
      }
export type CreateServiceDeploymentMutationHookResult = ReturnType<typeof useCreateServiceDeploymentMutation>;
export type CreateServiceDeploymentMutationResult = Apollo.MutationResult<CreateServiceDeploymentMutation>;
export type CreateServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>;
export const DeleteServiceDeploymentDocument = gql`
    mutation DeleteServiceDeployment($id: ID!) {
  deleteServiceDeployment(id: $id) {
    id
  }
}
    `;
export type DeleteServiceDeploymentMutationFn = Apollo.MutationFunction<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>;

/**
 * __useDeleteServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useDeleteServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteServiceDeploymentMutation, { data, loading, error }] = useDeleteServiceDeploymentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>(DeleteServiceDeploymentDocument, options);
      }
export type DeleteServiceDeploymentMutationHookResult = ReturnType<typeof useDeleteServiceDeploymentMutation>;
export type DeleteServiceDeploymentMutationResult = Apollo.MutationResult<DeleteServiceDeploymentMutation>;
export type DeleteServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>;
export const UpdateServiceDeploymentDocument = gql`
    mutation UpdateServiceDeployment($id: ID!, $attributes: ServiceUpdateAttributes!) {
  updateServiceDeployment(id: $id, attributes: $attributes) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type UpdateServiceDeploymentMutationFn = Apollo.MutationFunction<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>;

/**
 * __useUpdateServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useUpdateServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateServiceDeploymentMutation, { data, loading, error }] = useUpdateServiceDeploymentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>(UpdateServiceDeploymentDocument, options);
      }
export type UpdateServiceDeploymentMutationHookResult = ReturnType<typeof useUpdateServiceDeploymentMutation>;
export type UpdateServiceDeploymentMutationResult = Apollo.MutationResult<UpdateServiceDeploymentMutation>;
export type UpdateServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>;
export const RollbackServiceDocument = gql`
    mutation RollbackService($id: ID, $revisionId: ID!) {
  rollbackService(id: $id, revisionId: $revisionId) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type RollbackServiceMutationFn = Apollo.MutationFunction<RollbackServiceMutation, RollbackServiceMutationVariables>;

/**
 * __useRollbackServiceMutation__
 *
 * To run a mutation, you first call `useRollbackServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRollbackServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rollbackServiceMutation, { data, loading, error }] = useRollbackServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      revisionId: // value for 'revisionId'
 *   },
 * });
 */
export function useRollbackServiceMutation(baseOptions?: Apollo.MutationHookOptions<RollbackServiceMutation, RollbackServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RollbackServiceMutation, RollbackServiceMutationVariables>(RollbackServiceDocument, options);
      }
export type RollbackServiceMutationHookResult = ReturnType<typeof useRollbackServiceMutation>;
export type RollbackServiceMutationResult = Apollo.MutationResult<RollbackServiceMutation>;
export type RollbackServiceMutationOptions = Apollo.BaseMutationOptions<RollbackServiceMutation, RollbackServiceMutationVariables>;
export const RestorePostgresDocument = gql`
    mutation RestorePostgres($clone: CloneAttributes, $name: String!, $namespace: String!, $timestamp: DateTime!) {
  restorePostgres(
    clone: $clone
    name: $name
    namespace: $namespace
    timestamp: $timestamp
  ) {
    status {
      clusterStatus
    }
  }
}
    `;
export type RestorePostgresMutationFn = Apollo.MutationFunction<RestorePostgresMutation, RestorePostgresMutationVariables>;

/**
 * __useRestorePostgresMutation__
 *
 * To run a mutation, you first call `useRestorePostgresMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestorePostgresMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restorePostgresMutation, { data, loading, error }] = useRestorePostgresMutation({
 *   variables: {
 *      clone: // value for 'clone'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      timestamp: // value for 'timestamp'
 *   },
 * });
 */
export function useRestorePostgresMutation(baseOptions?: Apollo.MutationHookOptions<RestorePostgresMutation, RestorePostgresMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RestorePostgresMutation, RestorePostgresMutationVariables>(RestorePostgresDocument, options);
      }
export type RestorePostgresMutationHookResult = ReturnType<typeof useRestorePostgresMutation>;
export type RestorePostgresMutationResult = Apollo.MutationResult<RestorePostgresMutation>;
export type RestorePostgresMutationOptions = Apollo.BaseMutationOptions<RestorePostgresMutation, RestorePostgresMutationVariables>;
export const PostgresDatabasesDocument = gql`
    query PostgresDatabases {
  postgresDatabases {
    ...DatabaseTableRow
  }
  applications {
    name
    spec {
      descriptor {
        icons
      }
    }
  }
}
    ${DatabaseTableRowFragmentDoc}`;

/**
 * __usePostgresDatabasesQuery__
 *
 * To run a query within a React component, call `usePostgresDatabasesQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostgresDatabasesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostgresDatabasesQuery({
 *   variables: {
 *   },
 * });
 */
export function usePostgresDatabasesQuery(baseOptions?: Apollo.QueryHookOptions<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>(PostgresDatabasesDocument, options);
      }
export function usePostgresDatabasesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>(PostgresDatabasesDocument, options);
        }
export type PostgresDatabasesQueryHookResult = ReturnType<typeof usePostgresDatabasesQuery>;
export type PostgresDatabasesLazyQueryHookResult = ReturnType<typeof usePostgresDatabasesLazyQuery>;
export type PostgresDatabasesQueryResult = Apollo.QueryResult<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>;
export const PostgresDatabaseDocument = gql`
    query PostgresDatabase($name: String!, $namespace: String!) {
  postgresDatabase(name: $name, namespace: $namespace) {
    ...DatabaseTableRow
  }
}
    ${DatabaseTableRowFragmentDoc}`;

/**
 * __usePostgresDatabaseQuery__
 *
 * To run a query within a React component, call `usePostgresDatabaseQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostgresDatabaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostgresDatabaseQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function usePostgresDatabaseQuery(baseOptions: Apollo.QueryHookOptions<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>(PostgresDatabaseDocument, options);
      }
export function usePostgresDatabaseLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>(PostgresDatabaseDocument, options);
        }
export type PostgresDatabaseQueryHookResult = ReturnType<typeof usePostgresDatabaseQuery>;
export type PostgresDatabaseLazyQueryHookResult = ReturnType<typeof usePostgresDatabaseLazyQuery>;
export type PostgresDatabaseQueryResult = Apollo.QueryResult<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>;
export const GroupsDocument = gql`
    query Groups($q: String, $cursor: String) {
  groups(q: $q, first: 20, after: $cursor) {
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
${GroupFragmentDoc}`;

/**
 * __useGroupsQuery__
 *
 * To run a query within a React component, call `useGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupsQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useGroupsQuery(baseOptions?: Apollo.QueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
      }
export function useGroupsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
        }
export type GroupsQueryHookResult = ReturnType<typeof useGroupsQuery>;
export type GroupsLazyQueryHookResult = ReturnType<typeof useGroupsLazyQuery>;
export type GroupsQueryResult = Apollo.QueryResult<GroupsQuery, GroupsQueryVariables>;
export const SearchGroupsDocument = gql`
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
${GroupFragmentDoc}`;

/**
 * __useSearchGroupsQuery__
 *
 * To run a query within a React component, call `useSearchGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchGroupsQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useSearchGroupsQuery(baseOptions?: Apollo.QueryHookOptions<SearchGroupsQuery, SearchGroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchGroupsQuery, SearchGroupsQueryVariables>(SearchGroupsDocument, options);
      }
export function useSearchGroupsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchGroupsQuery, SearchGroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchGroupsQuery, SearchGroupsQueryVariables>(SearchGroupsDocument, options);
        }
export type SearchGroupsQueryHookResult = ReturnType<typeof useSearchGroupsQuery>;
export type SearchGroupsLazyQueryHookResult = ReturnType<typeof useSearchGroupsLazyQuery>;
export type SearchGroupsQueryResult = Apollo.QueryResult<SearchGroupsQuery, SearchGroupsQueryVariables>;
export const GroupMembersDocument = gql`
    query GroupMembers($cursor: String, $id: ID!) {
  groupMembers(groupId: $id, after: $cursor, first: 20) {
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
${GroupMemberFragmentDoc}`;

/**
 * __useGroupMembersQuery__
 *
 * To run a query within a React component, call `useGroupMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupMembersQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGroupMembersQuery(baseOptions: Apollo.QueryHookOptions<GroupMembersQuery, GroupMembersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupMembersQuery, GroupMembersQueryVariables>(GroupMembersDocument, options);
      }
export function useGroupMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupMembersQuery, GroupMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupMembersQuery, GroupMembersQueryVariables>(GroupMembersDocument, options);
        }
export type GroupMembersQueryHookResult = ReturnType<typeof useGroupMembersQuery>;
export type GroupMembersLazyQueryHookResult = ReturnType<typeof useGroupMembersLazyQuery>;
export type GroupMembersQueryResult = Apollo.QueryResult<GroupMembersQuery, GroupMembersQueryVariables>;
export const CreateGroupMemberDocument = gql`
    mutation CreateGroupMember($groupId: ID!, $userId: ID!) {
  createGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}`;
export type CreateGroupMemberMutationFn = Apollo.MutationFunction<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>;

/**
 * __useCreateGroupMemberMutation__
 *
 * To run a mutation, you first call `useCreateGroupMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupMemberMutation, { data, loading, error }] = useCreateGroupMemberMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCreateGroupMemberMutation(baseOptions?: Apollo.MutationHookOptions<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>(CreateGroupMemberDocument, options);
      }
export type CreateGroupMemberMutationHookResult = ReturnType<typeof useCreateGroupMemberMutation>;
export type CreateGroupMemberMutationResult = Apollo.MutationResult<CreateGroupMemberMutation>;
export type CreateGroupMemberMutationOptions = Apollo.BaseMutationOptions<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>;
export const DeleteGroupMemberDocument = gql`
    mutation DeleteGroupMember($groupId: ID!, $userId: ID!) {
  deleteGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}`;
export type DeleteGroupMemberMutationFn = Apollo.MutationFunction<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>;

/**
 * __useDeleteGroupMemberMutation__
 *
 * To run a mutation, you first call `useDeleteGroupMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGroupMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGroupMemberMutation, { data, loading, error }] = useDeleteGroupMemberMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useDeleteGroupMemberMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>(DeleteGroupMemberDocument, options);
      }
export type DeleteGroupMemberMutationHookResult = ReturnType<typeof useDeleteGroupMemberMutation>;
export type DeleteGroupMemberMutationResult = Apollo.MutationResult<DeleteGroupMemberMutation>;
export type DeleteGroupMemberMutationOptions = Apollo.BaseMutationOptions<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>;
export const CreateGroupDocument = gql`
    mutation CreateGroup($attributes: GroupAttributes!) {
  createGroup(attributes: $attributes) {
    ...Group
  }
}
    ${GroupFragmentDoc}`;
export type CreateGroupMutationFn = Apollo.MutationFunction<CreateGroupMutation, CreateGroupMutationVariables>;

/**
 * __useCreateGroupMutation__
 *
 * To run a mutation, you first call `useCreateGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupMutation, { data, loading, error }] = useCreateGroupMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateGroupMutation(baseOptions?: Apollo.MutationHookOptions<CreateGroupMutation, CreateGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGroupMutation, CreateGroupMutationVariables>(CreateGroupDocument, options);
      }
export type CreateGroupMutationHookResult = ReturnType<typeof useCreateGroupMutation>;
export type CreateGroupMutationResult = Apollo.MutationResult<CreateGroupMutation>;
export type CreateGroupMutationOptions = Apollo.BaseMutationOptions<CreateGroupMutation, CreateGroupMutationVariables>;
export const UpdateGroupDocument = gql`
    mutation UpdateGroup($id: ID!, $attributes: GroupAttributes!) {
  updateGroup(groupId: $id, attributes: $attributes) {
    ...Group
  }
}
    ${GroupFragmentDoc}`;
export type UpdateGroupMutationFn = Apollo.MutationFunction<UpdateGroupMutation, UpdateGroupMutationVariables>;

/**
 * __useUpdateGroupMutation__
 *
 * To run a mutation, you first call `useUpdateGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGroupMutation, { data, loading, error }] = useUpdateGroupMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateGroupMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGroupMutation, UpdateGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGroupMutation, UpdateGroupMutationVariables>(UpdateGroupDocument, options);
      }
export type UpdateGroupMutationHookResult = ReturnType<typeof useUpdateGroupMutation>;
export type UpdateGroupMutationResult = Apollo.MutationResult<UpdateGroupMutation>;
export type UpdateGroupMutationOptions = Apollo.BaseMutationOptions<UpdateGroupMutation, UpdateGroupMutationVariables>;
export const DeleteGroupDocument = gql`
    mutation DeleteGroup($id: ID!) {
  deleteGroup(groupId: $id) {
    ...Group
  }
}
    ${GroupFragmentDoc}`;
export type DeleteGroupMutationFn = Apollo.MutationFunction<DeleteGroupMutation, DeleteGroupMutationVariables>;

/**
 * __useDeleteGroupMutation__
 *
 * To run a mutation, you first call `useDeleteGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGroupMutation, { data, loading, error }] = useDeleteGroupMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGroupMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGroupMutation, DeleteGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGroupMutation, DeleteGroupMutationVariables>(DeleteGroupDocument, options);
      }
export type DeleteGroupMutationHookResult = ReturnType<typeof useDeleteGroupMutation>;
export type DeleteGroupMutationResult = Apollo.MutationResult<DeleteGroupMutation>;
export type DeleteGroupMutationOptions = Apollo.BaseMutationOptions<DeleteGroupMutation, DeleteGroupMutationVariables>;
export const AccessTokensDocument = gql`
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
${AccessTokenFragmentDoc}`;

/**
 * __useAccessTokensQuery__
 *
 * To run a query within a React component, call `useAccessTokensQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccessTokensQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccessTokensQuery({
 *   variables: {
 *   },
 * });
 */
export function useAccessTokensQuery(baseOptions?: Apollo.QueryHookOptions<AccessTokensQuery, AccessTokensQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AccessTokensQuery, AccessTokensQueryVariables>(AccessTokensDocument, options);
      }
export function useAccessTokensLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AccessTokensQuery, AccessTokensQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AccessTokensQuery, AccessTokensQueryVariables>(AccessTokensDocument, options);
        }
export type AccessTokensQueryHookResult = ReturnType<typeof useAccessTokensQuery>;
export type AccessTokensLazyQueryHookResult = ReturnType<typeof useAccessTokensLazyQuery>;
export type AccessTokensQueryResult = Apollo.QueryResult<AccessTokensQuery, AccessTokensQueryVariables>;
export const TokenAuditsDocument = gql`
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
${AccessTokenAuditFragmentDoc}`;

/**
 * __useTokenAuditsQuery__
 *
 * To run a query within a React component, call `useTokenAuditsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTokenAuditsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTokenAuditsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useTokenAuditsQuery(baseOptions: Apollo.QueryHookOptions<TokenAuditsQuery, TokenAuditsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TokenAuditsQuery, TokenAuditsQueryVariables>(TokenAuditsDocument, options);
      }
export function useTokenAuditsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TokenAuditsQuery, TokenAuditsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TokenAuditsQuery, TokenAuditsQueryVariables>(TokenAuditsDocument, options);
        }
export type TokenAuditsQueryHookResult = ReturnType<typeof useTokenAuditsQuery>;
export type TokenAuditsLazyQueryHookResult = ReturnType<typeof useTokenAuditsLazyQuery>;
export type TokenAuditsQueryResult = Apollo.QueryResult<TokenAuditsQuery, TokenAuditsQueryVariables>;
export const CreateAccessTokenDocument = gql`
    mutation CreateAccessToken {
  createAccessToken {
    ...AccessToken
  }
}
    ${AccessTokenFragmentDoc}`;
export type CreateAccessTokenMutationFn = Apollo.MutationFunction<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>;

/**
 * __useCreateAccessTokenMutation__
 *
 * To run a mutation, you first call `useCreateAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAccessTokenMutation, { data, loading, error }] = useCreateAccessTokenMutation({
 *   variables: {
 *   },
 * });
 */
export function useCreateAccessTokenMutation(baseOptions?: Apollo.MutationHookOptions<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>(CreateAccessTokenDocument, options);
      }
export type CreateAccessTokenMutationHookResult = ReturnType<typeof useCreateAccessTokenMutation>;
export type CreateAccessTokenMutationResult = Apollo.MutationResult<CreateAccessTokenMutation>;
export type CreateAccessTokenMutationOptions = Apollo.BaseMutationOptions<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>;
export const DeleteAccessTokenDocument = gql`
    mutation DeleteAccessToken($token: String!) {
  deleteAccessToken(token: $token) {
    ...AccessToken
  }
}
    ${AccessTokenFragmentDoc}`;
export type DeleteAccessTokenMutationFn = Apollo.MutationFunction<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>;

/**
 * __useDeleteAccessTokenMutation__
 *
 * To run a mutation, you first call `useDeleteAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAccessTokenMutation, { data, loading, error }] = useDeleteAccessTokenMutation({
 *   variables: {
 *      token: // value for 'token'
 *   },
 * });
 */
export function useDeleteAccessTokenMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>(DeleteAccessTokenDocument, options);
      }
export type DeleteAccessTokenMutationHookResult = ReturnType<typeof useDeleteAccessTokenMutation>;
export type DeleteAccessTokenMutationResult = Apollo.MutationResult<DeleteAccessTokenMutation>;
export type DeleteAccessTokenMutationOptions = Apollo.BaseMutationOptions<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    ...User
    boundRoles {
      ...Role
    }
    unreadNotifications
  }
  externalToken
  clusterInfo {
    version
    platform
    gitCommit
  }
  configuration {
    vpnEnabled
    gitCommit
    isDemoProject
    isSandbox
    pluralLogin
    manifest {
      ...Manifest
    }
    gitStatus {
      cloned
      output
    }
  }
}
    ${UserFragmentDoc}
${RoleFragmentDoc}
${ManifestFragmentDoc}`;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const namedOperations = {
  Query: {
    App: 'App',
    AppInfo: 'AppInfo',
    Repository: 'Repository',
    PluralContext: 'PluralContext',
    Clusters: 'Clusters',
    GitRepositories: 'GitRepositories',
    ServiceDeployments: 'ServiceDeployments',
    ServiceDeploymentRevisions: 'ServiceDeploymentRevisions',
    PostgresDatabases: 'PostgresDatabases',
    PostgresDatabase: 'PostgresDatabase',
    Groups: 'Groups',
    SearchGroups: 'SearchGroups',
    GroupMembers: 'GroupMembers',
    AccessTokens: 'AccessTokens',
    TokenAudits: 'TokenAudits',
    Me: 'Me'
  },
  Mutation: {
    CreateBuild: 'CreateBuild',
    UpdateCluster: 'UpdateCluster',
    CreateGitRepository: 'CreateGitRepository',
    DeleteGitRepository: 'DeleteGitRepository',
    UpdateGitRepository: 'UpdateGitRepository',
    CreateServiceDeployment: 'CreateServiceDeployment',
    DeleteServiceDeployment: 'DeleteServiceDeployment',
    UpdateServiceDeployment: 'UpdateServiceDeployment',
    RollbackService: 'RollbackService',
    RestorePostgres: 'RestorePostgres',
    CreateGroupMember: 'CreateGroupMember',
    DeleteGroupMember: 'DeleteGroupMember',
    CreateGroup: 'CreateGroup',
    UpdateGroup: 'UpdateGroup',
    DeleteGroup: 'DeleteGroup',
    CreateAccessToken: 'CreateAccessToken',
    DeleteAccessToken: 'DeleteAccessToken'
  },
  Fragment: {
    CostAnalysisFragment: 'CostAnalysisFragment',
    FileContentFragment: 'FileContentFragment',
    ConfigurationFragment: 'ConfigurationFragment',
    ApplicationSpecFragment: 'ApplicationSpecFragment',
    ApplicationStatusFragment: 'ApplicationStatusFragment',
    ApplicationFragment: 'ApplicationFragment',
    MetadataFragment: 'MetadataFragment',
    ConfigurationOverlayFragment: 'ConfigurationOverlayFragment',
    RepositoryFragment: 'RepositoryFragment',
    PageInfo: 'PageInfo',
    NodePool: 'NodePool',
    ClustersRow: 'ClustersRow',
    GitRepositoriesRow: 'GitRepositoriesRow',
    ServiceDeploymentsRow: 'ServiceDeploymentsRow',
    ServiceDeploymentRevision: 'ServiceDeploymentRevision',
    ServiceDeploymentRevisions: 'ServiceDeploymentRevisions',
    ResourceSpec: 'ResourceSpec',
    Resources: 'Resources',
    DatabaseTableRow: 'DatabaseTableRow',
    GroupMember: 'GroupMember',
    Group: 'Group',
    AccessToken: 'AccessToken',
    AccessTokenAudit: 'AccessTokenAudit',
    User: 'User',
    Invite: 'Invite',
    RoleBinding: 'RoleBinding',
    Role: 'Role',
    Manifest: 'Manifest'
  }
}