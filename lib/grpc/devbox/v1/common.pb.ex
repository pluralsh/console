defmodule Devbox.V1.AgentType do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.AgentType",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :AGENT_TYPE_UNSPECIFIED, 0
  field :AGENT_TYPE_CLAUDE, 1
  field :AGENT_TYPE_CODEX, 2
  field :AGENT_TYPE_OPENCODE, 3
  field :AGENT_TYPE_GEMINI, 4
  field :AGENT_TYPE_PI, 5
end

defmodule Devbox.V1.InstanceStatus do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.InstanceStatus",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :INSTANCE_STATUS_UNSPECIFIED, 0
  field :INSTANCE_STATUS_PENDING, 1
  field :INSTANCE_STATUS_PROVISIONING, 2
  field :INSTANCE_STATUS_RUNNING, 3
  field :INSTANCE_STATUS_SUSPENDED, 4
  field :INSTANCE_STATUS_SNAPSHOTTING, 5
  field :INSTANCE_STATUS_COMPLETED, 6
  field :INSTANCE_STATUS_FAILED, 7
  field :INSTANCE_STATUS_CANCELLED, 8
end

defmodule Devbox.V1.BillingMode do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.BillingMode",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :BILLING_MODE_UNSPECIFIED, 0
  field :BILLING_MODE_PROXY, 1
  field :BILLING_MODE_SUBSCRIPTION, 2
end

defmodule Devbox.V1.Autonomy do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.Autonomy",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :AUTONOMY_UNSPECIFIED, 0
  field :AUTONOMY_MANUAL, 1
  field :AUTONOMY_AUTO, 2
  field :AUTONOMY_FULL, 3
end

defmodule Devbox.V1.SnapshotFidelity do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.SnapshotFidelity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :SNAPSHOT_FIDELITY_UNSPECIFIED, 0
  field :SNAPSHOT_FIDELITY_MEMORY, 1
  field :SNAPSHOT_FIDELITY_FILESYSTEM, 2
end

defmodule Devbox.V1.ErrorReason do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.ErrorReason",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :ERROR_REASON_UNSPECIFIED, 0
  field :ERROR_REASON_UNSUPPORTED, 1
  field :ERROR_REASON_CLUSTER_OFFLINE, 2
  field :ERROR_REASON_INSTANCE_SUSPENDED, 3
  field :ERROR_REASON_INSTANCE_NOT_FOUND, 4
  field :ERROR_REASON_THREAD_NOT_FOUND, 5
  field :ERROR_REASON_STALE_REVISION, 6
  field :ERROR_REASON_CREDENTIALS_UNAVAILABLE, 7
  field :ERROR_REASON_REPOSITORY_NOT_ALLOWED, 8
  field :ERROR_REASON_THREAD_LIMIT_REACHED, 10
  field :ERROR_REASON_AGENT_AUTH_FAILED, 11
  field :ERROR_REASON_PLAN_LIMIT_REACHED, 12
  field :ERROR_REASON_INVALID_AGENT_OR_MODEL, 13
  field :ERROR_REASON_FILE_CONFLICT, 14
  field :ERROR_REASON_INSTANCE_STARTING, 15
end

defmodule Devbox.V1.LeaseKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.LeaseKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :LEASE_KIND_UNSPECIFIED, 0
  field :LEASE_KIND_VIEWER, 1
  field :LEASE_KIND_DEFERRAL, 2
end

defmodule Devbox.V1.BusyReasonKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.BusyReasonKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :BUSY_REASON_KIND_UNSPECIFIED, 0
  field :BUSY_REASON_KIND_AGENT_TURN, 1
  field :BUSY_REASON_KIND_PROCESS_ACTIVITY, 2
  field :BUSY_REASON_KIND_TERMINAL_JOB, 3
  field :BUSY_REASON_KIND_INTERACTIVE_STREAM, 4
  field :BUSY_REASON_KIND_VIEWER_LEASE, 5
  field :BUSY_REASON_KIND_DEFERRAL_LEASE, 6
  field :BUSY_REASON_KIND_PENDING_INTERACTION, 7
end

defmodule Devbox.V1.SuspendReason do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.SuspendReason",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :SUSPEND_REASON_UNSPECIFIED, 0
  field :SUSPEND_REASON_IDLE, 1
  field :SUSPEND_REASON_USER, 2
  field :SUSPEND_REASON_MAX_CONTINUOUS_AWAKE, 3
  field :SUSPEND_REASON_DAEMON_UNRESPONSIVE, 4
  field :SUSPEND_REASON_EVICTION, 5
  field :SUSPEND_REASON_SNAPSHOT, 6
  field :SUSPEND_REASON_HOME_UNAVAILABLE, 7
end

defmodule Devbox.V1.AutonomyPolicy do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AutonomyPolicy",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :default, 1, type: Devbox.V1.Autonomy, enum: true
  field :max, 2, type: Devbox.V1.Autonomy, enum: true
end

defmodule Devbox.V1.ErrorDetail.MetadataEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ErrorDetail.MetadataEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Devbox.V1.ErrorDetail do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ErrorDetail",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :reason, 1, type: Devbox.V1.ErrorReason, enum: true
  field :message, 2, type: :string
  field :metadata, 3, repeated: true, type: Devbox.V1.ErrorDetail.MetadataEntry, map: true
end

defmodule Devbox.V1.Principal do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.Principal",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :user_id, 1, type: :string, json_name: "userId"
  field :email, 2, type: :string
  field :name, 3, type: :string
  field :policy, 4, type: :string
end

defmodule Devbox.V1.RepositorySpec do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.RepositorySpec",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :url, 1, type: :string
  field :directory, 2, type: :string
  field :branch, 3, type: :string
  field :description, 4, type: :string
end

defmodule Devbox.V1.Checkout do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.Checkout",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :name, 2, type: :string
  field :remote_url, 3, type: :string, json_name: "remoteUrl"
  field :default_branch, 4, type: :string, json_name: "defaultBranch"
  field :branch, 5, type: :string
  field :head_sha, 6, type: :string, json_name: "headSha"
  field :dirty, 7, type: :bool
  field :worktree_thread_id, 8, type: :string, json_name: "worktreeThreadId"
  field :ahead, 9, type: :int32
  field :behind, 10, type: :int32
end

defmodule Devbox.V1.IdlePolicy do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.IdlePolicy",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :activity_window, 1, type: Google.Protobuf.Duration, json_name: "activityWindow"
  field :cpu_threshold_percent, 2, type: :double, json_name: "cpuThresholdPercent"
  field :grace_period, 3, type: Google.Protobuf.Duration, json_name: "gracePeriod"
  field :max_deferral, 4, type: Google.Protobuf.Duration, json_name: "maxDeferral"
  field :max_continuous_awake, 5, type: Google.Protobuf.Duration, json_name: "maxContinuousAwake"
  field :complete_after, 6, type: Google.Protobuf.Duration, json_name: "completeAfter"
end

defmodule Devbox.V1.Lease do
  @moduledoc false

  use Protobuf, full_name: "devbox.v1.Lease", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :kind, 1, type: Devbox.V1.LeaseKind, enum: true
  field :holder, 2, type: Devbox.V1.Principal
  field :expires_at, 3, type: Google.Protobuf.Timestamp, json_name: "expiresAt"
  field :requested_until, 4, type: Google.Protobuf.Timestamp, json_name: "requestedUntil"
end

defmodule Devbox.V1.BusyReason do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.BusyReason",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :kind, 1, type: Devbox.V1.BusyReasonKind, enum: true
  field :detail, 2, type: :string
  field :until, 3, type: Google.Protobuf.Timestamp
  field :thread_id, 4, type: :string, json_name: "threadId"
  field :terminal_id, 5, type: :string, json_name: "terminalId"
end

defmodule Devbox.V1.IdleState do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.IdleState",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :idle, 1, type: :bool
  field :idle_since, 2, type: Google.Protobuf.Timestamp, json_name: "idleSince"
  field :busy_reasons, 3, repeated: true, type: Devbox.V1.BusyReason, json_name: "busyReasons"
  field :suspend_at, 4, type: Google.Protobuf.Timestamp, json_name: "suspendAt"
  field :evaluated_at, 5, type: Google.Protobuf.Timestamp, json_name: "evaluatedAt"
end

defmodule Devbox.V1.AgentLaunch do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AgentLaunch",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :agent, 1, type: Devbox.V1.AgentType, enum: true
  field :billing, 2, type: Devbox.V1.BillingMode, enum: true
  field :credential_id, 3, type: :string, json_name: "credentialId"
  field :credential_kind, 4, type: :string, json_name: "credentialKind"
  field :acp_v2, 5, type: :bool, json_name: "acpV2"
  field :allow_collaborators, 6, type: :bool, json_name: "allowCollaborators"
  field :proxy_models, 7, type: Devbox.V1.ProxyModels, json_name: "proxyModels"
end

defmodule Devbox.V1.ProxyModels.AliasesEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ProxyModels.AliasesEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Devbox.V1.ProxyModels do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ProxyModels",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :default_model, 1, type: :string, json_name: "defaultModel"
  field :models, 2, repeated: true, type: :string
  field :aliases, 3, repeated: true, type: Devbox.V1.ProxyModels.AliasesEntry, map: true
end

defmodule Devbox.V1.ConfigOptionSetting do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ConfigOptionSetting",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :config_id, 1, type: :string, json_name: "configId"
  field :value, 2, type: :string
end
