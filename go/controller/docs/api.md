# API Reference

## Packages
- [deployments.plural.sh/v1alpha1](#deploymentspluralshv1alpha1)


## deployments.plural.sh/v1alpha1

Package v1alpha1 contains API Schema definitions for the deployments v1alpha1 API group

### Resource Types
- [BootstrapToken](#bootstraptoken)
- [Catalog](#catalog)
- [CloudConnection](#cloudconnection)
- [Cluster](#cluster)
- [ClusterRestore](#clusterrestore)
- [ClusterRestoreTrigger](#clusterrestoretrigger)
- [ClusterSync](#clustersync)
- [ComplianceReportGenerator](#compliancereportgenerator)
- [CustomStackRun](#customstackrun)
- [DeploymentSettings](#deploymentsettings)
- [FederatedCredential](#federatedcredential)
- [Flow](#flow)
- [GeneratedSecret](#generatedsecret)
- [GitRepository](#gitrepository)
- [GlobalService](#globalservice)
- [HelmRepository](#helmrepository)
- [InfrastructureStack](#infrastructurestack)
- [MCPServer](#mcpserver)
- [ManagedNamespace](#managednamespace)
- [NamespaceCredentials](#namespacecredentials)
- [NotificationRouter](#notificationrouter)
- [NotificationSink](#notificationsink)
- [OIDCProvider](#oidcprovider)
- [ObservabilityProvider](#observabilityprovider)
- [Observer](#observer)
- [Persona](#persona)
- [Pipeline](#pipeline)
- [PipelineContext](#pipelinecontext)
- [PrAutomation](#prautomation)
- [PrAutomationTrigger](#prautomationtrigger)
- [PrGovernance](#prgovernance)
- [PreviewEnvironmentTemplate](#previewenvironmenttemplate)
- [Project](#project)
- [ScmConnection](#scmconnection)
- [Sentinel](#sentinel)
- [ServiceAccount](#serviceaccount)
- [ServiceContext](#servicecontext)
- [ServiceDeployment](#servicedeployment)
- [StackDefinition](#stackdefinition)



#### AIProviderSettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `model` _string_ | Model is the LLM model name to use. |  | Optional: \{\} <br /> |
| `toolModel` _string_ | ToolModel to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: \{\} <br /> |
| `embeddingModel` _string_ | EmbeddingModel to use for generating embeddings |  | Optional: \{\} <br /> |
| `baseUrl` _string_ | BaseUrl is a custom base url to use, for reimplementations<br />of the same API scheme (for instance Together.ai uses the OpenAI API spec) |  | Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to the local secret holding the token to access<br />the configured AI provider. |  | Required: \{\} <br /> |


#### AISettings



AISettings holds the configuration for LLM provider clients.



_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled defines whether to enable the AI integration or not. | false | Optional: \{\} <br /> |
| `analysisRates` _[AnalysisRates](#analysisrates)_ | Configure the pace at which AI insight analysis should run. Useful if you want to minimize impacts on inference costs. |  | Optional: \{\} <br /> |
| `tools` _[Tools](#tools)_ | Tools holds the configuration for the tools that can be used with the AI integration. |  | Optional: \{\} <br /> |
| `provider` _[AiProvider](#aiprovider)_ | Provider defines which of the supported LLM providers should be used. | OPENAI | Enum: [OPENAI ANTHROPIC OLLAMA AZURE BEDROCK VERTEX] <br />Optional: \{\} <br /> |
| `toolProvider` _[AiProvider](#aiprovider)_ | ToolProvider to use for tool calling, in case you want to use a different LLM more optimized to those tasks |  | Enum: [OPENAI ANTHROPIC OLLAMA AZURE BEDROCK VERTEX] <br />Optional: \{\} <br /> |
| `embeddingProvider` _[AiProvider](#aiprovider)_ | EmbeddingProvider to use for generating embeddings. Oftentimes foundational<br />model providers do not have embeddings models, and it's better to simply use OpenAI. |  | Enum: [OPENAI ANTHROPIC OLLAMA AZURE BEDROCK VERTEX] <br />Optional: \{\} <br /> |
| `openAI` _[AIProviderSettings](#aiprovidersettings)_ | OpenAI holds the OpenAI provider configuration. |  | Optional: \{\} <br /> |
| `anthropic` _[AIProviderSettings](#aiprovidersettings)_ | Anthropic holds the Anthropic provider configuration. |  | Optional: \{\} <br /> |
| `ollama` _[OllamaSettings](#ollamasettings)_ | Ollama holds configuration for a self-hosted Ollama deployment,<br />more details available at https://github.com/ollama/ollama |  | Optional: \{\} <br /> |
| `azure` _[AzureOpenAISettings](#azureopenaisettings)_ | Azure holds configuration for using AzureOpenAI to generate LLM insights |  | Optional: \{\} <br /> |
| `bedrock` _[BedrockSettings](#bedrocksettings)_ | Bedrock holds configuration for using AWS Bedrock to generate LLM insights |  | Optional: \{\} <br /> |
| `vertex` _[VertexSettings](#vertexsettings)_ | Vertex holds configuration for using GCP VertexAI to generate LLM insights |  | Optional: \{\} <br /> |
| `vectorStore` _[VectorStore](#vectorstore)_ | VectorStore holds configuration for using a vector store to store embeddings. |  | Optional: \{\} <br /> |
| `graph` _[GraphStore](#graphstore)_ | Configuration for the cloud graph store, which uses similar datastores to the vector store. |  | Optional: \{\} <br /> |


#### AWSCloudConnection



AWSCloudConnection contains AWS-specific authentication configuration.
Enables cloud resource discovery and analysis across AWS resources and infrastructure.



_Appears in:_
- [CloudConnectionConfiguration](#cloudconnectionconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `accessKeyId` _string_ |  |  |  |
| `secretAccessKey` _[ObjectKeyReference](#objectkeyreference)_ |  |  |  |
| `region` _string_ | The region this connection applies to |  | Optional: \{\} <br /> |
| `regions` _string array_ | A list of regions this connection can query |  | Optional: \{\} <br /> |


#### AiApprovalConfiguration







_Appears in:_
- [StackConfiguration](#stackconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled indicates if AI approval is enabled for this stack. |  | Required: \{\} <br /> |
| `git` _[GitRef](#gitref)_ | Git references the Git repository containing the rules file. |  | Required: \{\} <br /> |
| `file` _string_ | File is the name of the rules file within the Git repository. |  | Required: \{\} <br /> |
| `ignoreCancel` _boolean_ | IgnoreCancel indicates if the cancellation of a stack run should be ignored by AI. |  | Optional: \{\} <br /> |


#### AnalysisRates







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `fast` _string_ | Fast is the rate in seconds for fast analysis, eg when the prompt used has seen a material change. Example 1h |  | Optional: \{\} <br /> |
| `slow` _string_ | Slow is the rate in seconds for slow analysis, eg when the prompt used has not seen a material change. Example 2h |  | Optional: \{\} <br /> |


#### AnsibleConfiguration







_Appears in:_
- [StackConfiguration](#stackconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `playbook` _string_ | Playbook is the ansible playbook to run. |  | Optional: \{\} <br /> |
| `inventory` _string_ | Inventory is the ansible inventory file to use.  We recommend checking this into git alongside your playbook files, and referencing it with a relative path. |  | Optional: \{\} <br /> |
| `additionalArgs` _string array_ | Additional args for the ansible playbook command. |  | Optional: \{\} <br /> |




#### AzureCloudConnection



AzureCloudConnection contains Microsoft Azure authentication configuration.
Provides credentials for discovering and querying Azure resources.



_Appears in:_
- [CloudConnectionConfiguration](#cloudconnectionconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `subscriptionId` _string_ |  |  |  |
| `tenantId` _string_ |  |  |  |
| `clientId` _string_ |  |  |  |
| `clientSecret` _[ObjectKeyReference](#objectkeyreference)_ |  |  |  |


#### AzureDevopsSettings







_Appears in:_
- [ScmConnectionSpec](#scmconnectionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `username` _string_ | The username to use for azure devops, it should be associated with the PAT you are supplying as the tokenSecretRef |  |  |
| `organization` _string_ | The organization to use for azure devops |  |  |
| `project` _string_ | The project to use for azure devops |  |  |


#### AzureOpenAISettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `endpoint` _string_ | Endpoint is your Azure OpenAI endpoint,<br />should be formatted like: https://\{endpoint\}/openai/deployments/\{deployment-id\}" |  | Required: \{\} <br /> |
| `apiVersion` _string_ | The azure openai Data plane - inference api version to use,<br />defaults to 2024-10-01-preview or the latest available |  | Optional: \{\} <br /> |
| `model` _string_ | Model - the OpenAi model you wish to use. If not specified, Plural will provide a default. |  | Optional: \{\} <br /> |
| `toolModel` _string_ | ToolModel to use for tool calling, which is less frequent and often requires more advanced reasoning. |  | Optional: \{\} <br /> |
| `embeddingModel` _string_ | EmbeddingModel to use for generating embeddings. |  | Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to the local secret holding the token to access<br />the configured AI provider. |  | Required: \{\} <br /> |


#### BedrockSettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `modelId` _string_ | ModelID is the AWS Bedrock Model ID to use.  This will use the openai compatible endpoint, so the model id must be supported. |  | Required: \{\} <br /> |
| `toolModelId` _string_ | ToolModelId to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: \{\} <br /> |
| `embeddingModel` _string_ | EmbeddingModel to use for generating embeddings |  | Optional: \{\} <br /> |
| `region` _string_ | Region is the AWS region the model is hosted in |  | Required: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to the local secret holding the token to access<br />the configured AI provider. |  | Required: \{\} <br /> |


#### Binding



Binding represents a policy binding.



_Appears in:_
- [Bindings](#bindings)
- [CatalogBindings](#catalogbindings)
- [CloudConnectionSpec](#cloudconnectionspec)
- [ComplianceReportGeneratorSpec](#compliancereportgeneratorspec)
- [DeploymentSettingsBindings](#deploymentsettingsbindings)
- [NotificationSinkSpec](#notificationsinkspec)
- [PersonaSpec](#personaspec)
- [PrAutomationBindings](#prautomationbindings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  | Optional: \{\} <br /> |
| `UserID` _string_ |  |  | Optional: \{\} <br /> |
| `userEmail` _string_ |  |  | Optional: \{\} <br /> |
| `groupID` _string_ |  |  | Optional: \{\} <br /> |
| `groupName` _string_ |  |  | Optional: \{\} <br /> |


#### Bindings



Bindings represents policy bindings that
can be used to define read/write permissions
to this resource for users/groups in the system.



_Appears in:_
- [ClusterSpec](#clusterspec)
- [FlowSpec](#flowspec)
- [InfrastructureStackSpec](#infrastructurestackspec)
- [MCPServerSpec](#mcpserverspec)
- [PipelineSpec](#pipelinespec)
- [ProjectSpec](#projectspec)
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: \{\} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: \{\} <br /> |


#### BindingsTemplate







_Appears in:_
- [SpecTemplate](#spectemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `read` _string_ | Read bindings. |  | Optional: \{\} <br /> |
| `write` _string_ | Write bindings. |  | Optional: \{\} <br /> |


#### BootstrapToken



BootstrapToken is a restricted authentication token for secure cluster registration.
It enables edge devices and new clusters to self-register with the Plural Console
without exposing full user credentials. The token is scope-limited to cluster
registration operations only and automatically assigns registered clusters to a
specified project.





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
| `user` _string_ | User is an optional email to attribute bootstrap token operations in audit logs. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef is the project that all clusters registered with this token will belong to. |  | Required: \{\} <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | TokenSecretRef points to a secret where the generated bootstrap token will be stored.<br />The secret is created automatically and must not already exist when the BootstrapToken is created. |  | Required: \{\} <br /> |


#### Cascade



Cascade defines the deletion behavior for resources owned by a GlobalService.
It provides fine-grained control over whether resources should be deleted from
the Plural Console, the target Kubernetes clusters, or both during cleanup operations.



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `detach` _boolean_ | Detach specifies whether to delete owned resources in Plural Console but leave<br />the corresponding Kubernetes objects in-place in the target clusters.<br />This allows for graceful handoff of resource management without disrupting running workloads. |  | Optional: \{\} <br /> |
| `delete` _boolean_ | Delete specifies whether to delete owned resources both in Plural Console<br />and in the targeted Kubernetes clusters. When true, this performs a complete<br />cleanup of all associated resources across the entire service deployment. |  | Optional: \{\} <br /> |


#### Catalog



Catalog is an organized collection of PR Automations.
It enables teams to group related automation workflows by category (like "data", "security",
"devops") and provides a browsable interface for self-service capabilities. Catalogs support
hierarchical permissions through RBAC bindings and can be scoped to specific projects for
multi-tenant environments.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Catalog` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CatalogSpec](#catalogspec)_ |  |  |  |


#### CatalogBindings



CatalogBindings defines the RBAC permissions for a catalog, controlling access to PR automations.
These bindings determine who can view, modify, and create PR automations within the catalog,
providing fine-grained access control for self-service automation capabilities.



_Appears in:_
- [CatalogSpec](#catalogspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings control who can generate new PR automations using this catalog.<br />Users with create permissions can trigger self-service workflows but cannot modify the catalog itself. |  | Optional: \{\} <br /> |
| `read` _[Binding](#binding) array_ | Read bindings control who can view and browse this catalog and its PR automations.<br />Users with read permissions can see available automations but cannot execute or modify them. |  | Optional: \{\} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings control who can modify the catalog and its PR automations.<br />Users with write permissions can add, update, or remove PR automations within this catalog. |  | Optional: \{\} <br /> |


#### CatalogSpec



CatalogSpec defines the desired state of Catalog



_Appears in:_
- [Catalog](#catalog)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is the display name for this catalog if different from metadata.name.<br />Defaults to metadata.name if not specified. |  | Optional: \{\} <br /> |
| `author` _string_ | Author is the name of the catalog creator used for attribution and contact purposes.<br />This field helps users identify who maintains and supports the catalog contents. |  | Required: \{\} <br /> |
| `icon` _string_ | Icon is a URL to an icon image for visual identification in the catalog browser.<br />Should be a publicly accessible image URL that displays well at small sizes. |  | Optional: \{\} <br /> |
| `darkIcon` _string_ | DarkIcon is a URL to a dark mode variant of the catalog icon.<br />Used when the UI is in dark mode to ensure proper contrast and visibility. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a detailed explanation of the catalog's purpose and contents.<br />This helps users understand what types of automations they can find within. |  | Optional: \{\} <br />Type: string <br /> |
| `category` _string_ | Category is a short classification label for organizing catalogs in the browser.<br />Examples include "infrastructure", "security", "monitoring", or "development". |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef links this catalog to a specific project for permission inheritance.<br />When set, the catalog inherits the project's RBAC policies and is scoped to that project.<br />ProjectRef owning project of the catalog, permissions will propagate down |  | Optional: \{\} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags provide key-value metadata for filtering and organizing catalogs.<br />Useful for adding custom labels like environment, team, or technology stack. |  | Optional: \{\} <br /> |
| `bindings` _[CatalogBindings](#catalogbindings)_ | Bindings define the read, write, and create permissions for this catalog.<br />Controls who can view, modify, and use the PR automations within this catalog.<br />Bindings contain read and write policies of this Catalog. |  | Optional: \{\} <br /> |


#### CloudConnection



CloudConnection is a credential for querying a cloud provider.  It will be used in agentic chats to perform generic sql-like
queries against cloud configuration data.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `CloudConnection` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CloudConnectionSpec](#cloudconnectionspec)_ |  |  |  |


#### CloudConnectionConfiguration



CloudConnectionConfiguration contains provider-specific credential configurations.
Only one provider configuration should be specified per CloudConnection instance.



_Appears in:_
- [CloudConnectionSpec](#cloudconnectionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[AWSCloudConnection](#awscloudconnection)_ |  |  |  |
| `gcp` _[GCPCloudConnection](#gcpcloudconnection)_ |  |  |  |
| `azure` _[AzureCloudConnection](#azurecloudconnection)_ |  |  |  |




#### CloudConnectionSpec



CloudConnectionSpec defines the desired state of CloudConnection



_Appears in:_
- [CloudConnection](#cloudconnection)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this CloudConnection. If not provided CloudConnection's own name<br />from CloudConnection.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `provider` _[CloudProvider](#cloudprovider)_ | Provider is the name of the cloud service for the Provider.<br />One of (CloudProvider): [gcp, aws, azure] |  | Enum: [gcp aws azure] <br />Required: \{\} <br />Type: string <br /> |
| `configuration` _[CloudConnectionConfiguration](#cloudconnectionconfiguration)_ | Configuration contains the cloud connection configuration. |  | Required: \{\} <br /> |
| `readBindings` _[Binding](#binding) array_ | ReadBindings is a list of bindings that defines<br />who can use this CloudConnection. |  | Optional: \{\} <br /> |


#### CloudProvider

_Underlying type:_ _string_

CloudProvider represents the supported cloud service providers.



_Appears in:_
- [CloudConnectionSpec](#cloudconnectionspec)

| Field | Description |
| --- | --- |
| `aws` | AWS represents Amazon Web Services as a cloud provider<br /> |
| `azure` | Azure represents Microsoft Azure as a cloud provider<br /> |
| `gcp` | GCP represents Google Cloud Platform as a cloud provider<br /> |


#### Cluster



Cluster represents a Kubernetes cluster managed by the Plural Console for continuous deployment.
Clusters serve as deployment targets for services and can be either management clusters (hosting
the Plural Console and operators) or workload clusters (running application workloads). The Console
tracks cluster health, versions, and coordinates service deployments across the fleet.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Cluster` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterSpec](#clusterspec)_ |  |  |  |


#### ClusterAWSCloudSettings



ClusterAWSCloudSettings contains AWS-specific configuration for cluster deployment.



_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `region` _string_ | Region in AWS to deploy this cluster to.<br />Determines data residency, latency characteristics, and available AWS services. |  | Required: \{\} <br />Type: string <br /> |


#### ClusterAzureCloudSettings



ClusterAzureCloudSettings contains Azure-specific configuration for cluster deployment.



_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `resourceGroup` _string_ | ResourceGroup specifies the Azure resource group name for organizing cluster resources. |  | Required: \{\} <br />Type: string <br /> |
| `network` _string_ | Network specifies the Azure virtual network name for cluster networking. |  | Required: \{\} <br />Type: string <br /> |
| `subscriptionId` _string_ | SubscriptionId is the GUID of the Azure subscription that will contain this cluster. |  | Required: \{\} <br />Type: string <br /> |
| `location` _string_ | Location specifies the Azure region where this cluster will be deployed. |  | Required: \{\} <br />Type: string <br /> |


#### ClusterCloudSettings



ClusterCloudSettings contains cloud provider-specific configuration for cluster infrastructure.
Allows customization of networking, regions, and other cloud-specific cluster properties.



_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[ClusterAWSCloudSettings](#clusterawscloudsettings)_ | AWS contains Amazon Web Services specific cluster configuration. |  | Optional: \{\} <br /> |
| `azure` _[ClusterAzureCloudSettings](#clusterazurecloudsettings)_ | Azure contains Microsoft Azure specific cluster configuration. |  | Optional: \{\} <br /> |
| `gcp` _[ClusterGCPCloudSettings](#clustergcpcloudsettings)_ | GCP contains Google Cloud Platform specific cluster configuration. |  | Optional: \{\} <br /> |


#### ClusterGCPCloudSettings



ClusterGCPCloudSettings contains Google Cloud Platform specific configuration for cluster deployment.



_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `project` _string_ | Project specifies the GCP project ID where this cluster will be deployed. |  | Required: \{\} <br />Type: string <br /> |
| `network` _string_ | Network specifies the GCP VPC network name for cluster networking. |  | Required: \{\} <br />Type: string <br /> |
| `region` _string_ | Region specifies the GCP region where this cluster will be deployed. |  | Required: \{\} <br />Type: string <br /> |


#### ClusterNodePool



ClusterNodePool defines the configuration for a group of worker nodes in the cluster.



_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is the unique identifier for this node pool within the cluster. |  | Required: \{\} <br />Type: string <br /> |
| `instanceType` _string_ | InstanceType specifies the cloud provider instance type for nodes in this pool. |  | Required: \{\} <br />Type: string <br /> |
| `minSize` _integer_ | MinSize is the minimum number of nodes that must be running in this pool. |  | Minimum: 1 <br />Required: \{\} <br /> |
| `maxSize` _integer_ | MaxSize is the maximum number of nodes that can be running in this pool. |  | Minimum: 1 <br />Required: \{\} <br /> |
| `labels` _object (keys:string, values:string)_ | Labels are key-value pairs applied to nodes for workload scheduling and organization. |  | Optional: \{\} <br /> |
| `taints` _[Taint](#taint) array_ | Taints are restrictions applied to nodes to control which pods can be scheduled. |  | Optional: \{\} <br /> |
| `cloudSettings` _[ClusterNodePoolCloudSettings](#clusternodepoolcloudsettings)_ | CloudSettings contains cloud provider-specific configuration for this node pool. |  | Optional: \{\} <br /> |


#### ClusterNodePoolAWSCloudSettings



ClusterNodePoolAWSCloudSettings contains AWS-specific configuration for node pool deployment.



_Appears in:_
- [ClusterNodePoolCloudSettings](#clusternodepoolcloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `launchTemplateId` _string_ | LaunchTemplateId specifies a custom EC2 launch template ID for node provisioning. |  | Optional: \{\} <br />Type: string <br /> |


#### ClusterNodePoolCloudSettings



ClusterNodePoolCloudSettings contains cloud provider-specific settings for node pools.



_Appears in:_
- [ClusterNodePool](#clusternodepool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[ClusterNodePoolAWSCloudSettings](#clusternodepoolawscloudsettings)_ | AWS contains Amazon Web Services specific node pool configuration. |  | Optional: \{\} <br /> |


#### ClusterRestore



ClusterRestore manages the restoration of cluster data from backup snapshots.
Orchestrates the recovery process for Kubernetes resources.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterRestore` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterRestoreSpec](#clusterrestorespec)_ |  |  |  |


#### ClusterRestoreSpec



ClusterRestoreSpec defines the desired state of ClusterRestore.
It specifies the backup to restore from, including the backup ID, name, namespace, and cluster reference.



_Appears in:_
- [ClusterRestore](#clusterrestore)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `backupID` _string_ | BackupID is an ID of the backup to restore.<br />If BackupID is specified, then BackupName, BackupNamespace, and BackupClusterRef are not needed. |  | Optional: \{\} <br />Type: string <br /> |
| `backupName` _string_ | BackupName is a name of the backup to restore.<br />BackupNamespace and BackupClusterRef have to be specified as well with it.<br />If BackupName, BackupNamespace, and BackupCluster are specified, then BackupID is not needed. |  | Optional: \{\} <br />Type: string <br /> |
| `backupNamespace` _string_ | BackupNamespace is a namespace of the backup to restore.<br />BackupName and BackupClusterRef have to be specified as well with it.<br />If BackupName, BackupNamespace, and BackupCluster are specified, then BackupID is not needed. |  | Optional: \{\} <br />Type: string <br /> |
| `backupClusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | BackupClusterID is an ID of a cluster where the backup to restore is located.<br />BackupName and BackupNamespace have to be specified as well with it.<br />If BackupName, BackupNamespace, and BackupClusterRef are specified, then BackupID is not needed. |  | Optional: \{\} <br /> |




#### ClusterRestoreTrigger



ClusterRestoreTrigger triggers cluster restore operations.
It provides a declarative way to initiate cluster restore processes from existing backups.

The ClusterRestoreTrigger works in conjunction with ClusterRestore resource to manage
the complete backup and restore lifecycle for Kubernetes clusters in the Plural platform.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterRestoreTrigger` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterRestoreTriggerSpec](#clusterrestoretriggerspec)_ | Spec defines the desired state and configuration for the cluster restore trigger. |  |  |


#### ClusterRestoreTriggerSpec



ClusterRestoreTriggerSpec defines the desired state and configuration for a ClusterRestoreTrigger.
It specifies which backup should be restored and provides the necessary references
to locate and access the backup data for the restore operation.



_Appears in:_
- [ClusterRestoreTrigger](#clusterrestoretrigger)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `clusterRestoreRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRestoreRef is a reference to the ClusterRestore resource that contains<br />the backup data and configuration for the restore operation.<br />This reference should point to a valid ClusterRestore resource that has been<br />successfully created and contains the backup data needed for restoration. |  | Optional: \{\} <br /> |


#### ClusterSpec



ClusterSpec defines the desired state of a Cluster.
Configures cluster properties including cloud provider settings, node pools, and access controls
for continuous deployment workflows across the Plural fleet management architecture.



_Appears in:_
- [Cluster](#cluster)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `handle` _string_ | Handle is a short, unique human-readable name used to identify this cluster.<br />Does not necessarily map to the cloud resource name.<br />This has to be specified to adopt the existing cluster. |  | Optional: \{\} <br />Type: string <br /> |
| `version` _string_ | Version specifies the Kubernetes version to use for this cluster.<br />Can be skipped only for BYOK (Bring Your Own Kubernetes) clusters where a version is externally managed.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br />Type: string <br /> |
| `providerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProviderRef references the cloud provider to use for this cluster.<br />Can be skipped only for BYOK clusters where infrastructure is externally provisioned.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references the project this cluster belongs to for multi-tenancy and access control.<br />If not provided, the cluster will be assigned to the default project.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br /> |
| `cloud` _string_ | Cloud specifies the cloud provider to use for this cluster.<br />Determines the infrastructure platform where the cluster will be provisioned and managed.<br />For BYOK clusters, this field is set to "byok" and no cloud provider is required.<br />Deprecated.<br />Do not use. |  | Enum: [aws azure gcp byok] <br />Optional: \{\} <br />Type: string <br /> |
| `protect` _boolean_ | Protect prevents accidental deletion of this cluster.<br />When enabled, the cluster cannot be deleted through the Console UI or API.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags are key-value pairs used to categorize and filter clusters in fleet management.<br />Used for organizing clusters by environment, team, or other operational criteria. |  | Optional: \{\} <br /> |
| `metadata` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  | Optional: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write access policies for this cluster.<br />Controls which users and groups can view or manage this cluster through RBAC. |  | Optional: \{\} <br /> |
| `cloudSettings` _[ClusterCloudSettings](#clustercloudsettings)_ | CloudSettings contains cloud provider-specific configuration for this cluster.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br /> |
| `nodePools` _[ClusterNodePool](#clusternodepool) array_ | NodePools defines the worker node configurations managed by this cluster.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br /> |


#### ClusterSpecTemplate







_Appears in:_
- [ClusterSyncSpec](#clustersyncspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `metadata` _[MetadataTemplate](#metadatatemplate)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  | Required: \{\} <br /> |
| `spec` _[SpecTemplate](#spectemplate)_ | Spec for the cluster. |  | Required: \{\} <br /> |




#### ClusterSync



ClusterSync enables automatic synchronization of clusters from the Plural Console
into Kubernetes cluster CRDs. It polls the Console clusters API endpoint and creates
or updates cluster resources based on the discovered infrastructure, making it ideal
for scenarios where clusters are provisioned externally (e.g., via Terraform) without
direct CRD creation capability.

The resource supports optional filtering by project and tags, and uses templatable
specifications that are populated with data from the discovered clusters.

Example usage:

	```yaml
	apiVersion: deployments.plural.sh/v1alpha1
	kind: ClusterSync
	metadata:
	  name: my-cluster-sync
	  namespace: default
	spec:
	  projectRef:
	    name: my-project  # optional: only sync clusters from this project
	  tags:
	    environment: production  # optional: filter clusters by tags
	  clusterSpec:
	    metadata:
	      name: "{{ .cluster.name }}"  # templated from discovered cluster
	      namespace: clusters
	    spec:
	      handle: "{{ .cluster.handle }}"
	      version: "{{ .cluster.version }}"
	      cloud: "{{ .cluster.cloud }}"
	 ````





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterSync` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterSyncSpec](#clustersyncspec)_ |  |  |  |


#### ClusterSyncSpec



ClusterSyncSpec defines the desired state of ClusterSync



_Appears in:_
- [ClusterSync](#clustersync)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references project to sync clusters from. |  | Optional: \{\} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags used to filter clusters. |  | Optional: \{\} <br /> |
| `clusterSpec` _[ClusterSpecTemplate](#clusterspectemplate)_ | ClusterSpec contains specifications of the cluster. |  | Required: \{\} <br /> |


#### ClusterTarget



ClusterTarget defines the criteria for selecting target clusters where managed namespaces should be created.
It provides flexible targeting mechanisms based on cluster metadata and properties,
enabling fine-grained control over namespace distribution across a fleet of clusters.



_Appears in:_
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tags` _object (keys:string, values:string)_ | Tags specify a set of key-value pairs used to select target clusters.<br />Only clusters that match all specified tags will receive the managed namespace.<br />This provides a flexible mechanism for targeting specific cluster groups,<br />environments, or organizational boundaries. |  | Optional: \{\} <br /> |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro specifies the Kubernetes distribution type for target cluster selection.<br />This allows targeting namespaces to specific cluster types that may have<br />distribution-specific requirements, networking configurations, or security policies. |  | Optional: \{\} <br /> |


#### CommandAttributes







_Appears in:_
- [CustomStackRunSpec](#customstackrunspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cmd` _string_ | Cmd is the command to execute |  | Required: \{\} <br /> |
| `args` _string array_ | Args are the arguments to pass to the command. |  | Optional: \{\} <br /> |
| `dir` _string_ | Dir is the working directory for the command. |  | Optional: \{\} <br /> |


#### ComplianceReportGenerator



ComplianceReportGenerator represents a resource that generates compliance reports.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ComplianceReportGenerator` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ComplianceReportGeneratorSpec](#compliancereportgeneratorspec)_ |  |  |  |


#### ComplianceReportGeneratorSpec



ComplianceReportGeneratorSpec defines the desired state of the resource.



_Appears in:_
- [ComplianceReportGenerator](#compliancereportgenerator)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name, if not provided name from object meta will be used. |  | Optional: \{\} <br /> |
| `format` _[ComplianceReportFormat](#compliancereportformat)_ | Format of the report to be generated. |  | Enum: [CSV JSON] <br />Required: \{\} <br /> |
| `readBindings` _[Binding](#binding) array_ | ReadBindings represent the download policy for this report. |  | Optional: \{\} <br /> |


#### ComponentState

_Underlying type:_ _string_





_Appears in:_
- [ServiceComponent](#servicecomponent)

| Field | Description |
| --- | --- |
| `RUNNING` |  |


#### Condition



Condition defines a conditional expression.



_Appears in:_
- [PrAutomationConfiguration](#prautomationconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `field` _string_ |  |  | Required: \{\} <br /> |
| `operation` _[Operation](#operation)_ |  |  | Enum: [NOT GT LT EQ GTE LTE PREFIX SUFFIX] <br />Required: \{\} <br /> |
| `value` _string_ |  |  | Optional: \{\} <br /> |








#### Container







_Appears in:_
- [JobSpec](#jobspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `image` _string_ |  |  | Required: \{\} <br />Type: string <br /> |
| `args` _string array_ |  |  | Optional: \{\} <br /> |
| `env` _[Env](#env) array_ |  |  | Optional: \{\} <br /> |
| `envFrom` _[EnvFrom](#envfrom) array_ |  |  | Optional: \{\} <br /> |
| `resources` _[ContainerResources](#containerresources)_ |  |  | Optional: \{\} <br /> |




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
| `recommendationCushion` _integer_ | RecommendationCushion is a percentage amount of cushion<br />to give over the average discovered utilization to generate<br />a scaling recommendation, should be between 1-99. |  | Optional: \{\} <br /> |
| `recommendationThreshold` _integer_ | RecommendationThreshold is the minimal monthly cost for<br />a recommendation to be covered by a controller. |  | Optional: \{\} <br /> |


#### CreatePr







_Appears in:_
- [Tools](#tools)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ScmConnectionRef the SCM connection to use for pr automations |  | Optional: \{\} <br /> |


#### CustomRunStep



CustomRunStep defines a custom execution step within a StackDefinition template.
Each step represents a discrete action that will be performed during stack execution,
with control over when it runs and whether it requires manual approval.



_Appears in:_
- [StackDefinitionSpec](#stackdefinitionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `args` _string array_ | Args provides additional command-line arguments that should be passed<br />to the command specified in Cmd during execution. |  | Required: \{\} <br /> |
| `cmd` _string_ | Cmd specifies the executable command that should be run as part of this<br />custom step. This can be any command available in the execution environment. |  | Required: \{\} <br /> |
| `requireApproval` _boolean_ | RequireApproval determines whether this step requires manual approval<br />before it can proceed. When true, the stack run will pause at this step<br />until an authorized user approves its execution. |  | Optional: \{\} <br /> |
| `stage` _[StepStage](#stepstage)_ | Stage controls at which phase of the stack lifecycle this step should be executed.<br />Valid stages include PLAN, VERIFY, APPLY, INIT, and DESTROY, allowing fine-grained<br />control over when custom logic runs in relation to the main IaC operations. |  | Enum: [PLAN VERIFY APPLY INIT DESTROY] <br />Required: \{\} <br /> |


#### CustomStackRun



CustomStackRun represents a custom stack run resource.
It allows users to define custom commands that can be executed as part of a stack run.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `CustomStackRun` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CustomStackRunSpec](#customstackrunspec)_ |  |  |  |


#### CustomStackRunSpec



CustomStackRunSpec defines the desired state of CustomStackRun.



_Appears in:_
- [CustomStackRun](#customstackrun)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this CustomStackRun. If not provided CustomStackRun's own name from CustomStackRun.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `stackRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ | StackRef is a reference to the stack this custom run belongs to. |  | Optional: \{\} <br /> |
| `documentation` _string_ | Documentation to explain what this custom run does. |  | Optional: \{\} <br /> |
| `commands` _[CommandAttributes](#commandattributes) array_ | Commands to execute as part of this custom run. |  | Optional: \{\} <br /> |
| `configuration` _[PrAutomationConfiguration](#prautomationconfiguration) array_ | Configuration self-service configuration which will be presented in UI before triggering |  | Optional: \{\} <br /> |


#### DeploymentSettings



DeploymentSettings provides global configuration settings for
Continuous Deployment (CD) operations. This resource defines
cluster-wide settings that control how the Plural deployment
system operates, including access policies, repository configuration,
monitoring integrations, and AI-powered features.

Example usage:

	```yaml
	apiVersion: deployments.plural.sh/v1alpha1
	kind: DeploymentSettings
	metadata:
	  name: global-deployment-settings
	  namespace: plrl-deploy-operator
	spec:
	  agentHelmValues:
	    annotations:
	      company.com/team: "platform"
	  managementRepo: "https://github.com/company/infrastructure"
	  bindings:
	    read:
	      - user:
	          email: "dev-team@company.com"
	    write:
	      - group:
	          name: "platform-engineers"
	  deploymentRepositoryRef:
	    name: "main-deployment-repo"
	    namespace: "plrl-deploy-operator"
	  prometheusConnection:
	    host: "https://prometheus.company.com"
	    user: "monitoring"
	    passwordSecretRef:
	      name: "prometheus-creds"
	      key: "password"
	  ai:
	    enabled: true
	    provider: OPENAI
	    openAI:
	      model: "gpt-4"
	      tokenSecretRef:
	        name: "openai-secret"
	        key: "token"
	  cost:
	    recommendationCushion: 20
	    recommendationThreshold: 100
	```





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
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: \{\} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: \{\} <br /> |
| `create` _[Binding](#binding) array_ | Create bindings. |  | Optional: \{\} <br /> |
| `git` _[Binding](#binding) array_ | Git bindings. |  | Optional: \{\} <br /> |


#### DeploymentSettingsSpec



DeploymentSettingsSpec defines the desired state of DeploymentSettings



_Appears in:_
- [DeploymentSettings](#deploymentsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `agentHelmValues` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | AgentHelmValues custom helm values to apply<br />to all agents (useful for things like adding<br />customary annotations/labels) |  | Optional: \{\} <br /> |
| `managementRepo` _string_ | ManagementRepo is the root repo for setting up<br />your infrastructure with Plural. Usually this<br />will be your `plural up repo` |  | Optional: \{\} <br /> |
| `stacks` _[StackSettings](#stacksettings)_ | Stacks global configuration for stack execution. |  | Optional: \{\} <br /> |
| `bindings` _[DeploymentSettingsBindings](#deploymentsettingsbindings)_ | Bindings global configuration for access control. |  | Optional: \{\} <br /> |
| `prometheusConnection` _[HTTPConnection](#httpconnection)_ | PrometheusConnection connection details for a prometheus instance to use |  | Optional: \{\} <br /> |
| `lokiConnection` _[HTTPConnection](#httpconnection)_ | LokiConnection connection details for a loki instance to use |  | Optional: \{\} <br /> |
| `ai` _[AISettings](#aisettings)_ | AI settings specifies a configuration for LLM provider clients |  | Optional: \{\} <br /> |
| `logging` _[LoggingSettings](#loggingsettings)_ | Logging settings for connections to log aggregation datastores |  | Optional: \{\} <br /> |
| `cost` _[CostSettings](#costsettings)_ | Cost settings for managing Plural's cost management features |  | Optional: \{\} <br /> |
| `deploymentRepositoryRef` _[NamespacedName](#namespacedname)_ | DeploymentRepositoryRef is a pointer to the deployment GIT repository to use |  | Optional: \{\} <br /> |
| `scaffoldsRepositoryRef` _[NamespacedName](#namespacedname)_ | ScaffoldsRepositoryRef is a pointer to the Scaffolds GIT repository to use |  | Optional: \{\} <br /> |


#### DiffNormalizers







_Appears in:_
- [SyncConfigAttributes](#syncconfigattributes)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `kind` _string_ |  |  |  |
| `namespace` _string_ |  |  | Optional: \{\} <br /> |
| `backfill` _boolean_ | Backfill indicates whether to backfill the given pointers with the current live value<br />or otherwise ignore it entirely. |  | Optional: \{\} <br /> |
| `jsonPointers` _string array_ | JSONPointers contains a list of JSON patches to apply to the service, which controls how drift detection works. |  |  |


#### ElasticsearchConnection







_Appears in:_
- [LoggingSettings](#loggingsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host is the elasticsearch host to connect to. |  | Required: \{\} <br /> |
| `index` _string_ | Index to query in elasticsearch. |  | Optional: \{\} <br /> |
| `user` _string_ | User to connect with basic auth. |  | Optional: \{\} <br /> |
| `passwordSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretRef is a reference to a secret containing the password to connect with basic auth. |  | Optional: \{\} <br /> |


#### ElasticsearchConnectionSettings







_Appears in:_
- [GraphStore](#graphstore)
- [VectorStore](#vectorstore)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host is the host of the elasticsearch cluster. |  | Required: \{\} <br /> |
| `index` _string_ | Index is the index of the elasticsearch cluster. |  | Required: \{\} <br /> |
| `user` _string_ | User is the user to authenticate with. |  | Optional: \{\} <br /> |
| `passwordSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretRef is a reference to the local secret holding the password to authenticate with. |  | Optional: \{\} <br /> |






#### FederatedCredential



FederatedCredential is a way to authenticate users from an external identity provider.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `FederatedCredential` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[FederatedCredentialSpec](#federatedcredentialspec)_ |  |  |  |


#### FederatedCredentialSpec



FederatedCredentialSpec defines the desired state of FederatedCredential.



_Appears in:_
- [FederatedCredential](#federatedcredential)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `issuer` _string_ | Issuer is the URL of the identity provider that issues the tokens. |  | Required: \{\} <br /> |
| `scopes` _string array_ | Scopes are the scopes that the credential will request from the identity provider. |  | Optional: \{\} <br /> |
| `claimsLike` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | ClaimsLike is a JSON expression that matches the claims in the token.<br />All the value strings should be a valid regular expression.<br />Example:<br />	...<br />	claimsLike:<br />		sub: "repo:myaccount/myrepo:ref:refs/heads/.*" |  | Optional: \{\} <br /> |
| `user` _string_ | User is the user email address that will be authenticated by this credential. |  | Required: \{\} <br /> |


#### Flow



Flow provides an abstraction layer over complex Kubernetes deployments to simplify application
management for developers. It groups related services, pipelines, and infrastructure components
into a single logical unit, making it easier to understand and manage application state.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Flow` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[FlowSpec](#flowspec)_ |  |  |  |


#### FlowServerAssociation







_Appears in:_
- [FlowSpec](#flowspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `mcpServerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | MCPServerRef is a required reference to an MCP server resource.<br />This establishes the connection between the flow and the server. |  | Required: \{\} <br /> |


#### FlowSpec



FlowSpec defines the desired state of Flow



_Appears in:_
- [Flow](#flow)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this Flow. If not provided Flow's own name from Flow.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a longform description of the service managed by this flow.<br />This field is used for documentation and UI display purposes. |  | Optional: \{\} <br /> |
| `icon` _string_ | Icon specifies an optional image icon for the flow to apply branding or improve identification. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef allows a global service to be scoped to a specific project only. |  | Optional: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this Flow. |  | Optional: \{\} <br /> |
| `repositories` _string array_ | Repositories contains a list of git https urls of the application code repositories used in this flow. |  | Optional: \{\} <br /> |
| `serverAssociations` _[FlowServerAssociation](#flowserverassociation) array_ | ServerAssociations contains a list of MCP services you wish to associate with this flow.<br />Can also be managed within the Plural Console UI securely. |  | Optional: \{\} <br /> |


#### GCPCloudConnection



GCPCloudConnection contains Google Cloud Platform authentication configuration.
Enables cloud resource discovery and analysis across GCP projects.



_Appears in:_
- [CloudConnectionConfiguration](#cloudconnectionconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceAccountKey` _[ObjectKeyReference](#objectkeyreference)_ |  |  |  |
| `projectId` _string_ |  |  |  |


#### GateSpec



GateSpec provides detailed configuration for complex gate types, particularly JOB gates.



_Appears in:_
- [PipelineGate](#pipelinegate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `job` _[JobSpec](#jobspec)_ | Job configuration for JOB gate types, enabling custom validation jobs<br />such as integration tests, security scans, or other promotion checks. |  | Optional: \{\} <br /> |


#### GeneratedSecret



GeneratedSecret handles templated secret creation and distribution.
It allows you to define secret templates with variable substitution and automatically distribute
the rendered secrets to multiple namespaces and destinations. This is particularly useful for
sharing configuration, credentials, or certificates across multiple applications or environments
while maintaining consistency and reducing manual secret management overhead.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GeneratedSecret` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GeneratedSecretSpec](#generatedsecretspec)_ |  |  |  |


#### GeneratedSecretDestination



GeneratedSecretDestination defines a target location where the generated secret should be created.



_Appears in:_
- [GeneratedSecretSpec](#generatedsecretspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name of the secret to create at the destination. |  | Required: \{\} <br /> |
| `namespace` _string_ | Namespace specifies the namespace where the secret should be created.<br />If omitted, defaults to the same namespace as the GeneratedSecret resource. |  | Optional: \{\} <br /> |


#### GeneratedSecretSpec



GeneratedSecretSpec defines the desired state of GeneratedSecret.



_Appears in:_
- [GeneratedSecret](#generatedsecret)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `template` _object (keys:string, values:string)_ | Template defines the secret data as key-value pairs in string form. |  | Optional: \{\} <br /> |
| `destinations` _[GeneratedSecretDestination](#generatedsecretdestination) array_ | Destinations describe the target name and namespace for the generated secrets. |  | Optional: \{\} <br /> |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef references a Secret containing configuration data used to populate template variables. |  | Optional: \{\} <br /> |




#### GitHealth

_Underlying type:_ _string_





_Appears in:_
- [GitRepositoryStatus](#gitrepositorystatus)

| Field | Description |
| --- | --- |
| `PULLABLE` |  |
| `FAILED` |  |


#### GitRef



GitRef represents a reference to a Git repository.



_Appears in:_
- [AiApprovalConfiguration](#aiapprovalconfiguration)
- [InfrastructureStackSpec](#infrastructurestackspec)
- [PrAutomationCreateConfiguration](#prautomationcreateconfiguration)
- [SentinelSpec](#sentinelspec)
- [ServiceHelm](#servicehelm)
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)
- [Source](#source)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `folder` _string_ | Folder is the folder in the Git repository where the manifests are located. |  | Required: \{\} <br /> |
| `ref` _string_ | Ref is the Git reference (branch, tag, or commit) to use. |  | Required: \{\} <br /> |
| `files` _string array_ | Optional files to add to the manifests for this service |  | Optional: \{\} <br /> |


#### GitRepository



GitRepository provides Git-based source control integration for Plural's GitOps workflows.
It represents a Git repository available for deployments, enabling automated fetching of manifests,
IaC code, and configuration from version-controlled sources. Supports both HTTPS and SSH authentication
methods with health monitoring and credential management through ScmConnections or direct secret references.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GitRepository` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GitRepositorySpec](#gitrepositoryspec)_ |  |  |  |


#### GitRepositorySpec



GitRepositorySpec defines the desired state of the GitRepository resource.



_Appears in:_
- [GitRepository](#gitrepository)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | Url of the GitRepository, supporting both HTTPS and SSH protocols.<br />This field is immutable once set. |  |  |
| `connectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ConnectionRef references an ScmConnection to reuse existing credentials and configuration<br />for authenticating with GitRepository. |  | Optional: \{\} <br /> |
| `credentialsRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | CredentialsRef references a Secret containing authentication credentials for this repository.<br />The secret should contain keys for privateKey, passphrase, username, and password as needed<br />for the repository's authentication method. |  | Optional: \{\} <br /> |




#### GlobalService



GlobalService handles the deployment and management of services across multiple clusters.
It provides a centralized way to define service deployments that should be replicated across
a fleet of Kubernetes clusters, with flexible targeting based
on cluster properties, tags, and organizational boundaries.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GlobalService` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GlobalServiceSpec](#globalservicespec)_ |  |  |  |


#### GlobalServiceSpec



GlobalServiceSpec defines the desired state of a GlobalService.
It enables the deployment and management of services across multiple Kubernetes clusters
with flexible targeting, templating, and lifecycle management capabilities.



_Appears in:_
- [GlobalService](#globalservice)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tags` _object (keys:string, values:string)_ | Tags specify a set of key-value pairs used to select target clusters for this global service.<br />Only clusters that match all specified tags will be included in the deployment scope.<br />This provides a flexible mechanism for targeting specific cluster groups or environments. |  | Optional: \{\} <br /> |
| `reparent` _boolean_ | Reparent indicates whether this global service should take ownership of existing<br />Plural services that match the targeting criteria. When true, existing services<br />will be brought under the management of this GlobalService resource. |  | Optional: \{\} <br /> |
| `interval` _string_ | Interval specifies the reconciliation interval for the global service.<br />This controls how frequently the controller checks and updates the service deployments<br />across target clusters. Defaults to 10 minutes if not specified. |  | Optional: \{\} <br /> |
| `cascade` _[Cascade](#cascade)_ | Cascade defines the deletion behavior for resources owned by this global service.<br />This controls whether resources are removed from Plural Console only, target clusters only,<br />or both during service deletion operations. |  | Optional: \{\} <br /> |
| `context` _[TemplateContext](#templatecontext)_ | Context provides data for dynamic template overrides of service deployment properties<br />such as Helm chart versions, values files, or other configuration parameters.<br />This enables environment-specific customization while maintaining a single service definition. |  | Optional: \{\} <br /> |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro specifies the Kubernetes distribution type for target cluster selection.<br />This allows targeting services to specific cluster types that may have<br />distribution-specific requirements or optimizations. |  | Enum: [GENERIC EKS AKS GKE RKE K3S] <br />Optional: \{\} <br /> |
| `mgmt` _boolean_ | Mgmt indicates whether to include management clusters in the target cluster set.<br />Management clusters typically host the Plural Console and operators, and may<br />require special consideration for service deployments. |  | Optional: \{\} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef references an existing ServiceDeployment to replicate across target clusters.<br />This allows leveraging an existing service definition as a template for global deployment. |  | Optional: \{\} <br /> |
| `providerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProviderRef restricts deployment to clusters associated with a specific cloud provider.<br />This enables provider-specific service deployments that may require particular<br />cloud integrations or provider-native services.<br />Deprecated.<br />Do not use. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef constrains the global service scope to clusters within a specific project.<br />This provides project-level isolation and ensures services are only deployed<br />to clusters belonging to the designated project. |  | Optional: \{\} <br /> |
| `template` _[ServiceTemplate](#servicetemplate)_ | Template defines the service deployment specification to be applied across target clusters.<br />This contains the core service definition including Helm charts, configurations,<br />and deployment parameters that will be instantiated on each matching cluster. |  | Optional: \{\} <br /> |


#### GraphStore







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled controls whether the graph store is enabled or not. | false | Optional: \{\} <br /> |
| `store` _[VectorStore](#vectorstore)_ | Store is the type of the graph store to use. |  | Enum: [ELASTIC] <br />Optional: \{\} <br /> |
| `elastic` _[ElasticsearchConnectionSettings](#elasticsearchconnectionsettings)_ | Elastic configuration for the graph store. |  | Optional: \{\} <br /> |


#### HTTPConnection







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)
- [LoggingSettings](#loggingsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host is the host to connect to. |  | Required: \{\} <br /> |
| `user` _string_ | User to connect with basic auth. |  | Optional: \{\} <br /> |
| `password` _string_ | Password to connect w/ for basic auth. |  | Optional: \{\} <br /> |
| `passwordSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretRef is a reference to a secret containing the password to connect with basic auth. |  | Optional: \{\} <br /> |




#### HelmMinimal







_Appears in:_
- [Renderer](#renderer)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `values` _string_ | Values a Helm values file to use when rendering this Helm chart. |  |  |
| `valuesFiles` _string array_ | ValuesFiles a list of relative paths to values files to use for Helm chart templating. |  |  |
| `release` _string_ | Release is a Helm release name to use when rendering this Helm chart. |  |  |


#### HelmRepository



HelmRepository is a Kubernetes custom resource that represents a Helm chart repository
for use with the Plural Console deployment system. It enables integration with various
Helm repository providers including public repositories, private cloud-hosted repositories,
and on-premises solutions with comprehensive authentication support.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `HelmRepository` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[HelmRepositorySpec](#helmrepositoryspec)_ | Spec defines the desired state of the HelmRepository, including the repository URL<br />and authentication configuration. The URL is immutable once set to ensure consistency<br />across deployments and prevent accidental repository changes. |  | Required: \{\} <br /> |


#### HelmRepositoryAuth



HelmRepositoryAuth defines the authentication configuration for a Helm repository.
It supports multiple authentication methods, but only one should be specified per repository.
The authentication method used should match the Provider specified in the HelmRepositorySpec.



_Appears in:_
- [HelmRepositorySpec](#helmrepositoryspec)
- [ObserverHelm](#observerhelm)
- [ObserverOci](#observeroci)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `basic` _[HelmRepositoryAuthBasic](#helmrepositoryauthbasic)_ | Basic specifies username/password authentication for repositories that support HTTP Basic Auth.<br />Commonly used with private Helm repositories, Harbor registries, and other traditional<br />repository managers that implement standard HTTP authentication. |  | Optional: \{\} <br /> |
| `bearer` _[HelmRepositoryAuthBearer](#helmrepositoryauthbearer)_ | Bearer specifies token-based authentication for repositories that support Bearer tokens.<br />Used with modern container registries and repositories that implement OAuth2 or similar<br />token-based authentication schemes. |  | Optional: \{\} <br /> |
| `aws` _[HelmRepositoryAuthAWS](#helmrepositoryauthaws)_ | Aws specifies AWS-specific authentication for Amazon ECR and other AWS-hosted repositories.<br />Supports both static credentials and IAM role-based authentication for secure access<br />to private repositories hosted in Amazon Web Services. |  | Optional: \{\} <br /> |
| `azure` _[HelmRepositoryAuthAzure](#helmrepositoryauthazure)_ | Azure specifies Azure-specific authentication for Azure Container Registry (ACR).<br />Supports service principal authentication and managed identity for secure access<br />to private repositories hosted in Microsoft Azure. |  | Optional: \{\} <br /> |
| `gcp` _[HelmRepositoryAuthGCP](#helmrepositoryauthgcp)_ | Gcp specifies Google Cloud-specific authentication for Google Artifact Registry.<br />Supports service account key authentication for secure access to private<br />repositories hosted in Google Cloud Platform. |  | Optional: \{\} <br /> |


#### HelmRepositoryAuthAWS



HelmRepositoryAuthAWS defines AWS-specific authentication for Amazon ECR and other AWS-hosted repositories.
It supports both static credentials and IAM role assumption for flexible authentication
in various AWS deployment scenarios.



_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `accessKey` _string_ | AccessKey specifies the AWS access key ID for authentication.<br />When using static credentials, this should be set along with the secret access key.<br />For enhanced security, consider using IAM roles instead of static credentials. |  | Optional: \{\} <br /> |
| `secretAccessKeySecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | SecretAccessKeySecretRef references a Kubernetes Secret containing the AWS secret access key.<br />The entire secret content will be used as the secret access key.<br />This approach is deprecated in favor of SecretAccessKeySecretKeyRef for better secret management. |  | Optional: \{\} <br /> |
| `secretAccessKeySecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | SecretAccessKeySecretKeyRef references a specific key within a Kubernetes Secret containing the secret access key.<br />This is the preferred method for storing AWS credentials as it allows multiple<br />credential sets to be organized within a single secret. |  | Optional: \{\} <br /> |
| `assumeRoleArn` _string_ | AssumeRoleArn specifies an AWS IAM role ARN to assume for repository access.<br />This enables cross-account access and role-based authentication, providing<br />enhanced security and flexibility in AWS environments. |  | Optional: \{\} <br /> |


#### HelmRepositoryAuthAzure



HelmRepositoryAuthAzure defines Azure-specific authentication for Azure Container Registry (ACR).
It supports service principal authentication which is the recommended approach
for automated access to private Azure repositories.



_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `clientId` _string_ | ClientID specifies the Azure service principal client ID.<br />This is used in conjunction with the client secret to authenticate with Azure services. |  | Optional: \{\} <br /> |
| `clientSecretSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ClientSecretSecretRef references a Kubernetes Secret containing the Azure service principal client secret.<br />The entire secret content will be used as the client secret.<br />This approach is deprecated in favor of ClientSecretSecretKeyRef for better secret management. |  | Optional: \{\} <br /> |
| `clientSecretSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ClientSecretSecretKeyRef references a specific key within a Kubernetes Secret containing the client secret.<br />This is the preferred method for storing Azure credentials as it allows proper<br />secret organization and key-based access control. |  | Optional: \{\} <br /> |
| `tenantId` _string_ | TenantID specifies the Azure Active Directory tenant ID.<br />This identifies the Azure AD instance that contains the service principal<br />and is required for proper authentication scope. |  | Optional: \{\} <br /> |
| `subscriptionId` _string_ | SubscriptionID specifies the Azure subscription ID.<br />This identifies the Azure subscription containing the resources<br />and may be required for certain repository access scenarios. |  | Optional: \{\} <br /> |


#### HelmRepositoryAuthBasic



HelmRepositoryAuthBasic defines username/password authentication for Helm repositories.
This authentication method is widely supported by traditional repository managers
and provides a simple way to secure access to private Helm charts.



_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `username` _string_ | Username specifies the username for HTTP Basic authentication.<br />This is typically a user account or service account name configured<br />in the target repository system. |  | Required: \{\} <br /> |
| `passwordSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | PasswordSecretRef references a Kubernetes Secret containing the password for Basic authentication.<br />The entire secret content will be used as the password.<br />This approach is deprecated in favor of PasswordSecretKeyRef for better secret management. |  | Optional: \{\} <br /> |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretKeyRef references a specific key within a Kubernetes Secret that contains the password.<br />This is the preferred method for password storage as it allows multiple credentials<br />to be stored in a single secret with proper key-based access. |  | Optional: \{\} <br /> |


#### HelmRepositoryAuthBearer



HelmRepositoryAuthBearer defines token-based authentication for Helm repositories.
This authentication method is commonly used with modern container registries
and repositories that implement OAuth2 or similar token-based authentication.



_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | TokenSecretRef references a Kubernetes Secret containing the bearer token.<br />The entire secret content will be used as the authentication token.<br />This approach is deprecated in favor of TokenSecretKeyRef for better secret management. |  | Optional: \{\} <br /> |
| `tokenSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretKeyRef references a specific key within a Kubernetes Secret that contains the bearer token.<br />This is the preferred method for token storage as it allows multiple tokens<br />to be stored in a single secret with proper key-based access. |  | Optional: \{\} <br /> |


#### HelmRepositoryAuthGCP



HelmRepositoryAuthGCP defines Google Cloud-specific authentication for Google Artifact Registry.
It uses service account key-based authentication which is the standard approach
for accessing private Google Cloud repositories from external systems.



_Appears in:_
- [HelmRepositoryAuth](#helmrepositoryauth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `applicationCredentialsSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ApplicationCredentialsSecretRef references a Kubernetes Secret containing the GCP service account key JSON.<br />The entire secret content will be used as the service account credentials.<br />This approach is deprecated in favor of ApplicationCredentialsSecretKeyRef for better secret management. |  | Optional: \{\} <br /> |
| `applicationCredentialsSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ApplicationCredentialsSecretKeyRef references a specific key within a Kubernetes Secret containing the service account JSON.<br />This is the preferred method for storing GCP credentials as it allows multiple<br />service account keys to be organized within a single secret with proper access control. |  | Optional: \{\} <br /> |


#### HelmRepositorySpec



HelmRepositorySpec defines the desired state of a HelmRepository.



_Appears in:_
- [HelmRepository](#helmrepository)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL specifies the HTTP/HTTPS URL of the Helm repository.<br />This field is immutable once set to prevent accidental changes that could break<br />existing service deployments that depend on this repository.<br />Supported formats include standard Helm repository URLs and OCI registry URLs. |  | Required: \{\} <br /> |
| `provider` _[HelmAuthProvider](#helmauthprovider)_ | Provider specifies the authentication provider type for this Helm repository.<br />This determines which authentication method will be used when accessing the repository.<br />Different providers support different authentication mechanisms optimized for their platforms. |  | Enum: [BASIC BEARER GCP AZURE AWS] <br />Type: string <br /> |
| `auth` _[HelmRepositoryAuth](#helmrepositoryauth)_ | Auth contains the authentication configuration for accessing the Helm repository.<br />The specific authentication method used depends on the Provider field.<br />Only one authentication method should be configured per repository. |  | Optional: \{\} <br /> |


#### HttpProxyConfiguration







_Appears in:_
- [ScmConnectionSpec](#scmconnectionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | The url of your HTTP proxy. |  | Required: \{\} <br /> |


#### InfrastructureStack



InfrastructureStack provides a scalable framework to manage infrastructure as code with a K8s-friendly, API-driven approach.
It declaratively defines a stack with a type, Git repository location, and target cluster for execution.
On each commit to the tracked repository, a run is created which the Plural deployment operator detects
and executes on the targeted cluster, enabling fine-grained permissions and network location control for IaC runs.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `InfrastructureStack` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[InfrastructureStackSpec](#infrastructurestackspec)_ |  |  |  |


#### InfrastructureStackSpec



InfrastructureStackSpec defines the desired state of the InfrastructureStack.



_Appears in:_
- [InfrastructureStack](#infrastructurestack)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this stack.<br />If not provided, the name from InfrastructureStack.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `type` _[StackType](#stacktype)_ | Type specifies the IaC tool to use for executing the stack.<br />One of TERRAFORM, ANSIBLE, CUSTOM. |  | Enum: [TERRAFORM ANSIBLE CUSTOM] <br />Required: \{\} <br /> |
| `interval` _string_ | Interval specifies the interval at which the stack will be reconciled, default is 5m |  | Optional: \{\} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef references the GitRepository containing the IaC source code. |  | Required: \{\} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef references the target Cluster where this stack will be executed. |  | Required: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references a project this stack belongs to.<br />If not provided, it will use the default project. |  | Optional: \{\} <br /> |
| `git` _[GitRef](#gitref)_ | Git contains reference within the repository where the IaC manifests are located. |  |  |
| `manageState` _boolean_ | ManageState indicates whether Plural should manage the Terraform state of this stack. |  | Optional: \{\} <br /> |
| `workdir` _string_ | Workdir specifies the working directory within the Git repository to execute commands in.<br />It is useful for projects with external modules or nested folder structures. |  | Optional: \{\} <br /> |
| `jobSpec` _[JobSpec](#jobspec)_ | JobSpec contains an optional configuration for the job that will apply this stack. |  | Optional: \{\} <br /> |
| `configuration` _[StackConfiguration](#stackconfiguration)_ | Configuration specifies version/image config for the IaC tool being used. |  | Optional: \{\} <br /> |
| `cron` _[StackCron](#stackcron)_ | Cron configuration for automated, scheduled generation of stack runs. |  | Optional: \{\} <br /> |
| `approval` _boolean_ | Approval when set to true, requires human approval before Terraform apply triggers,<br />ensuring verification of the plan to reduce misconfiguration risk. |  | Optional: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this stack. |  | Optional: \{\} <br /> |
| `environment` _[StackEnvironment](#stackenvironment) array_ | Environment variables to inject into the stack execution environment. |  | Optional: \{\} <br /> |
| `files` _[StackFile](#stackfile) array_ | Files to mount from Secrets into the stack execution environment,<br />commonly used for cloud credentials (though IRSA/Workload Identity is preferred). |  | Optional: \{\} <br /> |
| `detach` _boolean_ | Detach indicates whether to detach the stack on deletion instead of destroying it.<br />This leaves all cloud resources in place. |  | Optional: \{\} <br /> |
| `actor` _string_ | Actor is a user email to use for default Plural authentication in this stack. |  | Optional: \{\} <br /> |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: \{\} <br /> |
| `stackDefinitionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: \{\} <br /> |
| `observableMetrics` _[ObservableMetric](#observablemetric) array_ | ObservableMetrics is a list of metrics to poll to determine if a stack run should be canceled. |  | Optional: \{\} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags represent a set of key-value pairs that can be used to filter stacks. |  | Optional: \{\} <br /> |
| `variables` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Variables represent a file with variables in the stack run environment.<br />It will be automatically passed to the specific tool depending on the<br />stack Type (except [console.StackTypeCustom]). |  | Optional: \{\} <br /> |
| `policyEngine` _[PolicyEngine](#policyengine)_ | PolicyEngine is a configuration for applying policy enforcement to a stack. |  | Optional: \{\} <br /> |
| `agentId` _string_ | AgentId represents agent session ID that created this stack.<br />It is used for UI linking and otherwise ignored. |  | Optional: \{\} <br /> |


#### JobSpec



JobSpec defines a Kubernetes Job to execute as part of a JOB gate, allowing
inline job definition with containers, resources, and Kubernetes-native configurations.



_Appears in:_
- [GateSpec](#gatespec)
- [InfrastructureStackSpec](#infrastructurestackspec)
- [SentinelCheckIntegrationTestConfiguration](#sentinelcheckintegrationtestconfiguration)
- [StackSettings](#stacksettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespace` _string_ | Namespace where the job will be executed. |  | Required: \{\} <br />Type: string <br /> |
| `containers` _[Container](#container) array_ | Containers to run as part of the job, such as test runners or validation scripts. |  | Optional: \{\} <br /> |
| `labels` _object (keys:string, values:string)_ | Labels to apply to the job for organization and selection. |  | Optional: \{\} <br /> |
| `annotations` _object (keys:string, values:string)_ | Annotations to apply to the job for additional metadata. |  | Optional: \{\} <br /> |
| `nodeSelector` _object (keys:string, values:string)_ | NodeSelector to apply to the job for scheduling. |  | Optional: \{\} <br /> |
| `tolerations` _[Toleration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#toleration-v1-core) array_ | Tolerations to apply to the job for scheduling. |  | Optional: \{\} <br /> |
| `serviceAccount` _string_ | ServiceAccount to use for the job execution. |  | Optional: \{\} <br />Type: string <br /> |
| `raw` _[JobSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#jobspec-v1-batch)_ | Raw allows defining the job using a full Kubernetes JobSpec manifest<br />instead of the simplified container-based approach. |  | Optional: \{\} <br /> |
| `resources` _[ContainerResources](#containerresources)_ | Resources specification that overrides implicit container resources<br />when containers are not directly configured. |  | Optional: \{\} <br /> |


#### LoggingSettings







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled defines whether to enable the logging integration or not. |  | Optional: \{\} <br /> |
| `driver` _[LogDriver](#logdriver)_ | Driver is the type of log aggregation solution you wish to use. | VICTORIA | Enum: [VICTORIA ELASTIC OPENSEARCH] <br />Optional: \{\} <br /> |
| `victoria` _[HTTPConnection](#httpconnection)_ | Victoria configures a connection to VictoriaMetrics |  | Optional: \{\} <br /> |
| `elastic` _[ElasticsearchConnection](#elasticsearchconnection)_ | Elastic configures a connection to elasticsearch |  | Optional: \{\} <br /> |
| `opensearch` _[OpensearchConnection](#opensearchconnection)_ | Opensearch configures a connection to opensearch |  | Optional: \{\} <br /> |


#### MCPServer



MCPServer represents a Model Context Protocol server for AI tool
integration within the Plural Console environment. MCP servers enable
large language models to execute functions, access external APIs,
and interact with various systems.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `MCPServer` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[MCPServerSpec](#mcpserverspec)_ |  |  |  |


#### MCPServerAuthentication



MCPServerAuthentication defines the authentication configuration for an MCP server.
It supports multiple authentication methods to integrate with various systems
and security requirements, from simple JWT tokens to custom header-based authentication.



_Appears in:_
- [MCPServerSpec](#mcpserverspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `plural` _boolean_ | Plural enables built-in Plural JWT authentication for this MCP server.<br />When true, the server will receive a valid Plural JWT token in requests,<br />allowing it to authenticate and authorize operations within the Plural ecosystem. |  | Optional: \{\} <br /> |
| `headers` _object (keys:string, values:string)_ | Headers specify custom HTTP headers required for authentication with this MCP server.<br />This allows integration with servers that use API keys, bearer tokens, or other<br />header-based authentication schemes. Common examples include "Authorization",<br />"X-API-Key", or custom authentication headers. |  | Optional: \{\} <br /> |


#### MCPServerSpec



MCPServerSpec defines the desired state of an MCP (Model Context Protocol) server.



_Appears in:_
- [MCPServer](#mcpserver)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this MCP server.<br />If not provided, the name from the resource metadata will be used.<br />This name is used for identification and referencing in AI workflows. |  | Optional: \{\} <br /> |
| `url` _string_ | URL is the HTTP endpoint where the MCP server is hosted.<br />This must be a valid HTTP or HTTPS URL that the AI system can reach<br />to execute tool calls and interact with the server's capabilities. |  | Required: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings define the read and write access policies for this MCP server.<br />These control which users and groups can view, modify, or execute tools<br />provided by this server, enabling fine-grained access control. |  | Optional: \{\} <br /> |
| `authentication` _[MCPServerAuthentication](#mcpserverauthentication)_ | Authentication specifies the authentication configuration for accessing this MCP server.<br />Different authentication methods are supported including built-in Plural JWT<br />and custom HTTP headers for integration with various authentication systems. |  | Optional: \{\} <br /> |
| `confirm` _boolean_ | Confirm determines whether tool calls against this server require explicit user confirmation.<br />When true, users must approve each tool execution before it proceeds, providing<br />an additional safety mechanism for sensitive operations. Defaults to false. |  | Optional: \{\} <br /> |


#### ManagedNamespace



ManagedNamespace handles the creation and management of Kubernetes namespaces across multiple clusters.
It provides a centralized way to define namespace specifications that should be replicated
across a fleet of Kubernetes clusters.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ManagedNamespace` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ManagedNamespaceSpec](#managednamespacespec)_ |  |  |  |


#### ManagedNamespaceSpec



ManagedNamespaceSpec defines the desired state of a ManagedNamespace.
It specifies how Kubernetes namespaces should be created and managed across multiple clusters,
including their metadata, targeting criteria, and associated service deployments.



_Appears in:_
- [ManagedNamespace](#managednamespace)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name of the namespace once it's placed on a cluster.<br />If not provided, the ManagedNamespace's own name from metadata will be used. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a short description of the purpose of this namespace.<br />This is useful for documentation and helping teams understand the namespace's role<br />within the broader application architecture. |  | Optional: \{\} <br /> |
| `cascade` _[Cascade](#cascade)_ | Cascade specifies the deletion behavior for resources owned by this managed namespace.<br />This controls whether namespace deletion removes associated resources from<br />Plural Console only, target clusters only, or both. |  | Optional: \{\} <br /> |
| `labels` _object (keys:string, values:string)_ | Labels define key-value pairs to be applied to the created namespaces.<br />These labels are applied to the actual Kubernetes namespace resources<br />and can be used for organization, monitoring, and policy enforcement. |  | Optional: \{\} <br /> |
| `annotations` _object (keys:string, values:string)_ | Annotations define key-value pairs to be applied to the created namespaces.<br />These annotations are applied to the actual Kubernetes namespace resources<br />and are commonly used for configuration, tooling integration, and metadata. |  | Optional: \{\} <br /> |
| `pullSecrets` _string array_ | PullSecrets specifies a list of image pull secrets to attach to this namespace.<br />These secrets will be available for pulling container images within the namespace,<br />enabling access to private container registries across all pods in the namespace. |  | Optional: \{\} <br /> |
| `service` _[ServiceTemplate](#servicetemplate)_ | Service defines the service deployment specification to be created within this namespace.<br />This allows for automatic deployment of applications or infrastructure components<br />as part of the namespace provisioning process. |  | Optional: \{\} <br /> |
| `target` _[ClusterTarget](#clustertarget)_ | Target specifies the targeting criteria for selecting which clusters should receive this namespace.<br />This enables flexible namespace distribution based on tags and Kubernetes distributions. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef constrains the managed namespace scope to clusters within a specific project.<br />This provides project-level isolation and ensures namespaces are only created<br />on clusters belonging to the designated project. |  | Optional: \{\} <br /> |


#### MetadataTemplate







_Appears in:_
- [ClusterSpecTemplate](#clusterspectemplate)
- [ObjectReferenceTemplate](#objectreferencetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a short, unique human-readable name used to identify this cluster. |  | Required: \{\} <br /> |
| `namespace` _string_ | Namespace specifies an optional namespace for categorizing or scoping related resources.<br />If empty then the ClusterSync's namespace will be used. |  | Optional: \{\} <br /> |


#### NamespaceCredentials



NamespaceCredentials enables secure multi-tenancy by overriding operator credentials at the namespace level.
It connects specific namespaces with credentials from a secret reference, allowing fine-grained control over
resource reconciliation permissions. This prevents GitOps from becoming implicit God-mode by ensuring operators
use bounded credentials for specific namespaces, supporting the principle of least privilege in enterprise
fleet management scenarios.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NamespaceCredentials` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NamespaceCredentialsSpec](#namespacecredentialsspec)_ |  |  | Required: \{\} <br /> |


#### NamespaceCredentialsSpec



NamespaceCredentialsSpec defines the desired state of the NamespaceCredentials resource.



_Appears in:_
- [NamespaceCredentials](#namespacecredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespaces` _string array_ | Namespaces specifies the list of Kubernetes namespaces that will use the credentials<br />from SecretRef during resource reconciliation, enabling namespace-level credential isolation. |  | Required: \{\} <br /> |
| `secretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | SecretRef references a Secret containing the credentials that operators will use<br />when reconciling resources within the specified namespaces, overriding default operator credentials. |  | Required: \{\} <br /> |




#### NamespacedName



NamespacedName is the same as types.NamespacedName
with the addition of kubebuilder/json annotations for better schema support.



_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)
- [ServiceHelm](#servicehelm)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a resource name. |  | Required: \{\} <br /> |
| `namespace` _string_ | Namespace is a resource namespace. |  | Required: \{\} <br /> |




#### NotificationRouter



NotificationRouter routes events from Plural Console to notification destinations.
It filters events based on type, resource associations, and regex patterns, then
forwards matching events to configured sinks like Slack, Teams, or in-app notifications.
Common use cases include routing service deployment events, pipeline failures,
cluster alerts, and security events to appropriate teams or channels.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NotificationRouter` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NotificationRouterSpec](#notificationrouterspec)_ | Spec defines the desired state of the NotificationRouter, including event subscriptions,<br />filtering criteria, and destination sink configurations. |  |  |


#### NotificationRouterSpec



NotificationRouterSpec defines the desired state of NotificationRouter.
It specifies which events to subscribe to, how to filter them, and where to route
the resulting notifications.



_Appears in:_
- [NotificationRouter](#notificationrouter)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this notification router.<br />If not provided, the name from the resource metadata will be used. |  | Optional: \{\} <br /> |
| `events` _string array_ | Events define the list of event types this router should subscribe to.<br />Use "*" to subscribe to all events, or specify specific event names to filter<br />for particular types of notifications. Common events include deployment updates,<br />service health changes, pipeline status changes, and security alerts. |  | Optional: \{\} <br /> |
| `filters` _[RouterFilters](#routerfilters) array_ | Filters define criteria for selectively routing events.<br />These filters control which events trigger notifications, allowing teams<br />to focus on relevant events. Multiple filters can be combined. |  | Optional: \{\} <br /> |
| `sinks` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Sinks specify the notification destinations where filtered events should be delivered.<br />Each sink represents a configured notification channel such as Slack webhooks,<br />Microsoft Teams channels, or in-app notification systems. Events matching the<br />router's criteria will be formatted and sent to all configured sinks.<br />It is a reference to the NotificationSink resource. |  | Optional: \{\} <br /> |


#### NotificationSink



NotificationSink defines notification delivery destinations for events routed by NotificationRouter.
It represents the actual channels where notifications are sent, such as Slack webhooks,
Microsoft Teams channels, or in-app notifications. NotificationSinks are referenced by
NotificationRouter resources to determine where filtered events should be delivered.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NotificationSink` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NotificationSinkSpec](#notificationsinkspec)_ | Spec defines the desired state of the NotificationSink, including the sink type,<br />destination configuration, and delivery settings. |  |  |


#### NotificationSinkSpec



NotificationSinkSpec defines the desired state of NotificationSink.
It specifies the type of notification channel, destination configuration,
and delivery preferences for events routed to this sink.



_Appears in:_
- [NotificationSink](#notificationsink)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this notification sink.<br />If not provided, the name from the resource metadata will be used. // +kubebuilder:validation:Optional |  |  |
| `type` _[SinkType](#sinktype)_ | Type specifies the channel type of this sink.<br />Determines which configuration section will be used and how notifications are delivered.<br />SLACK and TEAMS require webhook URLs, while PLURAL delivers in-app notifications. |  | Enum: [SLACK TEAMS PLURAL] <br />Required: \{\} <br /> |
| `configuration` _[SinkConfiguration](#sinkconfiguration)_ | Configuration contains the type-specific settings for this notification sink.<br />Only one configuration section should be populated based on the Type field.<br />Each type has different requirements for delivery setup and authentication. |  | Optional: \{\} <br /> |
| `bindings` _[Binding](#binding) array_ | Bindings define the users and groups who can receive notifications through this sink.<br />This is only applicable for PLURAL type sinks that deliver in-app notifications.<br />For external sinks like Slack or Teams, notifications are sent to the configured webhook. |  | Optional: \{\} <br /> |


#### OIDCProvider



OIDCProvider configures OpenID Connect (OIDC) authentication for external applications and services.
It enables third-party applications to authenticate users through the Plural Console using the standard
OIDC protocol. This is useful for integrating external tools, dashboards, or custom applications with
Plural's authentication system while maintaining centralized user management and access control.
Common use cases include connecting monitoring dashboards, CI/CD tools, or custom applications that
need to authenticate users against the Plural Console's user directory.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `OIDCProvider` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[OIDCProviderSpec](#oidcproviderspec)_ | Spec defines the desired state of the OIDCProvider, including authentication settings,<br />redirect URIs, and credential management for OIDC client configuration. |  |  |


#### OIDCProviderSpec



OIDCProviderSpec defines the desired state of OIDCProvider.
It specifies the OIDC client configuration including redirect URIs, authentication methods,
and credential storage for enabling third-party applications to authenticate with Plural Console.



_Appears in:_
- [OIDCProvider](#oidcprovider)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this OIDC provider.<br />If not provided, the name from the resource metadata will be used. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a human-readable description of this OIDC provider.<br />This helps administrators understand the purpose and intended use of this OIDC client,<br />such as which application or service it's configured for. |  | Optional: \{\} <br /> |
| `redirectUris` _string array_ | RedirectUris specifies the list of allowed redirect URIs for this OIDC client.<br />These URIs define where the authorization server can redirect users after authentication.<br />Each URI must be an exact match to be considered valid during the OIDC flow.<br />Common patterns include application callback URLs or localhost URLs for development. |  | Optional: \{\} <br /> |
| `credentialsSecretRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ | CredentialsSecretRef references a Kubernetes Secret that will contain the generated OIDC client credentials.<br />Once the OIDCProvider is successfully created in the Console API, this secret will be populated<br />with the client ID and client secret needed for OIDC authentication flows.<br />The secret will contain two keys: 'clientId' and 'clientSecret'. |  | Required: \{\} <br /> |


#### ObjectKeyReference



ObjectKeyReference is a reference to an object in a specific namespace.
It is used to reference objects like secrets, configmaps, etc.



_Appears in:_
- [AWSCloudConnection](#awscloudconnection)
- [AzureCloudConnection](#azurecloudconnection)
- [GCPCloudConnection](#gcpcloudconnection)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is unique within a namespace to reference a resource. |  | Required: \{\} <br /> |
| `namespace` _string_ | Namespace defines the space within which the resource name must be unique. |  | Required: \{\} <br /> |
| `key` _string_ | Key is the key of the object to use. |  | Required: \{\} <br /> |


#### ObjectReferenceTemplate







_Appears in:_
- [SpecTemplate](#spectemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a short, unique human-readable name used to identify this cluster. |  | Required: \{\} <br /> |
| `namespace` _string_ | Namespace specifies an optional namespace for categorizing or scoping related resources.<br />If empty then the ClusterSync's namespace will be used. |  | Optional: \{\} <br /> |


#### ObservabilityProvider



ObservabilityProvider configures external monitoring and observability platforms for use with Plural Console.
It enables integration with services like Datadog and New Relic to provide enhanced monitoring capabilities
for infrastructure stacks and service deployments. The provider can be used by InfrastructureStack resources
to monitor metrics and determine if operations should be cancelled based on system health indicators.
Common use cases include monitoring deployment health or tracking infrastructure performance metrics.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ObservabilityProvider` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ObservabilityProviderSpec](#observabilityproviderspec)_ | Spec defines the desired state of the ObservabilityProvider, including the provider type<br />and authentication credentials needed to connect to the external monitoring service. |  | Required: \{\} <br /> |


#### ObservabilityProviderCredentials



ObservabilityProviderCredentials defines the authentication credentials for different observability providers.
Only one provider's credentials should be specified, matching the Type field in the ObservabilityProviderSpec.
Each provider has different authentication requirements and API key formats.



_Appears in:_
- [ObservabilityProviderSpec](#observabilityproviderspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `datadog` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Datadog specifies a reference to a Kubernetes Secret containing Datadog API credentials.<br />The referenced secret must contain two keys:<br />- 'apiKey': Your Datadog API key for authentication<br />- 'appKey': Your Datadog application key for extended API access<br />These keys are obtained from your Datadog account's API settings. |  | Optional: \{\} <br /> |
| `newrelic` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Newrelic specifies a reference to a Kubernetes Secret containing New Relic API credentials.<br />The referenced secret must contain one key:<br />- 'apiKey': Your New Relic API key for authentication and data access<br />This key is obtained from your New Relic account's API settings. |  | Optional: \{\} <br /> |


#### ObservabilityProviderSpec



ObservabilityProviderSpec defines the desired state of ObservabilityProvider.
It specifies the type of monitoring service and the credentials needed to authenticate
and establish connections with external observability platforms.



_Appears in:_
- [ObservabilityProvider](#observabilityprovider)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this observability provider.<br />If not provided, the name from the resource metadata will be used. |  | Optional: \{\} <br /> |
| `type` _[ObservabilityProviderType](#observabilityprovidertype)_ | Type specifies the observability platform this provider connects to.<br />Currently supported providers include Datadog for comprehensive monitoring and alerting,<br />and New Relic for application performance monitoring and infrastructure insights. |  | Enum: [DATADOG NEWRELIC] <br />Required: \{\} <br /> |
| `credentials` _[ObservabilityProviderCredentials](#observabilityprovidercredentials)_ | Credentials contains the authentication information needed to connect to the observability provider.<br />The specific credential format depends on the provider type. Each provider requires different<br />API keys and authentication methods as specified in their respective credential specifications. |  | Optional: \{\} <br /> |


#### ObservableMetric







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `identifier` _string_ |  |  | Required: \{\} <br /> |
| `observabilityProviderRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: \{\} <br /> |


#### Observer



Observer monitors external data sources and triggers automated actions when changes are detected.
It polls various targets like Helm repositories, OCI registries, Git repositories, or Kubernetes add-ons
on a scheduled basis and executes predefined actions when new versions or updates are discovered.
Common use cases include automatically creating pull requests when new chart versions are available or
triggering pipeline deployments when container images are updated.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Observer` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ObserverSpec](#observerspec)_ | Spec defines the desired state of the Observer, including the polling schedule,<br />target configuration, and actions to execute when changes are detected. |  |  |


#### ObserverAction



ObserverAction defines an automated response to execute when the observer detects changes.
Actions can create pull requests or trigger pipelines.



_Appears in:_
- [ObserverSpec](#observerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[ObserverActionType](#observeractiontype)_ | Type specifies the kind of action to perform when changes are detected.<br />PIPELINE actions trigger pipeline context updates, while PR actions create pull requests<br />using PR automation templates with the discovered values. |  | Enum: [PIPELINE PR] <br />Required: \{\} <br />Type: string <br /> |
| `configuration` _[ObserverConfiguration](#observerconfiguration)_ | Configuration contains the specific settings for this action type.<br />The structure depends on the Type field - PR actions use PR configuration,<br />while PIPELINE actions use pipeline configuration. |  | Required: \{\} <br /> |


#### ObserverAddOn



ObserverAddOn defines configuration for monitoring Kubernetes add-on versions.
This allows observing when new versions of Kubernetes add-ons are available,
enabling automated updates while ensuring compatibility with specific Kubernetes versions.



_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the add-on to monitor for new versions.<br />This should match the add-on name as known to the monitoring system. |  | Required: \{\} <br /> |
| `kubernetesVersion` _string_ | KubernetesVersion specifies the Kubernetes version for compatibility checking.<br />The observer will only consider add-on versions that are compatible with this Kubernetes version.<br />This helps ensure that suggested updates will work with your cluster. |  | Optional: \{\} <br /> |
| `kubernetesVersions` _string array_ | KubernetesVersions specifies multiple Kubernetes versions for compatibility checking.<br />Useful when managing clusters with different Kubernetes versions or during upgrade periods.<br />The observer will only suggest add-on versions compatible with all specified versions. |  | Optional: \{\} <br /> |


#### ObserverConfiguration



ObserverConfiguration contains type-specific configuration for observer actions.
Only one configuration section should be populated based on the action type.
This allows for different action types to have their own specialized settings.



_Appears in:_
- [ObserverAction](#observeraction)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pr` _[ObserverPrAction](#observerpraction)_ | Pr contains configuration for pull request actions.<br />Used when the action type is PR to automatically create pull requests<br />when new versions are detected by the observer. |  | Optional: \{\} <br /> |
| `pipeline` _[ObserverPipelineAction](#observerpipelineaction)_ | Pipeline contains configuration for pipeline actions.<br />Used when the action type is PIPELINE to trigger pipeline context updates<br />when new versions are detected by the observer. |  | Optional: \{\} <br /> |


#### ObserverGit



ObserverGit defines configuration for monitoring Git repository tags.
This allows observing when new tags are created in a Git repository,
typically used for monitoring application releases or infrastructure updates.



_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `gitRepositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | GitRepositoryRef references the Git repository resource to monitor.<br />The repository must be configured in Plural Console with appropriate access credentials. |  | Required: \{\} <br /> |
| `type` _[ObserverGitTargetType](#observergittargettype)_ | Type specifies what Git resources to monitor within the repository.<br />Currently only TAGS is supported, which monitors for new Git tags. |  | Enum: [TAGS] <br />Required: \{\} <br />Type: string <br /> |
| `filter` _[ObserverGitFilter](#observergitfilter)_ | Filter specifies a regex to filter the git repository tags for the observed value. |  | Optional: \{\} <br /> |


#### ObserverGitFilter







_Appears in:_
- [ObserverGit](#observergit)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | Regex specifies a regex to filter the git repository tags for the observed value.<br />Useful if you want to filter out tags within a larger monorepo or across multiple channels, eg: prod-1.2.3 vs. dev-1.2.3 |  | Optional: \{\} <br /> |


#### ObserverHelm



ObserverHelm defines configuration for monitoring Helm chart repositories.
This allows observing when new chart versions are published to Helm repositories,
enabling automated updates when application or infrastructure charts are updated.



_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL specifies the Helm repository URL to monitor.<br />This should be a valid Helm repository URL that contains the chart index.<br />The URL is immutable once set to ensure consistent monitoring. |  | Required: \{\} <br /> |
| `chart` _string_ | Chart specifies the name of the chart within the repository to monitor.<br />The observer will check for new versions of this specific chart. |  | Required: \{\} <br /> |
| `provider` _[HelmAuthProvider](#helmauthprovider)_ | Provider specifies the authentication provider type for the Helm repository.<br />Different providers support different authentication mechanisms optimized for their platforms. |  | Enum: [BASIC BEARER GCP AZURE AWS] <br />Optional: \{\} <br />Type: string <br /> |
| `auth` _[HelmRepositoryAuth](#helmrepositoryauth)_ | Auth contains authentication credentials for accessing the Helm repository.<br />Required for private repositories, the format depends on the Provider type. |  | Optional: \{\} <br /> |


#### ObserverOci



ObserverOci defines configuration for monitoring OCI (container) registries.
This allows observing when new container images or OCI artifacts are published,
enabling automated updates when application images or infrastructure artifacts are updated.



_Appears in:_
- [ObserverTarget](#observertarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL specifies the OCI registry URL to monitor.<br />This should include the full path to the specific repository or artifact.<br />The URL is immutable once set to ensure consistent monitoring. |  | Required: \{\} <br /> |
| `provider` _[HelmAuthProvider](#helmauthprovider)_ | Provider specifies the authentication provider type for the OCI registry.<br />Different providers support different authentication mechanisms optimized for their platforms. |  | Enum: [BASIC BEARER GCP AZURE AWS] <br />Optional: \{\} <br />Type: string <br /> |
| `auth` _[HelmRepositoryAuth](#helmrepositoryauth)_ | Auth contains authentication credentials for accessing the OCI registry.<br />Required for private registries, the format depends on the Provider type. |  | Optional: \{\} <br /> |


#### ObserverPipelineAction



ObserverPipelineAction defines configuration for triggering pipeline context updates.
When the observer detects new versions, it can update pipeline contexts to trigger
deployments or other pipeline-driven workflows with the new values.



_Appears in:_
- [ObserverConfiguration](#observerconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef references the pipeline to update when changes are detected.<br />The pipeline will receive a new context with the observed value,<br />potentially triggering deployment workflows or other pipeline stages. |  | Required: \{\} <br /> |
| `context` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Context is a templated context that becomes the pipeline context.<br />Use $value to interpolate the observed value into the context data.<br />This context is applied to the pipeline to trigger appropriate actions. |  | Optional: \{\} <br /> |


#### ObserverPrAction



ObserverPrAction defines configuration for automatically creating pull requests.
When the observer detects new versions, it can generate pull requests using
PR automation templates with the discovered values interpolated into the context.



_Appears in:_
- [ObserverConfiguration](#observerconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef references the PR automation template to use for generating pull requests.<br />The automation template defines the repository, branch pattern, and file modifications<br />to apply when creating the pull request. |  | Required: \{\} <br /> |
| `repository` _string_ | Repository overrides the repository slug for the referenced PR automation.<br />Use this when you want to target a different repository than the one<br />configured in the PR automation template. |  | Optional: \{\} <br /> |
| `branchTemplate` _string_ | BranchTemplate provides a template for generating branch names.<br />Use $value to inject the observed value into the branch name.<br />Example: "update-chart-to-$value" becomes "update-chart-to-1.2.3". |  | Optional: \{\} <br /> |
| `context` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Context is a templated context that becomes the input for the PR automation.<br />Use $value to interpolate the observed value into the context data.<br />This context is passed to the PR automation for template rendering and file modifications. |  | Optional: \{\} <br /> |


#### ObserverSpec



ObserverSpec defines the desired state of Observer.
It specifies what external source to monitor, when to poll it, and what actions
to take when changes are detected, enabling automated workflows based on external updates.



_Appears in:_
- [Observer](#observer)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this observer.<br />If not provided, the name from the resource metadata will be used.<br />This name is used for identification and logging purposes. |  | Optional: \{\} <br /> |
| `crontab` _string_ | Crontab defines the polling schedule using standard cron syntax.<br />This determines how frequently the observer checks the target for updates.<br />Examples: "0 */6 * * *" (every 6 hours), "*/15 * * * *" (every 15 minutes). |  | Required: \{\} <br /> |
| `initial` _string_ | Initial sets the baseline value for this observer to prevent duplicate actions on startup.<br />When specified, the observer will only trigger actions for values that are newer than this initial value.<br />This prevents unnecessary actions when the observer is first created or restarted. |  | Optional: \{\} <br /> |
| `target` _[ObserverTarget](#observertarget)_ | Target specifies the external source to monitor for changes.<br />This defines what type of resource to poll (Helm chart, OCI image, Git tags, etc.)<br />and the specific configuration needed to access that resource. |  | Required: \{\} <br /> |
| `actions` _[ObserverAction](#observeraction) array_ | Actions define the automated responses to execute when new values are detected.<br />Each action specifies what should happen when the observer discovers an update,<br />such as creating pull requests or triggering pipeline deployments. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references the project this observer belongs to.<br />If not provided, the observer will use the default project.<br />This helps organize observers and control access permissions. |  | Optional: \{\} <br /> |


#### ObserverTarget



ObserverTarget defines the external source to monitor for changes.
It specifies what type of resource to poll and how to interpret the results,
supporting various sources like Helm repositories, OCI registries, and Git repositories.



_Appears in:_
- [ObserverSpec](#observerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[ObserverTargetType](#observertargettype)_ | Type specifies the kind of external source to monitor.<br />Each type has different configuration requirements and polling mechanisms.<br />Supported types include Helm charts, OCI images, Git tags, and Kubernetes add-ons. |  | Enum: [OCI HELM GIT ADDON EKS_ADDON] <br />Required: \{\} <br />Type: string <br /> |
| `format` _string_ | Format is a regex pattern with a capture group for extracting version information.<br />Useful when version strings are embedded in larger release names or tags.<br />The first capture group is used as the version value.<br />Example: "app-v([0-9]+.[0-9]+.[0-9]+)" extracts "1.2.3" from "app-v1.2.3". |  | Optional: \{\} <br /> |
| `order` _[ObserverTargetOrder](#observertargetorder)_ | Order determines how discovered versions are sorted and which one is selected.<br />SEMVER sorts by semantic version rules, while LATEST uses chronological ordering.<br />SEMVER is recommended for most use cases as it provides predictable version ordering. |  | Enum: [SEMVER LATEST] <br />Required: \{\} <br />Type: string <br /> |
| `helm` _[ObserverHelm](#observerhelm)_ | Helm contains configuration for monitoring Helm chart repositories.<br />Used when Type is HELM to specify the repository URL, chart name, and authentication. |  | Optional: \{\} <br /> |
| `oci` _[ObserverOci](#observeroci)_ | OCI contains configuration for monitoring OCI (container) registries.<br />Used when Type is OCI to specify the registry URL and authentication credentials. |  | Optional: \{\} <br /> |
| `git` _[ObserverGit](#observergit)_ | Git contains configuration for monitoring Git repository tags.<br />Used when Type is GIT to specify which Git repository to monitor for new tags. |  | Optional: \{\} <br /> |
| `addon` _[ObserverAddOn](#observeraddon)_ | AddOn contains configuration for monitoring Plural add-on versions.<br />Used when Type is ADDON to specify which Kubernetes add-on to monitor for updates. |  | Optional: \{\} <br /> |
| `eksAddon` _[ObserverAddOn](#observeraddon)_ | EksAddOn contains configuration for monitoring AWS EKS add-on versions.<br />Used when Type is EKS_ADDON to specify which EKS add-on to monitor for updates. |  | Optional: \{\} <br /> |


#### OllamaSettings



OllamaSettings for configuring a self-hosted Ollama LLM, more details at https://github.com/ollama/ollama



_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL is the url this model is queryable on |  | Required: \{\} <br /> |
| `model` _string_ | Model is the Ollama model to use when querying the /chat api |  | Required: \{\} <br /> |
| `toolModel` _string_ | ToolModel to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | AuthorizationSecretRef is a reference to the local secret holding the contents of a HTTP Authorization header<br />to send to your ollama api in case authorization is required (eg for an instance hosted on a public network) |  | Optional: \{\} <br /> |


#### OpensearchConnection







_Appears in:_
- [LoggingSettings](#loggingsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host is the opensearch host to connect to. |  | Required: \{\} <br /> |
| `index` _string_ | Index to query in opensearch. |  | Optional: \{\} <br /> |
| `awsAccessKeyId` _string_ | AWS Access Key ID to use, can also use IRSA to acquire credentials. |  | Optional: \{\} <br /> |
| `awsSecretAccessKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | AWS Secret Access Key to use, can also use IRSA to acquire credentials. |  | Optional: \{\} <br /> |
| `awsRegion` _string_ | AWS Region to use. |  | Optional: \{\} <br /> |


#### OpensearchConnectionSettings







_Appears in:_
- [VectorStore](#vectorstore)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host is the host of the opensearch cluster. |  | Required: \{\} <br /> |
| `index` _string_ | Index is the index of the opensearch cluster. |  | Required: \{\} <br /> |
| `awsAccessKeyId` _string_ | AWSAccessKeyID is the AWS Access Key ID to use, can also use IRSA to acquire credentials. |  | Optional: \{\} <br /> |
| `awsSecretAccessKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | AWSSecretAccessKeyRef is a reference to the local secret holding the AWS Secret Access Key to use,<br />can also use IRSA to acquire credentials. |  | Optional: \{\} <br /> |
| `awsRegion` _string_ | AwsRegion is the AWS region to use, defaults to us-east-1 |  | Optional: \{\} <br /> |


#### Persona



Persona defines role-based UI configurations for different types of users in Plural Console.
It allows customizing the user interface based on user roles such as platform engineers, developers,
security teams, or management. Each persona controls which features and sections of the Console
are visible and accessible to users assigned to it. This enables organizations to provide
tailored experiences that match different user responsibilities and reduce interface complexity
for specific roles. Common use cases include hiding infrastructure details from developers
or providing simplified dashboards for management oversight.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Persona` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PersonaSpec](#personaspec)_ | Spec defines the desired state of the Persona, including role configuration,<br />UI customizations, and group bindings for role-based access control. |  |  |


#### PersonaAI



PersonaAI defines access controls for AI-powered features within the Console.
These settings determine which AI capabilities are available to users assigned to this persona.



_Appears in:_
- [PersonaConfiguration](#personaconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pr` _boolean_ | PR enables AI-powered pull request generation and management features.<br />When enabled, users can use AI assistance to create pull requests, generate code changes,<br />and automate various development workflows through AI-powered tools. |  | Optional: \{\} <br /> |


#### PersonaConfiguration



PersonaConfiguration defines the complete UI customization settings for a persona.
These settings control which features, sections, and capabilities are visible
and accessible to users assigned to this persona, enabling role-specific experiences.



_Appears in:_
- [PersonaSpec](#personaspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `all` _boolean_ | All enables the complete UI interface for this persona when set to true.<br />This overrides individual feature settings and provides full access to all Console features.<br />Useful for administrative personas that need unrestricted access to all functionality. |  | Optional: \{\} <br /> |
| `home` _[PersonaHome](#personahome)_ | Home configures the homepage layout and content for this persona.<br />Different personas can have customized homepages that highlight the most relevant<br />information and workflows for their specific role and responsibilities. |  | Optional: \{\} <br /> |
| `deployments` _[PersonaDeployment](#personadeployment)_ | Deployments controls access to deployment-related features and sections.<br />This includes clusters, services, pipelines, and other deployment management tools.<br />Useful for controlling which teams can view or manage different aspects of deployments. |  | Optional: \{\} <br /> |
| `sidebar` _[PersonaSidebar](#personasidebar)_ | Sidebar configures which navigation items and sections are visible in the main sidebar.<br />This allows personas to have streamlined navigation focused on their primary workflows<br />while hiding irrelevant or restricted functionality. |  | Optional: \{\} <br /> |
| `services` _[PersonaServices](#personaservices)_ | Services controls access to service-specific features and configuration options.<br />This includes service configuration, secrets management, and other service-level operations. |  | Optional: \{\} <br /> |
| `ai` _[PersonaAI](#personaai)_ | AI configures access to AI-powered features and capabilities within the Console.<br />This includes AI-assisted operations, automated suggestions, and other intelligent features. |  | Optional: \{\} <br /> |


#### PersonaDeployment



PersonaDeployment defines access controls for deployment-related features and views.
These settings determine which deployment management capabilities are visible and
accessible to users assigned to this persona.



_Appears in:_
- [PersonaConfiguration](#personaconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `clusters` _boolean_ | Clusters enables access to cluster management features when set to true.<br />This includes viewing cluster status, managing cluster resources, and performing<br />cluster-level operations. Typically enabled for platform and infrastructure teams. |  | Optional: \{\} <br /> |
| `deployments` _boolean_ | Deployments enables access to deployment management features when set to true.<br />This includes viewing and managing application deployments, deployment history,<br />and deployment-related operations across the platform. |  | Optional: \{\} <br /> |
| `repositories` _boolean_ | Repositories enables access to Git repository management features when set to true.<br />This includes configuring source repositories, managing Git credentials,<br />and other repository-related operations for deployments. |  | Optional: \{\} <br /> |
| `services` _boolean_ | Services enables access to service management features when set to true.<br />This includes viewing service status, managing service configurations,<br />and performing service-level operations and troubleshooting. |  | Optional: \{\} <br /> |
| `pipelines` _boolean_ | Pipelines enables access to CI/CD pipeline features when set to true.<br />This includes viewing pipeline status, managing pipeline configurations,<br />and triggering pipeline executions for automated deployments. |  | Optional: \{\} <br /> |
| `providers` _boolean_ | Providers enables access to cloud provider management features when set to true.<br />This includes managing cloud provider credentials, configuring provider settings,<br />and other provider-related operations for infrastructure management. |  | Optional: \{\} <br /> |
| `addOns` _boolean_ | AddOns enables access to Kubernetes add-on management features when set to true.<br />This includes installing, configuring, and managing cluster add-ons. |  | Optional: \{\} <br /> |


#### PersonaHome



PersonaHome defines homepage customization settings for different persona roles.
The homepage can be configured to emphasize different aspects of the system
based on the user's primary responsibilities and information needs.



_Appears in:_
- [PersonaConfiguration](#personaconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `manager` _boolean_ | Manager enables management-focused homepage content when set to true.<br />This typically includes high-level dashboards, cost summaries, compliance status,<br />and other information relevant to engineering managers and leadership roles. |  | Optional: \{\} <br /> |
| `security` _boolean_ | Security enables security-focused homepage content when set to true.<br />This includes security alerts, compliance reports, vulnerability summaries,<br />and other security-related metrics and dashboards. |  | Optional: \{\} <br /> |


#### PersonaServices



PersonaServices defines access controls for service-related features and operations.
These settings control which service management capabilities are available to users
assigned to this persona, enabling role-based access to sensitive operations.



_Appears in:_
- [PersonaConfiguration](#personaconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `secrets` _boolean_ | Secrets enables access to service secrets management when set to true.<br />This includes viewing, creating, and modifying secrets associated with services.<br />Typically restricted to platform engineers and senior developers who need<br />to manage service authentication and configuration secrets. |  | Optional: \{\} <br /> |
| `configuration` _boolean_ | Configuration enables access to service configuration management when set to true.<br />This includes modifying service deployment settings, environment variables,<br />and other configuration parameters that affect service behavior. |  | Optional: \{\} <br /> |


#### PersonaSidebar



PersonaSidebar defines which navigation items and sections are visible in the main Console sidebar.
These settings allow personas to have customized navigation focused on their primary workflows
while hiding irrelevant or restricted functionality from the user interface.



_Appears in:_
- [PersonaConfiguration](#personaconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `audits` _boolean_ | Audits enables access to audit logs and compliance reporting features when set to true.<br />This includes viewing system audit trails, user activity logs, and compliance reports.<br />Typically enabled for security teams and compliance officers. |  | Optional: \{\} <br /> |
| `kubernetes` _boolean_ | Kubernetes enables access to direct Kubernetes management features when set to true.<br />This includes raw Kubernetes resource management, kubectl-like operations,<br />and low-level cluster administration tasks. |  | Optional: \{\} <br /> |
| `pullRequests` _boolean_ | PullRequests enables access to pull request management features when set to true.<br />This includes viewing and managing pull requests and Git-based deployment automation features. |  | Optional: \{\} <br /> |
| `settings` _boolean_ | Settings enables access to system configuration and administrative settings when set to true.<br />This includes user management, system configuration, integration settings,<br />and other administrative functions. Typically restricted to administrators. |  | Optional: \{\} <br /> |
| `backups` _boolean_ | Backups enables access to backup and restore management features when set to true.<br />This includes configuring backup policies, managing backup storage,<br />and performing restore operations for disaster recovery. |  | Optional: \{\} <br /> |
| `stacks` _boolean_ | Stacks enables access to Infrastructure as Code (IaC) stack management when set to true.<br />This includes managing Terraform stacks and other IaC<br />automation tools for infrastructure provisioning and management. |  | Optional: \{\} <br /> |
| `security` _boolean_ | Security enables access to security management features when set to true.<br />This includes security scanning results, vulnerability management,<br />policy enforcement, and other security-related tools and dashboards. |  | Optional: \{\} <br /> |
| `cost` _boolean_ | Cost enables access to cost management and optimization features when set to true.<br />This includes cost tracking or resource optimization recommendations. |  | Optional: \{\} <br /> |


#### PersonaSpec



PersonaSpec defines the desired state of Persona.
It specifies the role-based configuration, UI customizations, and access controls
that define how the Console interface appears and behaves for users assigned to this persona.



_Appears in:_
- [Persona](#persona)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this persona.<br />If not provided, the name from the resource metadata will be used. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a detailed explanation of this persona's purpose and intended users.<br />This helps administrators understand which teams or roles should be assigned to this persona<br />and what kind of experience it provides. Examples might describe responsibilities like<br />"Platform engineers managing infrastructure" or "Developers deploying applications". |  | Optional: \{\} <br /> |
| `role` _[PersonaRole](#personarole)_ | Role defines the primary responsibility area for users assigned to this persona.<br />This controls the default homepage layout and highlights relevant features.<br />Different roles provide different perspectives on the same underlying data,<br />optimized for specific workflows and responsibilities. |  | Optional: \{\} <br /> |
| `configuration` _[PersonaConfiguration](#personaconfiguration)_ | Configuration contains detailed UI customization settings for this persona.<br />These settings are additive across multiple personas assigned to a user,<br />allowing for flexible permission combinations while maintaining role-based defaults. |  | Optional: \{\} <br /> |
| `bindings` _[Binding](#binding) array_ | Bindings define which users and groups are assigned to this persona.<br />Users can be assigned to multiple personas, with permissions being additive.<br />This enables flexible role combinations while maintaining clear base configurations. |  | Optional: \{\} <br /> |


#### Pipeline



Pipeline automates Service Deployments across environments by promoting git-based changes through defined stages.
It models multi-stage deployment pipelines with support for approval and job gates, offering safe,
customizable delivery flows. Integrates with continuous deployment systems by enabling declarative
configuration of deployment flows, including gating, promotions, and service progression.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Pipeline` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineSpec](#pipelinespec)_ |  |  |  |


#### PipelineContext



PipelineContext provides a variable context mechanism for pipelines.
It stores a context map that gets passed to the pipeline to enable advanced automation workflows.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PipelineContext` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineContextSpec](#pipelinecontextspec)_ |  |  |  |


#### PipelineContextSpec



PipelineContextSpec defines the desired state of the PipelineContext.



_Appears in:_
- [PipelineContext](#pipelinecontext)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef references the Pipeline this context will be applied to. |  | Optional: \{\} <br /> |
| `context` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Context is a templated context map that will be passed to the pipeline.<br />This context can contain variables, configuration data, and other information needed. |  |  |


#### PipelineEdge



PipelineEdge defines the flow of execution between stages, controlling promotion paths
and enabling attachment of gates for additional validation and approval.



_Appears in:_
- [PipelineSpec](#pipelinespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `fromId` _string_ | FromID is stage ID the edge is from, can also be specified by name. |  | Optional: \{\} <br />Type: string <br /> |
| `toId` _string_ | ToID is stage ID the edge is to, can also be specified by name. |  | Optional: \{\} <br />Type: string <br /> |
| `from` _string_ | From is the name of the pipeline stage this edge emits from. |  | Optional: \{\} <br />Type: string <br /> |
| `to` _string_ | To is the name of the pipeline stage this edge points to. |  | Optional: \{\} <br />Type: string <br /> |
| `gates` _[PipelineGate](#pipelinegate) array_ | Gates are any optional promotion gates you wish to configure. |  | Optional: \{\} <br /> |


#### PipelineGate



PipelineGate serves as a checkpoint between pipeline stages, enforcing promotion policies.
Three gate types are supported: APPROVAL (human sign-off), WINDOW (time-based constraints),
and JOB (custom validation jobs like tests or security scans).



_Appears in:_
- [PipelineEdge](#pipelineedge)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this gate. |  | Required: \{\} <br />Type: string <br /> |
| `type` _[GateType](#gatetype)_ | Type of gate.<br />One of:<br />- APPROVAL (requires human approval)<br />- WINDOW (time-based constraints),<br />- JOB (runs custom validation before allowing promotion). |  | Enum: [APPROVAL WINDOW JOB] <br />Required: \{\} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef specifies the target cluster where this gate will execute. |  | Optional: \{\} <br /> |
| `spec` _[GateSpec](#gatespec)_ | Spec contains detailed configuration for complex gate types like JOB gates. |  | Optional: \{\} <br /> |


#### PipelineSpec



PipelineSpec defines the desired state of the Pipeline.



_Appears in:_
- [Pipeline](#pipeline)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `stages` _[PipelineStage](#pipelinestage) array_ | Stages represent discrete steps in the deployment pipeline, such as environments (dev, staging, prod)<br />or specific deployment phases that services progress through. |  |  |
| `edges` _[PipelineEdge](#pipelineedge) array_ | Edges define the dependencies and flow between stages, controlling the execution order<br />and promotion path through the pipeline. |  |  |
| `flowRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | FlowRef provides contextual linkage to a broader application Flow this pipeline belongs within. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references the project this pipeline belongs to.<br />If not provided, it will use the default project. |  | Optional: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies controlling access to this pipeline. |  | Optional: \{\} <br /> |


#### PipelineStage



PipelineStage represents a logical unit within the pipeline, typically corresponding to
environments (e.g., dev, staging, prod) or specific deployment phases.



_Appears in:_
- [PipelineSpec](#pipelinespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this stage. |  | Required: \{\} <br />Type: string <br /> |
| `services` _[PipelineStageService](#pipelinestageservice) array_ | Services deployed in this stage, including optional promotion criteria<br />that dictate when and how services advance to subsequent stages. |  |  |


#### PipelineStageService



PipelineStageService defines a service within a pipeline stage and its promotion rules.
This enables conditional promotions, a critical part of automating production deployments safely.



_Appears in:_
- [PipelineStage](#pipelinestage)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef references the ServiceDeployment being deployed at this stage. |  |  |
| `criteria` _[PipelineStageServicePromotionCriteria](#pipelinestageservicepromotioncriteria)_ | Criteria defines optional promotion rules that control when and how<br />this service is allowed to advance to the next stage. |  | Optional: \{\} <br /> |


#### PipelineStageServicePromotionCriteria



PipelineStageServicePromotionCriteria defines actions to perform when promoting this service
to the next stage, including source references and secrets to copy.



_Appears in:_
- [PipelineStageService](#pipelinestageservice)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef pointing to a source ServiceDeployment to promote from. |  | Optional: \{\} <br /> |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef pointing to a source PrAutomation to promote from. |  | Optional: \{\} <br /> |
| `repository` _string_ | The repository slug the PrAutomation will use.<br />E.g., pluralsh/console if PR is done against https://github.com/pluralsh/console. |  | Optional: \{\} <br /> |
| `secrets` _string array_ | Secrets to copy over in a promotion. |  | Optional: \{\} <br /> |




#### PluralSinkConfiguration



PluralSinkConfiguration defines settings for in-app notifications within Plural Console.
These notifications appear in the Console interface and can be configured for priority
and immediate email delivery based on urgency requirements.



_Appears in:_
- [SinkConfiguration](#sinkconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `priority` _[NotificationPriority](#notificationpriority)_ | Priority determines the importance level of notifications delivered through this sink.<br />Higher priority notifications may be displayed more prominently in the Console UI<br />and can influence notification filtering and display behavior. |  | Enum: [LOW MEDIUM HIGH] <br />Optional: \{\} <br /> |
| `urgent` _boolean_ | Urgent controls whether notifications should be immediately delivered via email.<br />When true, notifications sent to this sink will trigger immediate SMTP delivery<br />in addition to appearing in the Console UI, useful for critical alerts. |  | Optional: \{\} <br /> |


#### PolicyEngine



PolicyEngine defines configuration for applying policy enforcement to a stack.



_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[PolicyEngineType](#policyenginetype)_ | Type of the policy engine to use with this stack.<br />At the moment only TRIVY is supported. |  | Enum: [TRIVY] <br />Required: \{\} <br /> |
| `maxSeverity` _[VulnSeverity](#vulnseverity)_ | MaxSeverity is the maximum allowed severity without failing the stack run.<br />One of UNKNOWN, LOW, MEDIUM, HIGH, CRITICAL, NONE. |  | Enum: [UNKNOWN LOW MEDIUM HIGH CRITICAL NONE] <br />Optional: \{\} <br /> |


#### PrAutomation



PrAutomation provides a self-service mechanism for generating pull requests against IaC repositories.
It enables teams to create standardized, templated PRs for common operations like cluster
upgrades, service deployments, and configuration changes. Each automation defines the files to modify,
the changes to make (via regex replacement, YAML overlays, or file creation), and provides a UI wizard
for users to configure parameters before generating the PR.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrAutomation` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrAutomationSpec](#prautomationspec)_ | Spec defines the desired state of the PrAutomation, including the operations<br />to perform, target repository, and user interface configuration. |  | Required: \{\} <br /> |


#### PrAutomationBindings



PrAutomationBindings defines access control for PR automation resources.



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings. |  | Optional: \{\} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: \{\} <br /> |


#### PrAutomationConfiguration



PrAutomationConfiguration defines a single input field in the self-service UI form.



_Appears in:_
- [CustomStackRunSpec](#customstackrunspec)
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is the identifier for this configuration field, used as a template variable<br />and as the form field name in the UI. |  | Required: \{\} <br /> |
| `type` _[ConfigurationType](#configurationtype)_ | Type specifies the input type for this field, determining how it's rendered<br />in the UI and what validation is applied. |  | Enum: [STRING INT BOOL PASSWORD ENUM CLUSTER PROJECT GROUP USER FLOW] <br />Required: \{\} <br /> |
| `condition` _[Condition](#condition)_ | Condition defines when this field should be displayed based on the values<br />of other fields, enabling dynamic forms that adapt to user input. |  | Optional: \{\} <br /> |
| `default` _string_ | Default provides a default value for this field. |  | Optional: \{\} <br /> |
| `documentation` _string_ | Documentation provides help text or description for this field to guide users in providing the correct input. |  | Optional: \{\} <br /> |
| `longform` _string_ | Longform provides extended documentation or detailed explanation for complex configuration fields. |  | Optional: \{\} <br /> |
| `displayName` _string_ | DisplayName provides a human-readable label for this field in the UI.<br />If not provided, the Name field is used as the display label. |  | Optional: \{\} <br /> |
| `optional` _boolean_ | Optional indicates whether this field is required (false) or optional (true) for PR generation.<br />Required fields must be filled by the user. |  | Optional: \{\} <br /> |
| `page` _integer_ | Page specifies the page to use for the pr configuration in the Plural web configuration wizard |  | Optional: \{\} <br /> |
| `placeholder` _string_ | Placeholder text to show in the input field to guide users on the expected format or content. |  | Optional: \{\} <br /> |
| `validation` _[PrAutomationConfigurationValidation](#prautomationconfigurationvalidation)_ | Validation defines additional validation rules to apply to user input before allowing PR generation. |  | Optional: \{\} <br /> |
| `values` _string array_ | Values provides the list of allowed values for ENUM type fields, creating a dropdown selection in the UI. |  | Optional: \{\} <br /> |


#### PrAutomationConfigurationValidation



PrAutomationConfigurationValidation defines validation rules for configuration field inputs.



_Appears in:_
- [PrAutomationConfiguration](#prautomationconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | A regex to match string-valued configuration items |  | Optional: \{\} <br /> |
| `json` _boolean_ | Whether the string value is supposed to be json-encoded |  | Optional: \{\} <br /> |
| `uniqBy` _[PrAutomationUniqBy](#prautomationuniqby)_ | How to determine uniquenss for this field |  | Optional: \{\} <br /> |


#### PrAutomationConfirmation



PrAutomationConfirmation defines additional verification steps before PR generation.



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `text` _string_ | Text in Markdown to explain this PR. |  | Optional: \{\} <br /> |
| `checklist` _[PrConfirmationChecklist](#prconfirmationchecklist) array_ | Checklist to present to confirm each prerequisite is satisfied. |  | Optional: \{\} <br /> |


#### PrAutomationCreateConfiguration



PrAutomationCreateConfiguration defines how to generate new files from templates during PR creation.



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `git` _[GitRef](#gitref)_ | Git location to source external files from. |  | Optional: \{\} <br /> |
| `templates` _[PrAutomationTemplate](#prautomationtemplate) array_ | Template files to use to generate file content |  | Optional: \{\} <br /> |


#### PrAutomationDeleteConfiguration



PrAutomationDeleteConfiguration specifies files and folders to delete as part of the PR operation.



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `files` _string array_ | Individual files to delete. |  | Optional: \{\} <br /> |
| `folders` _string array_ | Entire folders to delete. |  | Optional: \{\} <br /> |


#### PrAutomationSecretConfiguration







_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cluster` _string_ | The cluster handle that will hold this secret |  |  |
| `namespace` _string_ | The k8s namespace to place the secret in |  |  |
| `name` _string_ | The name of the secret |  |  |
| `entries` _[PrAutomationSecretEntry](#prautomationsecretentry) array_ | The entries of the secret |  |  |


#### PrAutomationSecretEntry







_Appears in:_
- [PrAutomationSecretConfiguration](#prautomationsecretconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | The name of the secret entry |  |  |
| `documentation` _string_ | The documentation of the secret entry |  |  |
| `autogenerate` _boolean_ | Whether to autogenerate the secret entry |  | Optional: \{\} <br /> |


#### PrAutomationSpec



PrAutomationSpec defines the desired state of the PrAutomation.



_Appears in:_
- [PrAutomation](#prautomation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `role` _[PrRole](#prrole)_ |  |  | Enum: [CLUSTER SERVICE PIPELINE UPDATE UPGRADE COST] <br />Optional: \{\} <br /> |
| `addon` _string_ | Addon links this automation to a specific add-on name. |  | Optional: \{\} <br /> |
| `branch` _string_ | Branch specifies the base branch this PR will be created from. If not provided,<br />defaults to the repository's main branch (usually 'main' or 'master'). |  | Optional: \{\} <br /> |
| `icon` _string_ | Icon provides a URL to an icon image to visually represent this automation<br />in the user interface and catalogs. |  | Optional: \{\} <br /> |
| `darkIcon` _string_ | DarkIcon provides a URL to a dark-mode variant of the icon for improved<br />visibility in dark-themed user interfaces. |  | Optional: \{\} <br /> |
| `documentation` _string_ | Documentation provides detailed explanation of what this automation does,<br />when to use it, and any prerequisites or considerations. |  | Optional: \{\} <br /> |
| `identifier` _string_ | Identifier specifies the target repository in the format "organization/repository-name"<br />for GitHub, or equivalent formats for other SCM providers. |  | Optional: \{\} <br /> |
| `message` _string_ | Message defines the commit message template that will be used in the generated PR.<br />Can include templated variables from user input. |  | Optional: \{\} <br /> |
| `name` _string_ | Name specifies the display name for this automation in the Console API.<br />If not provided, defaults to the Kubernetes resource name. |  | Optional: \{\} <br /> |
| `title` _string_ | Title defines the template for the pull request title. Can include variables<br />that will be replaced with user-provided configuration values. |  | Optional: \{\} <br /> |
| `patch` _boolean_ | Patch determines whether to generate a patch for this PR instead of<br />creating a full pull request. |  | Optional: \{\} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef references a specific cluster that this PR operates on. |  | Optional: \{\} <br /> |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ScmConnectionRef references the SCM connection to use for authentication when creating pull requests. |  | Required: \{\} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef references a Git repository resource this automation uses. |  | Optional: \{\} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef references a specific service that this PR automation acts upon. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references the project this automation belongs to, enabling<br />project-scoped organization and access control. |  | Optional: \{\} <br /> |
| `catalogRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | CatalogRef references the catalog this automation belongs to for<br />organizational purposes and discoverability in the service catalog. |  | Optional: \{\} <br /> |
| `bindings` _[PrAutomationBindings](#prautomationbindings)_ | Bindings containing read and write policies of PR automation. |  | Optional: \{\} <br /> |
| `configuration` _[PrAutomationConfiguration](#prautomationconfiguration) array_ | Configuration defines the self-service UI form fields that users fill out<br />to customize the generated PR. Each field can be templated into the PR content. |  | Optional: \{\} <br /> |
| `secrets` _[PrAutomationSecretConfiguration](#prautomationsecretconfiguration)_ | Configuration for setting a secret as part of this pr.  This will usually be used by k8s manifests defined and is<br />securely handled by our api with RBAC validation. |  | Optional: \{\} <br /> |
| `confirmation` _[PrAutomationConfirmation](#prautomationconfirmation)_ | Confirmation specifies additional verification steps or information to present<br />to users before they can generate the PR, ensuring prerequisites are met. |  | Optional: \{\} <br /> |
| `creates` _[PrAutomationCreateConfiguration](#prautomationcreateconfiguration)_ | Creates defines specifications for generating new files from templates,<br />allowing the automation to add new configuration files to the repository. |  | Optional: \{\} <br /> |
| `updates` _[PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)_ | Updates specifies how to modify existing files using regex replacements<br />or YAML overlays, enabling precise changes to infrastructure code. |  | Optional: \{\} <br /> |
| `deletes` _[PrAutomationDeleteConfiguration](#prautomationdeleteconfiguration)_ | Deletes specifies files and folders to remove from the repository as part<br />of the PR, useful for cleanup or migration scenarios. |  | Optional: \{\} <br /> |


#### PrAutomationTemplate



PrAutomationTemplate defines a single file template for creating new files in the target repository.



_Appears in:_
- [PrAutomationCreateConfiguration](#prautomationcreateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `destination` _string_ | The destination to write the file to |  | Required: \{\} <br /> |
| `external` _boolean_ | Whether it is being sourced from an external git repository |  | Required: \{\} <br /> |
| `source` _string_ | The source file to use for templating |  | Optional: \{\} <br /> |
| `context` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Additional context overrides to apply to this template, will be merged into the user-provided configuration options |  | Optional: \{\} <br /> |
| `condition` _string_ | Condition string that will be evaluated to determine if source files should be copied or not. |  | Optional: \{\} <br /> |


#### PrAutomationTrigger



PrAutomationTrigger initiates the execution of a PR automation with specific parameters.
This resource enables automated, event-driven, or scheduled generation of pull requests
by providing configuration context and branch information to an existing PrAutomation.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrAutomationTrigger` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrAutomationTriggerSpec](#prautomationtriggerspec)_ | Spec defines the desired state of the PrAutomationTrigger, including<br />the target automation, branch name, and configuration context. |  |  |


#### PrAutomationTriggerSpec



PrAutomationTriggerSpec defines the desired state of PrAutomationTrigger.
A trigger executes a specific PR automation with custom configuration and branch settings,
enabling programmatic and event-driven generation of pull requests for infrastructure changes.



_Appears in:_
- [PrAutomationTrigger](#prautomationtrigger)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef points to the source PrAutomation resource that defines<br />the templates, operations, and target repository for the generated PR. |  | Optional: \{\} <br /> |
| `branch` _string_ | Branch specifies the name of the branch that should be created for this PR<br />against the PrAutomation's configured base branch. This allows multiple<br />triggers to operate on the same automation without conflicts. |  | Required: \{\} <br /> |
| `context` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Context provides the configuration values that will be used to template<br />the PR content, file modifications, and metadata. This should match the<br />configuration schema defined in the referenced PrAutomation. |  | Optional: \{\} <br /> |


#### PrAutomationUniqBy







_Appears in:_
- [PrAutomationConfigurationValidation](#prautomationconfigurationvalidation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `scope` _[ValidationUniqScope](#validationuniqscope)_ |  |  | Enum: [PROJECT CLUSTER] <br />Required: \{\} <br /> |


#### PrAutomationUpdateConfiguration



PrAutomationUpdateConfiguration defines how to modify existing files in the target repository.



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `files` _string array_ | Files to update. |  | Optional: \{\} <br /> |
| `matchStrategy` _[MatchStrategy](#matchstrategy)_ | MatchStrategy, see enum for behavior. |  | Optional: \{\} <br /> |
| `regexReplacements` _[RegexReplacement](#regexreplacement) array_ | Full regex + replacement structs in case there is different behavior per regex |  | Optional: \{\} <br /> |
| `yamlOverlays` _[YamlOverlay](#yamloverlay) array_ | Replacement via overlaying a yaml structure on an existing yaml file |  | Optional: \{\} <br /> |
| `regexes` _string array_ | Regexes to apply on each file. |  | Optional: \{\} <br /> |
| `replaceTemplate` _string_ | ReplaceTemplate is a template to use when replacing a regex. |  | Optional: \{\} <br /> |
| `yq` _string_ | Yq (unused so far) |  | Optional: \{\} <br /> |


#### PrConfirmationChecklist



A checkbox to render to confirm a PR prerequisite is satisfied



_Appears in:_
- [PrAutomationConfirmation](#prautomationconfirmation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `label` _string_ | The label of this checkbox |  |  |


#### PrGovernance



PrGovernance defines governance rules and policies for pull request management within Plural Console.
It enforces organizational policies, approval workflows, and compliance requirements for pull requests
created through PR automations.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrGovernance` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrGovernanceSpec](#prgovernancespec)_ | Spec defines the desired state of the PrGovernance, including governance rules,<br />webhook configurations, and SCM integration settings for pull request management. |  |  |


#### PrGovernanceConfiguration



PrGovernanceConfiguration defines the configuration settings for PR governance enforcement.
It specifies the mechanisms and integrations used to implement governance policies
for pull requests managed through Plural Console automations.



_Appears in:_
- [PrGovernanceSpec](#prgovernancespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `webhook` _[PrGovernanceWebhook](#prgovernancewebhook)_ | Webhooks defines webhook integration settings for governance enforcement.<br />This enables the governance controller to receive notifications about pull request<br />events and respond with appropriate policy enforcement actions such as requiring<br />additional approvals, running compliance checks, or blocking merges. |  | Required: \{\} <br /> |


#### PrGovernanceSpec



PrGovernanceSpec defines the desired state of PrGovernance.
It specifies governance rules, approval workflows, and integration settings
for managing pull requests created through Plural Console automations.



_Appears in:_
- [PrGovernance](#prgovernance)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this PR governance controller.<br />If not provided, the name from the resource metadata will be used. |  | Optional: \{\} <br /> |
| `connectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ConnectionRef references an ScmConnection to reuse its credentials for this governance controller's authentication. |  | Required: \{\} <br /> |
| `configuration` _[PrGovernanceConfiguration](#prgovernanceconfiguration)_ | Configuration contains the specific governance settings and rules to enforce on pull requests.<br />This includes webhook configurations, approval requirements, and other policy enforcement<br />mechanisms that control how pull requests are managed and processed. |  | Optional: \{\} <br /> |


#### PrGovernanceWebhook



PrGovernanceWebhook defines webhook configuration for external governance system integration.
This enables the PR governance controller to integrate with external approval systems,
compliance platforms, or custom governance workflows that need to be notified about
or control pull request lifecycle events.



_Appears in:_
- [PrGovernanceConfiguration](#prgovernanceconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | Url specifies the HTTP endpoint where governance webhook notifications should be sent.<br />This URL will receive webhook payloads containing pull request information and governance<br />context, allowing external systems to implement custom approval workflows, compliance<br />checks, or other governance processes. The endpoint should be accessible and configured<br />to handle the webhook payload format expected by the governance system. |  | Required: \{\} <br /> |


#### PreviewEnvironmentTemplate



PreviewEnvironmentTemplate automates the creation of temporary preview environments for pull requests.
It defines how to clone and customize existing services when pull requests are opened, enabling
developers to test changes in isolated environments before merging. This is particularly useful
for feature branches, bug fixes, or any changes that need validation in a running environment.
Common use cases include creating preview environments for web applications, API services,
or microservices where visual or functional testing is needed before code review approval.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PreviewEnvironmentTemplate` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PreviewEnvironmentTemplateSpec](#previewenvironmenttemplatespec)_ | Spec defines the desired state of the PreviewEnvironmentTemplate, including the reference service<br />to clone, customization template, and integration settings for pull request workflows. |  |  |


#### PreviewEnvironmentTemplateSpec



PreviewEnvironmentTemplateSpec defines the desired state of PreviewEnvironmentTemplate.
It specifies how to create preview environments by cloning an existing service with customizations,
enabling automated testing environments for pull requests and feature development.



_Appears in:_
- [PreviewEnvironmentTemplate](#previewenvironmenttemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for this preview environment template.<br />If not provided, the name from the resource metadata will be used. |  | Optional: \{\} <br /> |
| `commentTemplate` _string_ | CommentTemplate provides a liquid template for generating custom PR comments.<br />This template can include dynamic information about the preview environment such as<br />URLs, deployment status, or custom instructions for reviewers. Variables from the<br />service template and environment can be interpolated into the comment. |  | Optional: \{\} <br /> |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ScmConnectionRef references the source control management connection to use for PR operations.<br />This connection is used to post comments on pull requests with preview environment information<br />and to trigger environment creation based on PR events. |  | Optional: \{\} <br /> |
| `referenceServiceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ReferenceServiceRef specifies the existing service deployment to use as a template.<br />This service will be cloned and customized according to the Template configuration<br />to create preview environments. The referenced service should be a stable, working<br />deployment that represents the base configuration for preview environments. |  | Required: \{\} <br /> |
| `flowRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | FlowRef references the flow that owns and manages this preview environment template.<br />The flow defines the overall workflow and permissions for creating and managing<br />preview environments based on this template. |  | Required: \{\} <br /> |
| `template` _[ServiceTemplate](#servicetemplate)_ | Template defines the service configuration overrides and customizations to apply<br />when cloning the reference service for preview environments. This includes<br />namespace changes, configuration overrides, and any other modifications needed<br />to create isolated preview environments. |  | Required: \{\} <br /> |


#### Project



Project provides organizational segmentation and multi-tenancy capabilities within Plural Console.
It serves as a unit of an organization to control permissions for sets of resources, enabling enterprise-grade
fleet management while maintaining security boundaries. Projects allow resource owners to manage their
domain without accessing resources outside their scope, supporting principles of least privilege
and preventing credential sprawl across the entire fleet.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Project` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ProjectSpec](#projectspec)_ | Spec reflects a Console API project spec. |  | Required: \{\} <br /> |


#### ProjectSpec



ProjectSpec defines the desired state of a Project.



_Appears in:_
- [Project](#project)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of the project. |  | Required: \{\} <br />Type: string <br /> |
| `description` _string_ | Description provides a human-readable explanation of this project's purpose<br />and the resources it manages within the organizational hierarchy. |  | Optional: \{\} <br />Type: string <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies that control access to all resources<br />within this project, enabling fine-grained permission management and multi-tenancy. |  | Optional: \{\} <br /> |




#### RegexReplacement



RegexReplacement defines a specific find-and-replace operation using regular expressions.



_Appears in:_
- [PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | Regex to match a substring on. |  | Required: \{\} <br /> |
| `file` _string_ | File this replacement will work on. |  | Required: \{\} <br /> |
| `replacement` _string_ | Replacement to be substituted for the match in the regex. |  | Required: \{\} <br /> |
| `templated` _boolean_ | Templated indicates whether you want to apply templating to the regex before compiling. |  | Optional: \{\} <br /> |


#### Renderer







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `path` _string_ |  |  |  |
| `type` _[RendererType](#renderertype)_ |  |  | Enum: [AUTO RAW HELM KUSTOMIZE] <br /> |
| `helm` _[HelmMinimal](#helmminimal)_ |  |  |  |


#### RouterFilters



RouterFilters defines filtering criteria for routing events to notification destinations.
Filters can be based on regex patterns, resource associations, or combinations thereof.



_Appears in:_
- [NotificationRouterSpec](#notificationrouterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | Regex specifies a regular expression pattern for filtering events based on content.<br />This can be used to filter events by URLs, resource names, error messages, or any<br />other textual content within the event data. Use standard regex syntax. |  | Optional: \{\} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef filters events to only those associated with a specific service deployment. |  | Optional: \{\} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef filters events to only those associated with a specific cluster. |  | Optional: \{\} <br /> |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef filters events to only those associated with a specific pipeline. |  | Optional: \{\} <br /> |


#### ScmConnection



ScmConnection is a container for credentials to a scm provider.  You can also reference a SCM connection created in the Plural UI via the provider + name, leaving all other fields blank.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ScmConnection` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ScmConnectionSpec](#scmconnectionspec)_ |  |  | Required: \{\} <br /> |


#### ScmConnectionSpec







_Appears in:_
- [ScmConnection](#scmconnection)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a human-readable name of the ScmConnection. |  | Required: \{\} <br /> |
| `type` _[ScmType](#scmtype)_ | Type is the name of the scm service for the ScmConnection.<br />One of (ScmType): [GITHUB, GITLAB, AZURE_DEVOPS, BITBUCKET] |  | Enum: [GITHUB GITLAB BITBUCKET AZURE_DEVOPS] <br />Required: \{\} <br />Type: string <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | A secret containing this access token you will use, stored in the `token` data field. |  | Optional: \{\} <br /> |
| `username` _string_ | Username ... |  | Optional: \{\} <br /> |
| `baseUrl` _string_ | BaseUrl is a base URL for Git clones for self-hosted versions. |  | Optional: \{\} <br /> |
| `apiUrl` _string_ | APIUrl is a base URL for HTTP apis for shel-hosted versions if different from BaseUrl. |  | Optional: \{\} <br /> |
| `github` _[ScmGithubConnection](#scmgithubconnection)_ | Settings for configuring Github App authentication |  | Optional: \{\} <br /> |
| `azure` _[AzureDevopsSettings](#azuredevopssettings)_ | Settings for configuring Azure DevOps authentication |  | Optional: \{\} <br /> |
| `proxy` _[HttpProxyConfiguration](#httpproxyconfiguration)_ | Configures usage of an HTTP proxy for all requests involving this SCM connection. |  | Optional: \{\} <br /> |
| `default` _boolean_ |  |  | Optional: \{\} <br /> |


#### ScmGithubConnection







_Appears in:_
- [ScmConnectionSpec](#scmconnectionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `appId` _string_ | The Github App ID to use for authentication (can be found on the Github Apps settings page) |  |  |
| `installationId` _string_ | The installation ID of your install of the Github App (found on the Github Apps section of your github repo/organization, located in the url path) |  |  |
| `privateKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  | Optional: \{\} <br /> |


#### Sentinel



Sentinel is the Schema for the sentinels API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Sentinel` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[SentinelSpec](#sentinelspec)_ |  |  |  |


#### SentinelCheck







_Appears in:_
- [SentinelSpec](#sentinelspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[SentinelCheckType](#sentinelchecktype)_ | Type the type of check to run. |  | Enum: [LOG KUBERNETES INTEGRATION_TEST] <br /> |
| `name` _string_ | Name the name of the check. |  |  |
| `ruleFile` _string_ | RuleFile the rule file to use for this check. |  |  |
| `configuration` _[SentinelCheckConfiguration](#sentinelcheckconfiguration)_ | Configuration the configuration to use for this check. |  |  |


#### SentinelCheckConfiguration







_Appears in:_
- [SentinelCheck](#sentinelcheck)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `log` _[SentinelCheckLogConfiguration](#sentinelchecklogconfiguration)_ | the log configuration to use for this check |  |  |
| `kubernetes` _[SentinelCheckKubernetesConfiguration](#sentinelcheckkubernetesconfiguration)_ | the kubernetes configuration to use for this check |  |  |
| `integrationTest` _[SentinelCheckIntegrationTestConfiguration](#sentinelcheckintegrationtestconfiguration)_ | the integration test configuration to use for this check |  |  |


#### SentinelCheckIntegrationTestConfiguration







_Appears in:_
- [SentinelCheckConfiguration](#sentinelcheckconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `jobSpec` _[JobSpec](#jobspec)_ | the job to run for this check |  |  |
| `distro` _[ClusterDistro](#clusterdistro)_ | the distro to run the check on |  | Enum: [GENERIC EKS AKS GKE RKE K3S OPENSHIFT] <br /> |
| `tags` _object (keys:string, values:string)_ | the cluster tags to select where to run this job |  |  |


#### SentinelCheckKubernetesConfiguration







_Appears in:_
- [SentinelCheckConfiguration](#sentinelcheckconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `group` _string_ | Group to use when fetching this resource. |  |  |
| `version` _string_ | Version the api version to use when fetching this resource. |  |  |
| `kind` _string_ | Kind the kind to use when fetching this resource. |  |  |
| `name` _string_ | Name to use when fetching this resource. |  |  |
| `namespace` _string_ | Namespace to use when fetching this resource |  |  |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef the cluster to run the query against |  | Required: \{\} <br /> |


#### SentinelCheckLogConfiguration







_Appears in:_
- [SentinelCheckConfiguration](#sentinelcheckconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespaces` _string array_ | Namespaces the namespaces to run the query against. |  |  |
| `query` _string_ | Query a search query this will run against the logs. |  |  |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef the cluster to run the query against. |  |  |
| `duration` _string_ | Duration of the log analysis run. |  |  |
| `facets` _object (keys:string, values:string)_ | Facets the log facets to run the query against. |  |  |


#### SentinelSpec



SentinelSpec defines the desired state of Sentinel



_Appears in:_
- [Sentinel](#sentinel)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this Sentinel.<br />If not provided, the name from Sentinel.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a human-readable explanation of what this Sentinel. |  |  |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef references a Git repository. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references the project this object belongs to, enabling<br />project-scoped organization and access control. |  | Optional: \{\} <br /> |
| `git` _[GitRef](#gitref)_ | The git location to use for this sentinel. |  |  |
| `checks` _[SentinelCheck](#sentinelcheck) array_ |  |  |  |


#### ServiceAccount



ServiceAccount provides a programmatic identity for automated processes and tools to interact
with the Plural Console API. Unlike user accounts, service accounts are designed for non-human
authentication and can be scoped to specific APIs and resources for secure, limited access.
This enables to authenticate and perform operations within defined permissions boundaries.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ServiceAccount` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ServiceAccountSpec](#serviceaccountspec)_ | Spec defines the desired state of the ServiceAccount, including email identity<br />and scope restrictions for API access control. |  | Required: \{\} <br /> |


#### ServiceAccountScope



ServiceAccountScope defines access restrictions for a service account, allowing
fine-grained control over which Console APIs and resources can be accessed.
This enables implementing least-privilege principles for automated systems.



_Appears in:_
- [ServiceAccountSpec](#serviceaccountspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `api` _string_ | API specifies a single Console API endpoint name that this service account<br />should be scoped to, such as 'updateServiceDeployment' or 'createCluster'. |  | Optional: \{\} <br /> |
| `apis` _string array_ | Apis is a list of Console API endpoint names that this service account<br />should be scoped to. |  | Optional: \{\} <br /> |
| `identifier` _string_ | Identifier specifies a resource ID in the Console API that this service<br />account should be scoped to. Leave blank or use '*' to scope to all resources<br />within the specified API endpoints. |  | Optional: \{\} <br /> |
| `ids` _string array_ | Ids is a list of Console API resource IDs that this service account should<br />be scoped to. |  | Optional: \{\} <br /> |


#### ServiceAccountSpec



ServiceAccountSpec defines the desired state of the ServiceAccount.



_Appears in:_
- [ServiceAccount](#serviceaccount)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `email` _string_ | Email address that will be bound to this service account for identification<br />and authentication purposes. This email serves as the unique identifier<br />for the service account within the Console API. |  | Required: \{\} <br />Type: string <br /> |
| `scopes` _[ServiceAccountScope](#serviceaccountscope) array_ | Scopes define the access boundaries for this service account, controlling<br />which Console APIs and resources it can interact with. Each scope can restrict<br />access to specific API endpoints and resource identifiers, enabling fine-grained<br />permission control for automated processes. |  | Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | TokenSecretRef references a Kubernetes secret that should contain the<br />authentication token for this service account. This enables secure storage<br />and management of credentials within the cluster. |  | Optional: \{\} <br /> |


#### ServiceComponent







_Appears in:_
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  |  |
| `name` _string_ | Name is the name of the Kubernetes resource, e.g. "test-deployment" or "test-job". |  |  |
| `group` _string_ | Group is a Kubernetes resource group, e.g. "apps" or "batch". |  | Optional: \{\} <br /> |
| `version` _string_ | Version is the Kubernetes resource version, e.g. "v1" or "v1beta1". |  | Optional: \{\} <br /> |
| `kind` _string_ | Kind is the Kubernetes resource kind, e.g. "Deployment" or "Job". |  |  |
| `namespace` _string_ | Namespace is the Kubernetes namespace where this component is deployed. |  | Optional: \{\} <br /> |
| `state` _[ComponentState](#componentstate)_ | State specifies the component state.<br />One of RUNNING, PENDING, FAILED. |  | Enum: [RUNNING PENDING FAILED] <br />Optional: \{\} <br /> |
| `synced` _boolean_ | Synced indicates whether this component is in sync with the desired state. |  |  |


#### ServiceContext



ServiceContext provides a reusable bundle of configuration. It enables sharing configuration data across multiple services.
This is particularly useful for passing outputs from infrastructure-as-code tools to Kubernetes services.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ServiceContext` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ServiceContextSpec](#servicecontextspec)_ |  |  |  |


#### ServiceContextSpec



ServiceContextSpec defines the desired state of the ServiceContext.



_Appears in:_
- [ServiceContext](#servicecontext)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this service context.<br />If not provided, the name from ServiceContext.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `configuration` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Configuration is a reusable configuration context that can include any JSON-compatible configuration data<br />that needs to be shared across multiple services. |  |  |
| `projectRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProjectRef references the project this service context belongs to.<br />If not provided, it will use the default project. |  | Optional: \{\} <br /> |


#### ServiceDependency







_Appears in:_
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | The name of a service on the same cluster this service depends on |  |  |


#### ServiceDeployment



ServiceDeployment provides a GitOps-driven approach to deploy and manage Kubernetes applications from Git repositories.
It represents a reference to a service deployed from a Git repo into a Cluster, enabling complete GitOps workflows
with full auditability and automated synchronization. The operator manages the deployment lifecycle by fetching
manifests from Git repositories and applying them to target clusters with support for Helm, Kustomize, and raw YAML.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ServiceDeployment` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ServiceSpec](#servicespec)_ |  |  | Required: \{\} <br /> |


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
| `url` _string_ |  |  | Optional: \{\} <br /> |
| `valuesFrom` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ValuesFrom is a reference to a Kubernetes Secret containing Helm values.<br />It will consider any key with YAML data as a values file and merge them iteratively.<br />This allows you to store Helm values in a secret and reference them here. |  | Optional: \{\} <br /> |
| `valuesConfigMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ |  |  | Optional: \{\} <br /> |
| `release` _string_ | Release contains the name of the Helm release to use when applying this service. |  | Optional: \{\} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef contains a reference to a GitRepository to source the Helm chart from.<br />This is useful for using a multi-source configuration for values files. |  | Optional: \{\} <br /> |
| `values` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Values contains arbitrary YAML values to overlay. |  | Optional: \{\} <br /> |
| `valuesFiles` _string array_ |  ValuesFiles contains individual values files to overlay. |  | Optional: \{\} <br /> |
| `chart` _string_ | Chart is the name of the Helm chart to use. |  | Optional: \{\} <br /> |
| `version` _string_ | Version of the Helm chart to use. |  | Optional: \{\} <br /> |
| `repository` _[NamespacedName](#namespacedname)_ | Repository is a pointer to the FluxCD Helm repository to use. |  | Optional: \{\} <br /> |
| `git` _[GitRef](#gitref)_ | Git contains a reference to a Git folder and ref where the Helm chart is located. |  | Optional: \{\} <br /> |
| `ignoreHooks` _boolean_ | IgnoreHooks indicates whether to completely ignore Helm hooks when actualizing this service. |  | Optional: \{\} <br /> |
| `ignoreCrds` _boolean_ | IgnoreCrds indicates whether to not include the CRDs in the /crds folder of the chart.<br />It is useful if you want to avoid installing CRDs that are already present in the cluster. |  | Optional: \{\} <br /> |
| `luaScript` _string_ | LuaScript to use to generate Helm configuration.<br />This can ultimately return a lua table with keys "values" and "valuesFiles"<br />to supply overlays for either dynamically based on git state or other metadata. |  | Optional: \{\} <br /> |
| `luaFile` _string_ | LuaFile to use to generate Helm configuration.<br />This can ultimately return a Lua table with keys "values" and "valuesFiles"<br />to supply overlays for either dynamically based on Git state or other metadata. |  | Optional: \{\} <br /> |
| `luaFolder` _string_ | a folder of lua files to include in the final script used |  | Optional: \{\} <br /> |


#### ServiceImport







_Appears in:_
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `stackRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | StackRef is a reference to an InfrastructureStack resource that provides outputs to import. |  | Required: \{\} <br /> |


#### ServiceKustomize







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `path` _string_ | Path to the kustomization file to use. |  |  |
| `enableHelm` _boolean_ | EnableHelm indicates whether to enable Helm for this Kustomize deployment.<br />Used for inflating Helm charts. |  | Optional: \{\} <br /> |


#### ServiceSpec



ServiceSpec defines the desired state of a ServiceDeployment.



_Appears in:_
- [ServiceDeployment](#servicedeployment)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this service.<br />If not provided, the name from ServiceDeployment.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `namespace` _string_ | Namespace where this service will be deployed.<br />If not provided, deploys to the ServiceDeployment namespace. |  | Optional: \{\} <br /> |
| `docsPath` _string_ | DocsPath specifies the path to documentation within the Git repository. |  | Optional: \{\} <br /> |
| `version` _string_ | Version specifies the semantic version of this ServiceDeployment. |  | Optional: \{\} <br /> |
| `protect` _boolean_ | Protect when true, prevents deletion of this service to avoid accidental removal. |  | Optional: \{\} <br /> |
| `kustomize` _[ServiceKustomize](#servicekustomize)_ | Kustomize configuration for applying Kustomize transformations to manifests. |  | Optional: \{\} <br /> |
| `git` _[GitRef](#gitref)_ | Git reference within the repository where the service manifests are located. |  | Optional: \{\} <br /> |
| `helm` _[ServiceHelm](#servicehelm)_ | Helm configuration for deploying Helm charts, including values and repository settings. |  | Optional: \{\} <br /> |
| `syncConfig` _[SyncConfigAttributes](#syncconfigattributes)_ | SyncConfig contains advanced configuration for how manifests are synchronized to the cluster. |  | Optional: \{\} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef references the GitRepository CRD containing the service source code. |  | Optional: \{\} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef references the target Cluster where this service will be deployed. |  | Required: \{\} <br /> |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef is a secret reference containing service configuration for templating. |  | Optional: \{\} <br /> |
| `flowRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | FlowRef provides contextual linkage to a broader application Flow this service belongs within. |  | Optional: \{\} <br /> |
| `configuration` _object (keys:string, values:string)_ | Configuration contains non-secret key-value pairs for lightweight templating of manifests. |  | Optional: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies controlling access to this service. |  | Optional: \{\} <br /> |
| `dependencies` _[ServiceDependency](#servicedependency) array_ | Dependencies specify services that must be healthy before this service can be deployed. |  | Optional: \{\} <br /> |
| `contexts` _string array_ | Contexts reference ServiceContext names to inject additional configuration. |  | Optional: \{\} <br /> |
| `templated` _boolean_ | Templated enables Liquid templating for raw YAML files, defaults to true. |  | Optional: \{\} <br /> |
| `imports` _[ServiceImport](#serviceimport) array_ | Imports enable importing outputs from InfrastructureStack resources for use in templating. |  | Optional: \{\} <br /> |
| `detach` _boolean_ | Detach when true, detaches the service on deletion instead of destroying it. |  | Optional: \{\} <br /> |
| `sources` _[Source](#source) array_ | Sources specify additional Git repositories to source manifests from for multi-source deployments. |  | Optional: \{\} <br /> |
| `renderers` _[Renderer](#renderer) array_ | Renderers define how to process and render manifests using different engines (Helm, Kustomize, etc.). |  | Optional: \{\} <br /> |
| `agentId` _string_ | AgentId represents agent session ID that created this service.<br />It is used for UI linking and otherwise ignored. |  | Optional: \{\} <br /> |




#### ServiceTemplate



ServiceTemplate defines the configuration for a service to be deployed within a managed namespace.
This enables automatic application deployment as part of the namespace provisioning process.



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)
- [ManagedNamespaceSpec](#managednamespacespec)
- [PreviewEnvironmentTemplateSpec](#previewenvironmenttemplatespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name specifies the name for the service deployment.<br />For managed namespaces, this is optional and can be auto-generated<br />if not explicitly provided. |  | Optional: \{\} <br /> |
| `namespace` _string_ | Namespace specifies the namespace for the service deployment.<br />For managed namespaces, this is typically auto-populated with<br />the managed namespace name if not explicitly provided. |  | Optional: \{\} <br /> |
| `templated` _boolean_ | Templated indicates whether to apply liquid templating to raw YAML files.<br />When enabled, allows for dynamic configuration injection and<br />environment-specific customization of service manifests. |  | Optional: \{\} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef references a GitRepository resource containing the service manifests.<br />This provides the source location for Kubernetes YAML files, Helm charts,<br />or other deployment artifacts needed for the service. |  | Optional: \{\} <br /> |
| `protect` _boolean_ | Protect indicates whether to protect this service from deletion.<br />Protected services are not automatically deleted during namespace cleanup<br />or cluster deletion operations, providing safety for critical workloads. |  | Optional: \{\} <br /> |
| `contexts` _string array_ | Contexts specifies a list of context names to add to this service.<br />Contexts provide reusable configuration bundles that can be shared<br />across multiple services for consistent environment setup. |  | Optional: \{\} <br /> |
| `git` _[GitRef](#gitref)_ | Git defines Git-specific settings for sourcing service manifests.<br />This includes repository references, branch/tag specifications,<br />and subdirectory paths within the Git repository. |  | Optional: \{\} <br /> |
| `helm` _[ServiceHelm](#servicehelm)_ | Helm defines Helm-specific settings for deploying Helm charts as part of this service.<br />This includes chart specifications, values files, repository references,<br />and Helm-specific deployment options. |  | Optional: \{\} <br /> |
| `kustomize` _[ServiceKustomize](#servicekustomize)_ | Kustomize defines Kustomize-specific settings for manifest customization.<br />This enables sophisticated YAML manipulation and configuration overlay<br />capabilities for complex deployment scenarios. |  | Optional: \{\} <br /> |
| `syncConfig` _[SyncConfigAttributes](#syncconfigattributes)_ | SyncConfig defines advanced synchronization settings for the service deployment.<br />This includes options for namespace management, drift detection configuration,<br />and deployment behavior customization. |  | Optional: \{\} <br /> |
| `dependencies` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Dependencies specify other services that must be healthy before this service is deployed.<br />This ensures proper deployment ordering and dependency resolution<br />within the managed namespace. |  | Optional: \{\} <br /> |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef references a Kubernetes Secret containing service-specific configuration.<br />This secret should contain key-value pairs that will be made available<br />to the service for runtime configuration and secrets management. |  | Optional: \{\} <br /> |
| `configuration` _object (keys:string, values:string)_ | Configuration provides a set of non-secret service-specific configuration values.<br />These key-value pairs are useful for templating and can be referenced<br />in manifest templates for environment-specific customization. |  | Optional: \{\} <br /> |
| `sources` _[Source](#source) array_ | Sources specify additional Git repositories or locations to source manifests from.<br />This enables multi-repository deployments and complex source composition<br />for sophisticated application architectures. |  | Optional: \{\} <br /> |
| `renderers` _[Renderer](#renderer) array_ | Renderers specify how manifests should be processed and rendered.<br />This includes options for Helm chart rendering, Kustomize processing,<br />and other manifest transformation workflows. |  | Optional: \{\} <br /> |


#### SinkConfiguration



SinkConfiguration contains type-specific configuration for different notification channels.
Only one configuration section should be populated based on the sink type.
Each configuration type has different requirements and delivery mechanisms.



_Appears in:_
- [NotificationSinkSpec](#notificationsinkspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `slack` _[SinkURL](#sinkurl)_ | Slack configuration for delivering notifications to Slack channels via webhook URLs.<br />Requires a valid Slack incoming webhook URL configured in your Slack workspace. |  | Optional: \{\} <br /> |
| `teams` _[SinkURL](#sinkurl)_ | Teams configuration for delivering notifications to Microsoft Teams channels.<br />Requires a valid Teams incoming webhook URL configured in your Teams workspace. |  | Optional: \{\} <br /> |
| `plural` _[PluralSinkConfiguration](#pluralsinkconfiguration)_ | Plural configuration for delivering in-app notifications within the Plural Console.<br />These notifications appear in the Console UI and can optionally trigger email delivery. |  | Optional: \{\} <br /> |


#### SinkURL



SinkURL defines the webhook URL configuration for external notification services.
Used by both Slack and Teams sink types to specify the destination webhook endpoint.



_Appears in:_
- [SinkConfiguration](#sinkconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL is the webhook endpoint where notifications will be delivered.<br />This should be a valid HTTP/HTTPS URL provided by your Slack or Teams workspace<br />when configuring incoming webhooks for the target channel. |  | Required: \{\} <br /> |


#### Source







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `path` _string_ | Path the subdirectory this source will live in the final tarball |  |  |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef the reference of the Git repository to source from. |  |  |
| `git` _[GitRef](#gitref)_ | Git contains a location in a Git repository to use. |  |  |


#### SpecTemplate







_Appears in:_
- [ClusterSpecTemplate](#clusterspectemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `handle` _string_ | Handle is a short, unique human-readable name used to identify this cluster.<br />Does not necessarily map to the cloud resource name.<br />This has to be specified in order to adopt existing cluster. |  | Optional: \{\} <br />Type: string <br /> |
| `version` _string_ | Version of Kubernetes to use for this cluster. Can be skipped only for BYOK. |  | Optional: \{\} <br />Type: string <br /> |
| `providerRef` _[ObjectReferenceTemplate](#objectreferencetemplate)_ | ProviderRef references provider to use for this cluster. Can be skipped only for BYOK. |  | Optional: \{\} <br /> |
| `projectRef` _[ObjectReferenceTemplate](#objectreferencetemplate)_ | ProjectRef references project this cluster belongs to.<br />If not provided, it will use the default project. |  | Optional: \{\} <br /> |
| `cloud` _string_ | Cloud provider to use for this cluster. |  | Optional: \{\} <br />Type: string <br /> |
| `protect` _string_ | Protect cluster from being deleted. |  | Optional: \{\} <br /> |
| `tags` _string_ | Tags used to filter clusters. |  | Optional: \{\} <br /> |
| `metadata` _string_ | Refer to Kubernetes API documentation for fields of `metadata`. |  | Optional: \{\} <br /> |
| `bindings` _[BindingsTemplate](#bindingstemplate)_ | Bindings contain read and write policies of this cluster |  | Optional: \{\} <br /> |
| `nodePools` _string_ | NodePools contains specs of node pools managed by this cluster. |  | Optional: \{\} <br /> |


#### StackConfiguration







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)
- [StackDefinitionSpec](#stackdefinitionspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `image` _string_ | Image contains the optional Docker image to use for the IaC tool.<br />If not provided, the default image for the tool will be used. |  | Optional: \{\} <br /> |
| `version` _string_ | Version of the IaC tool to use. |  | Optional: \{\} <br /> |
| `tag` _string_ | Tag of the IaC tool Docker image to use. |  | Optional: \{\} <br /> |
| `hooks` _[StackHook](#stackhook) array_ | Hooks to run at various stages of the stack run. |  | Optional: \{\} <br /> |
| `terraform` _[TerraformConfiguration](#terraformconfiguration)_ | Terraform configuration for this stack. |  | Optional: \{\} <br /> |
| `ansible` _[AnsibleConfiguration](#ansibleconfiguration)_ | Ansible configuration for this stack. |  | Optional: \{\} <br /> |
| `aiApproval` _[AiApprovalConfiguration](#aiapprovalconfiguration)_ | AiApproval configuration for this stack to be auto-approved by AI according to rules sourced from Git. |  | Optional: \{\} <br /> |


#### StackCron







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `crontab` _string_ | The crontab on which to spawn stack runs. |  |  |
| `autoApprove` _boolean_ | Whether to automatically approve cron-spawned runs. |  | Optional: \{\} <br /> |
| `overrides` _[StackOverrides](#stackoverrides)_ | Overrides for the cron triggered stack run configuration. |  | Optional: \{\} <br /> |


#### StackDefinition



StackDefinition provides reusable templates for Infrastructure Stack configurations and execution steps.
It allows you to define standardized stack configurations, custom execution steps, and runtime environments
that can be referenced by multiple Infrastructure Stacks. This enables consistent deployment patterns
and reduces duplication when managing similar infrastructure components across different environments.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `StackDefinition` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[StackDefinitionSpec](#stackdefinitionspec)_ |  |  |  |


#### StackDefinitionSpec



StackDefinitionSpec defines the desired state of the StackDefinition.



_Appears in:_
- [StackDefinition](#stackdefinition)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this StackDefinition.<br />If not provided, the name from StackDefinition.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `description` _string_ | Description provides a human-readable explanation of what this StackDefinition<br />template is intended for and how it should be used. |  | Optional: \{\} <br /> |
| `steps` _[CustomRunStep](#customrunstep) array_ | Steps defines a list of custom run steps that will be executed as part of<br />any stack run using this definition. Each step specifies a command, arguments,<br />execution stage, and approval requirements. |  | Optional: \{\} <br /> |
| `configuration` _[StackConfiguration](#stackconfiguration)_ | Configuration allows customization of the stack execution environment,<br />including Docker image settings, version specifications, and execution hooks. |  | Optional: \{\} <br /> |


#### StackEnvironment







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of the environment variable to set. |  | Required: \{\} <br /> |
| `value` _string_ | Value of the environment variable to set. |  | Optional: \{\} <br /> |
| `secretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | SecretKeyRef references a key in a Secret to set the environment variable value. |  | Optional: \{\} <br /> |
| `configMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ | ConfigMapRef references a key in a ConfigMap to set the environment variable value. |  | Optional: \{\} <br /> |


#### StackFile



StackFile represents	a file to mount from secrets into the stack execution environment.



_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `mountPath` _string_ | MountPath is the path where the file will be mounted in the stack execution environment. |  |  |
| `secretRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ | SecretRef is a reference to the secret containing the file. |  |  |


#### StackHook







_Appears in:_
- [StackConfiguration](#stackconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cmd` _string_ | Cmd is the command to execute. |  | Required: \{\} <br /> |
| `args` _string array_ | Args contain optional arguments to pass to the command. |  | Optional: \{\} <br /> |
| `afterStage` _[StepStage](#stepstage)_ |  |  | Enum: [INIT PLAN VERIFY APPLY DESTROY] <br />Required: \{\} <br /> |


#### StackOverrides







_Appears in:_
- [StackCron](#stackcron)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `terraform` _[TerraformConfiguration](#terraformconfiguration)_ | Terraform is the terraform configuration for this stack |  | Optional: \{\} <br /> |


#### StackSettings







_Appears in:_
- [DeploymentSettingsSpec](#deploymentsettingsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `jobSpec` _[JobSpec](#jobspec)_ | JobSpec optional k8s job configuration for the job that will apply this stack. |  | Optional: \{\} <br /> |
| `connectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ConnectionRef reference to ScmConnection. |  | Optional: \{\} <br /> |


#### Status







_Appears in:_
- [ClusterStatus](#clusterstatus)
- [GeneratedSecretStatus](#generatedsecretstatus)
- [GitRepositoryStatus](#gitrepositorystatus)
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ | ID of the resource in the Console API. |  | Optional: \{\} <br />Type: string <br /> |
| `sha` _string_ | SHA of last applied configuration. |  | Optional: \{\} <br />Type: string <br /> |
| `conditions` _[Condition](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#condition-v1-meta) array_ | Represents the observations of a PrAutomation's current state. |  |  |


#### SyncConfigAttributes







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `createNamespace` _boolean_ | Whether to auto-create the namespace for this service (specifying labels and annotations will also add those to the created namespace) |  | Optional: \{\} <br /> |
| `deleteNamespace` _boolean_ | Whether to delete the namespace for this service upon deletion |  | Optional: \{\} <br /> |
| `enforceNamespace` _boolean_ | Whether to enforce all created resources are placed in the service namespace |  | Optional: \{\} <br /> |
| `requireOwnership` _boolean_ | Whether to require all resources are owned by this service and fail if they are owned by another. Default is true. |  | Optional: \{\} <br /> |
| `labels` _object (keys:string, values:string)_ |  |  | Optional: \{\} <br /> |
| `annotations` _object (keys:string, values:string)_ |  |  | Optional: \{\} <br /> |
| `diffNormalizers` _[DiffNormalizers](#diffnormalizers) array_ | DiffNormalizers a list of diff normalizers to apply to the service which controls how drift detection works. |  | Optional: \{\} <br /> |


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



#### TemplateContext



TemplateContext provides metadata and configuration data for templating service deployments.
It enables dynamic customization of service properties based on cluster-specific or
environment-specific requirements during the deployment process.



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `raw` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Raw contains arbitrary YAML data that can be used as context for templating<br />service deployment properties. This data is made available to template engines<br />for dynamic substitution of values, configurations, or other deployment parameters. |  | Optional: \{\} <br /> |


#### TerraformConfiguration







_Appears in:_
- [StackConfiguration](#stackconfiguration)
- [StackOverrides](#stackoverrides)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `parallelism` _integer_ | Parallelism is the number of concurrent operations to run,<br />equivalent to the -parallelism flag in Terraform. |  | Optional: \{\} <br /> |
| `refresh` _boolean_ | Refresh is whether to refresh the state of the stack,<br />equivalent to the -refresh flag in Terraform. |  | Optional: \{\} <br /> |


#### Tools







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `createPr` _[CreatePr](#createpr)_ | CreatePr holds the configuration for the pr automation tool. |  | Optional: \{\} <br /> |


#### VectorStore







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled controls whether the vector store is enabled or not.. | false | Optional: \{\} <br /> |
| `vectorStore` _[VectorStore](#vectorstore)_ | VectorStore is the type of the vector store to use. |  | Enum: [ELASTIC OPENSEARCH] <br />Optional: \{\} <br /> |
| `elastic` _[ElasticsearchConnectionSettings](#elasticsearchconnectionsettings)_ | Elastic configuration for the vector store. |  | Optional: \{\} <br /> |
| `opensearch` _[OpensearchConnectionSettings](#opensearchconnectionsettings)_ | Opensearch configuration for the vector store. |  | Optional: \{\} <br /> |


#### VertexSettings







_Appears in:_
- [AISettings](#aisettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `model` _string_ | Model is the Vertex AI model to use.  Must support the OpenAI completions api, see: https://cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/overview |  | Optional: \{\} <br /> |
| `toolModel` _string_ | ToolModel to use for tool calling, which is less frequent and often requires more advanced reasoning |  | Optional: \{\} <br /> |
| `embeddingModel` _string_ | EmbeddingModel to use for generating embeddings |  | Optional: \{\} <br /> |
| `project` _string_ | Project is the GCP project you'll be using |  | Required: \{\} <br /> |
| `location` _string_ | Location is the GCP region Vertex is queried from |  | Required: \{\} <br /> |
| `endpoint` _string_ | Endpoint is a custom endpoint for self-deployed models |  | Optional: \{\} <br /> |
| `serviceAccountJsonSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ServiceAccountJsonSecretRef is a Service Account json file stored w/in a kubernetes secret to use for authentication to GCP |  | Optional: \{\} <br /> |


#### YamlOverlay



YamlOverlay defines a YAML merge operation to modify existing YAML files.



_Appears in:_
- [PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `file` _string_ | File to execute the overlay on. |  | Required: \{\} <br /> |
| `yaml` _string_ | Yaml (possibly templated) to use as the overlayed YAML blob written to the file. |  | Required: \{\} <br /> |
| `templated` _boolean_ | Templated indicates whether you want to apply templating to the YAML blob before overlaying. |  | Optional: \{\} <br /> |
| `listMerge` _[ListMerge](#listmerge)_ | ListMerge defines how you want list merge to be performed, defaults to OVERWRITE. |  | Enum: [OVERWRITE APPEND] <br />Optional: \{\} <br /> |


