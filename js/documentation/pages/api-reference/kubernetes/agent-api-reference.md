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
- [CustomInsightPriority](#custominsightpriority)
- [DevboxRunner](#devboxrunner)
- [ImageWarmer](#imagewarmer)
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
| `managedNamespacePollInterval` _string_ | ManagedNamespacePollInterval defines how often the agent polls for managed namespaces.<br />Set to "0s" to disable managed namespace polling. |  |  |
| `clusterPingInterval` _string_ | ClusterPingInterval specifies the interval at which the agent pings the cluster.<br />Set to "0s" to disable cluster pings. |  |  |
| `compatibilityUploadInterval` _string_ | CompatibilityUploadInterval determines how frequently the agent uploads compatibility data.<br />Set to "0s" to disable compatibility uploads. |  |  |
| `stackPollInterval` _string_ | StackPollInterval sets how often the agent polls for stack updates or changes.<br />Set to "0s" to disable stack polling. |  |  |
| `sentinelPollInterval` _string_ | SentinelPollInterval sets how often the agent polls for sentinel run jobs.<br />Set to "0s" to disable sentinel run job polling. |  |  |
| `pipelineGateInterval` _string_ | PipelineGateInterval specifies how frequently the agent checks pipeline gates.<br />Set to "0s" to disable pipeline gate checks. |  |  |
| `componentShaCacheTTL` _string_ | ComponentShaCacheTTL specifies how long duplicate component updates are cached. |  |  |
| `maxConcurrentReconciles` _integer_ | MaxConcurrentReconciles controls the maximum number of concurrent reconcile loops.<br />Higher values can increase throughput at the cost of resource usage. |  |  |
| `vulnerabilityReportUploadInterval` _string_ | VulnerabilityReportUploadInterval sets how often vulnerability reports are uploaded.<br />Set to "0s" to disable vulnerability report uploads. |  |  |
| `baseRegistryURL` _string_ | BaseRegistryURL allows overriding the default base registry URL.<br />For stack run jobs, agent run pods, sentinel run jobs. |  |  |
| `maxSentinelRunJobs` _integer_ | MaxSentinelRunJobs limits the number of concurrent SentinelRunJobs that can be active at any given time.<br />Must be greater than 0. Set this field to nil (omit) to disable the limit. |  | Minimum: 1 <br /> |
| `maxStackRunJobs` _integer_ | MaxStackRunJobs limits the number of concurrent StackRunJobs that can be active at any given time.<br />Must be greater than 0. Set this field to nil (omit) to disable the limit. |  | Minimum: 1 <br /> |
| `maxAgentRunPods` _integer_ | MaxAgentRunPods limits the number of concurrent agent run pods that can be active at any given time.<br />Must be greater than 0. Set this field to nil (omit) to disable the limit. |  | Minimum: 1 <br /> |
| `disableWebsocket` _boolean_ | DisableWebsocket disables the cluster websocket connection to the Console.<br />When enabled, the agent will rely exclusively on polling instead of receiving<br />push updates. This is useful in large-scale edge deployments where maintaining<br />persistent websocket connections has an infeasible network cost. |  |  |
| `pollImmediately` _boolean_ | PollImmediately determines whether the agent should poll immediately upon startup.<br />When set to true, the agent will perform an initial poll as soon as it starts.<br />By default, it's set to true. |  |  |


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
| `branch` _string_ | Branch is the repository branch the agent should operate on. If omitted, the repository default branch is used. |  | Optional: \{\} <br /> |
| `mode` _[AgentRunMode](#agentrunmode)_ | Mode defines how the agent should run (ANALYZE, WRITE, REVIEW) |  | Required: \{\} <br /> |
| `reviewDepth` _[AgentReviewDepth](#agentreviewdepth)_ | ReviewDepth controls how far a review run explores code adjacent to the pull request changes. |  | Optional: \{\} <br /> |
| `flowId` _string_ | FlowID is the flow this agent run is associated with (optional) |  | Optional: \{\} <br /> |
| `workbenchMcpUrl` _string_ | WorkbenchMCPURL is the Console MCP endpoint for the workbench that<br />originated this run. It is populated by the AgentRuntime controller. |  | Optional: \{\} <br /> |
| `language` _[AgentRunLanguage](#agentrunlanguage)_ | Language is the programming language used in the agent run.<br />Deprecated: No longer used for image selection. Enable dind on the AgentRuntime instead. |  | Optional: \{\} <br /> |
| `languageVersion` _string_ | LanguageVersion is the version of the language to use, if you wish to specify.<br />Deprecated: No longer used for image selection. Enable dind on the AgentRuntime instead. |  | Optional: \{\} <br /> |




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
| `create` _[Binding](#binding) array_ | Create bindings control who can create agent runs on this runtime. |  | Optional: \{\} <br /> |


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
| `pi` _[PiConfig](#piconfig)_ | Pi config for Pi coding-agent CLI runtime. |  | Optional: \{\} <br /> |




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
| `type` _[AgentRuntimeType](#agentruntimetype)_ | Type specifies the agent runtime to use for executing the stack.<br />One of CLAUDE, OPENCODE, GEMINI, CODEX, PI, CUSTOM. |  | Enum: [CLAUDE OPENCODE GEMINI CODEX PI CUSTOM] <br />Required: \{\} <br /> |
| `bindings` _[AgentRuntimeBindings](#agentruntimebindings)_ | Bindings define who can create agent runs on this runtime. Omit them to leave the runtime's bindings<br />unchanged in console (eg managed by an AgentRuntimePolicy), or set an empty create list to clear them.<br />Only applied on clusters configured to allow agent workloads. |  | Optional: \{\} <br /> |
| `template` _[PodTemplateSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#podtemplatespec-v1-core)_ | Template defines the pod template for this agent runtime. |  |  |
| `config` _[AgentRuntimeConfig](#agentruntimeconfig)_ | Config contains typed configuration depending on the chosen runtime type. |  | Optional: \{\} <br /> |
| `aiProxy` _boolean_ | AiProxy routes LLM requests through the Console AI proxy (/ext/ai) using the deploy token,<br />which the in-pod mcpserver sidecar adds, so provider API keys in spec.config are optional.<br />Set the model on the runtime-specific config block (for example spec.config.codex.model).<br />The proxy expects models in provider/name format (for example openai/gpt-5.4,<br />anthropic/claude-sonnet-4-5, vertex/gemini-2.5-pro). Values that already include a "/"<br />are passed through unchanged.<br />When only a bare model id is given, the harness may prefix it by runtime type:<br />  - CLAUDE: anthropic/\{model\} (for example claude-sonnet-4-5 -> anthropic/claude-sonnet-4-5)<br />  - CODEX, OPENCODE: openai/\{model\} (for example gpt-5.4 -> openai/gpt-5.4)<br />  - GEMINI: vertex/\{model\}<br />  - CUSTOM: no automatic prefix; use provider/name explicitly |  |  |
| `streamingProxy` _boolean_ | StreamingProxy routes OpenAI-compatible LLM requests through the in-pod mcpserver<br />sse conversion proxy before they reach the Console AI proxy (/ext/ai). Only valid when aiProxy<br />is enabled. Applies to CODEX and OPENCODE runtimes. |  | Optional: \{\} <br /> |
| `dind` _boolean_ | Dind enables Docker-in-Docker for this agent runtime.<br />When true, the runtime will be configured to run with DinD support. |  | Optional: \{\} <br /> |
| `memory` _boolean_ | Memory enables team-shared codebase-memory persistence for this agent runtime.<br />When true, agents may create and commit .codebase-memory/ graph artifacts<br />by default so future runs can bootstrap from the persisted index. When false<br />or unset, codebase-memory indexes stay in the pod-local cache and generated<br />.codebase-memory/ artifacts are excluded from commits. |  | Optional: \{\} <br /> |
| `repositoryImage` _string_ | RepositoryImage is an OCI image of precloned git repositories plus manifest.json.<br />When set, an init container copies it into /plural/shared/repos before bootstrap<br />so a matching repo can be copied locally instead of git clone. |  | Optional: \{\} <br /> |
| `prewarm` _[RepositoryImagePrewarm](#repositoryimageprewarm)_ | Prewarm periodically pulls RepositoryImage onto selected nodes before<br />agent runs are scheduled. |  | Optional: \{\} <br /> |
| `allowedRepositories` _string array_ | AllowedRepositories the git repositories allowed to be used with this runtime. |  | Optional: \{\} <br /> |
| `browser` _[BrowserConfig](#browserconfig)_ | Browser configuration augments agent runtime with a headless browser.<br />When provided, the runtime will be configured to run with a headless browser available<br />for the agent to use. |  | Optional: \{\} <br /> |
| `bootstrapScript` _string_ | BootstrapScript is a bash script that will be executed inside the cloned repository<br />directory before the coding agent starts. It can be used to install dependencies,<br />configure tooling, or perform any other setup required by the agent. |  | Optional: \{\} <br /> |
| `readOnlyRootFilesystem` _boolean_ | ReadOnlyRootFilesystem controls the default container securityContext.<br />When unset, the root filesystem stays writable (the current default).<br />Set true when extending a finished image that already contains compilers.<br />Set false (or leave unset) together with mise.config to run<br />`mise bootstrap --yes` at boot: https://mise.jdx.dev/bootstrap.html |  | Optional: \{\} <br /> |
| `mise` _[MiseSpec](#misespec)_ | Mise supplies a mise.toml applied before the coding agent starts.<br />When the default container root is writable, the harness runs<br />`mise trust` and `mise bootstrap --yes`. When readOnlyRootFilesystem is true,<br />the config is still mounted so mise exec can use [tools] and [env],<br />but bootstrap is skipped. |  | Optional: \{\} <br /> |
| `git` _[GitSpec](#gitspec)_ | Git configure commit signing on agent run. When provided, the runtime will be configured to sign git commits using the provided key reference. |  |  |
| `babysitInterval` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BabysitInterval configures the interval for the operator to check on the health of the agent runtime and perform necessary babysitting actions (e.g. restarting unhealthy runtimes). When not provided, a default interval of 1 minute will be used. |  |  |
| `agentTTL` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | AgentTTL configures the maximum lifetime for agent run pods on this runtime. When not provided, a default TTL of 12 hours will be used. |  | Optional: \{\} <br /> |
| `scmConnection` _string_ | ScmConnection is the name of an ScmConnection in Console to use for git operations on agent runs using this runtime.<br />This should match the name of an existing ScmConnection resource or connection created in the Plural UI. |  | Optional: \{\} <br /> |
| `exaConnection` _[ExaConnection](#exaconnection)_ | ExaConnection enables Exa web search and content retrieval tools on the Plural MCP server. |  |  |
| `mcpServers` _[MCPServer](#mcpserver) array_ | MCPServers are additional remote MCP servers made available to coding agents<br />on this runtime. Servers are expected to already be deployed and reachable<br />at the given URL. Built-in servers named "plural" and "codebase-memory-mcp"<br />are reserved and cannot be overridden. |  | Optional: \{\} <br /> |
| `workbenchMcp` _[WorkbenchMCPConfig](#workbenchmcpconfig)_ | WorkbenchMCP exposes the originating workbench's read-only tools to coding<br />agents through the credential-isolating MCP sidecar. |  | Optional: \{\} <br /> |




#### Binding



Binding ...



_Appears in:_
- [AgentRuntimeBindings](#agentruntimebindings)
- [Bindings](#bindings)
- [DevboxRunnerBindings](#devboxrunnerbindings)

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
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ApiKeySecretRef references a Secret containing the Claude API key.<br />Optional when aiProxy is enabled; authentication uses the Console deploy token instead. |  | Optional: \{\} <br /> |
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
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ApiKeySecretRef references a Secret containing the Codex API key.<br />Optional when aiProxy is enabled; authentication uses the Console deploy token instead. |  | Optional: \{\} <br /> |
| `model` _string_ | Model to use. |  |  |
| `method` _[OpenAiMethod](#openaimethod)_ | Method configures which OpenAI API Codex should use.<br />AUTO omits wire_api and lets Codex choose. CHAT forces /chat/completions.<br />RESPONSES forces /responses. |  | Enum: [CHAT RESPONSES AUTO] <br />Optional: \{\} <br /> |
| `endpoint` _string_ | Endpoint is the base URL for the Codex API (supports OpenAI/Azure-compatible endpoints). |  | Optional: \{\} <br /> |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single codex run invocation. |  | Optional: \{\} <br /> |


#### CodexConfigRaw







_Appears in:_
- [AgentRuntimeConfigRaw](#agentruntimeconfigraw)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKey` _string_ | ApiKey is the raw API key to use. |  |  |
| `model` _string_ | Model to use. |  |  |
| `method` _[OpenAiMethod](#openaimethod)_ | Method configures which OpenAI API Codex should use.<br />AUTO omits wire_api and lets Codex choose. CHAT forces /chat/completions.<br />RESPONSES forces /responses. |  | Enum: [CHAT RESPONSES AUTO] <br />Optional: \{\} <br /> |
| `endpoint` _string_ | Endpoint is the base URL for the Codex API (supports OpenAI/Azure-compatible endpoints). |  | Optional: \{\} <br /> |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single codex run invocation. |  | Optional: \{\} <br /> |








#### CostProvider

_Underlying type:_ _string_

CostProvider identifies which cost allocation backend to query.



_Appears in:_
- [KubecostExtractorSpec](#kubecostextractorspec)

| Field | Description |
| --- | --- |
| `Kubecost` |  |
| `OpenCost` |  |


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
| `script` _string_ | Script is a Lua health-assessment script. The target resource is available as the global `Obj`.<br />The script must assign a Lua table to the global `healthStatus`; a Lua `return \{ ... \}` is not consumed.<br />The table uses `status` and an optional `message`, for example: `healthStatus = \{ status = "Healthy", message = "resource is ready" \}`.<br />Supported/intended status values are `Healthy`, `Degraded`, `Paused`, `Unknown`, `Progressing`, `Suspended`, and `Missing`.<br />See https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator/custom-health for the full guide. |  |  |
| `group` _string_ |  |  | Optional: \{\} <br /> |
| `version` _string_ |  |  | Optional: \{\} <br /> |
| `kind` _string_ |  |  | Optional: \{\} <br /> |




#### CustomInsightPriority



CustomInsightPriority sets the priority of failing objects in the cluster insights and the cluster health score.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `CustomInsightPriority` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[CustomInsightPrioritySpec](#custominsightpriorityspec)_ |  |  |  |


#### CustomInsightPrioritySpec



CustomInsightPrioritySpec defines how the insight priority of failing objects is decided.



_Appears in:_
- [CustomInsightPriority](#custominsightpriority)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `target` _[InsightTarget](#insighttarget)_ | Target selects the failing objects this script sets the priority of. |  | Optional: \{\} <br /> |
| `precedence` _integer_ | Precedence decides which script owns an object that several targets match: the highest wins and ties are<br />broken by name. A script never sees objects it does not own, and scripts are not chained. |  | Optional: \{\} <br /> |
| `engine` _[InsightEngine](#insightengine)_ | Engine the script is written for. | python | Enum: [python] <br />Optional: \{\} <br /> |
| `script` _string_ | Script defines `evaluate(input)`, called with the objects this script owns in `input["rows"]`, and returns a<br />dictionary from the `uid` of a row to `\{"priority": "LOW\|MEDIUM\|HIGH\|CRITICAL\|IGNORE", "reason": "..."\}`.<br />Rows that are left out keep their built-in priority, IGNORE removes a row from the insights and the cluster health score.<br />Objects annotated with deployments.plural.sh/insight-priority are decided by the annotation and never reach the script.<br />See https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator/insight-priority for the full guide. |  |  |




#### DevboxAWSIdentity







_Appears in:_
- [DevboxCloudIdentity](#devboxcloudidentity)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `roleArn` _string_ |  |  | Pattern: `^arn:aws[a-zA-Z-]*:iam::[0-9]\{12\}:role/.+$` <br />Required: \{\} <br /> |
| `durationSeconds` _integer_ |  |  | Maximum: 43200 <br />Minimum: 900 <br />Optional: \{\} <br /> |
| `sessionPolicy` _string_ | SessionPolicy is an inline IAM policy JSON further scoping the session. |  | Optional: \{\} <br /> |


#### DevboxAgent



DevboxAgent declares one supported harness.



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[DevboxAgentType](#devboxagenttype)_ | Type of the harness. |  | Enum: [claude codex opencode gemini pi] <br />Required: \{\} <br /> |
| `default` _boolean_ | Default marks the agent used when a workbench doesn't pick one. |  | Optional: \{\} <br /> |
| `adapterVersion` _string_ | AdapterVersion pins the ACP adapter version. Defaults to the version shipped in the image. |  | Optional: \{\} <br /> |
| `models` _string array_ | Models is an allowlist of model ids. Empty allows every model the agent reports. |  | MaxItems: 64 <br />Optional: \{\} <br /> |
| `defaultModel` _string_ | DefaultModel is the model new sessions start on. |  | Optional: \{\} <br /> |
| `acpV2` _boolean_ | ACPV2 opts the harness into the ACP v2 protocol where the adapter supports it. |  | Optional: \{\} <br /> |


#### DevboxAgentStatus







_Appears in:_
- [DevboxRunnerStatus](#devboxrunnerstatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `type` _[DevboxAgentType](#devboxagenttype)_ |  |  | Enum: [claude codex opencode gemini pi] <br /> |
| `probeStatus` _string_ | ProbeStatus is OK, FAILED or MISSING. |  |  |
| `adapterVersion` _string_ |  |  | Optional: \{\} <br /> |
| `probeError` _string_ |  |  | Optional: \{\} <br /> |


#### DevboxAgentType

_Underlying type:_ _string_

DevboxAgentType is a coding-agent harness a devbox can run (section 4.2a).

_Validation:_
- Enum: [claude codex opencode gemini pi]

_Appears in:_
- [DevboxAgent](#devboxagent)
- [DevboxAgentStatus](#devboxagentstatus)

| Field | Description |
| --- | --- |
| `claude` |  |
| `codex` |  |
| `opencode` |  |
| `gemini` |  |
| `pi` |  |


#### DevboxAutonomy







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `default` _[DevboxAutonomyLevel](#devboxautonomylevel)_ | Default is the level new threads start at, lowered to max and to what the agent supports. Defaults to auto. |  | Enum: [manual auto full] <br />Optional: \{\} <br /> |
| `max` _[DevboxAutonomyLevel](#devboxautonomylevel)_ | Max is the highest level a thread can use. Defaults to auto. |  | Enum: [manual auto full] <br />Optional: \{\} <br /> |


#### DevboxAutonomyLevel

_Underlying type:_ _string_

DevboxAutonomyLevel is one of:
  - manual: every permission request goes to a human.
  - auto: the agent's own reviewer approves what it can (Claude's auto mode, Codex's guardian); the rest goes to
    a human.
  - full: everything is approved without asking.

_Validation:_
- Enum: [manual auto full]

_Appears in:_
- [DevboxAutonomy](#devboxautonomy)

| Field | Description |
| --- | --- |
| `manual` |  |
| `auto` |  |
| `full` |  |


#### DevboxAzureIdentity







_Appears in:_
- [DevboxCloudIdentity](#devboxcloudidentity)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tenantId` _string_ |  |  | Required: \{\} <br /> |
| `clientId` _string_ |  |  | Required: \{\} <br /> |


#### DevboxBrowser







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ |  |  | Optional: \{\} <br /> |


#### DevboxCapacityStatus



DevboxCapacityStatus reports how instances are sized from the WorkerPool and how the autoscaler sees it.



_Appears in:_
- [DevboxRunnerStatus](#devboxrunnerstatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `instancesPerWorker` _integer_ | InstancesPerWorker is how many instances one worker hosts at once. |  |  |
| `limitedBy` _string_ | LimitedBy is the worker resource (cpu, memory or disk) that bounds InstancesPerWorker. |  | Optional: \{\} <br /> |
| `instanceCPU` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | InstanceCPU and InstanceMemory are the limits each instance runs with. |  |  |
| `instanceMemory` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ |  |  |  |
| `instanceDisk` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | InstanceDisk is each instance's share of the worker's budgeted disk, when DiskSize is set. |  | Optional: \{\} <br /> |
| `workers` _integer_ | Workers are the managed pool's schedulable workers, DrainingWorkers those being removed. |  | Optional: \{\} <br /> |
| `drainingWorkers` _integer_ |  |  | Optional: \{\} <br /> |
| `runningInstances` _integer_ | RunningInstances are instances placed on the managed pool's schedulable workers. |  | Optional: \{\} <br /> |
| `additionalFreeInstances` _integer_ | AdditionalFreeInstances are the instance slots free on AdditionalPools. |  | Optional: \{\} <br /> |
| `desiredWorkers` _integer_ | DesiredWorkers is the autoscaler's target for the managed pool. |  | Optional: \{\} <br /> |
| `lastScaleTime` _[Time](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#time-v1-meta)_ |  |  | Optional: \{\} <br /> |


#### DevboxCloudIdentity



DevboxCloudIdentity is one named cloud identity. Exactly one provider must be set.



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | MaxLength: 63 <br />Pattern: `^[a-z0-9]([-a-z0-9]*[a-z0-9])?$` <br />Required: \{\} <br /> |
| `default` _boolean_ | Default marks the identity instances get when a workbench doesn't pick one. |  | Optional: \{\} <br /> |
| `aws` _[DevboxAWSIdentity](#devboxawsidentity)_ |  |  | Optional: \{\} <br /> |
| `gcp` _[DevboxGCPIdentity](#devboxgcpidentity)_ |  |  | Optional: \{\} <br /> |
| `azure` _[DevboxAzureIdentity](#devboxazureidentity)_ |  |  | Optional: \{\} <br /> |
| `extraHosts` _string array_ | ExtraHosts are API hosts allowlisted only when this identity is attached. |  | Optional: \{\} <br /> |


#### DevboxCloudProviders



DevboxCloudProviders enables egress to each cloud's API endpoints (see CloudProviderHosts).



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _boolean_ | AWS: the regional and global service endpoints under amazonaws.com and api.aws. |  | Optional: \{\} <br /> |
| `gcp` _boolean_ | GCP: the Google APIs under googleapis.com and Google's OAuth endpoint. |  | Optional: \{\} <br /> |
| `azure` _boolean_ | Azure: Resource Manager, Entra ID sign-in, Microsoft Graph, Key Vault and Storage. |  | Optional: \{\} <br /> |


#### DevboxECRRegistries



DevboxECRRegistries enables egress to private Amazon ECR registries. ECR hosts are regional, so each region
is listed. Pulling still needs credentials, such as an AWS cloud identity and `aws ecr get-login-password`.



_Appears in:_
- [DevboxOCIRegistries](#devboxociregistries)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regions` _string array_ | Regions opens, per region, the registry API (<account>.dkr.ecr.<region>.amazonaws.com), the ECR API<br />that issues login tokens, and the S3 bucket image layers download from. |  | MaxItems: 32 <br />Optional: \{\} <br />items:Pattern: ^[a-z]\{2\}(-[a-z]+)+-[0-9]+$ <br /> |


#### DevboxEnvVar







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | MaxLength: 256 <br />Pattern: `^[A-Za-z_][A-Za-z0-9_]*$` <br />Required: \{\} <br /> |
| `value` _string_ |  |  | Optional: \{\} <br /> |
| `valueFrom` _[DevboxEnvVarSource](#devboxenvvarsource)_ |  |  | Optional: \{\} <br /> |


#### DevboxEnvVarSource







_Appears in:_
- [DevboxEnvVar](#devboxenvvar)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `secretKeyRef` _[DevboxSecretKeySelector](#devboxsecretkeyselector)_ |  |  | Required: \{\} <br /> |


#### DevboxGCPIdentity







_Appears in:_
- [DevboxCloudIdentity](#devboxcloudidentity)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `workloadIdentityProvider` _string_ | WorkloadIdentityProvider is the full provider resource name<br />(projects/<n>/locations/global/workloadIdentityPools/<pool>/providers/<provider>). |  | Required: \{\} <br /> |
| `serviceAccount` _string_ | ServiceAccount is the email of the service account to impersonate. |  | Required: \{\} <br /> |


#### DevboxHTTPAllowlistEntry







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `host` _string_ | Host is a hostname or a *.suffix wildcard. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `port` _integer_ |  | 443 | Maximum: 65535 <br />Minimum: 1 <br />Optional: \{\} <br /> |
| `passthrough` _boolean_ | Passthrough tunnels TLS without interception (no credential injection or request authz). |  | Optional: \{\} <br /> |


#### DevboxHome



DevboxHome selects how instances store /home/dev.

With JuiceFS or ZeroFS, an instance's home is seeded from the golden boot's, so what the bootstrap script and
mise installed is there from the start. With JuiceFS, every snapshot also saves the home as a JuiceFS clone;
ZeroFS snapshots don't save the home yet. Starting an instance from a snapshot isn't supported for either:
Substrate can't restore a tag of a template with external volumes.



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `storage` _[DevboxHomeStorage](#devboxhomestorage)_ | Storage defaults to Snapshot. Changing it rolls a new revision, and instances moved to it start with a fresh<br />home. | Snapshot | Enum: [Snapshot JuiceFS ZeroFS] <br />Optional: \{\} <br /> |
| `size` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | Size is the most a JuiceFS or ZeroFS home may hold: a JuiceFS quota, or the size of the ZeroFS block device.<br />Defaults to spec.resources.disk. |  | Optional: \{\} <br /> |
| `storageClassName` _string_ | StorageClassName is the JuiceFS or ZeroFS StorageClass. Defaults to the agent-substrate chart's<br />devbox-juicefs or devbox-zerofs. |  | Optional: \{\} <br /> |


#### DevboxHomeStorage

_Underlying type:_ _string_

DevboxHomeStorage is where an instance's /home/dev lives.

_Validation:_
- Enum: [Snapshot JuiceFS ZeroFS]

_Appears in:_
- [DevboxHome](#devboxhome)
- [DevboxRevision](#devboxrevision)

| Field | Description |
| --- | --- |
| `Snapshot` | DevboxHomeSnapshot keeps the home on the instance's node and carries it in every snapshot.<br /> |
| `JuiceFS` | DevboxHomeJuiceFS keeps the home in the agent-substrate chart's JuiceFS filesystem (juicefs.enabled), mounted<br />wherever the instance runs, so snapshots carry only memory and moving node doesn't copy the home.<br /> |
| `ZeroFS` | DevboxHomeZeroFS keeps each home in its own ZeroFS filesystem in object storage, from the agent-substrate<br />chart's ZeroFS driver (zerofs.enabled): an ext4 block device that follows the instance from node to node, with<br />no metadata database. Snapshots carry only memory.<br /> |


#### DevboxIdlePolicy







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `activityWindow` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | ActivityWindow is how far back activity counts toward keeping an instance awake. | 2m | Optional: \{\} <br /> |
| `cpuThreshold` _string_ | CPUThreshold is the CPU utilization above which an instance counts as active, e.g. "5%". | 5% | Optional: \{\} <br />Pattern: `^([0-9]\|[1-9][0-9]\|100)(\.[0-9]+)?%$` <br /> |
| `gracePeriod` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | GracePeriod is how long an instance stays idle before it is suspended. | 5m | Optional: \{\} <br /> |
| `maxDeferral` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | MaxDeferral bounds how long agents can defer a suspension. | 12h | Optional: \{\} <br /> |
| `maxContinuousAwake` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | MaxContinuousAwake bounds how long an instance can stay awake. | 24h | Optional: \{\} <br /> |
| `completeAfter` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | CompleteAfter is how long a suspended instance is kept before it is completed. | 336h | Optional: \{\} <br /> |


#### DevboxImageUpdateMode

_Underlying type:_ _string_

DevboxImageUpdateMode controls whether the operator re-resolves spec.image.

_Validation:_
- Enum: [pinned poll]

_Appears in:_
- [DevboxImageUpdatePolicy](#devboximageupdatepolicy)

| Field | Description |
| --- | --- |
| `pinned` | DevboxImageUpdatePinned keeps the resolved digest until the spec changes.<br /> |
| `poll` | DevboxImageUpdatePoll re-resolves the tag every interval and rolls a new revision when the digest changes.<br /> |


#### DevboxImageUpdatePolicy







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `mode` _[DevboxImageUpdateMode](#devboximageupdatemode)_ | Mode is pinned or poll. |  | Enum: [pinned poll] <br />Optional: \{\} <br /> |
| `interval` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Interval between re-resolutions in poll mode. Defaults to 1h. |  | Optional: \{\} <br /> |


#### DevboxOCIRegistries



DevboxOCIRegistries enables egress to each container registry's API and blob hosts (see OCIRegistryHosts).



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `dockerHub` _boolean_ | DockerHub: docker.io, its auth service and its Cloudflare blob CDN. Unqualified image names resolve here. | true | Optional: \{\} <br /> |
| `github` _boolean_ | GitHub: ghcr.io and its blob host. | true | Optional: \{\} <br /> |
| `quay` _boolean_ | Quay: quay.io, its CDN and its S3 blob bucket. |  | Optional: \{\} <br /> |
| `google` _boolean_ | Google: Container Registry (gcr.io and its regional hosts) and Artifact Registry (*.pkg.dev). |  | Optional: \{\} <br /> |
| `microsoft` _boolean_ | Microsoft: the Microsoft Artifact Registry, mcr.microsoft.com, and its regional data endpoints. |  | Optional: \{\} <br /> |
| `kubernetes` _boolean_ | Kubernetes: registry.k8s.io and the Artifact Registry mirrors it redirects to. From AWS addresses it<br />redirects to regional S3 buckets instead, which need httpAllowlist entries. |  | Optional: \{\} <br /> |
| `ecr` _[DevboxECRRegistries](#devboxecrregistries)_ | ECR opens private Amazon ECR registries, for any account, in the listed regions. |  | Optional: \{\} <br /> |


#### DevboxPackageServers



DevboxPackageServers enables egress to each ecosystem's public registries (see PackageServerHosts).



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `go` _boolean_ | Go: the module proxy and checksum database, the storage its downloads redirect to, and Go releases. | true | Optional: \{\} <br /> |
| `rust` _boolean_ | Rust: crates.io and rustup. | true | Optional: \{\} <br /> |
| `javascript` _boolean_ | JavaScript: the npm and yarn registries, JSR, and the Node.js, Bun and Deno downloads. | true | Optional: \{\} <br /> |
| `java` _boolean_ | Java: Maven Central, Google's Maven repository, and the Gradle plugin portal and distributions. | true | Optional: \{\} <br /> |
| `elixir` _boolean_ | Elixir: hex.pm and its package and build repositories. | true | Optional: \{\} <br /> |
| `python` _boolean_ | Python: PyPI. | true | Optional: \{\} <br /> |
| `ruby` _boolean_ | Ruby: rubygems.org and Ruby releases. | true | Optional: \{\} <br /> |
| `php` _boolean_ | PHP: Packagist and Composer. | true | Optional: \{\} <br /> |
| `dotnet` _boolean_ | Dotnet: NuGet and .NET releases. | true | Optional: \{\} <br /> |
| `mise` _boolean_ | Mise: what `mise use` needs for languages and tools the image doesn't ship: mise's version and Java<br />metadata, GitHub releases (most tools are released there) and the other common release hosts. On boxes<br />without a GitHub SCM connection this opens github.com unauthenticated. | false | Optional: \{\} <br /> |


#### DevboxRepository



DevboxRepository is a repository the golden boot clones.



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL is the https clone URL, e.g. https://github.com/pluralsh/console.git. |  | Pattern: `^https://[^/]+/.+` <br />Required: \{\} <br /> |
| `branch` _string_ | Branch is checked out instead of the default branch. |  | Optional: \{\} <br /> |
| `description` _string_ | Description is shown to agents in the home's Project.md. |  | Optional: \{\} <br /> |


#### DevboxResources







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cpu` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | CPU limit per instance. When the WorkerPool has limits this is the minimum, and instances get an even share<br />of the worker's CPU. | 2 | Optional: \{\} <br /> |
| `memory` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | Memory limit per instance, a minimum in the same way as CPU. | 4Gi | Optional: \{\} <br /> |
| `disk` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | Disk is the size of the durable /home/dev workspace volume. Each instance slot is budgeted Disk plus Memory<br />for its own snapshot and Memory for each of the WorkerPool's SuspendedSnapshotsPerInstance. | 20Gi | Optional: \{\} <br /> |


#### DevboxRevision







_Appears in:_
- [DevboxRunnerStatus](#devboxrunnerstatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `revision` _integer_ |  |  |  |
| `name` _string_ | Name is the ActorTemplate name. |  |  |
| `hash` _string_ | Hash of the inputs that produced this revision. |  |  |
| `image` _string_ |  |  |  |
| `phase` _[DevboxRevisionPhase](#devboxrevisionphase)_ |  |  |  |
| `goldenTag` _string_ |  |  | Optional: \{\} <br /> |
| `homeStorage` _[DevboxHomeStorage](#devboxhomestorage)_ | HomeStorage is where this revision's template keeps /home/dev; unset means Snapshot. |  | Enum: [Snapshot JuiceFS ZeroFS] <br />Optional: \{\} <br /> |
| `message` _string_ |  |  | Optional: \{\} <br /> |
| `createdAt` _[Time](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#time-v1-meta)_ |  |  | Optional: \{\} <br /> |


#### DevboxRevisionPhase

_Underlying type:_ _string_

DevboxRevisionPhase is the lifecycle of one ActorTemplate revision.



_Appears in:_
- [DevboxRevision](#devboxrevision)

| Field | Description |
| --- | --- |
| `Building` | DevboxRevisionBuilding means the ActorTemplate exists and its golden snapshot is not ready yet.<br /> |
| `Probing` | DevboxRevisionProbing means the golden snapshot is ready and the agent probe is running.<br /> |
| `Ready` | DevboxRevisionReady means the revision passed the probe and may serve new instances.<br /> |
| `Failed` | DevboxRevisionFailed is terminal: the golden boot, image contract or agent probe failed.<br /> |
| `Retired` | DevboxRevisionRetired means a newer revision is current, or its golden boot lost its worker and it is rebuilt as<br />a new revision; the revision stays until nothing references it.<br /> |


#### DevboxRunner



DevboxRunner is the Schema for the devboxrunners API. It defines one kind of devbox
(image, agents, limits, egress) backed by a Substrate WorkerPool and ActorTemplate revisions.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `DevboxRunner` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[DevboxRunnerSpec](#devboxrunnerspec)_ |  |  |  |


#### DevboxRunnerBindings







_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings control who can attach this devbox to a workbench and start instances on it.<br />Only users and groups resolvable by userEmail or groupName apply. If none are set, console falls<br />back to its global create policy, which admins always pass. |  | Optional: \{\} <br /> |


#### DevboxRunnerSpec



DevboxRunnerSpec defines the desired state of DevboxRunner.



_Appears in:_
- [DevboxRunner](#devboxrunner)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of the Devbox in console. Defaults to metadata.name. |  | Optional: \{\} <br /> |
| `image` _string_ | Image is the devbox image. Defaults to ghcr.io/pluralsh/devbox-fat at the operator's version;<br />ghcr.io/pluralsh/devbox-minimal is the lean alternative. Custom images must meet the image<br />contract (sh.plural.devbox/contract=v1 label, devbox-daemon entrypoint, UID 1000) and are<br />normally built FROM one of these. |  | Optional: \{\} <br /> |
| `imageUpdatePolicy` _[DevboxImageUpdatePolicy](#devboximageupdatepolicy)_ | ImageUpdatePolicy controls re-resolution of spec.image. Defaults to pinned for digest<br />references and to poll every hour for tag references. |  | Optional: \{\} <br /> |
| `imagePullSecrets` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core) array_ | ImagePullSecrets are dockerconfigjson secrets used only to resolve spec.image to a digest.<br />Nodes pull with their own credentials (Substrate's image credential provider). |  | Optional: \{\} <br /> |
| `agents` _[DevboxAgent](#devboxagent) array_ | Agents are the coding-agent harnesses this devbox supports. Exactly one must be the default. |  | MaxItems: 5 <br />MinItems: 1 <br />Required: \{\} <br /> |
| `resources` _[DevboxResources](#devboxresources)_ | Resources are the per-instance limits. |  | Optional: \{\} <br /> |
| `home` _[DevboxHome](#devboxhome)_ | Home selects where instances keep /home/dev. |  | Optional: \{\} <br /> |
| `workerPool` _[DevboxWorkerPool](#devboxworkerpool)_ | WorkerPool sizes the Substrate WorkerPool backing this runner. |  | Optional: \{\} <br /> |
| `scmConnections` _string array_ | ScmConnections are names of console SCM connections instances may use for git credentials. |  | Optional: \{\} <br /> |
| `bindings` _[DevboxRunnerBindings](#devboxrunnerbindings)_ | Bindings control who can use this devbox in console. |  | Optional: \{\} <br /> |
| `allowedRepositories` _string array_ | AllowedRepositories the git repositories allowed to be used with this devbox,<br />with the same semantics as AgentRuntime.spec.allowedRepositories. |  | Optional: \{\} <br /> |
| `httpAllowlist` _[DevboxHTTPAllowlistEntry](#devboxhttpallowlistentry) array_ | HTTPAllowlist are extra hosts instances may reach, on top of the built-in ones. |  | MaxItems: 256 <br />Optional: \{\} <br /> |
| `packageServers` _[DevboxPackageServers](#devboxpackageservers)_ | PackageServers opens egress to public package registries by ecosystem. Go, Rust, JavaScript, Java, Elixir<br />and Python are on unless set to false. | \{  \} | Optional: \{\} <br /> |
| `cloudProviders` _[DevboxCloudProviders](#devboxcloudproviders)_ | CloudProviders opens egress to cloud providers' API endpoints. A provider is on when the runner has a cloud<br />identity for it, unless set to false. | \{  \} | Optional: \{\} <br /> |
| `ociRegistries` _[DevboxOCIRegistries](#devboxociregistries)_ | OCIRegistries opens egress to public container registries, for pulling images with podman, docker,<br />crane or helm. Docker Hub and GitHub Container Registry are on unless set to false. | \{  \} | Optional: \{\} <br /> |
| `env` _[DevboxEnvVar](#devboxenvvar) array_ | Env are environment variables for every process the box starts: agents, terminals and git. Plain values<br />are part of the template, so changing them rolls a new revision. Secret values are read when an instance<br />wakes and are never baked into the template, the golden snapshot or the workspace volume. |  | MaxItems: 128 <br />Optional: \{\} <br /> |
| `browser` _[DevboxBrowser](#devboxbrowser)_ | Browser enables the in-box headless browser. |  | Optional: \{\} <br /> |
| `bootstrapScript` _string_ | BootstrapScript runs once during the golden boot, from the home directory and after repositories are cloned<br />and mise has installed its tools, so its results are baked into the snapshot. It runs with `bash -e` unless<br />it starts with a #! line, and a failure fails the revision; its output is in ~/.plural/golden.log. |  | Optional: \{\} <br /> |
| `mise` _[MiseSpec](#misespec)_ | Mise is an inline mise.toml installed during the golden boot. |  | Optional: \{\} <br /> |
| `repositories` _[DevboxRepository](#devboxrepository) array_ | Repositories are cloned into the home during the golden boot, with the box's SCM connections, so every<br />instance starts with them checked out, along with whatever bootstrapScript builds in them. Each instance<br />fetches them again when it first boots. When allowedRepositories is set, each must be on it. |  | MaxItems: 32 <br />Optional: \{\} <br /> |
| `bootstrapTimeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | BootstrapTimeout bounds the golden boot when it has work to do (repositories, mise or bootstrapScript):<br />past it, Substrate crashes the boot and the revision fails. It's also how long a waking instance may take to<br />report ready. Defaults to 30m. |  | Optional: \{\} <br /> |
| `idlePolicy` _[DevboxIdlePolicy](#devboxidlepolicy)_ | IdlePolicy bounds idle suspension. Workbenches can only lower these values. |  | Optional: \{\} <br /> |
| `autonomy` _[DevboxAutonomy](#devboxautonomy)_ | Autonomy sets how agents' permission requests are answered: the level new threads start at and the highest<br />level users can switch a thread to. Defaults to auto for both, so full autonomy needs an explicit max: full. |  | Optional: \{\} <br /> |
| `cloudIdentities` _[DevboxCloudIdentity](#devboxcloudidentity) array_ | CloudIdentities are named cloud identities instances can assume. At most one is the default. |  | MaxItems: 16 <br />Optional: \{\} <br /> |
| `substrate` _[DevboxSubstrate](#devboxsubstrate)_ | Substrate overrides where the operator reaches the Substrate API and the identity it calls it as. The<br />operator mints the token and reads the CA bundle from the cluster when it reconciles the runner, so<br />nothing is mounted into the operator. |  | Optional: \{\} <br /> |




#### DevboxSandboxClass

_Underlying type:_ _string_

DevboxSandboxClass is the Substrate sandbox class backing the runner's WorkerPool.

_Validation:_
- Enum: [gvisor microvm]

_Appears in:_
- [DevboxWorkerPool](#devboxworkerpool)

| Field | Description |
| --- | --- |
| `gvisor` |  |
| `microvm` |  |


#### DevboxSecretKeySelector







_Appears in:_
- [DevboxEnvVarSource](#devboxenvvarsource)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespace` _string_ | Namespace of the Secret; defaults to the operator's namespace. |  | Optional: \{\} <br /> |
| `name` _string_ |  |  | MinLength: 1 <br />Required: \{\} <br /> |
| `key` _string_ |  |  | MinLength: 1 <br />Required: \{\} <br /> |


#### DevboxSubstrate



DevboxSubstrate locates the Substrate API credentials the operator loads for a runner.



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `address` _string_ | Address of ate-api-server. Defaults to the deployment-operator chart's devboxes.substrate.apiAddress. |  | Optional: \{\} <br /> |
| `serviceAccountName` _string_ | ServiceAccountName is a ServiceAccount in the operator's namespace that the operator mints Substrate API<br />tokens for. It must be a Substrate global owner, since it creates atespaces and drains workers. Defaults<br />to the operator's own ServiceAccount. |  | Optional: \{\} <br /> |
| `caSignerName` _string_ | CASignerName is the signer of the ClusterTrustBundles that verify ate-api-server's serving certificate.<br />Defaults to servicedns.podcert.ate.dev/identity. |  | Optional: \{\} <br /> |


#### DevboxWorkerAutoscaling







_Appears in:_
- [DevboxWorkerPool](#devboxworkerpool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `minReplicas` _integer_ |  | 1 | Minimum: 0 <br />Optional: \{\} <br /> |
| `maxReplicas` _integer_ |  |  | Minimum: 1 <br />Required: \{\} <br /> |
| `spareInstances` _integer_ | SpareInstances is how many free instance slots are kept across the runner's pools, so a resume doesn't<br />wait for a new worker (and node) to start. | 1 | Minimum: 0 <br />Optional: \{\} <br /> |
| `scaleDownDelay` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | ScaleDownDelay is how long after the last scaling event idle workers are kept before being removed. | 10m | Optional: \{\} <br /> |


#### DevboxWorkerPool



DevboxWorkerPool is the Substrate WorkerPool the operator runs for the runner. Each worker is expected to have a
node to itself (requests close to the node's allocatable), so the pool's limits and DiskSize describe one node.

Instances are sized from the pool: the instances one worker hosts is the most that fit its CPU and memory
limits and its DiskSize, given spec.resources as each instance's minimum, and every instance then gets an even
share of the worker's CPU and memory. Substrate places instances by those limits, so a worker never hosts more
instances than its disk was budgeted for.



_Appears in:_
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `replicas` _integer_ | Replicas is the number of Substrate workers. Ignored when Autoscaling is set. | 1 | Minimum: 0 <br />Optional: \{\} <br /> |
| `autoscaling` _[DevboxWorkerAutoscaling](#devboxworkerautoscaling)_ | Autoscaling lets the operator size the pool to demand: it keeps SpareInstances free instance slots and<br />removes only workers that host no instance. |  | Optional: \{\} <br /> |
| `diskSize` _[Quantity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#quantity-resource-api)_ | DiskSize is the size of the disk backing /var/lib/ate on each worker's node (e.g. the devbox-nodes<br />catalog's data disk). Unset leaves disk out of instance sizing. |  | Optional: \{\} <br /> |
| `diskReservePercent` _integer_ | DiskReservePercent of DiskSize is kept for the image cache and snapshot staging rather than budgeted to<br />instances. | 20 | Maximum: 90 <br />Minimum: 0 <br />Optional: \{\} <br /> |
| `suspendedSnapshotsPerInstance` _integer_ | SuspendedSnapshotsPerInstance is how many suspended instances' snapshots each instance slot budgets disk<br />for. A suspended instance frees its slot at once, but its snapshot stays on the node until Substrate<br />detaches it (30 minutes by default), so heavy suspend and resume churn stacks snapshots on a full worker. | 1 | Maximum: 10 <br />Minimum: 0 <br />Optional: \{\} <br /> |
| `additionalPools` _[DevboxWorkerPoolRef](#devboxworkerpoolref) array_ | AdditionalPools are existing Substrate WorkerPools this runner's instances may also run on. The operator<br />labels each with the runner's worker selector and removes the label when the pool leaves this list. They<br />should run the same sandbox class as the runner, and their free capacity counts toward SpareInstances. |  | Optional: \{\} <br /> |
| `maxInstances` _integer_ | MaxInstances caps concurrently running instances in console. Unset means unlimited. |  | Minimum: 1 <br />Optional: \{\} <br /> |
| `sandboxClass` _[DevboxSandboxClass](#devboxsandboxclass)_ | SandboxClass is the isolation technology. Immutable once the WorkerPool exists. | gvisor | Enum: [gvisor microvm] <br />Optional: \{\} <br /> |
| `sandboxConfig` _string_ | SandboxConfig names a Substrate sandbox class ConfigMap (WorkerPool sandboxClasses[].configRef). |  | Optional: \{\} <br /> |
| `workerImage` _string_ | WorkerImage overrides the Substrate worker image configured on the operator for the sandbox class. |  | Optional: \{\} <br /> |
| `resources` _[ResourceRequirements](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#resourcerequirements-v1-core)_ | Resources of each worker pod. |  | Optional: \{\} <br /> |
| `nodeSelector` _object (keys:string, values:string)_ |  |  | Optional: \{\} <br /> |
| `nodeAffinity` _[NodeAffinity](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#nodeaffinity-v1-core)_ | NodeAffinity scheduling rules for the worker pods (WorkerPool template.nodeAffinity). |  | Optional: \{\} <br /> |
| `tolerations` _[Toleration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#toleration-v1-core) array_ |  |  | Optional: \{\} <br /> |
| `podAnnotations` _object (keys:string, values:string)_ | PodAnnotations are added to the worker pods, e.g. karpenter.sh/do-not-disrupt. Keys in the ate.dev domain<br />are reserved by Substrate. |  | Optional: \{\} <br /> |
| `priorityClassName` _string_ |  |  | Optional: \{\} <br /> |


#### DevboxWorkerPoolRef







_Appears in:_
- [DevboxWorkerPool](#devboxworkerpool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | MinLength: 1 <br />Required: \{\} <br /> |
| `namespace` _string_ | Namespace defaults to the namespace the operator runs devbox WorkerPools in. |  | Optional: \{\} <br /> |


#### ExaConnection







_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ | URL is the Exa API base URL. Defaults to https://api.exa.ai when unset. |  | Optional: \{\} <br /> |
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | ApiKeySecretRef references a Secret containing the Exa API key. |  | Optional: \{\} <br /> |
| `proxyUrl` _string_ | ProxyURL is an HTTP proxy URL used for Exa API requests. |  | Optional: \{\} <br /> |




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
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | APIKeySecretRef references a Secret containing the Gemini API key.<br />Optional when aiProxy is enabled; authentication uses the Console deploy token instead. |  | Optional: \{\} <br /> |
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


#### ImageWarmer



ImageWarmer is the Schema for the imagewarmers API.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ImageWarmer` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ImageWarmerSpec](#imagewarmerspec)_ |  |  |  |


#### ImageWarmerSpec



ImageWarmerSpec defines an image that should periodically be pulled onto
every selected node.



_Appears in:_
- [ImageWarmer](#imagewarmer)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cron` _string_ | Cron is a standard five-field cron expression controlling how often the<br />image is refreshed. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `image` _string_ | Image is the OCI image to warm. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `template` _[PodTemplateSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#podtemplatespec-v1-core)_ | Template optionally overrides the secure default warmer pod template. |  | Optional: \{\} <br /> |
| `selector` _[LabelSelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#labelselector-v1-meta)_ | Selector restricts warming to nodes matching this label selector. |  | Optional: \{\} <br /> |




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


#### InsightEngine

_Underlying type:_ _string_

InsightEngine is the language an insight priority script is written in.

_Validation:_
- Enum: [python]

_Appears in:_
- [CustomInsightPrioritySpec](#custominsightpriorityspec)

| Field | Description |
| --- | --- |
| `python` | InsightEnginePython evaluates the script as sandboxed Python.<br /> |


#### InsightEvaluation



InsightEvaluation is the outcome of the last time the script ran.



_Appears in:_
- [CustomInsightPriorityStatus](#custominsightprioritystatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `time` _[Time](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#time-v1-meta)_ | Time the script last ran with a different outcome than the one before. |  |  |
| `matched` _integer_ | Matched is the number of failing objects the script owned. |  |  |
| `overridden` _integer_ | Overridden is the number of objects the script gave a priority. |  |  |
| `ignored` _integer_ | Ignored is the number of objects the script ignored. |  |  |
| `durationMs` _integer_ | DurationMs is how long the script took. |  |  |


#### InsightTarget



InsightTarget selects the failing objects a script is responsible for. An object has to match every
non-empty field, so an empty target matches everything.



_Appears in:_
- [CustomInsightPrioritySpec](#custominsightpriorityspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `kinds` _[InsightTargetKind](#insighttargetkind) array_ | Kinds the script is responsible for. |  | Optional: \{\} <br /> |
| `namespaces` _string array_ | Namespaces the script is responsible for. Cluster scoped objects only match when this is empty. |  | Optional: \{\} <br /> |
| `labelSelector` _[LabelSelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#labelselector-v1-meta)_ | LabelSelector selects objects by their labels. |  | Optional: \{\} <br /> |


#### InsightTargetKind



InsightTargetKind selects objects by kind.



_Appears in:_
- [InsightTarget](#insighttarget)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `group` _string_ | Group of the kind, empty for the core group. |  | Optional: \{\} <br /> |
| `version` _string_ | Version of the kind, any version matches when empty. |  | Optional: \{\} <br /> |
| `kind` _string_ | Kind of the objects, for example StatefulSet. |  | MinLength: 1 <br /> |


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
| `provider` _[CostProvider](#costprovider)_ | Provider selects which cost backend to query. Defaults to Kubecost. | Kubecost | Enum: [Kubecost OpenCost] <br />Optional: \{\} <br /> |
| `interval` _string_ |  | 1h | Optional: \{\} <br /> |
| `kubecostServiceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | KubecostServiceRef points at the cost analyzer Service. When omitted, defaults<br />are chosen from provider: kubecost-cost-analyzer/kubecost or opencost/opencost. |  | Optional: \{\} <br /> |
| `kubecostPort` _integer_ |  |  | Optional: \{\} <br /> |
| `recommendationThreshold` _string_ | RecommendationThreshold float value for example: `1.2 or 0.001` |  |  |
| `recommendationsSettings` _[RecommendationsSettings](#recommendationssettings)_ |  |  | Optional: \{\} <br /> |


#### MCPServer



MCPServer is a remote MCP server exposed to agent runtimes.



_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is the MCP server identifier used by the coding agent. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `url` _string_ | URL is the remote streamable HTTP MCP endpoint. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `allowedTools` _string array_ | AllowedTools is an optional allowlist of tool names from this server.<br />When omitted or empty, all tools advertised by the server are exposed. |  | Optional: \{\} <br /> |
| `headers` _[MCPServerHeader](#mcpserverheader) array_ | Headers are HTTP headers sent with requests to this MCP server.<br />Each header must set exactly one of value or valueFrom. |  | Optional: \{\} <br /> |


#### MCPServerHeader



MCPServerHeader is an HTTP header for a remote MCP server.



_Appears in:_
- [MCPServer](#mcpserver)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is the HTTP header name. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `value` _string_ | Value is a literal header value. |  | Optional: \{\} <br /> |
| `valueFrom` _[EnvVarSource](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#envvarsource-v1-core)_ | ValueFrom sources the header value the same way as a pod env var. |  | Optional: \{\} <br /> |


#### MetricsAggregate



MetricsAggregate





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `MetricsAggregate` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |




#### MiseSpec



MiseSpec is an inline mise.toml used for unattended bootstrap.
See https://mise.jdx.dev/bootstrap.html



_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)
- [DevboxRunnerSpec](#devboxrunnerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `config` _string_ | Config is the contents of a mise.toml. |  | Optional: \{\} <br /> |


#### OpenCodeConfig



OpenCodeConfig contains configuration for the OpenCode CLI runtime.



_Appears in:_
- [AgentRuntimeConfig](#agentruntimeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `openaiCompatible` _[OpenCodeOpenAICompatibleConfig](#opencodeopenaicompatibleconfig)_ | OpenAICompatible configures a custom OpenAI-compatible provider block in opencode.json.<br />When set (and aiProxy is false), provider and endpoint on this struct are ignored in favor<br />of the nested openaiCompatible fields. |  | Optional: \{\} <br /> |
| `provider` _string_ | Provider is the OpenCode provider id from https://models.dev (for example openai, anthropic,<br />amazon-bedrock, google-vertex, google). Optional.<br />When the parent AgentRuntime has spec.aiProxy enabled, the harness ignores this field and<br />autowires provider "plural", routing requests through the Console AI proxy at /ext/ai/v1<br />using the deploy token, which the in-pod mcpserver sidecar adds. Set<br />spec.config.opencode.model to a bare model id; the harness<br />prefixes it for proxy routing based on runtime type (for example gpt-5.4 -> openai/gpt-5.4).<br />When aiProxy is false, this selects the native OpenCode provider block; credentials come from<br />tokenSecretRef or the provider's usual environment variables. Defaults to plural when omitted.<br />Use exact models.dev slugs (for example amazon-bedrock, google-vertex, google). |  | MaxLength: 128 <br />Optional: \{\} <br /> |
| `endpoint` _string_ | Endpoint optionally overrides the provider baseURL in opencode.json.<br />When omitted, the harness omits baseURL so OpenCode uses the models.dev default for the provider. |  | Optional: \{\} <br /> |
| `model` _string_ | Model is the LLM model to use. |  | Optional: \{\} <br /> |
| `method` _[OpenAiMethod](#openaimethod)_ | Method configures which OpenAI API OpenCode should use.<br />CHAT selects @ai-sdk/openai-compatible and forces /chat/completions.<br />RESPONSES selects @ai-sdk/openai and forces /responses.<br />AUTO preserves the provider default. |  | Enum: [CHAT RESPONSES AUTO] <br />Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef references a Secret containing the API token for OpenCode.<br />Optional when aiProxy is enabled; authentication uses the Console deploy token instead. |  | Optional: \{\} <br /> |
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
| `openaiCompatible` _boolean_ | OpenAICompatible is true when spec.config.opencode.openaiCompatible was set on the AgentRuntime. |  |  |
| `provider` _string_ | Provider is the OpenCode provider id from https://models.dev. |  |  |
| `endpoint` _string_ | Endpoint API endpoint for the OpenCode service. |  |  |
| `model` _string_ | Model is the LLM model to use. |  |  |
| `method` _[OpenAiMethod](#openaimethod)_ | Method configures which OpenAI API OpenCode should use. |  |  |
| `token` _string_ | Token is the raw API token for OpenCode. |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single opencode run invocation. |  | Optional: \{\} <br /> |


#### OpenCodeOpenAICompatibleConfig



OpenCodeOpenAICompatibleConfig configures a custom OpenAI-compatible API provider in opencode.json.
Use this for endpoints that are not listed on https://models.dev (for example LiteLLM, vLLM,
or a private gateway).

When set and the parent AgentRuntime has spec.aiProxy false, spec.config.opencode.provider and
spec.config.opencode.endpoint are ignored in favor of this block.



_Appears in:_
- [OpenCodeConfig](#opencodeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `endpoint` _string_ | Endpoint is the OpenAI-compatible API base URL (for example https://litellm.example/v1). |  | MinLength: 1 <br />Required: \{\} <br /> |
| `model` _string_ | Model is the model id exposed by that endpoint. |  | Optional: \{\} <br /> |
| `tokenSecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | TokenSecretRef references a Secret containing the API key for the endpoint. |  | Optional: \{\} <br /> |


#### PiConfig



PiConfig configures the Pi coding-agent CLI runtime.



_Appears in:_
- [AgentRuntimeConfig](#agentruntimeconfig)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKeySecretRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | APIKeySecretRef references an API key. Optional with aiProxy enabled. |  | Optional: \{\} <br /> |
| `provider` _string_ | Provider is Pi's provider id. Defaults to openai. |  | Optional: \{\} <br /> |
| `model` _string_ | Model is the model id to use. |  | Optional: \{\} <br /> |
| `method` _[OpenAiMethod](#openaimethod)_ | Method configures which OpenAI API Pi should use.<br />CHAT selects openai-completions and forces /chat/completions.<br />RESPONSES selects openai-responses and forces /responses.<br />AUTO preserves the current openai-responses default. |  | Enum: [CHAT RESPONSES AUTO] <br />Optional: \{\} <br /> |
| `endpoint` _string_ | Endpoint overrides the OpenAI-compatible provider base URL. |  | Optional: \{\} <br /> |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ | Timeout bounds a single Pi invocation. |  | Optional: \{\} <br /> |


#### PiConfigRaw



PiConfigRaw contains resolved credentials and configuration for Pi.



_Appears in:_
- [AgentRuntimeConfigRaw](#agentruntimeconfigraw)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiKey` _string_ |  |  |  |
| `provider` _string_ |  |  |  |
| `model` _string_ |  |  |  |
| `method` _[OpenAiMethod](#openaimethod)_ |  |  |  |
| `endpoint` _string_ |  |  |  |
| `timeout` _[Duration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#duration-v1-meta)_ |  |  |  |


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


#### RepositoryImagePrewarm



RepositoryImagePrewarm configures periodic repository image warming.



_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cron` _string_ | Cron is a standard five-field cron expression controlling how often the<br />repository image is refreshed. |  | MinLength: 1 <br />Required: \{\} <br /> |
| `template` _[PodTemplateSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#podtemplatespec-v1-core)_ | Template optionally overrides the secure default warmer pod template. |  | Optional: \{\} <br /> |
| `selector` _[LabelSelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#labelselector-v1-meta)_ | Selector restricts warming to nodes matching this label selector. |  | Optional: \{\} <br /> |


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
- [AgentRuntimeStatus](#agentruntimestatus)
- [DevboxRunnerStatus](#devboxrunnerstatus)
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




#### WorkbenchMCPCategory

_Underlying type:_ _string_

WorkbenchMCPCategory is a workbench tool category accepted by the Console MCP endpoint.

_Validation:_
- Enum: [metrics logs integration ticketing traces error_tracking infrastructure search scm chat function coding verification observability]

_Appears in:_
- [WorkbenchMCPConfig](#workbenchmcpconfig)

| Field | Description |
| --- | --- |
| `metrics` |  |
| `logs` |  |
| `integration` |  |
| `ticketing` |  |
| `traces` |  |
| `error_tracking` |  |
| `infrastructure` |  |
| `search` |  |
| `scm` |  |
| `chat` |  |
| `function` |  |
| `coding` |  |
| `verification` |  |
| `observability` |  |


#### WorkbenchMCPConfig







_Appears in:_
- [AgentRuntimeSpec](#agentruntimespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `enabled` _boolean_ | Enabled controls whether workbench tools are available to coding agents. | false |  |
| `categories` _[WorkbenchMCPCategory](#workbenchmcpcategory) array_ | Categories limits the exposed workbench tools. When omitted, the default<br />set is metrics, logs, traces, ticketing, search, scm, and infrastructure. |  | Enum: [metrics logs integration ticketing traces error_tracking infrastructure search scm chat function coding verification observability] <br />Optional: \{\} <br /> |


