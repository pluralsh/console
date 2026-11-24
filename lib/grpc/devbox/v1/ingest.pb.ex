defmodule Devbox.V1.DeltaOp do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.DeltaOp",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :DELTA_OP_UNSPECIFIED, 0
  field :DELTA_OP_APPEND, 1
  field :DELTA_OP_PATCH, 2
  field :DELTA_OP_NOTICE, 3
  field :DELTA_OP_STATE, 4
  field :DELTA_OP_SETTLE, 5
end

defmodule Devbox.V1.SnapshotState do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.SnapshotState",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :SNAPSHOT_STATE_UNSPECIFIED, 0
  field :SNAPSHOT_STATE_SUCCEEDED, 1
  field :SNAPSHOT_STATE_FAILED, 2
end

defmodule Devbox.V1.RegisterGatewayRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.RegisterGatewayRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :gateway_id, 1, type: :string, json_name: "gatewayId"
  field :version, 2, type: :string
  field :capabilities, 3, repeated: true, type: :string
  field :substrate_version, 4, type: :string, json_name: "substrateVersion"
  field :credential_provider_registered, 5, type: :bool, json_name: "credentialProviderRegistered"
  field :egress_authz_registered, 6, type: :bool, json_name: "egressAuthzRegistered"
end

defmodule Devbox.V1.RegisterGatewayResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.RegisterGatewayResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :cluster_id, 1, type: :string, json_name: "clusterId"
  field :heartbeat_interval_seconds, 2, type: :int32, json_name: "heartbeatIntervalSeconds"
  field :instances, 3, repeated: true, type: Devbox.V1.InstanceSummary
end

defmodule Devbox.V1.InstanceSummary do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InstanceSummary",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :devbox_id, 2, type: :string, json_name: "devboxId"
  field :status, 3, type: Devbox.V1.InstanceStatus, enum: true
  field :leases, 4, repeated: true, type: Devbox.V1.Lease
  field :lease_generation, 5, type: :uint64, json_name: "leaseGeneration"
end

defmodule Devbox.V1.HeartbeatRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HeartbeatRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :gateway_id, 1, type: :string, json_name: "gatewayId"
  field :instances, 2, repeated: true, type: Devbox.V1.InstanceHeartbeat
end

defmodule Devbox.V1.InstanceHeartbeat do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InstanceHeartbeat",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :status, 2, type: Devbox.V1.InstanceStatus, enum: true
  field :idle, 3, type: Devbox.V1.IdleState
  field :last_daemon_contact, 4, type: Google.Protobuf.Timestamp, json_name: "lastDaemonContact"
  field :acked_offset, 5, type: :uint64, json_name: "ackedOffset"
  field :conditions, 6, repeated: true, type: Devbox.V1.ErrorDetail
end

defmodule Devbox.V1.HeartbeatResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HeartbeatResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :unknown_instance_ids, 1, repeated: true, type: :string, json_name: "unknownInstanceIds"
end

defmodule Devbox.V1.InstanceAggregate do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InstanceAggregate",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :foreground, 1, type: Devbox.V1.ForegroundStateKind, enum: true
  field :running_threads, 2, type: :int32, json_name: "runningThreads"
  field :waiting_threads, 3, type: :int32, json_name: "waitingThreads"
  field :connections, 4, repeated: true, type: Devbox.V1.AgentConnection
  field :checkouts, 5, repeated: true, type: Devbox.V1.Checkout
  field :revision, 6, type: :uint64
end

defmodule Devbox.V1.UpsertInstanceIndexRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpsertInstanceIndexRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :sessions, 2, repeated: true, type: Devbox.V1.Session
  field :interactions, 3, repeated: true, type: Devbox.V1.Interaction
  field :aggregate, 4, type: Devbox.V1.InstanceAggregate
  field :offset, 5, type: :uint64
end

defmodule Devbox.V1.UpsertInstanceIndexResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpsertInstanceIndexResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :sessions_applied, 1, type: :int32, json_name: "sessionsApplied"
  field :interactions_applied, 2, type: :int32, json_name: "interactionsApplied"
end

defmodule Devbox.V1.Delta do
  @moduledoc false

  use Protobuf, full_name: "devbox.v1.Delta", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :session_id, 2, type: :string, json_name: "sessionId"
  field :entity_type, 3, type: Devbox.V1.EntityType, json_name: "entityType", enum: true
  field :entity_id, 4, type: :string, json_name: "entityId"
  field :position, 5, type: :uint64
  field :op, 6, type: Devbox.V1.DeltaOp, enum: true
  field :state_kind, 7, type: :string, json_name: "stateKind"
  field :payload_json, 8, type: :bytes, json_name: "payloadJson"
  field :entity, 9, type: Devbox.V1.AcpEntity
  field :offset, 10, type: :uint64
  field :emitted_at, 11, type: Google.Protobuf.Timestamp, json_name: "emittedAt"
  field :seq, 12, type: :uint64
  field :stream, 13, type: :string
end

defmodule Devbox.V1.PushInstanceDeltasRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PushInstanceDeltasRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :deltas, 1, repeated: true, type: Devbox.V1.Delta
end

defmodule Devbox.V1.PushInstanceDeltasResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PushInstanceDeltasResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.ReportInstanceStatusRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReportInstanceStatusRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :status, 2, type: Devbox.V1.InstanceStatus, enum: true
  field :suspend_reason, 3, type: Devbox.V1.SuspendReason, json_name: "suspendReason", enum: true
  field :message, 4, type: :string
  field :error, 5, type: Devbox.V1.ErrorDetail
  field :actor_id, 6, type: :string, json_name: "actorId"
  field :image_digest, 7, type: :string, json_name: "imageDigest"
  field :template_revision, 8, type: :int64, json_name: "templateRevision"
  field :idle, 9, type: Devbox.V1.IdleState
  field :observed_at, 10, type: Google.Protobuf.Timestamp, json_name: "observedAt"
  field :generation, 11, type: :uint64
  field :daemon_version, 12, type: :string, json_name: "daemonVersion"
  field :rebase_state, 13, type: Devbox.V1.RebaseState, json_name: "rebaseState", enum: true
  field :rebase_message, 14, type: :string, json_name: "rebaseMessage"
  field :rebase_revision, 15, type: :int64, json_name: "rebaseRevision"
end

defmodule Devbox.V1.ReportInstanceStatusResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReportInstanceStatusResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :status, 1, type: Devbox.V1.InstanceStatus, enum: true
end

defmodule Devbox.V1.ReportSnapshotRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReportSnapshotRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :snapshot_id, 1, type: :string, json_name: "snapshotId"
  field :instance_id, 2, type: :string, json_name: "instanceId"
  field :state, 3, type: Devbox.V1.SnapshotState, enum: true
  field :snapshot, 4, type: Devbox.V1.SnapshotRef
  field :size_bytes, 5, type: :int64, json_name: "sizeBytes"
  field :error, 6, type: Devbox.V1.ErrorDetail
  field :completed_at, 7, type: Google.Protobuf.Timestamp, json_name: "completedAt"
end

defmodule Devbox.V1.ReportSnapshotResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReportSnapshotResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.GetInstanceCredentialsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetInstanceCredentialsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :credentials, 2, repeated: true, type: Devbox.V1.CredentialSelector
end

defmodule Devbox.V1.GetInstanceCredentialsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetInstanceCredentialsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :credentials, 1, repeated: true, type: Devbox.V1.InstanceCredential
end

defmodule Devbox.V1.UpdateAgentCredentialRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpdateAgentCredentialRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :credential_id, 2, type: :string, json_name: "credentialId"
  field :expected_version, 3, type: :int64, json_name: "expectedVersion"
  field :bundle_json, 4, type: :bytes, json_name: "bundleJson"
  field :refreshed_at, 5, type: Google.Protobuf.Timestamp, json_name: "refreshedAt"
end

defmodule Devbox.V1.UpdateAgentCredentialResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpdateAgentCredentialResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :applied, 1, type: :bool
  field :current, 2, type: Devbox.V1.InstanceCredential
end

defmodule Devbox.V1.ReportPullRequestRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReportPullRequestRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :actor_id, 2, type: :string, json_name: "actorId"
  field :url, 3, type: :string
  field :provider, 4, type: :string
  field :repository, 5, type: :string
  field :number, 6, type: :int64
  field :head_branch, 7, type: :string, json_name: "headBranch"
  field :base_branch, 8, type: :string, json_name: "baseBranch"
  field :observed_at, 9, type: Google.Protobuf.Timestamp, json_name: "observedAt"
end

defmodule Devbox.V1.ReportPullRequestResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReportPullRequestResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :pull_request_id, 1, type: :string, json_name: "pullRequestId"
  field :created, 2, type: :bool
end

defmodule Devbox.V1.PullRequestAttributes do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PullRequestAttributes",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :repository, 1, type: :string
  field :title, 2, type: :string
  field :body, 3, type: :string
  field :head_branch, 4, type: :string, json_name: "headBranch"
  field :base_branch, 5, type: :string, json_name: "baseBranch"
  field :draft, 6, type: :bool
  field :labels, 7, repeated: true, type: :string
  field :related_urls, 8, repeated: true, type: :string, json_name: "relatedUrls"
  field :extra, 9, type: Google.Protobuf.Struct
  field :difficulty, 10, type: Devbox.V1.PullRequestDifficulty
  field :commit_shas, 11, repeated: true, type: Devbox.V1.CommitSha, json_name: "commitShas"
end

defmodule Devbox.V1.PullRequestDifficulty do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PullRequestDifficulty",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :change_type, 1, type: :string, json_name: "changeType"
  field :lines, 2, type: :int32
end

defmodule Devbox.V1.CommitSha do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CommitSha",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :branch, 1, type: :string
  field :sha, 2, type: :string
end

defmodule Devbox.V1.DevboxPullRequestRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DevboxPullRequestRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :thread_id, 2, type: :string, json_name: "threadId"
  field :subagent_session_id, 3, type: :string, json_name: "subagentSessionId"
  field :attributes, 4, type: Devbox.V1.PullRequestAttributes
  field :tool_call_id, 5, type: :string, json_name: "toolCallId"
  field :position, 6, type: :uint64
end

defmodule Devbox.V1.DevboxPullRequestResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DevboxPullRequestResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :pull_request_id, 1, type: :string, json_name: "pullRequestId"
  field :url, 2, type: :string
  field :number, 3, type: :int64
end

defmodule Devbox.V1.Ingest.Service do
  @moduledoc false

  use GRPC.Service, name: "devbox.v1.Ingest", protoc_gen_elixir_version: "0.16.0"

  rpc :RegisterGateway, Devbox.V1.RegisterGatewayRequest, Devbox.V1.RegisterGatewayResponse

  rpc :Heartbeat, Devbox.V1.HeartbeatRequest, Devbox.V1.HeartbeatResponse

  rpc :UpsertInstanceIndex,
      Devbox.V1.UpsertInstanceIndexRequest,
      Devbox.V1.UpsertInstanceIndexResponse

  rpc :PushInstanceDeltas,
      Devbox.V1.PushInstanceDeltasRequest,
      Devbox.V1.PushInstanceDeltasResponse

  rpc :ReportInstanceStatus,
      Devbox.V1.ReportInstanceStatusRequest,
      Devbox.V1.ReportInstanceStatusResponse

  rpc :ReportSnapshot, Devbox.V1.ReportSnapshotRequest, Devbox.V1.ReportSnapshotResponse

  rpc :GetInstanceCredentials,
      Devbox.V1.GetInstanceCredentialsRequest,
      Devbox.V1.GetInstanceCredentialsResponse

  rpc :UpdateAgentCredential,
      Devbox.V1.UpdateAgentCredentialRequest,
      Devbox.V1.UpdateAgentCredentialResponse

  rpc :ReportPullRequest, Devbox.V1.ReportPullRequestRequest, Devbox.V1.ReportPullRequestResponse

  rpc :DevboxPullRequest, Devbox.V1.DevboxPullRequestRequest, Devbox.V1.DevboxPullRequestResponse
end

defmodule Devbox.V1.Ingest.Stub do
  @moduledoc false

  use GRPC.Stub, service: Devbox.V1.Ingest.Service
end
