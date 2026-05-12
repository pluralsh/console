# API Reference

## Packages
- [deployments.plural.sh/v1alpha1](#deploymentspluralshv1alpha1)


## deployments.plural.sh/v1alpha1

Package v1alpha1 contains API Schema definitions for the deployments v1alpha1 API group

### Resource Types
- [AgentConfiguration](#agentconfiguration)
- [AgentRun](#agentrun)
- [AgentRuntime](#agentruntime)
- [ClusterDrain](#clusterdrain)
- [CustomHealth](#customhealth)
- [IngressReplica](#ingressreplica)
- [KubecostExtractor](#kubecostextractor)
- [MetricsAggregate](#metricsaggregate)
- [PipelineGate](#pipelinegate)
- [PluralCAPICluster](#pluralcapicluster)
- [SentinelRunJob](#sentinelrunjob)
- [StackRunJob](#stackrunjob)
- [UpgradeInsights](#upgradeinsights)
- [VirtualCluster](#virtualcluster)



#### AWSProviderCredentials







_Appears in:_
- [ProviderCredentials](#providercredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `region` _string_ | Region is the name of the AWS region cluster lives in. |  | Required: \{\} <br /> |
| `accessKeyID` _string_ | AccessKeyID is your access key ID used to authenticate against AWS API. |  | Optional: \{\} <br /> |
| `secretAccessKeyRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | SecretAccessKeyRef is a reference to the secret that contains secret access key.<br />Since UpgradeInsights is a cluster-scoped resource we can't use local reference.<br />SecretAccessKey must be stored in a key named "secretAccessKey".<br />An example secret can look like this:<br />	apiVersion: v1<br />	kind: Secret<br />	metadata:<br />   name: eks-credentials<br />   namespace: upgrade-insights-test<br />	stringData:<br />   secretAccessKey: "changeme"<br />Then it can be referenced like this:<br />   ...<br />   secretAccessKeyRef:<br />     name: eks-credentials<br />     namespace: upgrade-insights-test |  | Optional: \{\} <br /> |


#### AgentConfiguration



AgentConfiguration is the deployment operator configuration





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `AgentConfiguration` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[AgentConfigurationSpec](#agentconfigurationspec)_ |  |  |  |


#### AgentConfigurationSpec



AgentConfigurationSpec defines the desired state of AgentConfiguration



_Appears in:_
- [AgentConfiguration](#agentconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `servicePollInterval` _string_ | ServicePollInterval defines how often the agent polls for services.<br />Expected format is a duration string (e.g., "30s", "5m").<br />Set to "0s" to disable service polling. |  |  |
| `clusterPingInterval` _string_ | ClusterPingInterval specifies the interval at which the agent pings the cluster.<br />Set to "0s" to disable cluster pings. |  |  |
| `compatibilityUploadInterval` _string_ | CompatibilityUploadInterval determines how frequently the agent uploads compatibility data.<br />Set to "0s" to disable compatibility uploads. |  |  |
| `stackPollInterval` _string_ | StackPollInterval sets how often the agent polls for stack updates or changes.<br />Set to "0s" to disable stack polling. |  |  |
| `pipelineGateInterval` _string_ | PipelineGateInterval specifies how frequently the agent checks pipeline gates.<br />Set to "0s" to disable pipeline gate checks. |  |  |
| `maxConcurrentReconciles` _integer_ | MaxConcurrentReconciles controls the maximum number of concurrent reconcile loops.<br />Higher values can increase throughput at the cost of resource usage. |  |  |
| `vulnerabilityReportUploadInterval` _string_ | VulnerabilityReportUploadInterval sets how often vulnerability reports are uploaded.<br />Set to "0s" to disable vulnerability report uploads. |  |  |
| `baseRegistryURL` _string_ | BaseRegistryURL allows overriding the default base registry URL.<br />For stack run jobs, agent run pods, sentinel run jobs. |  |  |
| `maxSentinelRunJobs` _integer_ | MaxSentinelRunJobs limits the number of concurrent SentinelRunJobs that can be active at any given time.<br />Must be greater than 0. Set this field to nil (omit) to disable the limit. |  | Minimum: 1 <br /> |
| `maxStackRunJobs` _integer_ | MaxStackRunJobs limits the number of concurrent StackRunJobs that can be active at any given time.<br />Must be greater than 0. Set this field to nil (omit) to disable the limit. |  | Minimum: 1 <br /> |
| `maxAgentRunPods` _integer_ | MaxAgentRunPods limits the number of concurrent agent run pods that can be active at any given time.<br />Must be greater than 0. Set this field to nil (omit) to disable the limit. |  | Minimum: 1 <br /> |
| `disableWebsocket` _boolean_ | DisableWebsocket disables the cluster websocket connection to the Console.<br />When enabled, the agent will rely exclusively on polling instead of receiving<br />push updates. This is useful in large-scale edge deployments where maintaining<br />persistent websocket connections has an infeasible network cost. |  |  |


#### AgentHelmConfiguration







_Appears in:_
- [CapiConfigurationClusterSpec](#capiconfigurationclusterspec)
- [HelmSpec](#helmspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `chartName` _string_ | ChartName is a helm chart name. |  |  |
| `repoUrl` _string_ | RepoUrl is a url that points to this helm chart. |  | Optional: \{\} <br />Type: string <br /> |
| `values` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Values allows defining arbitrary YAML values to pass to the helm as values.yaml file.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |
| `valuesSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ValuesSecretRef fetches helm values from a secret in this cluster.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |
| `valuesConfigMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ | ValuesConfigMapRef fetches helm values from a config map in this cluster.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |


#### AgentRun



AgentRun is the Schema for the agentruns API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `AgentRun` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[AgentRunSpec](#agentrunspec)_ |  |  |  |


#### AgentRunPhase

_Underlying type:_ _string_

AgentRunPhase represents the phase of an agent run

_Validation:_
- Enum: [Pending Running Succeeded Failed Cancelled]

_Appears in:_
- [AgentRunStatus](#agentrunstatus)

| Field | Description |
| --- | --- |
| `Pending` |  |
| `Running` |  |
| `Succeeded` |  |
| `Failed` |  |
| `Cancelled` |  |


#### AgentRunSpec



AgentRunSpec defines the desired state of AgentRun



_Appears in:_
- [AgentRun](#agentrun)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `runtimeRef` _[AgentRuntimeReference](#agentruntimereference)_ |  |  | Required: \{\} <br /> |
| `prompt` _string_ | Prompt is the task/prompt given to the agent |  | Required: \{\} <br /> |
| `repository` _string_ | Repository is the git repository the agent will work with |  | Required: \{\} <br /> |
| `mode` _[AgentRunMode](#agentrunmode)_ | Mode defines how the agent should run (ANALYZE, WRITE) |  | Required: \{\} <br /> |
| `flowId` _string_ | FlowID is the flow this agent run is associated with (optional) |  | Optional: \{\} <br /> |
| `language` _[AgentRunLanguage](#agentrunlanguage)_ | Language is the programming language used in the agent run. |  | Optional: \{\} <br /> |
| `languageVersion` _string_ | LanguageVersion is the version of the language to use, if you wish to specify. |  | Optional: \{\} <br /> |




#### AgentRuntime



AgentRuntime is the Schema for the agentruntimes API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `AgentRuntime` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[AgentRuntimeSpec](#agentruntimespec)_ |  |  |  |


#### AgentRuntimeBindings







_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings control who can generate new agent runtimes. |  | Optional: \{\} <br /> |


#### AgentRuntimeConfig



AgentRuntimeConfig contains typed configuration for the agent runtime.



_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `claude` _[ClaudeConfig](#claudeconfig)_ | Config for Claude CLI runtime. |  | Optional: \{\} <br /> |
| `opencode` _[OpenCodeConfig](#opencodeconfig)_ | Config for OpenCode CLI runtime. |  | Optional: \{\} <br /> |
| `gemini` _[GeminiConfig](#geminiconfig)_ | Config for Gemini CLI runtime. |  | Optional: \{\} <br /> |
| `codex` _[CodexConfig](#codexconfig)_ | Codex config for Codex CLI runtime. |  | Optional: \{\} <br /> |




#### AgentRuntimeReference







_Appears in:_
- [AgentRunSpec](#agentrunspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Required: \{\} <br /> |


#### AgentRuntimeSpec



AgentRuntimeSpec defines the desired state of AgentRuntime



_Appears in:_
- [AgentRuntime](#agentruntime)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this AgentRuntime.<br />If not provided, the name from AgentRuntime.ObjectMeta will be used. |  | Optional: \{\} <br /> |
| `default` _boolean_ | Default indicates whether this is the default agent runtime for coding agents. |  | Optional: \{\} <br /> |
| `targetNamespace` _string_ |  |  | Required: \{\} <br /> |
| `type` _[AgentRuntimeType](#agentruntimetype)_ | Type specifies the agent runtime to use for executing the stack.<br />One of CLAUDE, OPENCODE, GEMINI, CODEX, CUSTOM. |  | Enum: [CLAUDE OPENCODE GEMINI CODEX CUSTOM] <br />Required: \{\} <br /> |
| `bindings` _[AgentRuntimeBindings](#agentruntimebindings)_ | Bindings define the creation permissions for this agent runtime. |  | Optional: \{\} <br /> |
| `template` _[PodTemplateSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#podtemplatespec-v1-core)_ | Template defines the pod template for this agent runtime. |  |  |
| `config` _[AgentRuntimeConfig](#agentruntimeconfig)_ | Config contains typed configuration depending on the chosen runtime type. |  | Optional: \{\} <br /> |
| `aiProxy` _boolean_ | AiProxy specifies whether the agent runtime should be proxied through the AI proxy. |  |  |
| `dind` _boolean_ | Dind enables Docker-in-Docker for this agent runtime.<br />When true, the runtime will be configured to run with DinD support. |  | Optional: \{\} <br /> |
| `allowedRepositories` _string array_ | AllowedRepositories the git repositories allowed to be used with this runtime. |  | Optional: \{\} <br /> |
| `browser` _[BrowserConfig](#browserconfig)_ | Browser configuration augments agent runtime with a headless browser.<br />When provided, the runtime will be configured to run with a headless browser available<br />for the agent to use. |  | Optional: \{\} <br /> |
| `bootstrapScript` _string_ | BootstrapScript is a bash script that will be executed inside the cloned repository<br />directory before the coding agent starts. It can be used to install dependencies,<br />configure tooling, or perform any other setup required by the agent. |  | Optional: \{\} <br /> |
| `git` _[GitSpec](#gitspec)_ | Git configure commit signing on agent run. When provided, the runtime will be configured to sign git commits using the provided key reference. |  |  |
| `babysitInterval` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BabysitInterval configures the interval for the operator to check on the health of the agent runtime and perform necessary babysitting actions (e.g. restarting unhealthy runtimes). When not provided, a default interval of 1 minute will be used. |  |  |
| `exaMcpServers` _[ExaMcpServerConfig](#examcpserverconfig) array_ | ExaMcpServers defines external MCP servers that the agent runtime should connect to. When provided, the runtime will be configured to connect to these external MCP servers for tool and action execution. |  |  |


#### Binding



Binding ...



_Appears in:_
- [AgentRuntimeBindings](#agentruntimebindings)
- [Bindings](#bindings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  | Optional: \{\} <br /> |
| `UserID` _string_ |  |  | Optional: \{\} <br /> |
| `userEmail` _string_ |  |  | Optional: \{\} <br /> |
| `groupID` _string_ |  |  | Optional: \{\} <br /> |
| `groupName` _string_ |  |  | Optional: \{\} <br /> |


#### Bindings



Bindings represents a policy bindings that
can be used to define read/write permissions
to this resource for users/groups in the system.



_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: \{\} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: \{\} <br /> |


#### Browser

_Underlying type:_ _string_

Browser defines the browser to use for the agent runtime.



_Appears in:_
- [BrowserConfig](#browserconfig)

| Field | Description |
| --- | --- |
| `chrome` |  |
| `chromium` |  |
| `firefox` |  |
| `selenium-chrome` |  |
| `selenium-chromium` |  |
| `selenium-firefox` |  |
| `selenium-edge` |  |
| `puppeteer` |  |
| `custom` |  |


#### BrowserConfig



BrowserConfig is the configuration for the browser runtime.
It allows AgentRuntime to leverage a headless browser for executing and testing code.



_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled controls whether the browser runtime is enabled for this agent runtime. |  | Required: \{\} <br /> |
| `browser` _[Browser](#browser)_ | Browser defines the browser to use. When using non-custom options,<br />predefined images with validated configurations will be used. Default configuration<br />can be overridden by specifying a custom Container. When using a "custom" browser,<br />a custom Container configuration must be provided.<br />Available options are:<br />- chrome - uses browserless/chrome image<br />- chromium - uses browserless/chromium image<br />- firefox - uses browserless/firefox image<br />- selenium-chrome - uses selenium/standalone-chrome image<br />- selenium-chromium - uses selenium/standalone-chromium image<br />- selenium-firefox - uses selenium/standalone-firefox image<br />- selenium-edge - uses selenium/standalone-edge image<br />- puppeteer - uses browserless/chromium image<br />- custom<br />Default: chrome | chrome | Enum: [chrome chromium firefox selenium-chrome selenium-chromium selenium-firefox selenium-edge puppeteer custom] <br />Optional: \{\} <br /> |
| `container` _[Container](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#container-v1-core)_ | Container defines the container to use for the browser runtime.<br />For custom images, ensure the container starts a browser server and binds to<br />the predetermined port 3000 for remote access from the main agent container.<br />When using a predefined image, only partial overrides are allowed, including:<br />- environment variables<br />- resource limits<br />- image pull policy<br /># Examples<br />Selenium:<br />  name: browser<br />  image: selenium/standalone-chrome:144.0<br />  env:<br />  - name: SE_OPTS<br />    value: "--port 3000" |  | Optional: \{\} <br /> |


#### CapiConfigurationClusterSpec







_Appears in:_
- [PluralCAPICluster](#pluralcapicluster)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cluster` _[ClusterSpec](#clusterspec)_ | Cluster is a simplified representation of the Console API cluster<br />object. See [ClusterSpec] for more information. |  | Optional: \{\} <br /> |
| `consoleTokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef contains the reference to the secret holding the token to access the Console API |  | Required: \{\} <br /> |
| `capiClusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | CapiClusterRef contains the reference to the CAPI cluster |  | Required: \{\} <br /> |
| `agent` _[AgentHelmConfiguration](#agenthelmconfiguration)_ | Agent allows configuring agent specific helm chart options. |  | Optional: \{\} <br /> |


#### ClaudeConfig



ClaudeConfig contains configuration for the Claude CLI runtime.



_Appears in:_
- [AgentRuntimeConfig](#agentruntimeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ApiKeySecretRef Reference to a Kubernetes Secret containing the Claude API key. |  |  |
| `model` _string_ | Model Name of the model to use. |  |  |
| `endpoint` _string_ | Endpoint is the base URL for the Claude API (supports Bedrock/Anthropic-compatible endpoints). |  | Optional: \{\} <br /> |
| `extraArgs` _string array_ | ExtraArgs CLI args for advanced flags not modeled here |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single claude CLI run invocation. |  | Optional: \{\} <br /> |
| `bashTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BashTimeout is the default timeout for any bash command Claude execute. |  | Optional: \{\} <br /> |
| `bashMaxTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BashMaxTimeout is the maximum time Claude is permitted to wait<br />for a command before it is terminated. |  | Optional: \{\} <br /> |


#### ClaudeConfigRaw



ClaudeConfigRaw contains configuration for the Claude CLI runtime.

NOTE: Do not embed this struct directly, use ClaudeConfig instead.
This is only used to read original ClaudeConfig secret data and be
able to inject it into the pod as env vars.



_Appears in:_
- [AgentRuntimeConfigRaw](#agentruntimeconfigraw)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKey` _string_ | ApiKey is the raw API key to use. |  |  |
| `model` _string_ | Model Name of the model to use. |  |  |
| `endpoint` _string_ | Endpoint is the base URL for the Claude API (supports Bedrock/Anthropic-compatible endpoints). |  | Optional: \{\} <br /> |
| `extraArgs` _string array_ | ExtraArgs CLI args for advanced flags not modeled here |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single claude CLI run invocation. |  | Optional: \{\} <br /> |
| `bashTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BashTimeout is the default timeout for any bash command Claude executes. |  | Optional: \{\} <br /> |
| `bashMaxTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BashMaxTimeout is the maximum time Claude is permitted to wait<br />for a command before it is terminated. |  | Optional: \{\} <br /> |


#### ClusterDrain



ClusterDrain is the Schema for the ClusterDrain object





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterDrain` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterDrainSpec](#clusterdrainspec)_ |  |  |  |


#### ClusterDrainSpec



ClusterDrainSpec defines the desired state of ClusterDrain



_Appears in:_
- [ClusterDrain](#clusterdrain)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `flowControl` _[FlowControl](#flowcontrol)_ |  |  |  |
| `labelSelector` _[LabelSelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#labelselector-v1-meta)_ |  |  |  |




#### ClusterSpec







_Appears in:_
- [CapiConfigurationClusterSpec](#capiconfigurationclusterspec)
- [VirtualClusterSpec](#virtualclusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `handle` _string_ | Handle is a short, unique human-readable name used to identify this cluster.<br />Does not necessarily map to the cloud resource name. |  | Optional: \{\} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags used to filter clusters. |  | Optional: \{\} <br /> |
| `metadata` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  | Optional: \{\} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: \{\} <br /> |


#### CodexConfig







_Appears in:_
- [AgentRuntimeConfig](#agentruntimeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ApiKeySecretRef Reference to a Kubernetes Secret containing the Codex API key. |  |  |
| `model` _string_ | Model to use. |  |  |
| `endpoint` _string_ | Endpoint is the base URL for the Codex API (supports OpenAI/Azure-compatible endpoints). |  | Optional: \{\} <br /> |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single codex run invocation. |  | Optional: \{\} <br /> |


#### CodexConfigRaw







_Appears in:_
- [AgentRuntimeConfigRaw](#agentruntimeconfigraw)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKey` _string_ | ApiKey is the raw API key to use. |  |  |
| `model` _string_ | Model to use. |  |  |
| `endpoint` _string_ | Endpoint is the base URL for the Codex API (supports OpenAI/Azure-compatible endpoints). |  | Optional: \{\} <br /> |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single codex run invocation. |  | Optional: \{\} <br /> |








#### CustomHealth



CustomHealth is the Schema for the HealthConverts API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `CustomHealth` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CustomHealthSpec](#customhealthspec)_ |  |  |  |


#### CustomHealthSpec



CustomHealthSpec defines the desired state of CustomHealth



_Appears in:_
- [CustomHealth](#customhealth)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `script` _string_ |  |  |  |




#### ExaMcpServerConfig







_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `url` _string_ |  |  |  |
| `apiKey` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  |  |




#### FlowControl







_Appears in:_
- [ClusterDrainSpec](#clusterdrainspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `percentage` _integer_ |  |  |  |
| `maxConcurrency` _integer_ |  |  |  |


#### GateSpec



GateSpec defines the detailed gate specifications



_Appears in:_
- [PipelineGateSpec](#pipelinegatespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `job` _[JobSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#jobspec-v1-batch)_ | resuse JobSpec type from the kubernetes api |  |  |


#### GateState

_Underlying type:_ _GateState_

GateState represents the state of a gate, reused from console client

_Validation:_
- Enum: [PENDING OPEN CLOSED RUNNING]

_Appears in:_
- [PipelineGateStatus](#pipelinegatestatus)



#### GateType

_Underlying type:_ _GateType_

GateType represents the type of a gate, reused from console client

_Validation:_
- Enum: [APPROVAL WINDOW JOB]

_Appears in:_
- [PipelineGateSpec](#pipelinegatespec)



#### GeminiConfig



GeminiConfig contains configuration for the Gemini CLI runtime.



_Appears in:_
- [AgentRuntimeConfig](#agentruntimeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | APIKeySecretRef is a reference to a Kubernetes Secret containing the Gemini API key. |  |  |
| `model` _string_ | Model is the name of the model to use.<br />NOTE: gemini flash lite models and are not fit for the write (agent) mode, and<br />should only be used for analysis. |  | Optional: \{\} <br /> |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single gemini run invocation. |  | Optional: \{\} <br /> |
| `inactivityTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | InactivityTimeout is the timeout for inactivity during a gemini run. |  | Optional: \{\} <br /> |
| `endpoint` _string_ |  |  | Optional: \{\} <br /> |


#### GeminiConfigRaw



GeminiConfigRaw contains configuration for the Gemini CLI runtime.

NOTE: Do not embed this struct directly, use GeminiConfig instead.
This is only used to read original GeminiConfig secret data and be
able to inject it into the pod as env vars.



_Appears in:_
- [AgentRuntimeConfigRaw](#agentruntimeconfigraw)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKey` _string_ | APIKey is the raw Gemini API key to use. |  |  |
| `model` _string_ | Model is the name of the model to use. |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single gemini run invocation. |  | Optional: \{\} <br /> |
| `inactivityTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | InactivityTimeout is the timeout for inactivity during gemini run. |  | Optional: \{\} <br /> |
| `endpoint` _string_ |  |  | Optional: \{\} <br /> |


#### GitSpec







_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `proxy` _string_ |  |  |  |
| `signingKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  |  |




#### HelmConfiguration







_Appears in:_
- [AgentHelmConfiguration](#agenthelmconfiguration)
- [VClusterHelmConfiguration](#vclusterhelmconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `chartName` _string_ | ChartName is a helm chart name. |  |  |
| `repoUrl` _string_ | RepoUrl is a url that points to this helm chart. |  | Optional: \{\} <br />Type: string <br /> |
| `values` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Values allows defining arbitrary YAML values to pass to the helm as values.yaml file.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |
| `valuesSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ValuesSecretRef fetches helm values from a secret in this cluster.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |
| `valuesConfigMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ | ValuesConfigMapRef fetches helm values from a config map in this cluster.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |


#### HelmSpec







_Appears in:_
- [VirtualClusterSpec](#virtualclusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `agent` _[AgentHelmConfiguration](#agenthelmconfiguration)_ | Agent allows configuring agent specific helm chart options. |  | Optional: \{\} <br /> |
| `vcluster` _[VClusterHelmConfiguration](#vclusterhelmconfiguration)_ | VCluster allows configuring vcluster specific helm chart options. |  | Optional: \{\} <br /> |


#### IngressReplica



IngressReplica is the Schema for the console ingress replica





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `IngressReplica` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[IngressReplicaSpec](#ingressreplicaspec)_ | Spec of the IngressReplica |  | Required: \{\} <br /> |


#### IngressReplicaSpec







_Appears in:_
- [IngressReplica](#ingressreplica)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `ingressRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: \{\} <br /> |
| `ingressClassName` _string_ |  |  | Optional: \{\} <br /> |
| `tls` _[IngressTLS](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#ingresstls-v1-networking) array_ |  |  | Optional: \{\} <br /> |
| `hostMappings` _object (keys:string, values:string)_ |  |  | Required: \{\} <br /> |


#### KubecostExtractor



KubecostExtractor





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `KubecostExtractor` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[KubecostExtractorSpec](#kubecostextractorspec)_ |  |  |  |


#### KubecostExtractorSpec







_Appears in:_
- [KubecostExtractor](#kubecostextractor)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `interval` _string_ |  | 1h | Optional: \{\} <br /> |
| `kubecostServiceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  |  |
| `kubecostPort` _integer_ |  |  | Optional: \{\} <br /> |
| `recommendationThreshold` _string_ | RecommendationThreshold float value for example: `1.2 or 0.001` |  |  |
| `recommendationsSettings` _[RecommendationsSettings](#recommendationssettings)_ |  |  | Optional: \{\} <br /> |


#### MetricsAggregate



MetricsAggregate





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `MetricsAggregate` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |




#### OpenCodeConfig



OpenCodeConfig contains configuration for the OpenCode CLI runtime.



_Appears in:_
- [AgentRuntimeConfig](#agentruntimeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `provider` _string_ | Provider is the OpenCode provider to use. |  | Enum: [plural openai] <br />Required: \{\} <br /> |
| `endpoint` _string_ | Endpoint API endpoint for the OpenCode service.<br />Endpoint for the OpenCode service (can be any OpenAI-compatible API endpoint). |  | Required: \{\} <br /> |
| `model` _string_ | Model is the LLM model to use. |  | Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef is a reference to a Kubernetes Secret containing the API token for OpenCode. |  | Required: \{\} <br /> |
| `extraArgs` _string array_ | ExtraArgs args for advanced or experimental CLI flags.<br />Deprecated: It is being ignored by the agent harness. |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single opencode run invocation. |  | Optional: \{\} <br /> |


#### OpenCodeConfigRaw



OpenCodeConfigRaw contains configuration for the OpenCode CLI runtime.

NOTE: Do not embed this struct directly, use OpenCodeConfig instead.
This is only used to read original OpenCodeConfig secret data and be
able to inject it into the pod as env vars.



_Appears in:_
- [AgentRuntimeConfigRaw](#agentruntimeconfigraw)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `provider` _string_ | Provider is the OpenCode provider to use. |  |  |
| `endpoint` _string_ | Endpoint API endpoint for the OpenCode service. |  |  |
| `model` _string_ | Model is the LLM model to use. |  |  |
| `tokenSecretRef` _string_ | Token is the raw API token for OpenCode. |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single opencode run invocation. |  | Optional: \{\} <br /> |


#### PipelineGate



PipelineGate represents a gate blocking promotion along a release pipeline





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PipelineGate` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineGateSpec](#pipelinegatespec)_ |  |  |  |


#### PipelineGateSpec



PipelineGateSpec defines the detailed gate specifications



_Appears in:_
- [PipelineGate](#pipelinegate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  |  |
| `name` _string_ |  |  |  |
| `type` _[GateType](#gatetype)_ |  |  | Enum: [APPROVAL WINDOW JOB] <br /> |
| `gateSpec` _[GateSpec](#gatespec)_ |  |  |  |




#### PluralCAPICluster



PluralCAPICluster is the Schema for the CAPI cluster configuration





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PluralCAPICluster` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CapiConfigurationClusterSpec](#capiconfigurationclusterspec)_ | Spec of the CAPI cluster configuration |  | Required: \{\} <br /> |




#### Progress







_Appears in:_
- [ClusterDrainStatus](#clusterdrainstatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `wave` _integer_ |  |  |  |
| `percentage` _integer_ |  |  |  |
| `count` _integer_ |  |  |  |
| `failures` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ |  |  |  |
| `cursor` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  |  |


#### ProviderCredentials







_Appears in:_
- [UpgradeInsightsSpec](#upgradeinsightsspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[AWSProviderCredentials](#awsprovidercredentials)_ | AWS defines attributes required to auth with AWS API. |  | Optional: \{\} <br /> |


#### RecommendationsSettings







_Appears in:_
- [KubecostExtractorSpec](#kubecostextractorspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `excludeNamespaces` _string array_ |  |  |  |
| `requireAnnotations` _object (keys:string, values:string)_ |  |  |  |


#### SentinelRunJob



SentinelRunJob is the Schema for the sentinel run job





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `SentinelRunJob` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[SentinelRunJobSpec](#sentinelrunjobspec)_ |  |  |  |


#### SentinelRunJobSpec







_Appears in:_
- [SentinelRunJob](#sentinelrunjob)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `runId` _string_ | RunID from Console API |  |  |




#### StackRunJob



StackRunJob is the Schema for the stack run job





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `StackRunJob` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[StackRunJobSpec](#stackrunjobspec)_ |  |  |  |


#### StackRunJobSpec







_Appears in:_
- [StackRunJob](#stackrunjob)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `runId` _string_ | RunID from Console API |  |  |




#### Status







_Appears in:_
- [AgentRunStatus](#agentrunstatus)
- [SentinelRunJobStatus](#sentinelrunjobstatus)
- [StackRunJobStatus](#stackrunjobstatus)
- [VirtualClusterStatus](#virtualclusterstatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ | ID of the resource in the Console API. |  | Optional: \{\} <br />Type: string <br /> |
| `sha` _string_ | SHA of last applied configuration. |  | Optional: \{\} <br />Type: string <br /> |
| `conditions` _[Condition](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#condition-v1-meta) array_ | Represents the observations of a PrAutomation's current state. |  |  |


#### UpgradeInsights



UpgradeInsights is the Schema for the UpgradeInsights API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `UpgradeInsights` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[UpgradeInsightsSpec](#upgradeinsightsspec)_ |  |  |  |




#### UpgradeInsightsSpec







_Appears in:_
- [UpgradeInsights](#upgradeinsights)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro defines which provider API should be used to fetch latest upgrade insights.<br />If not provided, we get the distro from the Plural API cluster tied to this operator deploy token. |  | Enum: [EKS] <br />Optional: \{\} <br /> |
| `clusterName` _string_ | ClusterName is your cloud provider cluster identifier (usually name) that is used<br />to fetch latest upgrade insights information from the cloud provider API.<br />If not provided, we get the cluster name from the Plural API cluster tied to this<br />operator deploy token and assume that it is the same as the cluster name in your cloud provider. |  | Optional: \{\} <br /> |
| `interval` _string_ | Interval defines how often should the upgrade insights information be fetched. | 10m | Optional: \{\} <br /> |
| `credentials` _[ProviderCredentials](#providercredentials)_ | Credentials allow overriding default provider credentials bound to the operator. |  | Optional: \{\} <br /> |


#### VClusterHelmConfiguration







_Appears in:_
- [HelmSpec](#helmspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `chartName` _string_ | ChartName is a helm chart name. |  |  |
| `repoUrl` _string_ | RepoUrl is a url that points to this helm chart. |  | Optional: \{\} <br />Type: string <br /> |
| `values` _[RawExtension](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#rawextension-runtime-pkg)_ | Values allows defining arbitrary YAML values to pass to the helm as values.yaml file.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |
| `valuesSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ValuesSecretRef fetches helm values from a secret in this cluster.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |
| `valuesConfigMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ | ValuesConfigMapRef fetches helm values from a config map in this cluster.<br />Use only one of:<br />	- Values<br />	- ValuesSecretRef<br />	- ValuesConfigMapRef |  | Optional: \{\} <br /> |


#### VirtualCluster



VirtualCluster is the Schema for the virtual cluster API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `VirtualCluster` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[VirtualClusterSpec](#virtualclusterspec)_ | Spec ... |  | Required: \{\} <br /> |


#### VirtualClusterSpec







_Appears in:_
- [VirtualCluster](#virtualcluster)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `kubeconfigRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ | KubeconfigRef is a reference to the secret created by the<br />vcluster helm chart. It contains kubeconfig with information<br />on how to access created virtual cluster. |  | Required: \{\} <br /> |
| `credentialsRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | CredentialsRef is a reference to the secret pointing to the<br />key that holds Console API access token. It allows to communicate<br />with the standard Console API. |  | Required: \{\} <br /> |
| `cluster` _[ClusterSpec](#clusterspec)_ | Cluster is a simplified representation of the Console API cluster<br />object. See [ClusterSpec] for more information. |  | Optional: \{\} <br /> |
| `external` _boolean_ | External marks this virtual cluster as external one, meaning<br />that the vcluster deployment will not be automatically created.<br />User has to pre-provision vcluster and provide a valid KubeconfigRef<br />pointing to an existing vcluster installation. |  | Optional: \{\} <br /> |
| `helm` _[HelmSpec](#helmspec)_ | Helm allows configuring helm chart options of both agent and vcluster.<br />It is then deployed by the [VirtualCluster] CRD controller. |  | Optional: \{\} <br /> |




