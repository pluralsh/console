defmodule Devbox.V1.HealthRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HealthRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.HealthResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HealthResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :ready, 1, type: :bool
  field :status, 2, type: :string
  field :version, 3, type: :string
  field :boot_id, 4, type: :string, json_name: "bootId"
  field :restored, 5, type: :bool
  field :workspace_hydrated, 6, type: :bool, json_name: "workspaceHydrated"
end

defmodule Devbox.V1.HarnessEndpoints do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HarnessEndpoints",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :console_url, 1, type: :string, json_name: "consoleUrl"
  field :ai_proxy_url, 2, type: :string, json_name: "aiProxyUrl"
  field :workbench_mcp_url, 3, type: :string, json_name: "workbenchMcpUrl"
  field :devbox_mcp_url, 4, type: :string, json_name: "devboxMcpUrl"
  field :sandbox_credentials_url, 5, type: :string, json_name: "sandboxCredentialsUrl"
end

defmodule Devbox.V1.InitializeRequest.EnvEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InitializeRequest.EnvEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Devbox.V1.InitializeRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InitializeRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :devbox_id, 2, type: :string, json_name: "devboxId"
  field :workbench_id, 3, type: :string, json_name: "workbenchId"
  field :owner, 4, type: Devbox.V1.Principal
  field :agent, 5, type: Devbox.V1.AgentType, enum: true
  field :model, 6, type: :string

  field :config_options, 7,
    repeated: true,
    type: Devbox.V1.ConfigOptionSetting,
    json_name: "configOptions"

  field :agents, 8, repeated: true, type: Devbox.V1.AgentLaunch
  field :repositories, 9, repeated: true, type: Devbox.V1.RepositorySpec
  field :first_thread_id, 10, type: :string, json_name: "firstThreadId"
  field :first_thread_title, 11, type: :string, json_name: "firstThreadTitle"
  field :idle_policy, 12, type: Devbox.V1.IdlePolicy, json_name: "idlePolicy"
  field :max_running_threads, 13, type: :int32, json_name: "maxRunningThreads"
  field :leases, 14, repeated: true, type: Devbox.V1.Lease
  field :lease_generation, 15, type: :uint64, json_name: "leaseGeneration"

  field :cloud_identities, 16,
    repeated: true,
    type: Devbox.V1.CloudIdentity,
    json_name: "cloudIdentities"

  field :endpoints, 17, type: Devbox.V1.HarnessEndpoints
  field :restored_from_snapshot, 18, type: :bool, json_name: "restoredFromSnapshot"

  field :restore_fidelity, 19,
    type: Devbox.V1.SnapshotFidelity,
    json_name: "restoreFidelity",
    enum: true

  field :request_token_jwks, 20, type: :bytes, json_name: "requestTokenJwks"
  field :env, 21, repeated: true, type: Devbox.V1.InitializeRequest.EnvEntry, map: true
  field :autonomy, 22, type: Devbox.V1.AutonomyPolicy
  field :decision_review, 23, type: :bool, json_name: "decisionReview"
end

defmodule Devbox.V1.InitializeResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InitializeResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :info, 1, type: Devbox.V1.DaemonInfo
  field :already_initialized, 2, type: :bool, json_name: "alreadyInitialized"
end

defmodule Devbox.V1.GetInfoRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetInfoRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.DaemonInfo do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DaemonInfo",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :version, 1, type: :string
  field :contract_version, 2, type: :string, json_name: "contractVersion"
  field :boot_id, 3, type: :string, json_name: "bootId"
  field :started_at, 4, type: Google.Protobuf.Timestamp, json_name: "startedAt"
  field :instance_id, 5, type: :string, json_name: "instanceId"
  field :agents, 6, repeated: true, type: Devbox.V1.AgentCatalogEntry
  field :connections, 7, repeated: true, type: Devbox.V1.AgentConnection
  field :head_offset, 8, type: :uint64, json_name: "headOffset"
  field :acked_offset, 9, type: :uint64, json_name: "ackedOffset"
end

defmodule Devbox.V1.AgentProbeSpec do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AgentProbeSpec",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :type, 1, type: Devbox.V1.AgentType, enum: true
  field :is_default, 2, type: :bool, json_name: "isDefault"
  field :adapter_version, 3, type: :string, json_name: "adapterVersion"
  field :models, 4, repeated: true, type: :string
  field :default_model, 5, type: :string, json_name: "defaultModel"
  field :acp_v2, 6, type: :bool, json_name: "acpV2"
end

defmodule Devbox.V1.ProbeAgentsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ProbeAgentsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :agents, 1, repeated: true, type: Devbox.V1.AgentProbeSpec
  field :endpoints, 2, type: Devbox.V1.HarnessEndpoints
end

defmodule Devbox.V1.ProbeAgentsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ProbeAgentsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :agents, 1, repeated: true, type: Devbox.V1.AgentCatalogEntry
end

defmodule Devbox.V1.PrepareSuspendRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PrepareSuspendRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :reason, 1, type: Devbox.V1.SuspendReason, enum: true
  field :shared_snapshot, 2, type: :bool, json_name: "sharedSnapshot"
end

defmodule Devbox.V1.PrepareSuspendResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PrepareSuspendResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :settled_offset, 1, type: :uint64, json_name: "settledOffset"

  field :stopped_agents, 2,
    repeated: true,
    type: Devbox.V1.AgentType,
    json_name: "stoppedAgents",
    enum: true
end

defmodule Devbox.V1.SubscribeEventsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SubscribeEventsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :from_offset, 1, type: :uint64, json_name: "fromOffset"
end

defmodule Devbox.V1.DaemonEvent do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DaemonEvent",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :event, 0

  field :offset, 1, type: :uint64
  field :emitted_at, 2, type: Google.Protobuf.Timestamp, json_name: "emittedAt"
  field :delta, 11, type: Devbox.V1.Delta, oneof: 0
  field :session, 12, type: Devbox.V1.Session, oneof: 0
  field :interaction, 13, type: Devbox.V1.Interaction, oneof: 0
  field :aggregate, 14, type: Devbox.V1.InstanceAggregate, oneof: 0
  field :idle_state, 15, type: Devbox.V1.IdleState, json_name: "idleState", oneof: 0

  field :suspend_requested, 16,
    type: Devbox.V1.SuspendRequested,
    json_name: "suspendRequested",
    oneof: 0

  field :condition, 17, type: Devbox.V1.DaemonCondition, oneof: 0
  field :heartbeat, 18, type: Devbox.V1.DaemonHeartbeat, oneof: 0
end

defmodule Devbox.V1.SuspendRequested do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SuspendRequested",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :reason, 1, type: Devbox.V1.SuspendReason, enum: true
  field :idle_since, 2, type: Google.Protobuf.Timestamp, json_name: "idleSince"
  field :settled_offset, 3, type: :uint64, json_name: "settledOffset"
end

defmodule Devbox.V1.DaemonCondition do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DaemonCondition",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :type, 1, type: :string
  field :severity, 2, type: :string
  field :message, 3, type: :string
  field :error, 4, type: Devbox.V1.ErrorDetail
  field :active, 5, type: :bool
end

defmodule Devbox.V1.DaemonHeartbeat do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DaemonHeartbeat",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :head_offset, 1, type: :uint64, json_name: "headOffset"
  field :idle, 2, type: Devbox.V1.IdleState
end

defmodule Devbox.V1.AckEventsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AckEventsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :offset, 1, type: :uint64
end

defmodule Devbox.V1.AckEventsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AckEventsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :acked_offset, 1, type: :uint64, json_name: "ackedOffset"
end

defmodule Devbox.V1.GetIdleStateRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetIdleStateRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.PushCredentialRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PushCredentialRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :credential, 1, type: Devbox.V1.InstanceCredential
end

defmodule Devbox.V1.PushCredentialResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PushCredentialResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :applied, 1, type: :bool
end

defmodule Devbox.V1.Daemon.Service do
  @moduledoc false

  use GRPC.Service, name: "devbox.v1.Daemon", protoc_gen_elixir_version: "0.16.0"

  rpc :Health, Devbox.V1.HealthRequest, Devbox.V1.HealthResponse

  rpc :Initialize, Devbox.V1.InitializeRequest, Devbox.V1.InitializeResponse

  rpc :GetInfo, Devbox.V1.GetInfoRequest, Devbox.V1.DaemonInfo

  rpc :ProbeAgents, Devbox.V1.ProbeAgentsRequest, Devbox.V1.ProbeAgentsResponse

  rpc :PrepareSuspend, Devbox.V1.PrepareSuspendRequest, Devbox.V1.PrepareSuspendResponse

  rpc :SubscribeEvents, Devbox.V1.SubscribeEventsRequest, stream(Devbox.V1.DaemonEvent)

  rpc :AckEvents, Devbox.V1.AckEventsRequest, Devbox.V1.AckEventsResponse

  rpc :GetTimeline, Devbox.V1.GetTimelineRequest, Devbox.V1.GetTimelineResponse

  rpc :GetSessions, Devbox.V1.GetSessionsRequest, Devbox.V1.GetSessionsResponse

  rpc :CreateThread, Devbox.V1.CreateThreadRequest, Devbox.V1.ThreadResponse

  rpc :ListThreads, Devbox.V1.ListThreadsRequest, Devbox.V1.ListThreadsResponse

  rpc :ImportThread, Devbox.V1.ImportThreadRequest, Devbox.V1.ThreadResponse

  rpc :ResumeThread, Devbox.V1.ResumeThreadRequest, Devbox.V1.ThreadResponse

  rpc :CloseThread, Devbox.V1.ThreadActionRequest, Devbox.V1.ThreadResponse

  rpc :DeleteThread, Devbox.V1.ThreadActionRequest, Devbox.V1.DeleteThreadResponse

  rpc :ForkThread, Devbox.V1.ForkThreadRequest, Devbox.V1.ThreadResponse

  rpc :Prompt, Devbox.V1.PromptRequest, Devbox.V1.PromptResponse

  rpc :CancelPrompt, Devbox.V1.CancelPromptRequest, Devbox.V1.CancelPromptResponse

  rpc :SetThreadConfigOption,
      Devbox.V1.SetThreadConfigOptionRequest,
      Devbox.V1.SetThreadConfigOptionResponse

  rpc :RespondInteraction,
      Devbox.V1.RespondInteractionRequest,
      Devbox.V1.RespondInteractionResponse

  rpc :ListCommands, Devbox.V1.ListCommandsRequest, Devbox.V1.ListCommandsResponse

  rpc :SetAgentBilling, Devbox.V1.SetAgentBillingRequest, Devbox.V1.SetAgentBillingResponse

  rpc :CreateTerminal, Devbox.V1.CreateTerminalRequest, Devbox.V1.TerminalInfo

  rpc :ListTerminals, Devbox.V1.ListTerminalsRequest, Devbox.V1.ListTerminalsResponse

  rpc :ResizeTerminal, Devbox.V1.ResizeTerminalRequest, Devbox.V1.TerminalInfo

  rpc :CloseTerminal, Devbox.V1.CloseTerminalRequest, Devbox.V1.TerminalInfo

  rpc :AttachTerminal, stream(Devbox.V1.TerminalInput), stream(Devbox.V1.TerminalOutput)

  rpc :ListFiles, Devbox.V1.ListFilesRequest, Devbox.V1.ListFilesResponse

  rpc :StatFile, Devbox.V1.StatFileRequest, Devbox.V1.StatFileResponse

  rpc :ReadFile, Devbox.V1.ReadFileRequest, Devbox.V1.ReadFileResponse

  rpc :WriteFile, Devbox.V1.WriteFileRequest, Devbox.V1.WriteFileResponse

  rpc :WatchFiles, Devbox.V1.WatchFilesRequest, stream(Devbox.V1.FileEvent)

  rpc :GetChanges, Devbox.V1.GetChangesRequest, Devbox.V1.GetChangesResponse

  rpc :GetBranchDiffStat, Devbox.V1.BranchDiffStatRequest, Devbox.V1.BranchDiffStatResponse

  rpc :AddRepository, Devbox.V1.AddRepositoryRequest, Devbox.V1.AddRepositoryResponse

  rpc :ListRepositories, Devbox.V1.ListRepositoriesRequest, Devbox.V1.ListRepositoriesResponse

  rpc :StartBrowser, Devbox.V1.StartBrowserRequest, Devbox.V1.BrowserInfo

  rpc :StopBrowser, Devbox.V1.StopBrowserRequest, Devbox.V1.BrowserInfo

  rpc :GetBrowser, Devbox.V1.GetBrowserRequest, Devbox.V1.BrowserInfo

  rpc :SetLeases, Devbox.V1.SetInstanceLeasesRequest, Devbox.V1.SetInstanceLeasesResponse

  rpc :GetIdleState, Devbox.V1.GetIdleStateRequest, Devbox.V1.IdleState

  rpc :PushCredential, Devbox.V1.PushCredentialRequest, Devbox.V1.PushCredentialResponse
end

defmodule Devbox.V1.Daemon.Stub do
  @moduledoc false

  use GRPC.Stub, service: Devbox.V1.Daemon.Service
end
