# API Reference

## Packages
- [deployments.plural.sh/v1alpha1](#deploymentspluralshv1alpha1)


## deployments.plural.sh/v1alpha1

Package v1alpha1 contains API Schema definitions for the deployments v1alpha1 API group

### Resource Types
- [BootstrapToken](#bootstraptoken)
- [Catalog](#catalog)
- [Cluster](#cluster)
- [ClusterRestore](#clusterrestore)
- [ClusterRestoreTrigger](#clusterrestoretrigger)
- [CustomStackRun](#customstackrun)
- [DeploymentSettings](#deploymentsettings)
- [GeneratedSecret](#generatedsecret)
- [GitRepository](#gitrepository)
- [GlobalService](#globalservice)
- [HelmRepository](#helmrepository)
- [InfrastructureStack](#infrastructurestack)
- [ManagedNamespace](#managednamespace)
- [NamespaceCredentials](#namespacecredentials)
- [NotificationRouter](#notificationrouter)
- [NotificationSink](#notificationsink)
- [OIDCProvider](#oidcprovider)
- [ObservabilityProvider](#observabilityprovider)
- [Observer](#observer)
- [Pipeline](#pipeline)
- [PipelineContext](#pipelinecontext)
- [PrAutomation](#prautomation)
- [PrAutomationTrigger](#prautomationtrigger)
- [Project](#project)
- [Provider](#provider)
- [ScmConnection](#scmconnection)
- [ServiceAccount](#serviceaccount)
- [ServiceDeployment](#servicedeployment)
- [StackDefinition](#stackdefinition)



#### AIProviderSettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `model` _string_ | Model is the LLM model name to use. |  | Optional: {} <br /> |
| `toolModel` _string_ | Model to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: {} <br /> |
| `embeddingModel` _string_ | Model to use for generating embeddings |  | Optional: {} <br /> |
| `baseUrl` _string_ | A custom base url to use, for reimplementations of the same API scheme (for instance Together.ai uses the OpenAI API spec) |  | Optional: {} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to the local secret holding the token to access<br />the configured AI provider. |  | Required: {} <br /> |


#### AISettings



AISettings holds the configuration for LLM provider clients.



_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled defines whether to enable the AI integration or not. | false | Optional: {} <br /> |
| `tools` _[Tools](#tools)_ |  |  | Optional: {} <br /> |
| `provider` _[AiProvider](#aiprovider)_ | Provider defines which of the supported LLM providers should be used. | OPENAI | Enum: [OPENAI ANTHROPIC OLLAMA AZURE BEDROCK VERTEX] <br />Optional: {} <br /> |
| `toolProvider` _[AiProvider](#aiprovider)_ | Provider to use for tool calling, in case you want to use a different LLM more optimized to those tasks |  | Enum: [OPENAI ANTHROPIC OLLAMA AZURE BEDROCK VERTEX] <br />Optional: {} <br /> |
| `embeddingProvider` _[AiProvider](#aiprovider)_ | Provider to use for generating embeddings. Oftentimes foundational model providers do not have embeddings models, and it's better to simply use OpenAI. |  | Enum: [OPENAI ANTHROPIC OLLAMA AZURE BEDROCK VERTEX] <br />Optional: {} <br /> |
| `openAI` _[AIProviderSettings](#aiprovidersettings)_ | OpenAI holds the OpenAI provider configuration. |  | Optional: {} <br /> |
| `anthropic` _[AIProviderSettings](#aiprovidersettings)_ | Anthropic holds the Anthropic provider configuration. |  | Optional: {} <br /> |
| `ollama` _[OllamaSettings](#ollamasettings)_ | Ollama holds configuration for a self-hosted Ollama deployment, more details available at https://github.com/ollama/ollama |  | Optional: {} <br /> |
| `azure` _[AzureOpenAISettings](#azureopenaisettings)_ | Azure holds configuration for using AzureOpenAI to generate LLM insights |  | Optional: {} <br /> |
| `bedrock` _[BedrockSettings](#bedrocksettings)_ | Bedrock holds configuration for using AWS Bedrock to generate LLM insights |  | Optional: {} <br /> |
| `vertex` _[VertexSettings](#vertexsettings)_ | Vertex holds configuration for using GCP VertexAI to generate LLM insights |  | Optional: {} <br /> |




#### AzureOpenAISettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `endpoint` _string_ | Your Azure OpenAI endpoint, should be formatted like: https://{endpoint}/openai/deployments/{deployment-id}" |  | Required: {} <br /> |
| `apiVersion` _string_ | The azure openai Data plane - inference api version to use, defaults to 2024-10-01-preview or the latest available |  | Optional: {} <br /> |
| `model` _string_ | The OpenAi Model you wish to use.  If not specified, Plural will provide a default |  | Optional: {} <br /> |
| `toolModel` _string_ | Model to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: {} <br /> |
| `embeddingModel` _string_ | Model to use for generating embeddings |  | Optional: {} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to the local secret holding the token to access<br />the configured AI provider. |  | Required: {} <br /> |


#### BedrockSettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `modelId` _string_ | The AWS Bedrock Model ID to use |  | Required: {} <br /> |
| `toolModelId` _string_ | Model to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: {} <br /> |
| `accessKeyId` _string_ | An AWS Access Key ID to use, can also use IRSA to acquire credentials |  | Optional: {} <br /> |
| `secretAccessKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | An AWS Secret Access Key to use, can also use IRSA to acquire credentials |  | Optional: {} <br /> |


#### Binding



Binding ...



_Appears in:_
- [Bindings](#bindings)
- [CatalogBindings](#catalogbindings)
- [DeploymentSettingsBindings](#deploymentsettingsbindings)
- [NotificationSinkSpec](#notificationsinkspec)
- [PrAutomationBindings](#prautomationbindings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  | Optional: {} <br /> |
| `UserID` _string_ |  |  | Optional: {} <br /> |
| `userEmail` _string_ |  |  | Optional: {} <br /> |
| `groupID` _string_ |  |  | Optional: {} <br /> |
| `groupName` _string_ |  |  | Optional: {} <br /> |


#### Bindings



Bindings represents a policy bindings that
can be used to define read/write permissions
to this resource for users/groups in the system.



_Appears in:_
- [ClusterSpec](#clusterspec)
- [InfrastructureStackSpec](#infrastructurestackspec)
- [PipelineSpec](#pipelinespec)
- [ProjectSpec](#projectspec)
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: {} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: {} <br /> |


#### BootstrapToken



BootstrapToken is the Schema for the BootstrapTokens API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `BootstrapToken` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[BootstrapTokenSpec](#bootstraptokenspec)_ |  |  |  |


#### BootstrapTokenSpec



BootstrapTokenSpec defines the desired state of BootstrapToken



_Appears in:_
- [BootstrapToken](#bootstraptoken)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `user` _string_ | User is an optional email to the user identity for this bootstrap token in audit logs |  | Optional: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef is the project that all clusters spawned by generated bootstrap token will belong to |  | Required: {} <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | TokenSecretRef points to an output secret where bootstrap token will be stored.<br />It will be created automatically in the same namespace as BootstrapToken and cannot exist. |  | Required: {} <br /> |


#### Cascade



Cascade is a specification for deletion behavior of owned resources



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `detach` _boolean_ | Whether you want to delete owned resources in Plural but leave kubernetes objects in-place |  | Optional: {} <br /> |
| `delete` _boolean_ | Whether you want to delete owned resources in Plural and in the targeted k8s cluster |  | Optional: {} <br /> |


#### Catalog



Catalog is the Schema for the catalogs API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Catalog` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CatalogSpec](#catalogspec)_ |  |  |  |


#### CatalogBindings



CatalogBindings ...



_Appears in:_
- [CatalogSpec](#catalogspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings. |  | Optional: {} <br /> |
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: {} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: {} <br /> |


#### CatalogSpec



CatalogSpec defines the desired state of Catalog



_Appears in:_
- [Catalog](#catalog)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Optional: {} <br /> |
| `author` _string_ |  |  | Required: {} <br /> |
| `icon` _string_ | An icon url to annotate this pr automation |  | Optional: {} <br /> |
| `darkIcon` _string_ | An darkmode icon url to annotate this pr automation |  | Optional: {} <br /> |
| `description` _string_ | Description is a description of this Catalog. |  | Optional: {} <br />Type: string <br /> |
| `category` _string_ |  |  | Optional: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef owning project of the catalog, permissions will propagate down |  | Optional: {} <br /> |
| `tags` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `bindings` _[CatalogBindings](#catalogbindings)_ | Bindings contain read and write policies of this Catalog. |  | Optional: {} <br /> |


#### CloudProvider

_Underlying type:_ _string_





_Appears in:_
- [ProviderSpec](#providerspec)



#### CloudProviderSettings



CloudProviderSettings ...



_Appears in:_
- [ProviderSpec](#providerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |
| `azure` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |
| `gcp` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |




#### Cluster



Cluster ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Cluster` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterSpec](#clusterspec)_ |  |  |  |


#### ClusterAWSCloudSettings







_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `region` _string_ | Region in AWS to deploy this cluster to. |  | Required: {} <br />Type: string <br /> |


#### ClusterAzureCloudSettings







_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `resourceGroup` _string_ | ResourceGroup is a name for the Azure resource group for this cluster. |  | Required: {} <br />Type: string <br /> |
| `network` _string_ | Network is a name for the Azure virtual network for this cluster. |  | Required: {} <br />Type: string <br /> |
| `subscriptionId` _string_ | SubscriptionId is GUID of the Azure subscription to hold this cluster. |  | Required: {} <br />Type: string <br /> |
| `location` _string_ | Location in Azure to deploy this cluster to. |  | Required: {} <br />Type: string <br /> |


#### ClusterCloudSettings







_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[ClusterAWSCloudSettings](#clusterawscloudsettings)_ | AWS cluster customizations. |  | Optional: {} <br /> |
| `azure` _[ClusterAzureCloudSettings](#clusterazurecloudsettings)_ | Azure cluster customizations. |  | Optional: {} <br /> |
| `gcp` _[ClusterGCPCloudSettings](#clustergcpcloudsettings)_ | GCP cluster customizations. |  | Optional: {} <br /> |


#### ClusterGCPCloudSettings







_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `project` _string_ | Project in GCP to deploy cluster to. |  | Required: {} <br />Type: string <br /> |
| `network` _string_ | Network in GCP to use when creating the cluster. |  | Required: {} <br />Type: string <br /> |
| `region` _string_ | Region in GCP to deploy cluster to. |  | Required: {} <br />Type: string <br /> |


#### ClusterNodePool







_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of the node pool. Must be unique. |  | Required: {} <br />Type: string <br /> |
| `instanceType` _string_ | InstanceType contains the type of node to use. Usually cloud-specific. |  | Required: {} <br />Type: string <br /> |
| `minSize` _integer_ | MinSize is minimum number of instances in this node pool. |  | Minimum: 1 <br />Required: {} <br /> |
| `maxSize` _integer_ | MaxSize is maximum number of instances in this node pool. |  | Minimum: 1 <br />Required: {} <br /> |
| `labels` _object (keys:string, values:string)_ | Labels to apply to the nodes in this pool. Useful for node selectors. |  | Optional: {} <br /> |
| `taints` _[Taint](#taint) array_ | Taints you'd want to apply to a node, i.e. for preventing scheduling on spot instances. |  | Optional: {} <br /> |
| `cloudSettings` _[ClusterNodePoolCloudSettings](#clusternodepoolcloudsettings)_ | CloudSettings contains cloud-specific settings for this node pool. |  | Optional: {} <br /> |


#### ClusterNodePoolAWSCloudSettings







_Appears in:_
- [ClusterNodePoolCloudSettings](#clusternodepoolcloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `launchTemplateId` _string_ | LaunchTemplateId is an ID of custom launch template for your nodes. Useful for Golden AMI setups. |  | Optional: {} <br />Type: string <br /> |


#### ClusterNodePoolCloudSettings







_Appears in:_
- [ClusterNodePool](#clusternodepool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[ClusterNodePoolAWSCloudSettings](#clusternodepoolawscloudsettings)_ | AWS node pool customizations. |  | Optional: {} <br /> |


#### ClusterRestore



ClusterRestore is the Schema for the clusterrestores API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterRestore` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterRestoreSpec](#clusterrestorespec)_ |  |  |  |


#### ClusterRestoreSpec



ClusterRestoreSpec defines the desired state of ClusterRestore



_Appears in:_
- [ClusterRestore](#clusterrestore)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `backupID` _string_ | BackupID is an ID of the backup to restore.<br />If BackupID is specified, then BackupName, BackupNamespace and BackupClusterRef are not needed. |  | Optional: {} <br />Type: string <br /> |
| `backupName` _string_ | BackupName is a name of the backup to restore.<br />BackupNamespace and BackupClusterRef have to be specified as well with it.<br />If BackupName, BackupNamespace and BackupCluster are specified, then BackupID is not needed. |  | Optional: {} <br />Type: string <br /> |
| `backupNamespace` _string_ | BackupNamespace is a namespace of the backup to restore.<br />BackupName and BackupClusterRef have to be specified as well with it.<br />If BackupName, BackupNamespace and BackupCluster are specified, then BackupID is not needed. |  | Optional: {} <br />Type: string <br /> |
| `backupClusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | BackupClusterID is an ID of a cluster where the backup to restore is located.<br />BackupName and BackupNamespace have to be specified as well with it.<br />If BackupName, BackupNamespace and BackupClusterRef are specified, then BackupID is not needed. |  | Optional: {} <br /> |




#### ClusterRestoreTrigger



ClusterRestoreTrigger is the Schema for the clusterrestoretriggers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterRestoreTrigger` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterRestoreTriggerSpec](#clusterrestoretriggerspec)_ |  |  |  |


#### ClusterRestoreTriggerSpec



ClusterRestoreTriggerSpec defines the desired state of ClusterRestoreTrigger



_Appears in:_
- [ClusterRestoreTrigger](#clusterrestoretrigger)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `clusterRestoreRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRestoreRef pointing to source ClusterRestore. |  | Optional: {} <br /> |


#### ClusterSpec







_Appears in:_
- [Cluster](#cluster)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `handle` _string_ | Handle is a short, unique human-readable name used to identify this cluster.<br />Does not necessarily map to the cloud resource name.<br />This has to be specified in order to adopt existing cluster. |  | Optional: {} <br />Type: string <br /> |
| `version` _string_ | Version of Kubernetes to use for this cluster. Can be skipped only for BYOK. |  | Optional: {} <br />Type: string <br /> |
| `providerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProviderRef references provider to use for this cluster. Can be skipped only for BYOK. |  | Optional: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references project this cluster belongs to.<br />If not provided, it will use the default project. |  | Optional: {} <br /> |
| `cloud` _string_ | Cloud provider to use for this cluster. |  | Enum: [aws azure gcp byok] <br />Optional: {} <br />Type: string <br /> |
| `protect` _boolean_ | Protect cluster from being deleted. |  | Optional: {} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags used to filter clusters. |  | Optional: {} <br /> |
| `metadata` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: {} <br /> |
| `cloudSettings` _[ClusterCloudSettings](#clustercloudsettings)_ | CloudSettings contains cloud-specific settings for this cluster. |  | Optional: {} <br /> |
| `nodePools` _[ClusterNodePool](#clusternodepool) array_ | NodePools contains specs of node pools managed by this cluster. |  | Optional: {} <br /> |




#### ClusterTarget



A spec for targeting clusters



_Appears in:_
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tags` _object (keys:string, values:string)_ | Tags the cluster tags to target |  | Optional: {} <br /> |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro kubernetes distribution to target |  | Optional: {} <br /> |


#### CommandAttributes







_Appears in:_
- [CustomStackRunSpec](#customstackrunspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cmd` _string_ | the command this hook will execute |  |  |
| `args` _string array_ | optional arguments to pass to the command |  | Optional: {} <br /> |
| `dir` _string_ |  |  | Optional: {} <br /> |


#### ComponentState

_Underlying type:_ _string_





_Appears in:_
- [ServiceComponent](#servicecomponent)



#### Condition



Condition ...



_Appears in:_
- [PrAutomationConfiguration](#prautomationconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `field` _string_ |  |  | Required: {} <br /> |
| `operation` _[Operation](#operation)_ |  |  | Enum: [NOT GT LT EQ GTE LTE PREFIX SUFFIX] <br />Required: {} <br /> |
| `value` _string_ |  |  | Optional: {} <br /> |








#### Container







_Appears in:_
- [JobSpec](#jobspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `image` _string_ |  |  | Required: {} <br />Type: string <br /> |
| `args` _string array_ |  |  | Optional: {} <br /> |
| `env` _[Env](#env) array_ |  |  | Optional: {} <br /> |
| `envFrom` _[EnvFrom](#envfrom) array_ |  |  | Optional: {} <br /> |
| `resources` _[ContainerResources](#containerresources)_ |  |  | Optional: {} <br /> |




#### ContainerResources

_Underlying type:_ _[struct{Requests *ContainerResourceRequests "json:\"requests,omitempty\""; Limits *ContainerResourceRequests "json:\"limits,omitempty\""}](#struct{requests-*containerresourcerequests-"json:\"requests,omitempty\"";-limits-*containerresourcerequests-"json:\"limits,omitempty\""})_





_Appears in:_
- [Container](#container)
- [JobSpec](#jobspec)



#### CostSettings







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `recommendationCushion` _integer_ | A percentage amount of cushion to give over the average discovered utilization to generate a scaling recommendation,<br />should be between 1-99. |  | Optional: {} <br /> |
| `recommendationThreshold` _integer_ | The minimal monthly cost for a recommendation to be covered by a controller |  | Optional: {} <br /> |


#### CreatePr







_Appears in:_
- [Tools](#tools)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ScmConnectionRef the SCM connection to use for pr automations |  |  |


#### CustomRunStep







_Appears in:_
- [StackDefinitionSpec](#stackdefinitionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `args` _string array_ | Args allow you to provide any additional<br />args that should be passed to the custom<br />run step. |  | Required: {} <br /> |
| `cmd` _string_ | Cmd defines what command should be executed<br />as part of your custom run step. |  | Required: {} <br /> |
| `requireApproval` _boolean_ | RequireApproval controls whether this custom run step<br />will require an approval to proceed. |  | Optional: {} <br /> |
| `stage` _[StepStage](#stepstage)_ | Stage controls at which stage should this custom run<br />step be executed. |  | Enum: [PLAN VERIFY APPLY INIT DESTROY] <br />Required: {} <br /> |


#### CustomStackRun



CustomStackRun is the Schema for the customstackruns API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `CustomStackRun` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CustomStackRunSpec](#customstackrunspec)_ |  |  |  |


#### CustomStackRunSpec



CustomStackRunSpec defines the desired state of CustomStackRun



_Appears in:_
- [CustomStackRun](#customstackrun)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this CustomStackRun. If not provided CustomStackRun's own name from CustomStackRun.ObjectMeta will be used. |  | Optional: {} <br /> |
| `stackRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `documentation` _string_ | Documentation to explain what this will do |  | Optional: {} <br /> |
| `commands` _[CommandAttributes](#commandattributes) array_ | Commands the commands for this custom run |  |  |
| `configuration` _[PrAutomationConfiguration](#prautomationconfiguration) array_ | Configuration self-service configuration which will be presented in UI before triggering |  |  |


#### DeploymentSettings



DeploymentSettings is the Schema for the deploymentsettings API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `DeploymentSettings` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[DeploymentSettingsSpec](#deploymentsettingsspec)_ |  |  |  |


#### DeploymentSettingsBindings







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: {} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: {} <br /> |
| `create` _[Binding](#binding) array_ | Create bindings. |  | Optional: {} <br /> |
| `git` _[Binding](#binding) array_ | Git bindings. |  | Optional: {} <br /> |


#### DeploymentSettingsSpec



DeploymentSettingsSpec defines the desired state of DeploymentSettings



_Appears in:_
- [DeploymentSettings](#deploymentsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `agentHelmValues` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | AgentHelmValues custom helm values to apply to all agents (useful for things like adding customary annotations/labels) |  | Optional: {} <br /> |
| `managementRepo` _string_ | The root repo for setting up your infrastructure with Plural.  Usually this will be your `plural up repo` |  | Optional: {} <br /> |
| `stacks` _[StackSettings](#stacksettings)_ | Stacks global configuration for stack execution |  | Optional: {} <br /> |
| `bindings` _[DeploymentSettingsBindings](#deploymentsettingsbindings)_ | Bindings |  | Optional: {} <br /> |
| `prometheusConnection` _[HTTPConnection](#httpconnection)_ | PrometheusConnection connection details for a prometheus instance to use |  | Optional: {} <br /> |
| `lokiConnection` _[HTTPConnection](#httpconnection)_ | LokiConnection connection details for a loki instance to use |  | Optional: {} <br /> |
| `ai` _[AISettings](#aisettings)_ | AI settings specifies a configuration for LLM provider clients |  | Optional: {} <br /> |
| `logging` _[LoggingSettings](#loggingsettings)_ | Settings for connections to log aggregation datastores |  | Optional: {} <br /> |
| `cost` _[CostSettings](#costsettings)_ | Settings for managing Plural's cost management features |  | Optional: {} <br /> |
| `deploymentRepositoryRef` _[NamespacedName](#namespacedname)_ | pointer to the deployment GIT repository to use |  | Optional: {} <br /> |
| `scaffoldsRepositoryRef` _[NamespacedName](#namespacedname)_ | pointer to the Scaffolds GIT repository to use |  | Optional: {} <br /> |


#### ElasticsearchConnection







_Appears in:_
- [LoggingSettings](#loggingsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host ... |  | Required: {} <br /> |
| `index` _string_ | Index to query in elasticsearch |  | Optional: {} <br /> |
| `user` _string_ | User to connect with basic auth |  | Optional: {} <br /> |
| `passwordSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretRef selects a key of a password Secret |  | Optional: {} <br /> |






#### GateSpec



GateSpec is a more refined spec for parameters needed for complex gates.



_Appears in:_
- [PipelineGate](#pipelinegate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `job` _[JobSpec](#jobspec)_ |  |  | Optional: {} <br /> |


#### GeneratedSecret



GeneratedSecret is the Schema for the generatedsecrets API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GeneratedSecret` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GeneratedSecretSpec](#generatedsecretspec)_ |  |  |  |


#### GeneratedSecretDestination







_Appears in:_
- [GeneratedSecretSpec](#generatedsecretspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `namespace` _string_ |  |  |  |


#### GeneratedSecretSpec



GeneratedSecretSpec defines the desired state of GeneratedSecret



_Appears in:_
- [GeneratedSecret](#generatedsecret)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `template` _object (keys:string, values:string)_ | Template secret data in string form. |  | Optional: {} <br /> |
| `destinations` _[GeneratedSecretDestination](#generatedsecretdestination) array_ | Destinations describe name/namespace for the secrets. |  |  |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef is a secret reference which should contain data for secrets. |  | Optional: {} <br /> |




#### GitHealth

_Underlying type:_ _string_





_Appears in:_
- [GitRepositoryStatus](#gitrepositorystatus)



#### GitRef



GitRef ...



_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)
- [PrAutomationCreateConfiguration](#prautomationcreateconfiguration)
- [ServiceHelm](#servicehelm)
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `folder` _string_ | Folder ... |  | Required: {} <br /> |
| `ref` _string_ | Ref ... |  | Required: {} <br /> |
| `files` _string array_ | Optional files to add to the manifests for this service |  | Optional: {} <br /> |


#### GitRepository









| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GitRepository` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GitRepositorySpec](#gitrepositoryspec)_ |  |  |  |


#### GitRepositorySpec







_Appears in:_
- [GitRepository](#gitrepository)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ |  |  |  |
| `connectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | Reference a ScmConnection to reuse its credentials for this GitRepository's authentication |  | Optional: {} <br /> |
| `credentialsRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | CredentialsRef is a secret reference which should contain privateKey, passphrase, username and password. |  | Optional: {} <br /> |




#### GlobalService



GlobalService is the Schema for the globalservices API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GlobalService` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GlobalServiceSpec](#globalservicespec)_ |  |  |  |


#### GlobalServiceSpec



GlobalServiceSpec defines the desired state of GlobalService



_Appears in:_
- [GlobalService](#globalservice)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tags` _object (keys:string, values:string)_ | Tags a set of tags to select clusters for this global service |  | Optional: {} <br /> |
| `reparent` _boolean_ | Whether you'd want this global service to take ownership of existing Plural services |  | Optional: {} <br /> |
| `cascade` _[Cascade](#cascade)_ | Cascade deletion options for this global service |  | Optional: {} <br /> |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro of kubernetes this cluster is running |  | Enum: [GENERIC EKS AKS GKE RKE K3S] <br />Optional: {} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef to replicate across clusters |  | Optional: {} <br /> |
| `providerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProviderRef apply to clusters with this provider |  | Optional: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef allows a global service to span a specific project only |  | Optional: {} <br /> |
| `template` _[ServiceTemplate](#servicetemplate)_ |  |  | Optional: {} <br /> |


#### HTTPConnection







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)
- [LoggingSettings](#loggingsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host ... |  | Required: {} <br /> |
| `user` _string_ | User to connect with basic auth |  | Optional: {} <br /> |
| `password` _string_ | Password to connect w/ for basic auth |  | Optional: {} <br /> |
| `passwordSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretRef selects a key of a password Secret |  | Optional: {} <br /> |




#### HelmRepository









| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `HelmRepository` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[HelmRepositorySpec](#helmrepositoryspec)_ | Spec reflects a Console API Helm repository spec. |  | Required: {} <br /> |


#### HelmRepositoryAuth







_Appears in:_
- [HelmRepositorySpec](#helmrepositoryspec)
- [ObserverHelm](#observerhelm)
- [ObserverOci](#observeroci)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `basic` _[HelmRepositoryAuthBasic](#helmrepositoryauthbasic)_ |  |  | Optional: {} <br /> |
| `bearer` _[HelmRepositoryAuthBearer](#helmrepositoryauthbearer)_ |  |  | Optional: {} <br /> |
| `aws` _[HelmRepositoryAuthAWS](#helmrepositoryauthaws)_ |  |  | Optional: {} <br /> |
| `azure` _[HelmRepositoryAuthAzure](#helmrepositoryauthazure)_ |  |  | Optional: {} <br /> |
| `gcp` _[HelmRepositoryAuthGCP](#helmrepositoryauthgcp)_ |  |  | Optional: {} <br /> |


#### HelmRepositoryAuthAWS







_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `accessKey` _string_ |  |  | Optional: {} <br /> |
| `secretAccessKeySecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | SecretAccessKeySecretRef is a secret reference that should contain secret access key. |  | Optional: {} <br /> |
| `secretAccessKeySecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |
| `assumeRoleArn` _string_ |  |  | Optional: {} <br /> |


#### HelmRepositoryAuthAzure







_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `clientId` _string_ |  |  | Optional: {} <br /> |
| `clientSecretSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ClientSecretSecretRef is a secret reference that should contain client secret. |  | Optional: {} <br /> |
| `clientSecretSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |
| `tenantId` _string_ |  |  | Optional: {} <br /> |
| `subscriptionId` _string_ |  |  | Optional: {} <br /> |


#### HelmRepositoryAuthBasic







_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `username` _string_ |  |  | Required: {} <br /> |
| `passwordSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |


#### HelmRepositoryAuthBearer







_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |
| `tokenSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |


#### HelmRepositoryAuthGCP







_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `applicationCredentialsSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ApplicationCredentialsSecretRef is a secret reference that should contain application credentials. |  | Optional: {} <br /> |
| `applicationCredentialsSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |


#### HelmRepositorySpec







_Appears in:_
- [HelmRepository](#helmrepository)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL of the Helm repository. |  | Required: {} <br /> |
| `provider` _[HelmAuthProvider](#helmauthprovider)_ | Provider is the name of the Helm auth provider. |  | Enum: [BASIC BEARER GCP AZURE AWS] <br />Type: string <br /> |
| `auth` _[HelmRepositoryAuth](#helmrepositoryauth)_ | Auth contains authentication credentials for the Helm repository. |  | Optional: {} <br /> |


#### InfrastructureStack



InfrastructureStack is the Schema for the infrastructurestacks API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `InfrastructureStack` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[InfrastructureStackSpec](#infrastructurestackspec)_ |  |  |  |


#### InfrastructureStackSpec



InfrastructureStackSpec defines the desired state of InfrastructureStack



_Appears in:_
- [InfrastructureStack](#infrastructurestack)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this Stack. If not provided InfrastructureStack's own name from InfrastructureStack.ObjectMeta will be used. |  | Optional: {} <br /> |
| `type` _[StackType](#stacktype)_ | Type specifies the tool to use to apply it |  | Enum: [TERRAFORM ANSIBLE CUSTOM] <br />Required: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef to source IaC from |  | Required: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references project this stack belongs to.<br />If not provided, it will use the default project. |  | Optional: {} <br /> |
| `git` _[GitRef](#gitref)_ | Git reference w/in the repository where the IaC lives |  |  |
| `manageState` _boolean_ | ManageState - whether you want Plural to manage the state of this stack |  | Optional: {} <br /> |
| `workdir` _string_ | Workdir - the working directory within the git spec you want to run commands in (useful for projects with external modules) |  | Optional: {} <br /> |
| `jobSpec` _[JobSpec](#jobspec)_ | JobSpec optional k8s job configuration for the job that will apply this stack |  | Optional: {} <br /> |
| `configuration` _[StackConfiguration](#stackconfiguration)_ | Configuration version/image config for the tool you're using |  | Optional: {} <br /> |
| `cron` _[StackCron](#stackcron)_ | Configuration for cron generation of stack runs |  | Optional: {} <br /> |
| `approval` _boolean_ | Approval whether to require approval |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: {} <br /> |
| `environment` _[StackEnvironment](#stackenvironment) array_ |  |  | Optional: {} <br /> |
| `files` _[StackFile](#stackfile) array_ | Files reference to Secret with a key as a part of mount path and value as a content |  | Optional: {} <br /> |
| `detach` _boolean_ | Detach if true, detach the stack on CR deletion, leaving all cloud resources in-place. |  | Optional: {} <br /> |
| `actor` _string_ | Actor - user email to use for default Plural authentication in this stack. |  | Optional: {} <br /> |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `stackDefinitionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `observableMetrics` _[ObservableMetric](#observablemetric) array_ |  |  | Optional: {} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags used to filter stacks. |  | Optional: {} <br /> |
| `variables` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Variables represents a file with variables in the stack run environment.<br />It will be automatically passed to the specific tool depending on the<br />stack Type (except [console.StackTypeCustom]). |  | Optional: {} <br /> |
| `policyEngine` _[PolicyEngine](#policyengine)_ | PolicyEngine is a configuration for applying policy enforcement to a stack. |  | Optional: {} <br /> |


#### JobSpec



JobSpec is a spec for a job gate.



_Appears in:_
- [GateSpec](#gatespec)
- [InfrastructureStackSpec](#infrastructurestackspec)
- [StackSettings](#stacksettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespace` _string_ |  |  | Required: {} <br />Type: string <br /> |
| `containers` _[Container](#container) array_ |  |  | Optional: {} <br /> |
| `labels` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `annotations` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `serviceAccount` _string_ |  |  | Optional: {} <br />Type: string <br /> |
| `raw` _[JobSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#jobspec-v1-batch)_ | Raw can be used if you'd rather define the job spec via straight Kubernetes manifest file. |  | Optional: {} <br /> |
| `resources` _[ContainerResources](#containerresources)_ | Resource specification that overrides implicit container resources when containers are not directly configured. |  | Optional: {} <br /> |


#### LoggingSettings







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ |  |  | Optional: {} <br /> |
| `driver` _[LogDriver](#logdriver)_ | The type of log aggregation solution you wish to use | VICTORIA | Enum: [VICTORIA ELASTIC] <br />Optional: {} <br /> |
| `victoria` _[HTTPConnection](#httpconnection)_ | Configures a connection to victoria metrics |  | Optional: {} <br /> |
| `elastic` _[ElasticsearchConnection](#elasticsearchconnection)_ | Configures a connection to elasticsearch |  | Optional: {} <br /> |


#### ManagedNamespace



ManagedNamespace is the Schema for the managednamespaces API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ManagedNamespace` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ManagedNamespaceSpec](#managednamespacespec)_ |  |  |  |


#### ManagedNamespaceSpec



ManagedNamespaceSpec defines the desired state of ManagedNamespace



_Appears in:_
- [ManagedNamespace](#managednamespace)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this namespace once its placed on a cluster. If not provided ManagedNamespace's own name from ManagedNamespace.ObjectMeta will be used. |  | Optional: {} <br /> |
| `description` _string_ | Description a short description of the purpose of this namespace |  | Optional: {} <br /> |
| `cascade` _[Cascade](#cascade)_ | Cascade specifies how owned resources are deleted |  |  |
| `labels` _object (keys:string, values:string)_ | Labels for this namespace |  | Optional: {} <br /> |
| `annotations` _object (keys:string, values:string)_ | Annotations for this namespace |  | Optional: {} <br /> |
| `pullSecrets` _string array_ | PullSecrets a list of pull secrets to attach to this namespace |  | Optional: {} <br /> |
| `service` _[ServiceTemplate](#servicetemplate)_ |  |  | Optional: {} <br /> |
| `target` _[ClusterTarget](#clustertarget)_ |  |  | Optional: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef allows a managed namespace to span a specific project only |  | Optional: {} <br /> |


#### NamespaceCredentials



NamespaceCredentials connects namespaces with credentials from secret ref,
which are then used by other controllers during reconciling.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NamespaceCredentials` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NamespaceCredentialsSpec](#namespacecredentialsspec)_ |  |  | Required: {} <br /> |


#### NamespaceCredentialsSpec







_Appears in:_
- [NamespaceCredentials](#namespacecredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespaces` _string array_ | Namespaces that will be connected with credentials from SecretRef. |  | Required: {} <br /> |
| `secretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | SecretRef contains reference to secret with credentials. |  | Required: {} <br /> |




#### NamespacedName



NamespacedName is the same as types.NamespacedName
with the addition of kubebuilder/json annotations for better schema support.



_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)
- [ServiceHelm](#servicehelm)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a resource name. |  | Required: {} <br /> |
| `namespace` _string_ | Namespace is a resource namespace. |  | Required: {} <br /> |




#### NotificationRouter



NotificationRouter is the Schema for the notificationrouters API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NotificationRouter` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NotificationRouterSpec](#notificationrouterspec)_ |  |  |  |


#### NotificationRouterSpec



NotificationRouterSpec defines the desired state of NotificationRouter



_Appears in:_
- [NotificationRouter](#notificationrouter)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name the name of this router, if not provided NotificationRouter's own name from NotificationRouter.ObjectMeta will be used. |  | Optional: {} <br /> |
| `events` _string array_ | Events the events to trigger, or use * for any |  |  |
| `filters` _[RouterFilters](#routerfilters) array_ | Filters filters by object type |  | Optional: {} <br /> |
| `sinks` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Sinks notification sinks to deliver notifications to |  | Optional: {} <br /> |


#### NotificationSink



NotificationSink is the Schema for the notificationsinks API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NotificationSink` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NotificationSinkSpec](#notificationsinkspec)_ |  |  |  |


#### NotificationSinkSpec



NotificationSinkSpec defines the desired state of NotificationSink



_Appears in:_
- [NotificationSink](#notificationsink)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name the name of this service, if not provided NotificationSink's own name from NotificationSink.ObjectMeta will be used. |  | Optional: {} <br /> |
| `type` _[SinkType](#sinktype)_ | Type the channel type of this sink. |  | Enum: [SLACK TEAMS PLURAL] <br />Optional: {} <br /> |
| `configuration` _[SinkConfiguration](#sinkconfiguration)_ | Configuration for the specific type |  | Optional: {} <br /> |
| `bindings` _[Binding](#binding) array_ | Bindings to determine users/groups to be notified for PLURAL sync types |  | Optional: {} <br /> |


#### OIDCProvider



OIDCProvider is the Schema for the OIDCProviders API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `OIDCProvider` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[OIDCProviderSpec](#oidcproviderspec)_ |  |  |  |


#### OIDCProviderSpec



OIDCProviderSpec defines the desired state of OIDCProvider



_Appears in:_
- [OIDCProvider](#oidcprovider)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this OIDCProvider. If not provided OIDCProvider's own name<br />from OIDCProvider.ObjectMeta will be used. |  | Optional: {} <br /> |
| `description` _string_ | Description can be used to describe this OIDCProvider. |  | Optional: {} <br /> |
| `redirectUris` _string array_ | RedirectUris is a list of custom run steps that will be executed as<br />part of the stack run. |  | Optional: {} <br /> |
| `credentialsSecretRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ | CredentialsSecretRef is a local reference to the secret that contains OIDC provider credentials.<br />It will be created once OIDCProvider is created in the Console API.<br />Secret will contain 2 keys:<br />- 'clientId'<br />- 'clientSecret' |  | Required: {} <br /> |


#### ObservabilityProvider



ObservabilityProvider defines metrics provider used
by i.e. InfrastructureStack to determine if a stack run
should be cancelled.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ObservabilityProvider` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ObservabilityProviderSpec](#observabilityproviderspec)_ |  |  | Required: {} <br /> |


#### ObservabilityProviderCredentials







_Appears in:_
- [ObservabilityProviderSpec](#observabilityproviderspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `datadog` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Datadog is a reference to the secret with credentials used to access datadog.<br />It requires 2 keys to be provided in a secret:<br />- 'apiKey'<br />- 'appKey' |  | Optional: {} <br /> |
| `newrelic` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Newrelic is a reference to the secret with credentials used to access newrelic.<br />It requires 1 key to be provided in a secret:<br />- 'apiKey' |  | Optional: {} <br /> |


#### ObservabilityProviderSpec







_Appears in:_
- [ObservabilityProvider](#observabilityprovider)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of the ObservabilityProvider in the Console API. |  | Optional: {} <br /> |
| `type` _[ObservabilityProviderType](#observabilityprovidertype)_ | Type of the ObservabilityProvider. |  | Enum: [DATADOG NEWRELIC] <br />Required: {} <br /> |
| `credentials` _[ObservabilityProviderCredentials](#observabilityprovidercredentials)_ | Credentials to access the configured provider Type. |  | Optional: {} <br /> |


#### ObservableMetric







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `identifier` _string_ |  |  | Required: {} <br /> |
| `observabilityProviderRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: {} <br /> |


#### Observer



Observer is the Schema for the observers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Observer` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ObserverSpec](#observerspec)_ |  |  |  |


#### ObserverAction







_Appears in:_
- [ObserverSpec](#observerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[ObserverActionType](#observeractiontype)_ |  |  | Enum: [PIPELINE PR] <br />Type: string <br /> |
| `configuration` _[ObserverConfiguration](#observerconfiguration)_ | The configuration for the given action, relative to its current Type |  |  |


#### ObserverConfiguration







_Appears in:_
- [ObserverAction](#observeraction)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pr` _[ObserverPrAction](#observerpraction)_ |  |  |  |
| `pipeline` _[ObserverPipelineAction](#observerpipelineaction)_ |  |  |  |


#### ObserverGit







_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `gitRepositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | GitRepositoryRef references to Git repository. |  |  |
| `type` _[ObserverGitTargetType](#observergittargettype)_ |  |  | Enum: [TAGS] <br />Type: string <br /> |


#### ObserverHelm







_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL of the Helm repository. |  | Required: {} <br /> |
| `chart` _string_ | Chart of the Helm repository. |  | Required: {} <br /> |
| `provider` _[HelmAuthProvider](#helmauthprovider)_ | Provider is the name of the Helm auth provider. |  | Enum: [BASIC BEARER GCP AZURE AWS] <br />Type: string <br /> |
| `auth` _[HelmRepositoryAuth](#helmrepositoryauth)_ | Auth contains authentication credentials for the Helm repository. |  | Optional: {} <br /> |


#### ObserverOci







_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL of the Helm repository. |  | Required: {} <br /> |
| `provider` _[HelmAuthProvider](#helmauthprovider)_ | Provider is the name of the Helm auth provider. |  | Enum: [BASIC BEARER GCP AZURE AWS] <br />Type: string <br /> |
| `auth` _[HelmRepositoryAuth](#helmrepositoryauth)_ | Auth contains authentication credentials for the Helm repository. |  | Optional: {} <br /> |


#### ObserverPipelineAction







_Appears in:_
- [ObserverConfiguration](#observerconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef references to Pipeline. |  |  |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Context is a templated context that will become the PipelineContext applied to the given pipeline, use `$value` to interpolate the observed value |  |  |


#### ObserverPrAction







_Appears in:_
- [ObserverConfiguration](#observerconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef references to PR automation. |  |  |
| `repository` _string_ |  |  | Optional: {} <br /> |
| `branchTemplate` _string_ | BranchTemplate a template to use for the created branch, use $value to interject the observed value |  |  |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Context is a templated context that will become the context applied to the given PR Automation, use `$value` to interpolate the observed value |  |  |


#### ObserverSpec



ObserverSpec defines the desired state of Observer



_Appears in:_
- [Observer](#observer)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | the name of this observer, if not provided Observer's own name from Observer.ObjectMeta will be used. |  | Optional: {} <br /> |
| `crontab` _string_ | The crontab you will poll the given Target with |  |  |
| `target` _[ObserverTarget](#observertarget)_ | The target object to poll, triggering the list of Actions w/ the discovered value |  |  |
| `actions` _[ObserverAction](#observeraction) array_ | A list of predefined actions to take if a new Target is discovered in the last poll loop |  |  |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references project this observer belongs to.<br />If not provided, it will use the default project. |  | Optional: {} <br /> |


#### ObserverTarget







_Appears in:_
- [ObserverSpec](#observerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[ObserverTargetType](#observertargettype)_ |  |  | Enum: [OCI HELM GIT] <br />Type: string <br /> |
| `format` _string_ |  |  | Optional: {} <br /> |
| `order` _[ObserverTargetOrder](#observertargetorder)_ |  |  | Enum: [SEMVER LATEST] <br />Type: string <br /> |
| `helm` _[ObserverHelm](#observerhelm)_ |  |  | Optional: {} <br /> |
| `oci` _[ObserverOci](#observeroci)_ |  |  | Optional: {} <br /> |
| `git` _[ObserverGit](#observergit)_ |  |  | Optional: {} <br /> |


#### OllamaSettings



Settings for configuring a self-hosted Ollama LLM, more details at https://github.com/ollama/ollama



_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL is the url this model is queryable on |  | Required: {} <br /> |
| `model` _string_ | Model is the Ollama model to use when querying the /chat api |  | Required: {} <br /> |
| `toolModel` _string_ | Model to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: {} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to the local secret holding the contents of a HTTP Authorization header<br />to send to your ollama api in case authorization is required (eg for an instance hosted on a public network) |  | Optional: {} <br /> |


#### Pipeline



Pipeline is the Schema for the pipelines API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Pipeline` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineSpec](#pipelinespec)_ |  |  |  |


#### PipelineContext



PipelineContext is the Schema for the pipelinecontexts API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PipelineContext` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineContextSpec](#pipelinecontextspec)_ |  |  |  |


#### PipelineContextSpec



PipelineContextSpec defines the desired state of PipelineContext



_Appears in:_
- [PipelineContext](#pipelinecontext)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef pointing to source Pipeline. |  | Optional: {} <br /> |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Context is a Pipeline context |  |  |


#### PipelineEdge



PipelineEdge is a specification of an edge between two pipeline stages.



_Appears in:_
- [PipelineSpec](#pipelinespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `fromId` _string_ | FromID is stage ID the edge is from, can also be specified by name. |  | Optional: {} <br />Type: string <br /> |
| `toId` _string_ | ToID is stage ID the edge is to, can also be specified by name. |  | Optional: {} <br />Type: string <br /> |
| `from` _string_ | From is the name of the pipeline stage this edge emits from. |  | Optional: {} <br />Type: string <br /> |
| `to` _string_ | To is the name of the pipeline stage this edge points to. |  | Optional: {} <br />Type: string <br /> |
| `gates` _[PipelineGate](#pipelinegate) array_ | Gates are any optional promotion gates you wish to configure. |  | Optional: {} <br /> |


#### PipelineGate



PipelineGate will configure a promotion gate for a pipeline.



_Appears in:_
- [PipelineEdge](#pipelineedge)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this gate. |  | Required: {} <br />Type: string <br /> |
| `type` _[GateType](#gatetype)_ | Type of gate this is. |  | Enum: [APPROVAL WINDOW JOB] <br />Required: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef of a Cluster this gate will execute on. |  | Optional: {} <br /> |
| `spec` _[GateSpec](#gatespec)_ | Spec contains specification for more complex gate types. |  | Optional: {} <br /> |


#### PipelineSpec



PipelineSpec defines the desired state of Pipeline.



_Appears in:_
- [Pipeline](#pipeline)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `stages` _[PipelineStage](#pipelinestage) array_ | Stages of a pipeline. |  |  |
| `edges` _[PipelineEdge](#pipelineedge) array_ | Edges of a pipeline. |  |  |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references project this stack belongs to.<br />If not provided, it will use the default project. |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this pipeline |  | Optional: {} <br /> |


#### PipelineStage



PipelineStage defines the Pipeline stage.



_Appears in:_
- [PipelineSpec](#pipelinespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this stage. |  | Required: {} <br />Type: string <br /> |
| `services` _[PipelineStageService](#pipelinestageservice) array_ | Services including optional promotion criteria. |  |  |


#### PipelineStageService



PipelineStageService is the configuration of a service within a pipeline stage,
including optional promotion criteria.



_Appears in:_
- [PipelineStage](#pipelinestage)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  |  |
| `criteria` _[PipelineStageServicePromotionCriteria](#pipelinestageservicepromotioncriteria)_ |  |  | Optional: {} <br /> |


#### PipelineStageServicePromotionCriteria



PipelineStageServicePromotionCriteria represents actions to perform if this stage service were promoted.



_Appears in:_
- [PipelineStageService](#pipelinestageservice)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef pointing to source service to promote from. |  | Optional: {} <br /> |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef pointing to source PR automation to promote from. |  | Optional: {} <br /> |
| `repository` _string_ | The repository slug the pr automation will use (eg pluralsh/console if you will pr against https://github.com/pluralsh/console) |  | Optional: {} <br /> |
| `secrets` _string array_ | Secrets to copy over in a promotion. |  | Optional: {} <br /> |




#### PluralSinkConfiguration







_Appears in:_
- [SinkConfiguration](#sinkconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `priority` _[NotificationPriority](#notificationpriority)_ | The priority to label any delivered notification as |  | Enum: [LOW MEDIUM HIGH] <br /> |
| `urgent` _boolean_ | Whether to immediately deliver the notification via SMTP |  | Optional: {} <br /> |


#### PolicyEngine







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[PolicyEngineType](#policyenginetype)_ | Type is the policy engine to use with this stack |  | Enum: [TRIVY] <br />Required: {} <br /> |
| `maxSeverity` _[VulnSeverity](#vulnseverity)_ | MaxSeverity is the maximum allowed severity without failing the stack run |  | Enum: [UNKNOWN LOW MEDIUM HIGH CRITICAL NONE] <br />Optional: {} <br /> |


#### PrAutomation



PrAutomation ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrAutomation` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrAutomationSpec](#prautomationspec)_ | Spec ... |  | Required: {} <br /> |


#### PrAutomationBindings



PrAutomationBindings ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings. |  | Optional: {} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: {} <br /> |


#### PrAutomationConfiguration



PrAutomationConfiguration ...



_Appears in:_
- [CustomStackRunSpec](#customstackrunspec)
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Required: {} <br /> |
| `type` _[ConfigurationType](#configurationtype)_ |  |  | Enum: [STRING INT BOOL DOMAIN BUCKET FILE FUNCTION PASSWORD ENUM CLUSTER PROJECT] <br />Required: {} <br /> |
| `condition` _[Condition](#condition)_ |  |  | Optional: {} <br /> |
| `default` _string_ |  |  | Optional: {} <br /> |
| `documentation` _string_ |  |  | Optional: {} <br /> |
| `longform` _string_ |  |  | Optional: {} <br /> |
| `optional` _boolean_ |  |  | Optional: {} <br /> |
| `placeholder` _string_ |  |  | Optional: {} <br /> |
| `validation` _[PrAutomationConfigurationValidation](#prautomationconfigurationvalidation)_ | Any additional validations you want to apply to this configuration item before generating a pr |  | Optional: {} <br /> |
| `values` _string array_ |  |  | Optional: {} <br /> |


#### PrAutomationConfigurationValidation



PrAutomationConfigurationValidation validations to apply to configuration items in a PR Automation



_Appears in:_
- [PrAutomationConfiguration](#prautomationconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | A regex to match string-valued configuration items |  | Optional: {} <br /> |
| `json` _boolean_ | Whether the string value is supposed to be json-encoded |  | Optional: {} <br /> |
| `uniqBy` _[PrAutomationUniqBy](#prautomationuniqby)_ | How to determine uniquenss for this field |  | Optional: {} <br /> |


#### PrAutomationConfirmation



Additional details to verify all prerequisites are satisfied before generating this pr



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `text` _string_ | Markdown text to explain this pr |  | Optional: {} <br /> |
| `checklist` _[PrConfirmationChecklist](#prconfirmationchecklist) array_ | An itemized checklist to present to confirm each prerequisite is satisfied |  | Optional: {} <br /> |


#### PrAutomationCreateConfiguration



PrAutomationCreateConfiguration ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `git` _[GitRef](#gitref)_ | Git Location to source external files from |  | Optional: {} <br /> |
| `templates` _[PrAutomationTemplate](#prautomationtemplate) array_ | Template files to use to generate file content |  | Optional: {} <br /> |


#### PrAutomationDeleteConfiguration







_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `files` _string array_ | Individual files to delete |  | Optional: {} <br /> |
| `folders` _string array_ | Entire folders to delete |  | Optional: {} <br /> |


#### PrAutomationSpec



PrAutomationSpec ...



_Appears in:_
- [PrAutomation](#prautomation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `role` _[PrRole](#prrole)_ |  |  | Enum: [CLUSTER SERVICE PIPELINE UPDATE UPGRADE] <br />Optional: {} <br /> |
| `addon` _string_ | Addon is a link to an addon name |  | Optional: {} <br /> |
| `branch` _string_ | The base branch this pr will be based on (defaults to the repo's main branch) |  | Optional: {} <br /> |
| `icon` _string_ | An icon url to annotate this pr automation |  | Optional: {} <br /> |
| `darkIcon` _string_ | An darkmode icon url to annotate this pr automation |  | Optional: {} <br /> |
| `documentation` _string_ | Documentation ... |  | Optional: {} <br /> |
| `identifier` _string_ | Identifier is a string referencing the repository, i.e. for GitHub it would be "organization/repositoryName" |  | Optional: {} <br /> |
| `message` _string_ | Message the commit message this pr will incorporate |  | Optional: {} <br /> |
| `name` _string_ | Name name of the automation in the console api (defaults to metadata.name) |  | Optional: {} <br /> |
| `title` _string_ | Title the title of the generated pr |  | Optional: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef a cluster this pr works on |  | Optional: {} <br /> |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ScmConnectionRef the SCM connection to use for generating this PR |  | Required: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef the repository this automation uses. |  | Optional: {} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef the service this PR acts on. |  | Optional: {} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef the project this automation belongs to. |  | Optional: {} <br /> |
| `catalogRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | CatalogRef the catalog this automation will belong to |  | Optional: {} <br /> |
| `bindings` _[PrAutomationBindings](#prautomationbindings)_ | Bindings contain read and write policies of pr automation |  | Optional: {} <br /> |
| `configuration` _[PrAutomationConfiguration](#prautomationconfiguration) array_ | Configuration self-service configuration for the UI wizard generating this PR |  | Optional: {} <br /> |
| `confirmation` _[PrAutomationConfirmation](#prautomationconfirmation)_ | Additional details to verify all prerequisites are satisfied before generating this pr |  | Optional: {} <br /> |
| `creates` _[PrAutomationCreateConfiguration](#prautomationcreateconfiguration)_ | Specs for files to be templated and created |  | Optional: {} <br /> |
| `updates` _[PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)_ | Spec for files to be updated, using regex replacement |  | Optional: {} <br /> |
| `deletes` _[PrAutomationDeleteConfiguration](#prautomationdeleteconfiguration)_ | Spec for files and folders to be deleted |  | Optional: {} <br /> |


#### PrAutomationTemplate



PrAutomationTemplate ...



_Appears in:_
- [PrAutomationCreateConfiguration](#prautomationcreateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `destination` _string_ | The destination to write the file to |  | Required: {} <br /> |
| `external` _boolean_ | Whether it is being sourced from an external git repository |  | Required: {} <br /> |
| `source` _string_ | The source file to use for templating |  | Optional: {} <br /> |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Additional context overrides to apply to this template, will be merged into the user-provided configuration options |  | Optional: {} <br /> |
| `condition` _string_ | Condition string that will be evaluated to determine if source files should be copied or not. |  | Optional: {} <br /> |


#### PrAutomationTrigger



PrAutomationTrigger is the Schema for the prautomationtriggers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrAutomationTrigger` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrAutomationTriggerSpec](#prautomationtriggerspec)_ |  |  |  |


#### PrAutomationTriggerSpec



PrAutomationTriggerSpec defines the desired state of PrAutomationTrigger



_Appears in:_
- [PrAutomationTrigger](#prautomationtrigger)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef pointing to source [PrAutomation] |  | Optional: {} <br /> |
| `branch` _string_ | Branch that should be created against [PrAutomation] base branch |  | Required: {} <br /> |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Context is a [PrAutomation] configuration context |  | Optional: {} <br /> |


#### PrAutomationUniqBy







_Appears in:_
- [PrAutomationConfigurationValidation](#prautomationconfigurationvalidation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `scope` _[ValidationUniqScope](#validationuniqscope)_ |  |  | Enum: [PROJECT CLUSTER] <br />Required: {} <br /> |


#### PrAutomationUpdateConfiguration



PrAutomationUpdateConfiguration ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `files` _string array_ | Files to update |  | Optional: {} <br /> |
| `matchStrategy` _[MatchStrategy](#matchstrategy)_ | MatchStrategy, see enum for behavior |  | Optional: {} <br /> |
| `regexReplacements` _[RegexReplacement](#regexreplacement) array_ | Full regex + replacement structs in case there is different behavior per regex |  | Optional: {} <br /> |
| `yamlOverlays` _[YamlOverlay](#yamloverlay) array_ | Replacement via overlaying a yaml structure on an existing yaml file |  | Optional: {} <br /> |
| `regexes` _string array_ | The regexes to apply on each file |  | Optional: {} <br /> |
| `replaceTemplate` _string_ | The template to use when replacing a regex |  | Optional: {} <br /> |
| `yq` _string_ | (Unused so far) |  | Optional: {} <br /> |


#### PrConfirmationChecklist



A checkbox to render to confirm a PR prerequisite is satisfied



_Appears in:_
- [PrAutomationConfirmation](#prautomationconfirmation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `label` _string_ | The label of this checkbox |  |  |


#### Project



Project is a unit of organization to control
permissions for a set of objects within your
Console instance.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Project` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ProjectSpec](#projectspec)_ | Spec reflects a Console API project spec. |  | Required: {} <br /> |


#### ProjectSpec







_Appears in:_
- [Project](#project)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a project name. |  | Required: {} <br />Type: string <br /> |
| `description` _string_ | Description is a description of this project. |  | Optional: {} <br />Type: string <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this project. |  | Optional: {} <br /> |


#### Provider



Provider ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Provider` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ProviderSpec](#providerspec)_ |  |  | Required: {} <br /> |


#### ProviderSpec



ProviderSpec ...



_Appears in:_
- [Provider](#provider)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cloud` _[CloudProvider](#cloudprovider)_ | Cloud is the name of the cloud service for the Provider.<br />One of (CloudProvider): [gcp, aws, azure] |  | Enum: [gcp aws azure] <br />Required: {} <br />Type: string <br /> |
| `cloudSettings` _[CloudProviderSettings](#cloudprovidersettings)_ | CloudSettings reference cloud provider credentials secrets used for provisioning the Cluster.<br />Not required when Cloud is set to CloudProvider(BYOK). |  | Optional: {} <br />Type: object <br /> |
| `name` _string_ | Name is a human-readable name of the Provider. |  | Optional: {} <br /> |
| `namespace` _string_ | Namespace is the namespace ClusterAPI resources are deployed into. |  | Optional: {} <br /> |


#### RegexReplacement



RegexReplacement ...



_Appears in:_
- [PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | The regex to match a substring on |  | Required: {} <br /> |
| `file` _string_ | The file this replacement will work on |  | Required: {} <br /> |
| `replacement` _string_ | Replacement to be substituted for the match in the regex |  | Required: {} <br /> |
| `templated` _boolean_ | Whether you want to apply templating to the regex before compiling |  | Optional: {} <br /> |


#### RouterFilters







_Appears in:_
- [NotificationRouterSpec](#notificationrouterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | Regex a regex for filtering by things like pr url |  | Optional: {} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef whether to enable delivery for events associated with this service |  | Optional: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef whether to enable delivery for events associated with this cluster |  | Optional: {} <br /> |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef whether to enable delivery for events associated with this pipeline |  | Optional: {} <br /> |


#### ScmConnection



ScmConnection ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ScmConnection` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ScmConnectionSpec](#scmconnectionspec)_ |  |  | Required: {} <br /> |


#### ScmConnectionSpec







_Appears in:_
- [ScmConnection](#scmconnection)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a human-readable name of the ScmConnection. |  | Required: {} <br /> |
| `type` _[ScmType](#scmtype)_ | Type is the name of the scm service for the ScmConnection.<br />One of (ScmType): [github, gitlab] |  | Enum: [GITHUB GITLAB BITBUCKET] <br />Required: {} <br />Type: string <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Token ... |  | Optional: {} <br /> |
| `username` _string_ | Username ... |  | Optional: {} <br /> |
| `baseUrl` _string_ | BaseUrl is a base URL for Git clones for self-hosted versions. |  | Optional: {} <br /> |
| `apiUrl` _string_ | APIUrl is a base URL for HTTP apis for shel-hosted versions if different from BaseUrl. |  | Optional: {} <br /> |
| `github` _[ScmGithubConnection](#scmgithubconnection)_ |  |  | Optional: {} <br /> |


#### ScmGithubConnection







_Appears in:_
- [ScmConnectionSpec](#scmconnectionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `appId` _string_ |  |  |  |
| `installationId` _string_ |  |  |  |
| `privateKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |


#### ServiceAccount



ServiceAccount is a type of non-human account that provides distinct identity.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ServiceAccount` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ServiceAccountSpec](#serviceaccountspec)_ | Spec reflects a Console API service account spec. |  | Required: {} <br /> |


#### ServiceAccountSpec







_Appears in:_
- [ServiceAccount](#serviceaccount)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `email` _string_ | Email address to that will be bound to this service account. |  | Required: {} <br />Type: string <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | TokenSecretRef is a secret reference that should contain token. |  | Optional: {} <br /> |


#### ServiceComponent







_Appears in:_
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  |  |
| `name` _string_ |  |  |  |
| `group` _string_ |  |  | Optional: {} <br /> |
| `kind` _string_ |  |  |  |
| `namespace` _string_ |  |  | Optional: {} <br /> |
| `state` _[ComponentState](#componentstate)_ | State specifies the component state |  | Enum: [RUNNING PENDING FAILED] <br />Optional: {} <br /> |
| `synced` _boolean_ |  |  |  |
| `version` _string_ |  |  | Optional: {} <br /> |


#### ServiceDependency







_Appears in:_
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | The name of a service on the same cluster this service depends on |  |  |


#### ServiceDeployment









| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ServiceDeployment` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ServiceSpec](#servicespec)_ |  |  | Required: {} <br /> |


#### ServiceError







_Appears in:_
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `source` _string_ |  |  |  |
| `message` _string_ |  |  |  |


#### ServiceHelm







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ |  |  | Optional: {} <br /> |
| `valuesFrom` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Fetches the helm values from a secret in this cluster, will consider any key with yaml data a values file and merge them iteratively |  | Optional: {} <br /> |
| `valuesConfigMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ |  |  | Optional: {} <br /> |
| `release` _string_ | name of the helm release to use when applying |  | Optional: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | reference to a GitRepository to source the helm chart from (useful if you're using a multi-source configuration for values files) |  | Optional: {} <br /> |
| `values` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | arbitrary yaml values to overlay |  | Optional: {} <br /> |
| `valuesFiles` _string array_ | individual values files to overlay |  | Optional: {} <br /> |
| `chart` _string_ | chart to use |  | Optional: {} <br /> |
| `version` _string_ | chart version to use |  | Optional: {} <br /> |
| `repository` _[NamespacedName](#namespacedname)_ | pointer to the FluxCD helm repository to use |  | Optional: {} <br /> |
| `git` _[GitRef](#gitref)_ | A reference to a git folder/ref |  | Optional: {} <br /> |
| `ignoreHooks` _boolean_ | whether you want to completely ignore any helm hooks when actualizing this service |  | Optional: {} <br /> |


#### ServiceImport







_Appears in:_
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `stackRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: {} <br /> |


#### ServiceKustomize







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `path` _string_ |  |  |  |


#### ServiceSpec







_Appears in:_
- [ServiceDeployment](#servicedeployment)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | the name of this service, if not provided ServiceDeployment's own name from ServiceDeployment.ObjectMeta will be used. |  | Optional: {} <br /> |
| `namespace` _string_ | the namespace this service will be deployed into, if not provided deploys to the ServiceDeployment's own namespace |  | Optional: {} <br /> |
| `docsPath` _string_ |  |  | Optional: {} <br /> |
| `version` _string_ |  |  | Optional: {} <br /> |
| `protect` _boolean_ |  |  | Optional: {} <br /> |
| `kustomize` _[ServiceKustomize](#servicekustomize)_ |  |  | Optional: {} <br /> |
| `git` _[GitRef](#gitref)_ |  |  | Optional: {} <br /> |
| `helm` _[ServiceHelm](#servicehelm)_ |  |  | Optional: {} <br /> |
| `syncConfig` _[SyncConfigAttributes](#syncconfigattributes)_ |  |  | Optional: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: {} <br /> |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef is a secret reference which should contain service configuration. |  | Optional: {} <br /> |
| `configuration` _object (keys:string, values:string)_ | Configuration is a set of non-secret configuration to apply for lightweight templating of manifests in this service |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: {} <br /> |
| `dependencies` _[ServiceDependency](#servicedependency) array_ | Dependencies contain dependent services |  | Optional: {} <br /> |
| `contexts` _string array_ | Contexts contain dependent service context names |  | Optional: {} <br /> |
| `templated` _boolean_ | Templated should apply liquid templating to raw yaml files, defaults to true |  | Optional: {} <br /> |
| `imports` _[ServiceImport](#serviceimport) array_ |  |  | Optional: {} <br /> |
| `detach` _boolean_ | Detach determined if user want to delete or detach service |  | Optional: {} <br /> |




#### ServiceTemplate



Attributes for configuring a service in something like a managed namespace



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name the name for this service (optional for managed namespaces) |  | Optional: {} <br /> |
| `namespace` _string_ | Namespace the namespace for this service (optional for managed namespaces) |  | Optional: {} <br /> |
| `templated` _boolean_ |  |  | Optional: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `protect` _boolean_ | Whether to protect this service from deletion.  Protected services are also not drained on cluster deletion. |  | Optional: {} <br /> |
| `contexts` _string array_ | a list of context ids to add to this service |  | Optional: {} <br /> |
| `git` _[GitRef](#gitref)_ | Git settings to configure git for a service |  | Optional: {} <br /> |
| `helm` _[ServiceHelm](#servicehelm)_ | Helm settings to configure helm for a service |  | Optional: {} <br /> |
| `kustomize` _[ServiceKustomize](#servicekustomize)_ | Kustomize settings for service kustomization |  | Optional: {} <br /> |
| `syncConfig` _[SyncConfigAttributes](#syncconfigattributes)_ | SyncConfig attributes to configure sync settings for this service |  | Optional: {} <br /> |
| `dependencies` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Dependencies contain dependent services |  | Optional: {} <br /> |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef is a secret reference which should contain service configuration. |  | Optional: {} <br /> |


#### SinkConfiguration







_Appears in:_
- [NotificationSinkSpec](#notificationsinkspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `slack` _[SinkURL](#sinkurl)_ | Slack url |  | Optional: {} <br /> |
| `teams` _[SinkURL](#sinkurl)_ | Teams url |  | Optional: {} <br /> |
| `plural` _[PluralSinkConfiguration](#pluralsinkconfiguration)_ | Plural sink configuration knobs |  | Optional: {} <br /> |


#### SinkURL







_Appears in:_
- [SinkConfiguration](#sinkconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ |  |  |  |


#### StackConfiguration







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)
- [StackDefinitionSpec](#stackdefinitionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `image` _string_ | Image optional custom image you might want to use |  | Optional: {} <br /> |
| `version` _string_ | Version the semver of the tool you wish to use |  | Optional: {} <br /> |
| `tag` _string_ | Tag is the docker image tag you wish to use<br />if you're customizing the version |  | Optional: {} <br /> |
| `hooks` _[StackHook](#stackhook) array_ | Hooks to run at various stages of the stack run |  | Optional: {} <br /> |


#### StackCron







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `crontab` _string_ | The crontab on which to spawn stack runs |  |  |
| `autoApprove` _boolean_ | Whether to automatically approve cron-spawned runs |  | Optional: {} <br /> |


#### StackDefinition



StackDefinition is the Schema for the StackDefinitions API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `StackDefinition` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[StackDefinitionSpec](#stackdefinitionspec)_ |  |  |  |


#### StackDefinitionSpec



StackDefinitionSpec defines the desired state of StackDefinition



_Appears in:_
- [StackDefinition](#stackdefinition)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this StackDefinition. If not provided StackDefinition's own name<br />from StackDefinition.ObjectMeta will be used. |  | Optional: {} <br /> |
| `description` _string_ | Description can be used to describe this StackDefinition. |  | Optional: {} <br /> |
| `steps` _[CustomRunStep](#customrunstep) array_ | Steps is a list of custom run steps that will be executed as<br />part of the stack run. |  | Optional: {} <br /> |
| `configuration` _[StackConfiguration](#stackconfiguration)_ | Configuration allows modifying the StackDefinition environment<br />and execution. |  | Optional: {} <br /> |


#### StackEnvironment







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Required: {} <br /> |
| `value` _string_ |  |  | Optional: {} <br /> |
| `secretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: {} <br /> |
| `configMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ |  |  | Optional: {} <br /> |


#### StackFile







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `mountPath` _string_ |  |  |  |
| `secretRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |


#### StackHook







_Appears in:_
- [StackConfiguration](#stackconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cmd` _string_ | the command this hook will execute |  | Required: {} <br /> |
| `args` _string array_ | optional arguments to pass to the command |  | Optional: {} <br /> |
| `afterStage` _[StepStage](#stepstage)_ |  |  | Enum: [INIT PLAN VERIFY APPLY DESTROY] <br />Required: {} <br /> |


#### StackSettings







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `jobSpec` _[JobSpec](#jobspec)_ | JobSpec optional k8s job configuration for the job that will apply this stack |  | Optional: {} <br /> |
| `connectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ConnectionRef reference to ScmConnection |  | Optional: {} <br /> |


#### Status







_Appears in:_
- [ClusterStatus](#clusterstatus)
- [GeneratedSecretStatus](#generatedsecretstatus)
- [GitRepositoryStatus](#gitrepositorystatus)
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ | ID of the resource in the Console API. |  | Optional: {} <br />Type: string <br /> |
| `sha` _string_ | SHA of last applied configuration. |  | Optional: {} <br />Type: string <br /> |
| `conditions` _[Condition](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#condition-v1-meta) array_ | Represents the observations of a PrAutomation's current state. |  |  |


#### SyncConfigAttributes







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `createNamespace` _boolean_ |  |  | Optional: {} <br /> |
| `enforceNamespace` _boolean_ |  |  | Optional: {} <br /> |
| `labels` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `annotations` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |


#### Taint



Taint represents a Kubernetes taint.



_Appears in:_
- [ClusterNodePool](#clusternodepool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `effect` _[TaintEffect](#tainteffect)_ | Effect specifies the effect for the taint. |  | Enum: [NoSchedule NoExecute PreferNoSchedule] <br /> |
| `key` _string_ | Key is the key of the taint. |  |  |
| `value` _string_ | Value is the value of the taint. |  |  |


#### TaintEffect

_Underlying type:_ _string_

TaintEffect is the effect for a Kubernetes taint.



_Appears in:_
- [Taint](#taint)



#### Tools







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `createPr` _[CreatePr](#createpr)_ |  |  |  |


#### VertexSettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `model` _string_ | The Vertex AI model to use |  | Optional: {} <br /> |
| `toolModel` _string_ | Model to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: {} <br /> |
| `project` _string_ | The GCP project you'll be using |  | Required: {} <br /> |
| `location` _string_ | The GCP region Vertex is queried from |  | Required: {} <br /> |
| `endpoint` _string_ | A custom endpoint for self-deployed models |  | Optional: {} <br /> |
| `serviceAccountJsonSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | An Service Account json file stored w/in a kubernetes secret to use for authentication to GCP |  | Optional: {} <br /> |


#### YamlOverlay



YamlOverlay ...



_Appears in:_
- [PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `file` _string_ | the file to execute the overlay on |  | Required: {} <br /> |
| `yaml` _string_ | the (possibly templated) yaml to use as the overlayed yaml blob written to the file |  | Required: {} <br /> |
| `templated` _boolean_ | Whether you want to apply templating to the yaml blob before overlaying |  | Optional: {} <br /> |
| `listMerge` _[ListMerge](#listmerge)_ | How you want list merge to be performed, defaults to OVERWRITE |  | Enum: [OVERWRITE APPEND] <br />Optional: {} <br /> |


