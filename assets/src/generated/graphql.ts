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

/** Input configuration for an add-on you can install */
export type AddOnConfiguration = {
  __typename?: 'AddOnConfiguration';
  documentation?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
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
  Pipeline = 'PIPELINE',
  Pod = 'POD',
  Policy = 'POLICY',
  ProviderCredential = 'PROVIDER_CREDENTIAL',
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
  region?: InputMaybe<Scalars['String']['input']>;
};

export type AwsSettingsAttributes = {
  accessKeyId: Scalars['String']['input'];
  secretAccessKey: Scalars['String']['input'];
};

export type AzureSettingsAttributes = {
  clientId: Scalars['ID']['input'];
  clientSecret: Scalars['String']['input'];
  tenantId: Scalars['String']['input'];
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
  azure?: InputMaybe<AzureSettingsAttributes>;
  gcp?: InputMaybe<GcpSettingsAttributes>;
};

/** cloud specific settings for a node pool */
export type CloudSettings = {
  __typename?: 'CloudSettings';
  aws?: Maybe<AwsCloud>;
};

export type CloudSettingsAttributes = {
  aws?: InputMaybe<AwsCloudAttributes>;
  gcp?: InputMaybe<GcpCloudAttributes>;
};

/** a representation of a cluster you can deploy to */
export type Cluster = {
  __typename?: 'Cluster';
  /** all api deprecations for all services in this cluster */
  apiDeprecations?: Maybe<Array<Maybe<ApiDeprecation>>>;
  /** a custom credential to use when provisioning this cluster */
  credential?: Maybe<ProviderCredential>;
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
  /** whether the deploy operator has been registered for this cluster */
  installed?: Maybe<Scalars['Boolean']['output']>;
  /** the url of the kas server you can access this cluster from */
  kasUrl?: Maybe<Scalars['String']['output']>;
  /** human readable name of this cluster, will also translate to cloud k8s name */
  name: Scalars['String']['output'];
  /** list the cached node metrics for a cluster, can also be stale up to 5m */
  nodeMetrics?: Maybe<Array<Maybe<NodeMetric>>>;
  /** list of node pool specs managed by CAPI */
  nodePools?: Maybe<Array<Maybe<NodePool>>>;
  /** list cached nodes for a cluster, this can be stale up to 5m */
  nodes?: Maybe<Array<Maybe<Node>>>;
  /** last time the deploy operator pinged this cluster */
  pingedAt?: Maybe<Scalars['DateTime']['output']>;
  /** if true, this cluster cannot be deleted */
  protect?: Maybe<Scalars['Boolean']['output']>;
  /** the provider we use to create this cluster (null if BYOK) */
  provider?: Maybe<ClusterProvider>;
  /** read policy for this cluster */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** a custom git repository if you want to define your own CAPI manifests */
  repository?: Maybe<GitRepository>;
  /** a relay connection of all revisions of this service, these are periodically pruned up to a history limit */
  revisions?: Maybe<RevisionConnection>;
  /** whether this is the management cluster itself */
  self?: Maybe<Scalars['Boolean']['output']>;
  /** the service used to deploy the CAPI resources of this cluster */
  service?: Maybe<ServiceDeployment>;
  /** any errors which might have occurred during the bootstrap process */
  serviceErrors?: Maybe<Array<Maybe<ServiceError>>>;
  /** the status of the cluster as seen from the CAPI operator, since some clusters can be provisioned without CAPI, this can be null */
  status?: Maybe<ClusterStatus>;
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

/** A common kubernetes cluster add-on like cert-manager, istio, etc */
export type ClusterAddOn = {
  __typename?: 'ClusterAddOn';
  configuration?: Maybe<Array<Maybe<AddOnConfiguration>>>;
  global?: Maybe<Scalars['Boolean']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type ClusterAttributes = {
  cloudSettings?: InputMaybe<CloudSettingsAttributes>;
  /** a cloud credential to use when provisioning this cluster */
  credentialId?: InputMaybe<Scalars['ID']['input']>;
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: InputMaybe<Scalars['String']['input']>;
  kubeconfig?: InputMaybe<KubeconfigAttributes>;
  name: Scalars['String']['input'];
  nodePools?: InputMaybe<Array<InputMaybe<NodePoolAttributes>>>;
  protect?: InputMaybe<Scalars['Boolean']['input']>;
  providerId?: InputMaybe<Scalars['ID']['input']>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  version: Scalars['String']['input'];
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

/** a single condition struct for various phases of the cluster provisionining process */
export type ClusterCondition = {
  __typename?: 'ClusterCondition';
  lastTransitionTime?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  severity?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
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
  /** a list of credentials eligible for this provider */
  credentials?: Maybe<Array<Maybe<ProviderCredential>>>;
  /** when the cluster provider was deleted */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
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
  /** the repository for the CAPI service itself if customized */
  providerRepository?: Maybe<GitRepository>;
  /** the region names this provider can deploy to */
  regions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the repository used to serve cluster manifests */
  repository?: Maybe<GitRepository>;
  /** the service of the CAPI controller itself */
  service?: Maybe<ServiceDeployment>;
  /** the kubernetes versions this provider currently supports */
  supportedVersions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
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
  /** if you optionally want to reconfigure the git repository for the cluster provider */
  service?: InputMaybe<ClusterServiceAttributes>;
};

export type ClusterServiceAttributes = {
  git: GitRefAttributes;
  id: Scalars['ID']['input'];
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
};

/** the crd status of the cluster as seen by the CAPI operator */
export type ClusterStatus = {
  __typename?: 'ClusterStatus';
  conditions?: Maybe<Array<Maybe<ClusterCondition>>>;
  controlPlaneReady?: Maybe<Scalars['Boolean']['output']>;
  failureMessage?: Maybe<Scalars['String']['output']>;
  failureReason?: Maybe<Scalars['String']['output']>;
  phase?: Maybe<Scalars['String']['output']>;
};

export type ClusterUpdateAttributes = {
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: InputMaybe<Scalars['String']['input']>;
  kubeconfig?: InputMaybe<KubeconfigAttributes>;
  nodePools?: InputMaybe<Array<InputMaybe<NodePoolAttributes>>>;
  protect?: InputMaybe<Scalars['Boolean']['input']>;
  /** if you optionally want to reconfigure the git repository for the cluster service */
  service?: InputMaybe<ClusterServiceAttributes>;
  version: Scalars['String']['input'];
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
  value?: InputMaybe<Scalars['String']['input']>;
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
  readme?: Maybe<Scalars['String']['output']>;
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

export enum GateState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  Pending = 'PENDING'
}

export enum GateType {
  Approval = 'APPROVAL',
  Job = 'JOB',
  Window = 'WINDOW'
}

export type GcpCloudAttributes = {
  network?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
};

export type GcpSettingsAttributes = {
  applicationCredentials: Scalars['String']['input'];
};

export type GitAttributes = {
  /** a manually supplied https path for non standard git setups.  This is auto-inferred in many cases */
  httpsPath?: InputMaybe<Scalars['String']['input']>;
  /** a passphrase to decrypt the given private key */
  passphrase?: InputMaybe<Scalars['String']['input']>;
  /** the http password for http authenticated repos */
  password?: InputMaybe<Scalars['String']['input']>;
  /** an ssh private key to use with this repo if an ssh url was given */
  privateKey?: InputMaybe<Scalars['String']['input']>;
  /** the url of this repository */
  url: Scalars['String']['input'];
  /** similar to https_path, a manually supplied url format for custom git.  Should be something like {url}/tree/{ref}/{folder} */
  urlFormat?: InputMaybe<Scalars['String']['input']>;
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
  /** the https url for this git repo */
  httpsPath?: Maybe<Scalars['String']['output']>;
  /** internal id of this repository */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last successsful git pull timestamp */
  pulledAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the git url of the repository, either https or ssh supported */
  url: Scalars['String']['output'];
  /** a format string to get the http url for a subfolder in a git repo */
  urlFormat?: Maybe<Scalars['String']['output']>;
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

export type KubernetesUnstructured = {
  __typename?: 'KubernetesUnstructured';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw?: Maybe<Scalars['Map']['output']>;
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
  timestamp?: Maybe<Scalars['Long']['output']>;
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
  /** whether this is a spot pool or not */
  spot?: Maybe<Scalars['Boolean']['output']>;
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

/** a release pipeline, composed of multiple stages each with potentially multiple services */
export type Pipeline = {
  __typename?: 'Pipeline';
  /** edges linking two stages w/in the pipeline in a full DAG */
  edges?: Maybe<Array<Maybe<PipelineStageEdge>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the name of the pipeline */
  name: Scalars['String']['output'];
  /** the stages of this pipeline */
  stages?: Maybe<Array<Maybe<PipelineStage>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** the top level input object for creating/deleting pipelines */
export type PipelineAttributes = {
  edges?: InputMaybe<Array<InputMaybe<PipelineEdgeAttributes>>>;
  stages?: InputMaybe<Array<InputMaybe<PipelineStageAttributes>>>;
};

export type PipelineConnection = {
  __typename?: 'PipelineConnection';
  edges?: Maybe<Array<Maybe<PipelineEdge>>>;
  pageInfo: PageInfo;
};

export type PipelineEdge = {
  __typename?: 'PipelineEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Pipeline>;
};

/** specification of an edge between two pipeline stages */
export type PipelineEdgeAttributes = {
  /** the name of the pipeline stage this edge emits from */
  from?: InputMaybe<Scalars['String']['input']>;
  /** stage id the edge is from, can also be specified by name */
  fromId?: InputMaybe<Scalars['ID']['input']>;
  /** any optional promotion gates you wish to configure */
  gates?: InputMaybe<Array<InputMaybe<PipelineGateAttributes>>>;
  /** the name of the pipeline stage this edge points to */
  to?: InputMaybe<Scalars['String']['input']>;
  /** stage id the edge is to, can also be specified by name */
  toId?: InputMaybe<Scalars['ID']['input']>;
};

/** A gate blocking promotion along a release pipeline */
export type PipelineGate = {
  __typename?: 'PipelineGate';
  /** the last user to approve this gate */
  approver?: Maybe<User>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the name of this gate as seen in the UI */
  name: Scalars['String']['output'];
  /** the current state of this gate */
  state: GateState;
  /** the type of gate this is */
  type: GateType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** will configure a promotion gate for a pipeline */
export type PipelineGateAttributes = {
  /** the handle of a cluster this gate will execute on */
  cluster?: InputMaybe<Scalars['String']['input']>;
  /** the id of the cluster this gate will execute on */
  clusterId?: InputMaybe<Scalars['String']['input']>;
  /** the name of this gate */
  name: Scalars['String']['input'];
  /** the type of gate this is */
  type: GateType;
};

/** a representation of an individual pipeline promotion, which is a list of services/revisions and timestamps to determine promotion status */
export type PipelinePromotion = {
  __typename?: 'PipelinePromotion';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last time this promotion was fully promoted, it's no longer pending if promoted_at > revised_at */
  promotedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last time this promotion was updated */
  revisedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the services included in this promotion */
  services?: Maybe<Array<Maybe<PromotionService>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** a pipeline stage, has a list of services and potentially a promotion which might be pending */
export type PipelineStage = {
  __typename?: 'PipelineStage';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the name of this stage (eg dev, prod, staging) */
  name: Scalars['String']['output'];
  /** a promotion which might be outstanding for this stage */
  promotion?: Maybe<PipelinePromotion>;
  /** the services within this stage */
  services?: Maybe<Array<Maybe<StageService>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** specification of a stage of a pipeline */
export type PipelineStageAttributes = {
  name: Scalars['String']['input'];
  services?: InputMaybe<Array<InputMaybe<StageServiceAttributes>>>;
};

/** an edge in the pipeline DAG */
export type PipelineStageEdge = {
  __typename?: 'PipelineStageEdge';
  from: PipelineStage;
  gates?: Maybe<Array<Maybe<PipelineGate>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** when the edge was last promoted, if greater than the promotion objects revised at, was successfully promoted */
  promotedAt?: Maybe<Scalars['DateTime']['output']>;
  to: PipelineStage;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

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
  logs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: PodSpec;
  status: PodStatus;
};


export type PodLogsArgs = {
  container: Scalars['String']['input'];
  sinceSeconds: Scalars['Int']['input'];
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

/** how a promotion for a service will be performed */
export type PromotionCriteria = {
  __typename?: 'PromotionCriteria';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** whether you want to copy any configuration values from the source service */
  secrets?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the source service in a prior stage to promote settings from */
  source?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** actions to perform if this stage service were promoted */
export type PromotionCriteriaAttributes = {
  /** the handle of the cluster for the source service */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** the name of the source service */
  name?: InputMaybe<Scalars['String']['input']>;
  /** the secrets to copy over in a promotion */
  secrets?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  /** the id of the service to promote from */
  sourceId?: InputMaybe<Scalars['String']['input']>;
};

/** a service to be potentially promoted */
export type PromotionService = {
  __typename?: 'PromotionService';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the revision of the service to promote */
  revision?: Maybe<Revision>;
  /** a service to promote */
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** a cloud credential that can be used while creating new clusters */
export type ProviderCredential = {
  __typename?: 'ProviderCredential';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ProviderCredentialAttributes = {
  kind?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
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
  /** the commit message for this revision */
  message?: Maybe<Scalars['String']['output']>;
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
  /** approves an approval pipeline gate */
  approveGate?: Maybe<PipelineGate>;
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
  createProviderCredential?: Maybe<ProviderCredential>;
  createRole?: Maybe<Role>;
  createServiceDeployment?: Maybe<ServiceDeployment>;
  createUpgradePolicy?: Maybe<UpgradePolicy>;
  createWebhook?: Maybe<Webhook>;
  deleteAccessToken?: Maybe<AccessToken>;
  deleteCertificate?: Maybe<Scalars['Boolean']['output']>;
  deleteCluster?: Maybe<Cluster>;
  deleteClusterProvider?: Maybe<ClusterProvider>;
  deleteGitRepository?: Maybe<GitRepository>;
  deleteGlobalService?: Maybe<GlobalService>;
  deleteGroup?: Maybe<Group>;
  deleteGroupMember?: Maybe<GroupMember>;
  deleteJob?: Maybe<Job>;
  deleteNode?: Maybe<Node>;
  deletePeer?: Maybe<Scalars['Boolean']['output']>;
  deletePod?: Maybe<Pod>;
  deleteProviderCredential?: Maybe<ProviderCredential>;
  deleteRole?: Maybe<Role>;
  deleteServiceDeployment?: Maybe<ServiceDeployment>;
  deleteUpgradePolicy?: Maybe<UpgradePolicy>;
  deleteUser?: Maybe<User>;
  deleteWebhook?: Maybe<Webhook>;
  /** soft deletes a cluster, by deregistering it in our system but not disturbing any kubernetes objects */
  detachCluster?: Maybe<Cluster>;
  enableDeployments?: Maybe<DeploymentSettings>;
  executeRunbook?: Maybe<RunbookActionResponse>;
  /** forces a pipeline gate to be in open state */
  forceGate?: Maybe<PipelineGate>;
  installAddOn?: Maybe<ServiceDeployment>;
  installRecipe?: Maybe<Build>;
  installStack?: Maybe<Build>;
  loginLink?: Maybe<User>;
  markRead?: Maybe<User>;
  /** merges configuration for a service */
  mergeService?: Maybe<ServiceDeployment>;
  oauthCallback?: Maybe<User>;
  overlayConfiguration?: Maybe<Build>;
  /** a regular status ping to be sent by the deploy operator */
  pingCluster?: Maybe<Cluster>;
  readNotifications?: Maybe<User>;
  restartBuild?: Maybe<Build>;
  restorePostgres?: Maybe<Postgresql>;
  /** rewires this service to use the given revision id */
  rollbackService?: Maybe<ServiceDeployment>;
  /** upserts a pipeline with a given name */
  savePipeline?: Maybe<Pipeline>;
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


export type RootMutationTypeApproveGateArgs = {
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


export type RootMutationTypeCreateProviderCredentialArgs = {
  attributes: ProviderCredentialAttributes;
  name: Scalars['String']['input'];
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


export type RootMutationTypeDeleteClusterProviderArgs = {
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


export type RootMutationTypeDeleteProviderCredentialArgs = {
  id: Scalars['ID']['input'];
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


export type RootMutationTypeDetachClusterArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeExecuteRunbookArgs = {
  input: RunbookActionInput;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypeForceGateArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeInstallAddOnArgs = {
  clusterId: Scalars['ID']['input'];
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  global?: InputMaybe<GlobalServiceAttributes>;
  name: Scalars['String']['input'];
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


export type RootMutationTypeMergeServiceArgs = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  id: Scalars['ID']['input'];
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


export type RootMutationTypeSavePipelineArgs = {
  attributes: PipelineAttributes;
  name: Scalars['String']['input'];
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
  /** list all addons currently resident in the artifacts repo */
  clusterAddOns?: Maybe<Array<Maybe<ClusterAddOn>>>;
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
  /** tells you what cluster a deploy token points to */
  myCluster?: Maybe<Cluster>;
  myWireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
  namespaces?: Maybe<Array<Maybe<Namespace>>>;
  node?: Maybe<Node>;
  nodeMetric?: Maybe<NodeMetric>;
  nodeMetrics?: Maybe<Array<Maybe<NodeMetric>>>;
  nodes?: Maybe<Array<Maybe<Node>>>;
  notifications?: Maybe<NotificationConnection>;
  pipeline?: Maybe<Pipeline>;
  pipelines?: Maybe<PipelineConnection>;
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
  /** exchanges a kubeconfig token for user info */
  tokenExchange?: Maybe<User>;
  unstructuredResource?: Maybe<KubernetesUnstructured>;
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
  q?: InputMaybe<Scalars['String']['input']>;
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


export type RootQueryTypeNamespacesArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeNodeArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};


export type RootQueryTypeNodeMetricArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};


export type RootQueryTypeNodeMetricsArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePipelineArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypePipelinesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePodArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePodsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
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
  q?: InputMaybe<Scalars['String']['input']>;
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


export type RootQueryTypeTokenExchangeArgs = {
  token: Scalars['String']['input'];
};


export type RootQueryTypeUnstructuredResourceArgs = {
  group?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  version: Scalars['String']['input'];
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
  /** the commit message currently in use */
  message?: Maybe<Scalars['String']['output']>;
  /** human readable name of this service, must be unique per cluster */
  name: Scalars['String']['output'];
  /** kubernetes namespace this service will be deployed to */
  namespace: Scalars['String']['output'];
  /** whether this service is controlled by a global service */
  owner?: Maybe<GlobalService>;
  /** if true, deletion of this service is not allowed */
  protect?: Maybe<Scalars['Boolean']['output']>;
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
  protect?: InputMaybe<Scalars['Boolean']['input']>;
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
  git?: InputMaybe<GitRefAttributes>;
  protect?: InputMaybe<Scalars['Boolean']['input']>;
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

/** the configuration of a service within a pipeline stage, including optional promotion criteria */
export type StageService = {
  __typename?: 'StageService';
  /** criteria for how a promotion of this service shall be performed */
  criteria?: Maybe<PromotionCriteria>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a pointer to a service */
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** the attributes of a service w/in a specific stage */
export type StageServiceAttributes = {
  criteria?: InputMaybe<PromotionCriteriaAttributes>;
  /** the cluster handle of this service */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** the name of this service */
  name?: InputMaybe<Scalars['String']['input']>;
  /** the name of this service */
  serviceId?: InputMaybe<Scalars['ID']['input']>;
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
  groups?: Maybe<Array<Maybe<Group>>>;
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

export type CostAnalysisFragment = { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null };

export type FileContentFragment = { __typename?: 'FileContent', content?: string | null, path?: string | null };

export type ConfigurationFragment = { __typename?: 'Configuration', helm?: string | null, terraform?: string | null };

export type ApplicationSpecFragment = { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null };

export type ApplicationStatusFragment = { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null };

export type ApplicationFragment = { __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null };

export type ConfigurationOverlayFragment = { __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } };

export type AppQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type AppQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', name: string, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null, configurationOverlays?: Array<{ __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } } | null> | null };

export type AppInfoQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type AppInfoQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', info?: string | null, name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null };

export type RepositoryFragment = { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null };

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

export type ClusterNodeFragment = { __typename?: 'Node', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } };

export type ClusterConditionFragment = { __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null };

export type NodePoolFragment = { __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null };

export type ApiDeprecationFragment = { __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null };

export type ClustersRowFragment = { __typename?: 'Cluster', currentVersion?: string | null, id: string, self?: boolean | null, name: string, handle?: string | null, installed?: boolean | null, pingedAt?: string | null, deletedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Map<string, unknown> | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null };

export type ClusterFragment = { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null } | null> | null, nodes?: Array<{ __typename?: 'Node', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null };

export type ClustersQueryVariables = Exact<{ [key: string]: never; }>;


export type ClustersQuery = { __typename?: 'RootQueryType', clusters?: { __typename?: 'ClusterConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'ClusterEdge', node?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, self?: boolean | null, name: string, handle?: string | null, installed?: boolean | null, pingedAt?: string | null, deletedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Map<string, unknown> | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null } | null } | null> | null } | null };

export type ClusterTinyFragment = { __typename?: 'Cluster', id: string, name: string, provider?: { __typename?: 'ClusterProvider', cloud: string } | null };

export type ClustersTinyQueryVariables = Exact<{ [key: string]: never; }>;


export type ClustersTinyQuery = { __typename?: 'RootQueryType', clusters?: { __typename?: 'ClusterConnection', edges?: Array<{ __typename?: 'ClusterEdge', node?: { __typename?: 'Cluster', id: string, name: string, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null } | null> | null } | null };

export type ClusterQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ClusterQuery = { __typename?: 'RootQueryType', cluster?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null } | null> | null, nodes?: Array<{ __typename?: 'Node', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null } | null };

export type ClusterPodsQueryVariables = Exact<{
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
}>;


export type ClusterPodsQuery = { __typename?: 'RootQueryType', pods?: { __typename?: 'PodConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'PodEdge', node?: { __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null } | null> | null } | null };

export type ClusterNamespacesQueryVariables = Exact<{
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ClusterNamespacesQuery = { __typename?: 'RootQueryType', namespaces?: Array<{ __typename?: 'Namespace', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null };

export type PolicyBindingFragment = { __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null };

export type ClusterBindingsFragment = { __typename?: 'Cluster', readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null };

export type ClusterBindingsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ClusterBindingsQuery = { __typename?: 'RootQueryType', cluster?: { __typename?: 'Cluster', readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null } | null };

export type UpdateClusterBindingsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  rbac: RbacAttributes;
}>;


export type UpdateClusterBindingsMutation = { __typename?: 'RootMutationType', updateRbac?: boolean | null };

export type UpdateClusterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ClusterUpdateAttributes;
}>;


export type UpdateClusterMutation = { __typename?: 'RootMutationType', updateCluster?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, self?: boolean | null, name: string, handle?: string | null, installed?: boolean | null, pingedAt?: string | null, deletedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Map<string, unknown> | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null } | null };

export type CreateClusterMutationVariables = Exact<{
  attributes: ClusterAttributes;
}>;


export type CreateClusterMutation = { __typename?: 'RootMutationType', createCluster?: { __typename?: 'Cluster', deployToken?: string | null, currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null } | null> | null, nodes?: Array<{ __typename?: 'Node', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null } | null };

export type MetricResponseFragment = { __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null };

export type UsageQueryVariables = Exact<{
  cpu: Scalars['String']['input'];
  mem: Scalars['String']['input'];
  podCpu: Scalars['String']['input'];
  podMem: Scalars['String']['input'];
  step: Scalars['String']['input'];
  offset: Scalars['Int']['input'];
}>;


export type UsageQuery = { __typename?: 'RootQueryType', cpu?: Array<{ __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null, mem?: Array<{ __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null, podCpu?: Array<{ __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null, podMem?: Array<{ __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null };

export type GitRepositoriesRowFragment = { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null };

export type GitRepositoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GitRepositoriesQuery = { __typename?: 'RootQueryType', gitRepositories?: { __typename?: 'GitRepositoryConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GitRepositoryEdge', node?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null } | null } | null> | null } | null };

export type CreateGitRepositoryMutationVariables = Exact<{
  attributes: GitAttributes;
}>;


export type CreateGitRepositoryMutation = { __typename?: 'RootMutationType', createGitRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null } | null };

export type DeleteGitRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGitRepositoryMutation = { __typename?: 'RootMutationType', deleteGitRepository?: { __typename?: 'GitRepository', id: string } | null };

export type UpdateGitRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: GitAttributes;
}>;


export type UpdateGitRepositoryMutation = { __typename?: 'RootMutationType', updateGitRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null } | null };

export type GlobalServiceFragment = { __typename?: 'GlobalService', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, provider?: { __typename?: 'ClusterProvider', id: string, name: string, cloud: string, namespace: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null };

export type CreateGlobalServiceMutationVariables = Exact<{
  attributes: GlobalServiceAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateGlobalServiceMutation = { __typename?: 'RootMutationType', createGlobalService?: { __typename?: 'GlobalService', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, provider?: { __typename?: 'ClusterProvider', id: string, name: string, cloud: string, namespace: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null } | null };

export type DeleteGlobalServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGlobalServiceMutation = { __typename?: 'RootMutationType', deleteGlobalService?: { __typename?: 'GlobalService', id: string } | null };

export type ClusterProviderFragment = { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null };

export type ClusterProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type ClusterProvidersQuery = { __typename?: 'RootQueryType', clusterProviders?: { __typename?: 'ClusterProviderConnection', edges?: Array<{ __typename?: 'ClusterProviderEdge', node?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null } | null } | null> | null } | null };

export type CreateClusterProviderMutationVariables = Exact<{
  attributes: ClusterProviderAttributes;
}>;


export type CreateClusterProviderMutation = { __typename?: 'RootMutationType', createClusterProvider?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null } | null };

export type UpdateClusterProviderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ClusterProviderUpdateAttributes;
}>;


export type UpdateClusterProviderMutation = { __typename?: 'RootMutationType', updateClusterProvider?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null } | null };

export type DeleteClusterProviderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteClusterProviderMutation = { __typename?: 'RootMutationType', deleteClusterProvider?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null } | null };

export type ServiceDeploymentRevisionFragment = { __typename?: 'Revision', id: string, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } };

export type ServiceDeploymentsRowFragment = { __typename?: 'ServiceDeployment', id: string, name: string, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, git: { __typename?: 'GitRef', ref: string, folder: string }, cluster?: { __typename?: 'Cluster', id: string, name: string, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null };

export type ServiceDeploymentDetailsFragment = { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, componentStatus?: string | null, status: ServiceDeploymentStatus, version: string, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, docs?: Array<{ __typename?: 'GitFile', content: string, path: string } | null> | null, git: { __typename?: 'GitRef', folder: string, ref: string }, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null };

export type ServiceDeploymentComponentFragment = { __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null };

export type ServiceDeploymentRevisionsFragment = { __typename?: 'ServiceDeployment', revision?: { __typename?: 'Revision', id: string, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null, revisions?: { __typename?: 'RevisionConnection', edges?: Array<{ __typename?: 'RevisionEdge', node?: { __typename?: 'Revision', id: string, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null } | null> | null } | null };

export type ServiceDeploymentsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ServiceDeploymentsQuery = { __typename?: 'RootQueryType', serviceDeployments?: { __typename?: 'ServiceDeploymentConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'ServiceDeploymentEdge', node?: { __typename?: 'ServiceDeployment', id: string, name: string, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, git: { __typename?: 'GitRef', ref: string, folder: string }, cluster?: { __typename?: 'Cluster', id: string, name: string, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null } | null> | null } | null };

export type ServiceDeploymentsTinyQueryVariables = Exact<{ [key: string]: never; }>;


export type ServiceDeploymentsTinyQuery = { __typename?: 'RootQueryType', serviceDeployments?: { __typename?: 'ServiceDeploymentConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'ServiceDeploymentEdge', node?: { __typename?: 'ServiceDeployment', id: string, name: string, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null };

export type ServiceDeploymentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, componentStatus?: string | null, status: ServiceDeploymentStatus, version: string, cluster?: { __typename?: 'Cluster', id: string, name: string } | null, docs?: Array<{ __typename?: 'GitFile', content: string, path: string } | null> | null, git: { __typename?: 'GitRef', folder: string, ref: string }, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null } | null };

export type ServiceDeploymentComponentsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentComponentsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', name: string, components?: Array<{ __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, kind: string, name: string, service?: { __typename?: 'ServiceDeployment', git: { __typename?: 'GitRef', ref: string, folder: string }, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null } | null> | null } | null };

export type ServiceDeploymentSecretsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentSecretsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', configuration?: Array<{ __typename?: 'ServiceConfiguration', name: string, value: string } | null> | null } | null };

export type ServiceDeploymentRevisionsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentRevisionsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', revision?: { __typename?: 'Revision', id: string, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null, revisions?: { __typename?: 'RevisionConnection', edges?: Array<{ __typename?: 'RevisionEdge', node?: { __typename?: 'Revision', id: string, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null } | null> | null } | null } | null };

export type CreateServiceDeploymentMutationVariables = Exact<{
  attributes: ServiceDeploymentAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateServiceDeploymentMutation = { __typename?: 'RootMutationType', createServiceDeployment?: { __typename?: 'ServiceDeployment', id: string, name: string, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, git: { __typename?: 'GitRef', ref: string, folder: string }, cluster?: { __typename?: 'Cluster', id: string, name: string, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type UpdateServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ServiceUpdateAttributes;
}>;


export type UpdateServiceDeploymentMutation = { __typename?: 'RootMutationType', updateServiceDeployment?: { __typename?: 'ServiceDeployment', version: string, configuration?: Array<{ __typename?: 'ServiceConfiguration', name: string, value: string } | null> | null, git: { __typename?: 'GitRef', folder: string, ref: string } } | null };

export type MergeServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>> | InputMaybe<ConfigAttributes>>;
}>;


export type MergeServiceMutation = { __typename?: 'RootMutationType', mergeService?: { __typename?: 'ServiceDeployment', configuration?: Array<{ __typename?: 'ServiceConfiguration', name: string, value: string } | null> | null } | null };

export type DeleteServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteServiceDeploymentMutation = { __typename?: 'RootMutationType', deleteServiceDeployment?: { __typename?: 'ServiceDeployment', id: string } | null };

export type RollbackServiceMutationVariables = Exact<{
  id?: InputMaybe<Scalars['ID']['input']>;
  revisionId: Scalars['ID']['input'];
}>;


export type RollbackServiceMutation = { __typename?: 'RootMutationType', rollbackService?: { __typename?: 'ServiceDeployment', id: string, name: string, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, git: { __typename?: 'GitRef', ref: string, folder: string }, cluster?: { __typename?: 'Cluster', id: string, name: string, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type UpdateRbacMutationVariables = Exact<{
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  rbac: RbacAttributes;
}>;


export type UpdateRbacMutation = { __typename?: 'RootMutationType', updateRbac?: boolean | null };

export type ServiceDeploymentBindingsFragment = { __typename?: 'ServiceDeployment', readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null };

export type ServiceDeploymentBindingsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentBindingsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', id: string, readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null } | null };

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

export type CertificateFragment = { __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } };

export type CertificateQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CertificateQuery = { __typename?: 'RootQueryType', certificate?: { __typename?: 'Certificate', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } } | null };

export type CronJobFragment = { __typename?: 'CronJob', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CronStatus', lastScheduleTime?: string | null }, spec: { __typename?: 'CronSpec', schedule: string, suspend?: boolean | null, concurrencyPolicy?: string | null } };

export type CronJobQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CronJobQuery = { __typename?: 'RootQueryType', cronJob?: { __typename?: 'CronJob', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, jobs?: Array<{ __typename?: 'Job', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null } } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CronStatus', lastScheduleTime?: string | null }, spec: { __typename?: 'CronSpec', schedule: string, suspend?: boolean | null, concurrencyPolicy?: string | null } } | null };

export type DeploymentFragment = { __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } };

export type DeploymentQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type DeploymentQuery = { __typename?: 'RootQueryType', deployment?: { __typename?: 'Deployment', raw: string, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } } | null };

export type IngressFragment = { __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null } };

export type IngressQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type IngressQuery = { __typename?: 'RootQueryType', ingress?: { __typename?: 'Ingress', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null } } | null };

export type JobFragment = { __typename?: 'Job', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null }, spec: { __typename?: 'JobSpec', backoffLimit?: number | null, parallelism?: number | null, activeDeadlineSeconds?: number | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null };

export type JobQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type JobQuery = { __typename?: 'RootQueryType', job?: { __typename?: 'Job', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null }, spec: { __typename?: 'JobSpec', backoffLimit?: number | null, parallelism?: number | null, activeDeadlineSeconds?: number | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null } | null };

export type MetadataFragment = { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null };

export type EventFragment = { __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null };

export type ResourceSpecFragment = { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null };

export type ResourcesFragment = { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null };

export type ContainerFragment = { __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null };

export type ContainerStatusFragment = { __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null };

export type PodFragment = { __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } };

export type JobStatusFragment = { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null };

export type NodeFragment = { __typename?: 'Node', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null };

export type NodeMetricFragment = { __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null };

export type NodeQueryVariables = Exact<{
  name: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type NodeQuery = { __typename?: 'RootQueryType', node?: { __typename?: 'Node', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null } | null };

export type NodeMetricQueryVariables = Exact<{
  name: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type NodeMetricQuery = { __typename?: 'RootQueryType', nodeMetric?: { __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null };

export type PodWithEventsFragment = { __typename?: 'Pod', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } };

export type PodQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type PodQuery = { __typename?: 'RootQueryType', pod?: { __typename?: 'Pod', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null };

export type ServiceFragment = { __typename?: 'Service', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null } | null> | null } | null }, spec: { __typename?: 'ServiceSpec', type?: string | null, clusterIp?: string | null, ports?: Array<{ __typename?: 'ServicePort', name?: string | null, protocol?: string | null, port?: number | null, targetPort?: string | null } | null> | null } };

export type ServiceQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ServiceQuery = { __typename?: 'RootQueryType', service?: { __typename?: 'Service', raw: string, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null } | null> | null } | null }, spec: { __typename?: 'ServiceSpec', type?: string | null, clusterIp?: string | null, ports?: Array<{ __typename?: 'ServicePort', name?: string | null, protocol?: string | null, port?: number | null, targetPort?: string | null } | null> | null } } | null };

export type StatefulSetFragment = { __typename?: 'StatefulSet', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'StatefulSetStatus', replicas?: number | null, currentReplicas?: number | null, readyReplicas?: number | null, updatedReplicas?: number | null }, spec: { __typename?: 'StatefulSetSpec', replicas?: number | null, serviceName?: string | null } };

export type StatefulSetQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type StatefulSetQuery = { __typename?: 'RootQueryType', statefulSet?: { __typename?: 'StatefulSet', raw: string, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'StatefulSetStatus', replicas?: number | null, currentReplicas?: number | null, readyReplicas?: number | null, updatedReplicas?: number | null }, spec: { __typename?: 'StatefulSetSpec', replicas?: number | null, serviceName?: string | null } } | null };

export type UnstructuredResourceFragment = { __typename?: 'KubernetesUnstructured', raw?: Map<string, unknown> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null };

export type UnstructuredResourceQueryVariables = Exact<{
  group?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['ID']['input'];
  version: Scalars['String']['input'];
}>;


export type UnstructuredResourceQuery = { __typename?: 'RootQueryType', unstructuredResource?: { __typename?: 'KubernetesUnstructured', raw?: Map<string, unknown> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null } | null };

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

export type UsersQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type UsersQuery = { __typename?: 'RootQueryType', users?: { __typename?: 'UserConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'UserEdge', node?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null> | null } | null };

export type SearchUsersQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type SearchUsersQuery = { __typename?: 'RootQueryType', users?: { __typename?: 'UserConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'UserEdge', node?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null> | null } | null };

export const ApplicationSpecFragmentDoc = gql`
    fragment ApplicationSpec on ApplicationSpec {
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
export const ApplicationStatusFragmentDoc = gql`
    fragment ApplicationStatus on ApplicationStatus {
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
export const CostAnalysisFragmentDoc = gql`
    fragment CostAnalysis on CostAnalysis {
  minutes
  cpuCost
  pvCost
  ramCost
  totalCost
}
    `;
export const ApplicationFragmentDoc = gql`
    fragment Application on Application {
  name
  spec {
    ...ApplicationSpec
  }
  status {
    ...ApplicationStatus
  }
  cost {
    ...CostAnalysis
  }
}
    ${ApplicationSpecFragmentDoc}
${ApplicationStatusFragmentDoc}
${CostAnalysisFragmentDoc}`;
export const MetadataFragmentDoc = gql`
    fragment Metadata on Metadata {
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
export const ConfigurationOverlayFragmentDoc = gql`
    fragment ConfigurationOverlay on ConfigurationOverlay {
  metadata {
    ...Metadata
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
    ${MetadataFragmentDoc}`;
export const ConfigurationFragmentDoc = gql`
    fragment Configuration on Configuration {
  helm
  terraform
}
    `;
export const FileContentFragmentDoc = gql`
    fragment FileContent on FileContent {
  content
  path
}
    `;
export const RepositoryFragmentDoc = gql`
    fragment Repository on Repository {
  id
  name
  icon
  description
  grafanaDns
  configuration {
    ...Configuration
  }
  docs {
    ...FileContent
  }
}
    ${ConfigurationFragmentDoc}
${FileContentFragmentDoc}`;
export const PageInfoFragmentDoc = gql`
    fragment PageInfo on PageInfo {
  hasNextPage
  endCursor
}
    `;
export const ApiDeprecationFragmentDoc = gql`
    fragment ApiDeprecation on ApiDeprecation {
  availableIn
  blocking
  component {
    group
    kind
    name
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
    `;
export const ClusterConditionFragmentDoc = gql`
    fragment ClusterCondition on ClusterCondition {
  lastTransitionTime
  message
  reason
  severity
  status
  type
}
    `;
export const ClustersRowFragmentDoc = gql`
    fragment ClustersRow on Cluster {
  apiDeprecations {
    ...ApiDeprecation
  }
  currentVersion
  id
  self
  name
  handle
  nodes {
    status {
      capacity
    }
  }
  nodeMetrics {
    usage {
      cpu
      memory
    }
  }
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
  self
  service {
    id
    repository {
      url
    }
  }
  status {
    conditions {
      ...ClusterCondition
    }
  }
  version
}
    ${ApiDeprecationFragmentDoc}
${ClusterConditionFragmentDoc}`;
export const NodePoolFragmentDoc = gql`
    fragment NodePool on NodePool {
  id
  name
  minSize
  maxSize
  instanceType
  spot
}
    `;
export const ClusterNodeFragmentDoc = gql`
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
    ${MetadataFragmentDoc}`;
export const NodeMetricFragmentDoc = gql`
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
    ${MetadataFragmentDoc}`;
export const ClusterFragmentDoc = gql`
    fragment Cluster on Cluster {
  apiDeprecations {
    ...ApiDeprecation
  }
  currentVersion
  id
  name
  handle
  nodePools {
    ...NodePool
  }
  nodes {
    ...ClusterNode
  }
  nodeMetrics {
    ...NodeMetric
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
    repository {
      url
    }
  }
  version
}
    ${ApiDeprecationFragmentDoc}
${NodePoolFragmentDoc}
${ClusterNodeFragmentDoc}
${NodeMetricFragmentDoc}`;
export const ClusterTinyFragmentDoc = gql`
    fragment ClusterTiny on Cluster {
  id
  name
  provider {
    cloud
  }
}
    `;
export const PolicyBindingFragmentDoc = gql`
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
    `;
export const ClusterBindingsFragmentDoc = gql`
    fragment ClusterBindings on Cluster {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}`;
export const MetricResponseFragmentDoc = gql`
    fragment MetricResponse on MetricResponse {
  metric
  values {
    timestamp
    value
  }
}
    `;
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
  urlFormat
}
    `;
export const GlobalServiceFragmentDoc = gql`
    fragment GlobalService on GlobalService {
  id
  name
  provider {
    id
    name
    cloud
    namespace
  }
  service {
    id
    name
  }
  tags {
    name
    value
  }
  insertedAt
  updatedAt
}
    `;
export const ClusterProviderFragmentDoc = gql`
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
  deletedAt
  insertedAt
  updatedAt
}
    `;
export const ServiceDeploymentsRowFragmentDoc = gql`
    fragment ServiceDeploymentsRow on ServiceDeployment {
  id
  name
  message
  git {
    ref
    folder
  }
  cluster {
    id
    name
    provider {
      name
      cloud
    }
  }
  repository {
    id
    url
  }
  insertedAt
  updatedAt
  deletedAt
  componentStatus
  status
  errors {
    message
    source
  }
  components {
    apiDeprecations {
      blocking
    }
  }
  globalService {
    id
    name
  }
}
    `;
export const ServiceDeploymentDetailsFragmentDoc = gql`
    fragment ServiceDeploymentDetails on ServiceDeployment {
  id
  name
  namespace
  componentStatus
  status
  cluster {
    id
    name
  }
  version
  docs {
    content
    path
  }
  git {
    folder
    ref
  }
  components {
    apiDeprecations {
      blocking
    }
  }
}
    `;
export const ServiceDeploymentComponentFragmentDoc = gql`
    fragment ServiceDeploymentComponent on ServiceComponent {
  id
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
}
    ${ApiDeprecationFragmentDoc}`;
export const ServiceDeploymentRevisionFragmentDoc = gql`
    fragment ServiceDeploymentRevision on Revision {
  id
  version
  message
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
export const ServiceDeploymentBindingsFragmentDoc = gql`
    fragment ServiceDeploymentBindings on ServiceDeployment {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}`;
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
export const CertificateFragmentDoc = gql`
    fragment Certificate on Certificate {
  metadata {
    ...Metadata
  }
  status {
    renewalTime
    notBefore
    notAfter
  }
  spec {
    dnsNames
    secretName
    issuerRef {
      group
      kind
      name
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const CronJobFragmentDoc = gql`
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
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const DeploymentFragmentDoc = gql`
    fragment Deployment on Deployment {
  metadata {
    ...Metadata
  }
  status {
    availableReplicas
    replicas
    unavailableReplicas
  }
  spec {
    replicas
    strategy {
      type
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const IngressFragmentDoc = gql`
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
    tls {
      hosts
    }
    rules {
      host
      http {
        paths {
          path
          backend {
            serviceName
            servicePort
          }
        }
      }
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const JobStatusFragmentDoc = gql`
    fragment JobStatus on JobStatus {
  active
  completionTime
  succeeded
  failed
  startTime
}
    `;
export const ContainerStatusFragmentDoc = gql`
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
    `;
export const ContainerFragmentDoc = gql`
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
    ${ResourcesFragmentDoc}`;
export const PodFragmentDoc = gql`
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
${ContainerFragmentDoc}`;
export const JobFragmentDoc = gql`
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
  }
  pods {
    ...Pod
  }
  raw
}
    ${MetadataFragmentDoc}
${JobStatusFragmentDoc}
${PodFragmentDoc}`;
export const EventFragmentDoc = gql`
    fragment Event on Event {
  action
  lastTimestamp
  count
  message
  reason
  type
}
    `;
export const NodeFragmentDoc = gql`
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
${EventFragmentDoc}`;
export const PodWithEventsFragmentDoc = gql`
    fragment PodWithEvents on Pod {
  ...Pod
  events {
    ...Event
  }
}
    ${PodFragmentDoc}
${EventFragmentDoc}`;
export const ServiceFragmentDoc = gql`
    fragment Service on Service {
  metadata {
    ...Metadata
  }
  status {
    loadBalancer {
      ingress {
        ip
      }
    }
  }
  spec {
    type
    clusterIp
    ports {
      name
      protocol
      port
      targetPort
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const StatefulSetFragmentDoc = gql`
    fragment StatefulSet on StatefulSet {
  metadata {
    ...Metadata
  }
  status {
    replicas
    currentReplicas
    readyReplicas
    updatedReplicas
  }
  spec {
    replicas
    serviceName
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const UnstructuredResourceFragmentDoc = gql`
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
${EventFragmentDoc}`;
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
    ...Application
  }
  configurationOverlays(namespace: $name) {
    ...ConfigurationOverlay
  }
}
    ${ApplicationFragmentDoc}
${ConfigurationOverlayFragmentDoc}`;

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
    ...Application
    info
  }
}
    ${ApplicationFragmentDoc}`;

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
    ...Repository
  }
}
    ${RepositoryFragmentDoc}`;

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
export const ClustersTinyDocument = gql`
    query ClustersTiny {
  clusters(first: 100) {
    edges {
      node {
        ...ClusterTiny
      }
    }
  }
}
    ${ClusterTinyFragmentDoc}`;

/**
 * __useClustersTinyQuery__
 *
 * To run a query within a React component, call `useClustersTinyQuery` and pass it any options that fit your needs.
 * When your component renders, `useClustersTinyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClustersTinyQuery({
 *   variables: {
 *   },
 * });
 */
export function useClustersTinyQuery(baseOptions?: Apollo.QueryHookOptions<ClustersTinyQuery, ClustersTinyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClustersTinyQuery, ClustersTinyQueryVariables>(ClustersTinyDocument, options);
      }
export function useClustersTinyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClustersTinyQuery, ClustersTinyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClustersTinyQuery, ClustersTinyQueryVariables>(ClustersTinyDocument, options);
        }
export type ClustersTinyQueryHookResult = ReturnType<typeof useClustersTinyQuery>;
export type ClustersTinyLazyQueryHookResult = ReturnType<typeof useClustersTinyLazyQuery>;
export type ClustersTinyQueryResult = Apollo.QueryResult<ClustersTinyQuery, ClustersTinyQueryVariables>;
export const ClusterDocument = gql`
    query Cluster($id: ID!) {
  cluster(id: $id) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}`;

/**
 * __useClusterQuery__
 *
 * To run a query within a React component, call `useClusterQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useClusterQuery(baseOptions: Apollo.QueryHookOptions<ClusterQuery, ClusterQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterQuery, ClusterQueryVariables>(ClusterDocument, options);
      }
export function useClusterLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterQuery, ClusterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterQuery, ClusterQueryVariables>(ClusterDocument, options);
        }
export type ClusterQueryHookResult = ReturnType<typeof useClusterQuery>;
export type ClusterLazyQueryHookResult = ReturnType<typeof useClusterLazyQuery>;
export type ClusterQueryResult = Apollo.QueryResult<ClusterQuery, ClusterQueryVariables>;
export const ClusterPodsDocument = gql`
    query ClusterPods($clusterId: ID, $namespace: String) {
  pods(first: 100, clusterId: $clusterId, namespace: $namespace) {
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
${PodFragmentDoc}`;

/**
 * __useClusterPodsQuery__
 *
 * To run a query within a React component, call `useClusterPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterPodsQuery({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useClusterPodsQuery(baseOptions?: Apollo.QueryHookOptions<ClusterPodsQuery, ClusterPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterPodsQuery, ClusterPodsQueryVariables>(ClusterPodsDocument, options);
      }
export function useClusterPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterPodsQuery, ClusterPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterPodsQuery, ClusterPodsQueryVariables>(ClusterPodsDocument, options);
        }
export type ClusterPodsQueryHookResult = ReturnType<typeof useClusterPodsQuery>;
export type ClusterPodsLazyQueryHookResult = ReturnType<typeof useClusterPodsLazyQuery>;
export type ClusterPodsQueryResult = Apollo.QueryResult<ClusterPodsQuery, ClusterPodsQueryVariables>;
export const ClusterNamespacesDocument = gql`
    query ClusterNamespaces($clusterId: ID) {
  namespaces(clusterId: $clusterId) {
    metadata {
      ...Metadata
    }
  }
}
    ${MetadataFragmentDoc}`;

/**
 * __useClusterNamespacesQuery__
 *
 * To run a query within a React component, call `useClusterNamespacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterNamespacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterNamespacesQuery({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useClusterNamespacesQuery(baseOptions?: Apollo.QueryHookOptions<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>(ClusterNamespacesDocument, options);
      }
export function useClusterNamespacesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>(ClusterNamespacesDocument, options);
        }
export type ClusterNamespacesQueryHookResult = ReturnType<typeof useClusterNamespacesQuery>;
export type ClusterNamespacesLazyQueryHookResult = ReturnType<typeof useClusterNamespacesLazyQuery>;
export type ClusterNamespacesQueryResult = Apollo.QueryResult<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>;
export const ClusterBindingsDocument = gql`
    query ClusterBindings($id: ID!) {
  cluster(id: $id) {
    ...ClusterBindings
  }
}
    ${ClusterBindingsFragmentDoc}`;

/**
 * __useClusterBindingsQuery__
 *
 * To run a query within a React component, call `useClusterBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterBindingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterBindingsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useClusterBindingsQuery(baseOptions: Apollo.QueryHookOptions<ClusterBindingsQuery, ClusterBindingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterBindingsQuery, ClusterBindingsQueryVariables>(ClusterBindingsDocument, options);
      }
export function useClusterBindingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterBindingsQuery, ClusterBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterBindingsQuery, ClusterBindingsQueryVariables>(ClusterBindingsDocument, options);
        }
export type ClusterBindingsQueryHookResult = ReturnType<typeof useClusterBindingsQuery>;
export type ClusterBindingsLazyQueryHookResult = ReturnType<typeof useClusterBindingsLazyQuery>;
export type ClusterBindingsQueryResult = Apollo.QueryResult<ClusterBindingsQuery, ClusterBindingsQueryVariables>;
export const UpdateClusterBindingsDocument = gql`
    mutation UpdateClusterBindings($id: ID!, $rbac: RbacAttributes!) {
  updateRbac(clusterId: $id, rbac: $rbac)
}
    `;
export type UpdateClusterBindingsMutationFn = Apollo.MutationFunction<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>;

/**
 * __useUpdateClusterBindingsMutation__
 *
 * To run a mutation, you first call `useUpdateClusterBindingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateClusterBindingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateClusterBindingsMutation, { data, loading, error }] = useUpdateClusterBindingsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      rbac: // value for 'rbac'
 *   },
 * });
 */
export function useUpdateClusterBindingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>(UpdateClusterBindingsDocument, options);
      }
export type UpdateClusterBindingsMutationHookResult = ReturnType<typeof useUpdateClusterBindingsMutation>;
export type UpdateClusterBindingsMutationResult = Apollo.MutationResult<UpdateClusterBindingsMutation>;
export type UpdateClusterBindingsMutationOptions = Apollo.BaseMutationOptions<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>;
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
export const CreateClusterDocument = gql`
    mutation CreateCluster($attributes: ClusterAttributes!) {
  createCluster(attributes: $attributes) {
    ...Cluster
    deployToken
  }
}
    ${ClusterFragmentDoc}`;
export type CreateClusterMutationFn = Apollo.MutationFunction<CreateClusterMutation, CreateClusterMutationVariables>;

/**
 * __useCreateClusterMutation__
 *
 * To run a mutation, you first call `useCreateClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createClusterMutation, { data, loading, error }] = useCreateClusterMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateClusterMutation(baseOptions?: Apollo.MutationHookOptions<CreateClusterMutation, CreateClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateClusterMutation, CreateClusterMutationVariables>(CreateClusterDocument, options);
      }
export type CreateClusterMutationHookResult = ReturnType<typeof useCreateClusterMutation>;
export type CreateClusterMutationResult = Apollo.MutationResult<CreateClusterMutation>;
export type CreateClusterMutationOptions = Apollo.BaseMutationOptions<CreateClusterMutation, CreateClusterMutationVariables>;
export const UsageDocument = gql`
    query Usage($cpu: String!, $mem: String!, $podCpu: String!, $podMem: String!, $step: String!, $offset: Int!) {
  cpu: metric(query: $cpu, offset: $offset, step: $step) {
    ...MetricResponse
  }
  mem: metric(query: $mem, offset: $offset, step: $step) {
    ...MetricResponse
  }
  podCpu: metric(query: $podCpu, offset: $offset, step: $step) {
    ...MetricResponse
  }
  podMem: metric(query: $podMem, offset: $offset, step: $step) {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}`;

/**
 * __useUsageQuery__
 *
 * To run a query within a React component, call `useUsageQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageQuery({
 *   variables: {
 *      cpu: // value for 'cpu'
 *      mem: // value for 'mem'
 *      podCpu: // value for 'podCpu'
 *      podMem: // value for 'podMem'
 *      step: // value for 'step'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useUsageQuery(baseOptions: Apollo.QueryHookOptions<UsageQuery, UsageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UsageQuery, UsageQueryVariables>(UsageDocument, options);
      }
export function useUsageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UsageQuery, UsageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UsageQuery, UsageQueryVariables>(UsageDocument, options);
        }
export type UsageQueryHookResult = ReturnType<typeof useUsageQuery>;
export type UsageLazyQueryHookResult = ReturnType<typeof useUsageLazyQuery>;
export type UsageQueryResult = Apollo.QueryResult<UsageQuery, UsageQueryVariables>;
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
export const CreateGlobalServiceDocument = gql`
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
    ${GlobalServiceFragmentDoc}`;
export type CreateGlobalServiceMutationFn = Apollo.MutationFunction<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>;

/**
 * __useCreateGlobalServiceMutation__
 *
 * To run a mutation, you first call `useCreateGlobalServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGlobalServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGlobalServiceMutation, { data, loading, error }] = useCreateGlobalServiceMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *      cluster: // value for 'cluster'
 *      name: // value for 'name'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useCreateGlobalServiceMutation(baseOptions?: Apollo.MutationHookOptions<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>(CreateGlobalServiceDocument, options);
      }
export type CreateGlobalServiceMutationHookResult = ReturnType<typeof useCreateGlobalServiceMutation>;
export type CreateGlobalServiceMutationResult = Apollo.MutationResult<CreateGlobalServiceMutation>;
export type CreateGlobalServiceMutationOptions = Apollo.BaseMutationOptions<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>;
export const DeleteGlobalServiceDocument = gql`
    mutation DeleteGlobalService($id: ID!) {
  deleteGlobalService(id: $id) {
    id
  }
}
    `;
export type DeleteGlobalServiceMutationFn = Apollo.MutationFunction<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>;

/**
 * __useDeleteGlobalServiceMutation__
 *
 * To run a mutation, you first call `useDeleteGlobalServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGlobalServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGlobalServiceMutation, { data, loading, error }] = useDeleteGlobalServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGlobalServiceMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>(DeleteGlobalServiceDocument, options);
      }
export type DeleteGlobalServiceMutationHookResult = ReturnType<typeof useDeleteGlobalServiceMutation>;
export type DeleteGlobalServiceMutationResult = Apollo.MutationResult<DeleteGlobalServiceMutation>;
export type DeleteGlobalServiceMutationOptions = Apollo.BaseMutationOptions<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>;
export const ClusterProvidersDocument = gql`
    query ClusterProviders {
  clusterProviders(first: 100) {
    edges {
      node {
        ...ClusterProvider
      }
    }
  }
}
    ${ClusterProviderFragmentDoc}`;

/**
 * __useClusterProvidersQuery__
 *
 * To run a query within a React component, call `useClusterProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterProvidersQuery({
 *   variables: {
 *   },
 * });
 */
export function useClusterProvidersQuery(baseOptions?: Apollo.QueryHookOptions<ClusterProvidersQuery, ClusterProvidersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterProvidersQuery, ClusterProvidersQueryVariables>(ClusterProvidersDocument, options);
      }
export function useClusterProvidersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterProvidersQuery, ClusterProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterProvidersQuery, ClusterProvidersQueryVariables>(ClusterProvidersDocument, options);
        }
export type ClusterProvidersQueryHookResult = ReturnType<typeof useClusterProvidersQuery>;
export type ClusterProvidersLazyQueryHookResult = ReturnType<typeof useClusterProvidersLazyQuery>;
export type ClusterProvidersQueryResult = Apollo.QueryResult<ClusterProvidersQuery, ClusterProvidersQueryVariables>;
export const CreateClusterProviderDocument = gql`
    mutation CreateClusterProvider($attributes: ClusterProviderAttributes!) {
  createClusterProvider(attributes: $attributes) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}`;
export type CreateClusterProviderMutationFn = Apollo.MutationFunction<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>;

/**
 * __useCreateClusterProviderMutation__
 *
 * To run a mutation, you first call `useCreateClusterProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateClusterProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createClusterProviderMutation, { data, loading, error }] = useCreateClusterProviderMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateClusterProviderMutation(baseOptions?: Apollo.MutationHookOptions<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>(CreateClusterProviderDocument, options);
      }
export type CreateClusterProviderMutationHookResult = ReturnType<typeof useCreateClusterProviderMutation>;
export type CreateClusterProviderMutationResult = Apollo.MutationResult<CreateClusterProviderMutation>;
export type CreateClusterProviderMutationOptions = Apollo.BaseMutationOptions<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>;
export const UpdateClusterProviderDocument = gql`
    mutation UpdateClusterProvider($id: ID!, $attributes: ClusterProviderUpdateAttributes!) {
  updateClusterProvider(id: $id, attributes: $attributes) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}`;
export type UpdateClusterProviderMutationFn = Apollo.MutationFunction<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>;

/**
 * __useUpdateClusterProviderMutation__
 *
 * To run a mutation, you first call `useUpdateClusterProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateClusterProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateClusterProviderMutation, { data, loading, error }] = useUpdateClusterProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateClusterProviderMutation(baseOptions?: Apollo.MutationHookOptions<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>(UpdateClusterProviderDocument, options);
      }
export type UpdateClusterProviderMutationHookResult = ReturnType<typeof useUpdateClusterProviderMutation>;
export type UpdateClusterProviderMutationResult = Apollo.MutationResult<UpdateClusterProviderMutation>;
export type UpdateClusterProviderMutationOptions = Apollo.BaseMutationOptions<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>;
export const DeleteClusterProviderDocument = gql`
    mutation DeleteClusterProvider($id: ID!) {
  deleteClusterProvider(id: $id) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}`;
export type DeleteClusterProviderMutationFn = Apollo.MutationFunction<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>;

/**
 * __useDeleteClusterProviderMutation__
 *
 * To run a mutation, you first call `useDeleteClusterProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteClusterProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteClusterProviderMutation, { data, loading, error }] = useDeleteClusterProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteClusterProviderMutation(baseOptions?: Apollo.MutationHookOptions<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>(DeleteClusterProviderDocument, options);
      }
export type DeleteClusterProviderMutationHookResult = ReturnType<typeof useDeleteClusterProviderMutation>;
export type DeleteClusterProviderMutationResult = Apollo.MutationResult<DeleteClusterProviderMutation>;
export type DeleteClusterProviderMutationOptions = Apollo.BaseMutationOptions<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>;
export const ServiceDeploymentsDocument = gql`
    query ServiceDeployments($first: Int = 100, $after: String, $q: String, $cluster: String, $clusterId: ID) {
  serviceDeployments(
    first: $first
    after: $after
    q: $q
    cluster: $cluster
    clusterId: $clusterId
  ) {
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
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      q: // value for 'q'
 *      cluster: // value for 'cluster'
 *      clusterId: // value for 'clusterId'
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
export const ServiceDeploymentsTinyDocument = gql`
    query ServiceDeploymentsTiny {
  serviceDeployments(first: 100) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        id
        name
        cluster {
          id
          name
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}`;

/**
 * __useServiceDeploymentsTinyQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentsTinyQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentsTinyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentsTinyQuery({
 *   variables: {
 *   },
 * });
 */
export function useServiceDeploymentsTinyQuery(baseOptions?: Apollo.QueryHookOptions<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>(ServiceDeploymentsTinyDocument, options);
      }
export function useServiceDeploymentsTinyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>(ServiceDeploymentsTinyDocument, options);
        }
export type ServiceDeploymentsTinyQueryHookResult = ReturnType<typeof useServiceDeploymentsTinyQuery>;
export type ServiceDeploymentsTinyLazyQueryHookResult = ReturnType<typeof useServiceDeploymentsTinyLazyQuery>;
export type ServiceDeploymentsTinyQueryResult = Apollo.QueryResult<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>;
export const ServiceDeploymentDocument = gql`
    query ServiceDeployment($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}`;

/**
 * __useServiceDeploymentQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>(ServiceDeploymentDocument, options);
      }
export function useServiceDeploymentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>(ServiceDeploymentDocument, options);
        }
export type ServiceDeploymentQueryHookResult = ReturnType<typeof useServiceDeploymentQuery>;
export type ServiceDeploymentLazyQueryHookResult = ReturnType<typeof useServiceDeploymentLazyQuery>;
export type ServiceDeploymentQueryResult = Apollo.QueryResult<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>;
export const ServiceDeploymentComponentsDocument = gql`
    query ServiceDeploymentComponents($id: ID!) {
  serviceDeployment(id: $id) {
    name
    components {
      ...ServiceDeploymentComponent
    }
  }
}
    ${ServiceDeploymentComponentFragmentDoc}`;

/**
 * __useServiceDeploymentComponentsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentComponentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentComponentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentComponentsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentComponentsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>(ServiceDeploymentComponentsDocument, options);
      }
export function useServiceDeploymentComponentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>(ServiceDeploymentComponentsDocument, options);
        }
export type ServiceDeploymentComponentsQueryHookResult = ReturnType<typeof useServiceDeploymentComponentsQuery>;
export type ServiceDeploymentComponentsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentComponentsLazyQuery>;
export type ServiceDeploymentComponentsQueryResult = Apollo.QueryResult<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>;
export const ServiceDeploymentSecretsDocument = gql`
    query ServiceDeploymentSecrets($id: ID!) {
  serviceDeployment(id: $id) {
    configuration {
      name
      value
    }
  }
}
    `;

/**
 * __useServiceDeploymentSecretsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentSecretsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentSecretsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentSecretsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentSecretsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>(ServiceDeploymentSecretsDocument, options);
      }
export function useServiceDeploymentSecretsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>(ServiceDeploymentSecretsDocument, options);
        }
export type ServiceDeploymentSecretsQueryHookResult = ReturnType<typeof useServiceDeploymentSecretsQuery>;
export type ServiceDeploymentSecretsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentSecretsLazyQuery>;
export type ServiceDeploymentSecretsQueryResult = Apollo.QueryResult<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>;
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
export const UpdateServiceDeploymentDocument = gql`
    mutation UpdateServiceDeployment($id: ID!, $attributes: ServiceUpdateAttributes!) {
  updateServiceDeployment(id: $id, attributes: $attributes) {
    configuration {
      name
      value
    }
    git {
      folder
      ref
    }
    version
  }
}
    `;
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
export const MergeServiceDocument = gql`
    mutation MergeService($id: ID!, $configuration: [ConfigAttributes]) {
  mergeService(id: $id, configuration: $configuration) {
    configuration {
      name
      value
    }
  }
}
    `;
export type MergeServiceMutationFn = Apollo.MutationFunction<MergeServiceMutation, MergeServiceMutationVariables>;

/**
 * __useMergeServiceMutation__
 *
 * To run a mutation, you first call `useMergeServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMergeServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mergeServiceMutation, { data, loading, error }] = useMergeServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      configuration: // value for 'configuration'
 *   },
 * });
 */
export function useMergeServiceMutation(baseOptions?: Apollo.MutationHookOptions<MergeServiceMutation, MergeServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MergeServiceMutation, MergeServiceMutationVariables>(MergeServiceDocument, options);
      }
export type MergeServiceMutationHookResult = ReturnType<typeof useMergeServiceMutation>;
export type MergeServiceMutationResult = Apollo.MutationResult<MergeServiceMutation>;
export type MergeServiceMutationOptions = Apollo.BaseMutationOptions<MergeServiceMutation, MergeServiceMutationVariables>;
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
export const UpdateRbacDocument = gql`
    mutation UpdateRbac($serviceId: ID, $clusterId: ID, $rbac: RbacAttributes!) {
  updateRbac(serviceId: $serviceId, clusterId: $clusterId, rbac: $rbac)
}
    `;
export type UpdateRbacMutationFn = Apollo.MutationFunction<UpdateRbacMutation, UpdateRbacMutationVariables>;

/**
 * __useUpdateRbacMutation__
 *
 * To run a mutation, you first call `useUpdateRbacMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRbacMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRbacMutation, { data, loading, error }] = useUpdateRbacMutation({
 *   variables: {
 *      serviceId: // value for 'serviceId'
 *      clusterId: // value for 'clusterId'
 *      rbac: // value for 'rbac'
 *   },
 * });
 */
export function useUpdateRbacMutation(baseOptions?: Apollo.MutationHookOptions<UpdateRbacMutation, UpdateRbacMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateRbacMutation, UpdateRbacMutationVariables>(UpdateRbacDocument, options);
      }
export type UpdateRbacMutationHookResult = ReturnType<typeof useUpdateRbacMutation>;
export type UpdateRbacMutationResult = Apollo.MutationResult<UpdateRbacMutation>;
export type UpdateRbacMutationOptions = Apollo.BaseMutationOptions<UpdateRbacMutation, UpdateRbacMutationVariables>;
export const ServiceDeploymentBindingsDocument = gql`
    query ServiceDeploymentBindings($id: ID!) {
  serviceDeployment(id: $id) {
    id
    ...ServiceDeploymentBindings
  }
}
    ${ServiceDeploymentBindingsFragmentDoc}`;

/**
 * __useServiceDeploymentBindingsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentBindingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentBindingsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentBindingsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>(ServiceDeploymentBindingsDocument, options);
      }
export function useServiceDeploymentBindingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>(ServiceDeploymentBindingsDocument, options);
        }
export type ServiceDeploymentBindingsQueryHookResult = ReturnType<typeof useServiceDeploymentBindingsQuery>;
export type ServiceDeploymentBindingsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentBindingsLazyQuery>;
export type ServiceDeploymentBindingsQueryResult = Apollo.QueryResult<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>;
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
export const CertificateDocument = gql`
    query Certificate($name: String!, $namespace: String!, $serviceId: ID) {
  certificate(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Certificate
    events {
      ...Event
    }
  }
}
    ${CertificateFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useCertificateQuery__
 *
 * To run a query within a React component, call `useCertificateQuery` and pass it any options that fit your needs.
 * When your component renders, `useCertificateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCertificateQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useCertificateQuery(baseOptions: Apollo.QueryHookOptions<CertificateQuery, CertificateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CertificateQuery, CertificateQueryVariables>(CertificateDocument, options);
      }
export function useCertificateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CertificateQuery, CertificateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CertificateQuery, CertificateQueryVariables>(CertificateDocument, options);
        }
export type CertificateQueryHookResult = ReturnType<typeof useCertificateQuery>;
export type CertificateLazyQueryHookResult = ReturnType<typeof useCertificateLazyQuery>;
export type CertificateQueryResult = Apollo.QueryResult<CertificateQuery, CertificateQueryVariables>;
export const CronJobDocument = gql`
    query CronJob($name: String!, $namespace: String!, $serviceId: ID) {
  cronJob(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...CronJob
    events {
      ...Event
    }
    jobs {
      metadata {
        name
        namespace
      }
      status {
        ...JobStatus
      }
    }
  }
}
    ${CronJobFragmentDoc}
${EventFragmentDoc}
${JobStatusFragmentDoc}`;

/**
 * __useCronJobQuery__
 *
 * To run a query within a React component, call `useCronJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useCronJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCronJobQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useCronJobQuery(baseOptions: Apollo.QueryHookOptions<CronJobQuery, CronJobQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CronJobQuery, CronJobQueryVariables>(CronJobDocument, options);
      }
export function useCronJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CronJobQuery, CronJobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CronJobQuery, CronJobQueryVariables>(CronJobDocument, options);
        }
export type CronJobQueryHookResult = ReturnType<typeof useCronJobQuery>;
export type CronJobLazyQueryHookResult = ReturnType<typeof useCronJobLazyQuery>;
export type CronJobQueryResult = Apollo.QueryResult<CronJobQuery, CronJobQueryVariables>;
export const DeploymentDocument = gql`
    query Deployment($name: String!, $namespace: String!, $serviceId: ID) {
  deployment(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Deployment
    pods {
      ...Pod
    }
    events {
      ...Event
    }
  }
}
    ${DeploymentFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useDeploymentQuery__
 *
 * To run a query within a React component, call `useDeploymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useDeploymentQuery(baseOptions: Apollo.QueryHookOptions<DeploymentQuery, DeploymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentQuery, DeploymentQueryVariables>(DeploymentDocument, options);
      }
export function useDeploymentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentQuery, DeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentQuery, DeploymentQueryVariables>(DeploymentDocument, options);
        }
export type DeploymentQueryHookResult = ReturnType<typeof useDeploymentQuery>;
export type DeploymentLazyQueryHookResult = ReturnType<typeof useDeploymentLazyQuery>;
export type DeploymentQueryResult = Apollo.QueryResult<DeploymentQuery, DeploymentQueryVariables>;
export const IngressDocument = gql`
    query Ingress($name: String!, $namespace: String!, $serviceId: ID) {
  ingress(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Ingress
    events {
      ...Event
    }
  }
}
    ${IngressFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useIngressQuery__
 *
 * To run a query within a React component, call `useIngressQuery` and pass it any options that fit your needs.
 * When your component renders, `useIngressQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIngressQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useIngressQuery(baseOptions: Apollo.QueryHookOptions<IngressQuery, IngressQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IngressQuery, IngressQueryVariables>(IngressDocument, options);
      }
export function useIngressLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IngressQuery, IngressQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IngressQuery, IngressQueryVariables>(IngressDocument, options);
        }
export type IngressQueryHookResult = ReturnType<typeof useIngressQuery>;
export type IngressLazyQueryHookResult = ReturnType<typeof useIngressLazyQuery>;
export type IngressQueryResult = Apollo.QueryResult<IngressQuery, IngressQueryVariables>;
export const JobDocument = gql`
    query Job($name: String!, $namespace: String!, $serviceId: ID) {
  job(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Job
    events {
      ...Event
    }
  }
}
    ${JobFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useJobQuery__
 *
 * To run a query within a React component, call `useJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useJobQuery(baseOptions: Apollo.QueryHookOptions<JobQuery, JobQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobQuery, JobQueryVariables>(JobDocument, options);
      }
export function useJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobQuery, JobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobQuery, JobQueryVariables>(JobDocument, options);
        }
export type JobQueryHookResult = ReturnType<typeof useJobQuery>;
export type JobLazyQueryHookResult = ReturnType<typeof useJobLazyQuery>;
export type JobQueryResult = Apollo.QueryResult<JobQuery, JobQueryVariables>;
export const NodeDocument = gql`
    query Node($name: String!, $clusterId: ID) {
  node(name: $name, clusterId: $clusterId) {
    ...Node
  }
}
    ${NodeFragmentDoc}`;

/**
 * __useNodeQuery__
 *
 * To run a query within a React component, call `useNodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeQuery({
 *   variables: {
 *      name: // value for 'name'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useNodeQuery(baseOptions: Apollo.QueryHookOptions<NodeQuery, NodeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeQuery, NodeQueryVariables>(NodeDocument, options);
      }
export function useNodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeQuery, NodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeQuery, NodeQueryVariables>(NodeDocument, options);
        }
export type NodeQueryHookResult = ReturnType<typeof useNodeQuery>;
export type NodeLazyQueryHookResult = ReturnType<typeof useNodeLazyQuery>;
export type NodeQueryResult = Apollo.QueryResult<NodeQuery, NodeQueryVariables>;
export const NodeMetricDocument = gql`
    query NodeMetric($name: String!, $clusterId: ID) {
  nodeMetric(name: $name, clusterId: $clusterId) {
    ...NodeMetric
  }
}
    ${NodeMetricFragmentDoc}`;

/**
 * __useNodeMetricQuery__
 *
 * To run a query within a React component, call `useNodeMetricQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeMetricQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeMetricQuery({
 *   variables: {
 *      name: // value for 'name'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useNodeMetricQuery(baseOptions: Apollo.QueryHookOptions<NodeMetricQuery, NodeMetricQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeMetricQuery, NodeMetricQueryVariables>(NodeMetricDocument, options);
      }
export function useNodeMetricLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeMetricQuery, NodeMetricQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeMetricQuery, NodeMetricQueryVariables>(NodeMetricDocument, options);
        }
export type NodeMetricQueryHookResult = ReturnType<typeof useNodeMetricQuery>;
export type NodeMetricLazyQueryHookResult = ReturnType<typeof useNodeMetricLazyQuery>;
export type NodeMetricQueryResult = Apollo.QueryResult<NodeMetricQuery, NodeMetricQueryVariables>;
export const PodDocument = gql`
    query Pod($name: String!, $namespace: String!, $clusterId: ID) {
  pod(name: $name, namespace: $namespace, clusterId: $clusterId) {
    ...PodWithEvents
  }
}
    ${PodWithEventsFragmentDoc}`;

/**
 * __usePodQuery__
 *
 * To run a query within a React component, call `usePodQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function usePodQuery(baseOptions: Apollo.QueryHookOptions<PodQuery, PodQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodQuery, PodQueryVariables>(PodDocument, options);
      }
export function usePodLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodQuery, PodQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodQuery, PodQueryVariables>(PodDocument, options);
        }
export type PodQueryHookResult = ReturnType<typeof usePodQuery>;
export type PodLazyQueryHookResult = ReturnType<typeof usePodLazyQuery>;
export type PodQueryResult = Apollo.QueryResult<PodQuery, PodQueryVariables>;
export const ServiceDocument = gql`
    query Service($name: String!, $namespace: String!, $serviceId: ID) {
  service(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Service
    pods {
      ...Pod
    }
    events {
      ...Event
    }
  }
}
    ${ServiceFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useServiceQuery__
 *
 * To run a query within a React component, call `useServiceQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useServiceQuery(baseOptions: Apollo.QueryHookOptions<ServiceQuery, ServiceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceQuery, ServiceQueryVariables>(ServiceDocument, options);
      }
export function useServiceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceQuery, ServiceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceQuery, ServiceQueryVariables>(ServiceDocument, options);
        }
export type ServiceQueryHookResult = ReturnType<typeof useServiceQuery>;
export type ServiceLazyQueryHookResult = ReturnType<typeof useServiceLazyQuery>;
export type ServiceQueryResult = Apollo.QueryResult<ServiceQuery, ServiceQueryVariables>;
export const StatefulSetDocument = gql`
    query StatefulSet($name: String!, $namespace: String!, $serviceId: ID) {
  statefulSet(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...StatefulSet
    pods {
      ...Pod
    }
    events {
      ...Event
    }
  }
}
    ${StatefulSetFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useStatefulSetQuery__
 *
 * To run a query within a React component, call `useStatefulSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useStatefulSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatefulSetQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useStatefulSetQuery(baseOptions: Apollo.QueryHookOptions<StatefulSetQuery, StatefulSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StatefulSetQuery, StatefulSetQueryVariables>(StatefulSetDocument, options);
      }
export function useStatefulSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StatefulSetQuery, StatefulSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StatefulSetQuery, StatefulSetQueryVariables>(StatefulSetDocument, options);
        }
export type StatefulSetQueryHookResult = ReturnType<typeof useStatefulSetQuery>;
export type StatefulSetLazyQueryHookResult = ReturnType<typeof useStatefulSetLazyQuery>;
export type StatefulSetQueryResult = Apollo.QueryResult<StatefulSetQuery, StatefulSetQueryVariables>;
export const UnstructuredResourceDocument = gql`
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
    ${UnstructuredResourceFragmentDoc}`;

/**
 * __useUnstructuredResourceQuery__
 *
 * To run a query within a React component, call `useUnstructuredResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useUnstructuredResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUnstructuredResourceQuery({
 *   variables: {
 *      group: // value for 'group'
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *      version: // value for 'version'
 *   },
 * });
 */
export function useUnstructuredResourceQuery(baseOptions: Apollo.QueryHookOptions<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>(UnstructuredResourceDocument, options);
      }
export function useUnstructuredResourceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>(UnstructuredResourceDocument, options);
        }
export type UnstructuredResourceQueryHookResult = ReturnType<typeof useUnstructuredResourceQuery>;
export type UnstructuredResourceLazyQueryHookResult = ReturnType<typeof useUnstructuredResourceLazyQuery>;
export type UnstructuredResourceQueryResult = Apollo.QueryResult<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>;
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
export const UsersDocument = gql`
    query Users($q: String, $cursor: String) {
  users(q: $q, first: 20, after: $cursor) {
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
${UserFragmentDoc}`;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: Apollo.QueryHookOptions<UsersQuery, UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const SearchUsersDocument = gql`
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
${UserFragmentDoc}`;

/**
 * __useSearchUsersQuery__
 *
 * To run a query within a React component, call `useSearchUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchUsersQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useSearchUsersQuery(baseOptions?: Apollo.QueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchUsersQuery, SearchUsersQueryVariables>(SearchUsersDocument, options);
      }
export function useSearchUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchUsersQuery, SearchUsersQueryVariables>(SearchUsersDocument, options);
        }
export type SearchUsersQueryHookResult = ReturnType<typeof useSearchUsersQuery>;
export type SearchUsersLazyQueryHookResult = ReturnType<typeof useSearchUsersLazyQuery>;
export type SearchUsersQueryResult = Apollo.QueryResult<SearchUsersQuery, SearchUsersQueryVariables>;
export const namedOperations = {
  Query: {
    App: 'App',
    AppInfo: 'AppInfo',
    Repository: 'Repository',
    PluralContext: 'PluralContext',
    Clusters: 'Clusters',
    ClustersTiny: 'ClustersTiny',
    Cluster: 'Cluster',
    ClusterPods: 'ClusterPods',
    ClusterNamespaces: 'ClusterNamespaces',
    ClusterBindings: 'ClusterBindings',
    Usage: 'Usage',
    GitRepositories: 'GitRepositories',
    ClusterProviders: 'ClusterProviders',
    ServiceDeployments: 'ServiceDeployments',
    ServiceDeploymentsTiny: 'ServiceDeploymentsTiny',
    ServiceDeployment: 'ServiceDeployment',
    ServiceDeploymentComponents: 'ServiceDeploymentComponents',
    ServiceDeploymentSecrets: 'ServiceDeploymentSecrets',
    ServiceDeploymentRevisions: 'ServiceDeploymentRevisions',
    ServiceDeploymentBindings: 'ServiceDeploymentBindings',
    PostgresDatabases: 'PostgresDatabases',
    PostgresDatabase: 'PostgresDatabase',
    Groups: 'Groups',
    SearchGroups: 'SearchGroups',
    GroupMembers: 'GroupMembers',
    Certificate: 'Certificate',
    CronJob: 'CronJob',
    Deployment: 'Deployment',
    Ingress: 'Ingress',
    Job: 'Job',
    Node: 'Node',
    NodeMetric: 'NodeMetric',
    Pod: 'Pod',
    Service: 'Service',
    StatefulSet: 'StatefulSet',
    UnstructuredResource: 'UnstructuredResource',
    AccessTokens: 'AccessTokens',
    TokenAudits: 'TokenAudits',
    Me: 'Me',
    Users: 'Users',
    SearchUsers: 'SearchUsers'
  },
  Mutation: {
    CreateBuild: 'CreateBuild',
    UpdateClusterBindings: 'UpdateClusterBindings',
    UpdateCluster: 'UpdateCluster',
    CreateCluster: 'CreateCluster',
    CreateGitRepository: 'CreateGitRepository',
    DeleteGitRepository: 'DeleteGitRepository',
    UpdateGitRepository: 'UpdateGitRepository',
    CreateGlobalService: 'CreateGlobalService',
    DeleteGlobalService: 'DeleteGlobalService',
    CreateClusterProvider: 'CreateClusterProvider',
    UpdateClusterProvider: 'UpdateClusterProvider',
    DeleteClusterProvider: 'DeleteClusterProvider',
    CreateServiceDeployment: 'CreateServiceDeployment',
    UpdateServiceDeployment: 'UpdateServiceDeployment',
    MergeService: 'MergeService',
    DeleteServiceDeployment: 'DeleteServiceDeployment',
    RollbackService: 'RollbackService',
    UpdateRbac: 'UpdateRbac',
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
    CostAnalysis: 'CostAnalysis',
    FileContent: 'FileContent',
    Configuration: 'Configuration',
    ApplicationSpec: 'ApplicationSpec',
    ApplicationStatus: 'ApplicationStatus',
    Application: 'Application',
    ConfigurationOverlay: 'ConfigurationOverlay',
    Repository: 'Repository',
    PageInfo: 'PageInfo',
    ClusterNode: 'ClusterNode',
    ClusterCondition: 'ClusterCondition',
    NodePool: 'NodePool',
    ApiDeprecation: 'ApiDeprecation',
    ClustersRow: 'ClustersRow',
    Cluster: 'Cluster',
    ClusterTiny: 'ClusterTiny',
    PolicyBinding: 'PolicyBinding',
    ClusterBindings: 'ClusterBindings',
    MetricResponse: 'MetricResponse',
    GitRepositoriesRow: 'GitRepositoriesRow',
    GlobalService: 'GlobalService',
    ClusterProvider: 'ClusterProvider',
    ServiceDeploymentRevision: 'ServiceDeploymentRevision',
    ServiceDeploymentsRow: 'ServiceDeploymentsRow',
    ServiceDeploymentDetails: 'ServiceDeploymentDetails',
    ServiceDeploymentComponent: 'ServiceDeploymentComponent',
    ServiceDeploymentRevisions: 'ServiceDeploymentRevisions',
    ServiceDeploymentBindings: 'ServiceDeploymentBindings',
    DatabaseTableRow: 'DatabaseTableRow',
    GroupMember: 'GroupMember',
    Group: 'Group',
    Certificate: 'Certificate',
    CronJob: 'CronJob',
    Deployment: 'Deployment',
    Ingress: 'Ingress',
    Job: 'Job',
    Metadata: 'Metadata',
    Event: 'Event',
    ResourceSpec: 'ResourceSpec',
    Resources: 'Resources',
    Container: 'Container',
    ContainerStatus: 'ContainerStatus',
    Pod: 'Pod',
    JobStatus: 'JobStatus',
    Node: 'Node',
    NodeMetric: 'NodeMetric',
    PodWithEvents: 'PodWithEvents',
    Service: 'Service',
    StatefulSet: 'StatefulSet',
    UnstructuredResource: 'UnstructuredResource',
    AccessToken: 'AccessToken',
    AccessTokenAudit: 'AccessTokenAudit',
    User: 'User',
    Invite: 'Invite',
    RoleBinding: 'RoleBinding',
    Role: 'Role',
    Manifest: 'Manifest'
  }
}