defmodule Devbox.V1.PromptDisposition do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.PromptDisposition",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :PROMPT_DISPOSITION_UNSPECIFIED, 0
  field :PROMPT_DISPOSITION_SENT, 1
  field :PROMPT_DISPOSITION_QUEUED, 2
  field :PROMPT_DISPOSITION_DUPLICATE, 3
end

defmodule Devbox.V1.QueuedPromptAction do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.QueuedPromptAction",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :QUEUED_PROMPT_ACTION_UNSPECIFIED, 0
  field :QUEUED_PROMPT_ACTION_EDIT, 1
  field :QUEUED_PROMPT_ACTION_CANCEL, 2
  field :QUEUED_PROMPT_ACTION_SEND_NOW, 3
end

defmodule Devbox.V1.StreamKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.StreamKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :STREAM_KIND_UNSPECIFIED, 0
  field :STREAM_KIND_TERMINAL, 1
  field :STREAM_KIND_VNC, 2
  field :STREAM_KIND_PREVIEW, 3
end

defmodule Devbox.V1.CreateInstanceRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CreateInstanceRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :devbox_id, 2, type: :string, json_name: "devboxId"
  field :workbench_id, 3, type: :string, json_name: "workbenchId"
  field :owner, 4, type: Devbox.V1.Principal
  field :runner_namespace, 5, type: :string, json_name: "runnerNamespace"
  field :runner_name, 6, type: :string, json_name: "runnerName"
  field :agent, 7, type: Devbox.V1.AgentType, enum: true
  field :model, 8, type: :string

  field :config_options, 9,
    repeated: true,
    type: Devbox.V1.ConfigOptionSetting,
    json_name: "configOptions"

  field :agents, 10, repeated: true, type: Devbox.V1.AgentLaunch
  field :repositories, 11, repeated: true, type: Devbox.V1.RepositorySpec
  field :allowed_repositories, 12, repeated: true, type: :string, json_name: "allowedRepositories"
  field :first_thread_id, 13, type: :string, json_name: "firstThreadId"
  field :first_thread_title, 14, type: :string, json_name: "firstThreadTitle"
  field :idle_policy, 15, type: Devbox.V1.IdlePolicy, json_name: "idlePolicy"
  field :max_running_threads, 16, type: :int32, json_name: "maxRunningThreads"
  field :leases, 17, repeated: true, type: Devbox.V1.Lease
  field :idempotency_key, 18, type: :string, json_name: "idempotencyKey"
  field :decision_review, 19, type: :bool, json_name: "decisionReview"
end

defmodule Devbox.V1.CreateInstanceResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CreateInstanceResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :status, 2, type: Devbox.V1.InstanceStatus, enum: true
  field :actor_id, 3, type: :string, json_name: "actorId"
  field :template_revision, 4, type: :int64, json_name: "templateRevision"
  field :image_digest, 5, type: :string, json_name: "imageDigest"

  field :restore_fidelity, 6,
    type: Devbox.V1.SnapshotFidelity,
    json_name: "restoreFidelity",
    enum: true

  field :message, 7, type: :string
end

defmodule Devbox.V1.SnapshotRef do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SnapshotRef",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :snapshot_id, 1, type: :string, json_name: "snapshotId"
  field :tag, 2, type: :string
  field :template_revision, 3, type: :int64, json_name: "templateRevision"
  field :fidelity, 4, type: Devbox.V1.SnapshotFidelity, enum: true
end

defmodule Devbox.V1.StartFromSnapshotRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.StartFromSnapshotRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance, 1, type: Devbox.V1.CreateInstanceRequest
  field :snapshot, 2, type: Devbox.V1.SnapshotRef
end

defmodule Devbox.V1.InstanceActionRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InstanceActionRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :requested_by, 2, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :reason, 3, type: Devbox.V1.SuspendReason, enum: true
  field :message, 4, type: :string
end

defmodule Devbox.V1.InstanceActionResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InstanceActionResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :status, 2, type: Devbox.V1.InstanceStatus, enum: true
  field :message, 3, type: :string
end

defmodule Devbox.V1.SnapshotInstanceRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SnapshotInstanceRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :snapshot_id, 2, type: :string, json_name: "snapshotId"
  field :name, 3, type: :string
  field :fidelity, 4, type: Devbox.V1.SnapshotFidelity, enum: true
  field :shared, 5, type: :bool
  field :requested_by, 6, type: Devbox.V1.Principal, json_name: "requestedBy"
end

defmodule Devbox.V1.SnapshotInstanceResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SnapshotInstanceResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :snapshot_id, 1, type: :string, json_name: "snapshotId"
  field :accepted, 2, type: :bool
end

defmodule Devbox.V1.DeleteSnapshotRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DeleteSnapshotRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :snapshot, 1, type: Devbox.V1.SnapshotRef
end

defmodule Devbox.V1.DeleteSnapshotResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DeleteSnapshotResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :deleted, 1, type: :bool
end

defmodule Devbox.V1.SetAgentBillingRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SetAgentBillingRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :agent, 2, type: Devbox.V1.AgentLaunch
  field :requested_by, 3, type: Devbox.V1.Principal, json_name: "requestedBy"
end

defmodule Devbox.V1.SetAgentBillingResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SetAgentBillingResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :connection, 1, type: Devbox.V1.AgentConnection
  field :thread_ids, 2, repeated: true, type: :string, json_name: "threadIds"
end

defmodule Devbox.V1.ThreadRef do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ThreadRef",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :thread_id, 2, type: :string, json_name: "threadId"
  field :session_id, 3, type: :string, json_name: "sessionId"
end

defmodule Devbox.V1.CreateThreadRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CreateThreadRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :thread_id, 2, type: :string, json_name: "threadId"
  field :agent, 3, type: Devbox.V1.AgentType, enum: true
  field :model, 4, type: :string

  field :config_options, 5,
    repeated: true,
    type: Devbox.V1.ConfigOptionSetting,
    json_name: "configOptions"

  field :title, 6, type: :string
  field :cwd, 7, type: :string
  field :worktree_repos, 8, repeated: true, type: :string, json_name: "worktreeRepos"
  field :created_by, 9, type: Devbox.V1.Principal, json_name: "createdBy"
  field :resume_if_suspended, 10, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.ThreadResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ThreadResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :session, 1, type: Devbox.V1.Session
end

defmodule Devbox.V1.ListThreadsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListThreadsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :include_importable, 2, type: :bool, json_name: "includeImportable"
end

defmodule Devbox.V1.ListThreadsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListThreadsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :threads, 1, repeated: true, type: Devbox.V1.Session
  field :importable, 2, repeated: true, type: Devbox.V1.ImportableSession
end

defmodule Devbox.V1.ImportThreadRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ImportThreadRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :thread_id, 2, type: :string, json_name: "threadId"
  field :agent, 3, type: Devbox.V1.AgentType, enum: true
  field :agent_session_id, 4, type: :string, json_name: "agentSessionId"
  field :imported_by, 5, type: Devbox.V1.Principal, json_name: "importedBy"
  field :resume_if_suspended, 6, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.ResumeThreadRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ResumeThreadRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :replay, 2, type: :bool
  field :requested_by, 3, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :resume_if_suspended, 4, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.ThreadActionRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ThreadActionRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :requested_by, 2, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :resume_if_suspended, 3, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.DeleteThreadResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.DeleteThreadResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :session, 1, type: Devbox.V1.Session
  field :agent_side_deleted, 2, type: :bool, json_name: "agentSideDeleted"
end

defmodule Devbox.V1.ForkThreadRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ForkThreadRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :new_thread_id, 2, type: :string, json_name: "newThreadId"
  field :title, 3, type: :string
  field :requested_by, 4, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :resume_if_suspended, 5, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.PromptRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PromptRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :prompt_id, 2, type: :string, json_name: "promptId"
  field :content, 3, repeated: true, type: Devbox.V1.ContentBlock
  field :sent_by, 4, type: Devbox.V1.Principal, json_name: "sentBy"
  field :resume_if_suspended, 5, type: :bool, json_name: "resumeIfSuspended"
  field :attachments, 6, repeated: true, type: Devbox.V1.PromptAttachment
end

defmodule Devbox.V1.PromptAttachment do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PromptAttachment",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :name, 1, type: :string
  field :mime_type, 2, type: :string, json_name: "mimeType"
  field :data, 3, type: :bytes
end

defmodule Devbox.V1.PromptResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PromptResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :prompt_id, 1, type: :string, json_name: "promptId"
  field :disposition, 2, type: Devbox.V1.PromptDisposition, enum: true
  field :message_id, 3, type: :string, json_name: "messageId"
end

defmodule Devbox.V1.CancelPromptRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CancelPromptRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :requested_by, 2, type: Devbox.V1.Principal, json_name: "requestedBy"
end

defmodule Devbox.V1.CancelPromptResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CancelPromptResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :cancelled, 1, type: :bool
end

defmodule Devbox.V1.UpdateQueuedPromptRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpdateQueuedPromptRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :prompt_id, 2, type: :string, json_name: "promptId"
  field :action, 3, type: Devbox.V1.QueuedPromptAction, enum: true
  field :text, 4, type: :string
  field :requested_by, 5, type: Devbox.V1.Principal, json_name: "requestedBy"
end

defmodule Devbox.V1.UpdateQueuedPromptResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UpdateQueuedPromptResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :updated, 1, type: :bool

  field :queued_prompts, 2,
    repeated: true,
    type: Devbox.V1.QueuedPrompt,
    json_name: "queuedPrompts"
end

defmodule Devbox.V1.SetThreadConfigOptionRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SetThreadConfigOptionRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :option, 2, type: Devbox.V1.ConfigOptionSetting
  field :requested_by, 3, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :resume_if_suspended, 4, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.SetThreadConfigOptionResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SetThreadConfigOptionResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :config_options, 1,
    repeated: true,
    type: Devbox.V1.ConfigOption,
    json_name: "configOptions"
end

defmodule Devbox.V1.RespondInteractionRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.RespondInteractionRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :interaction_id, 2, type: :string, json_name: "interactionId"
  field :session_id, 3, type: :string, json_name: "sessionId"
  field :response, 4, type: Devbox.V1.InteractionResponse
  field :answered_by, 5, type: Devbox.V1.Principal, json_name: "answeredBy"
  field :resume_if_suspended, 6, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.RespondInteractionResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.RespondInteractionResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :interaction, 1, type: Devbox.V1.Interaction
end

defmodule Devbox.V1.ListCommandsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListCommandsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread, 1, type: Devbox.V1.ThreadRef
  field :session_id, 2, type: :string, json_name: "sessionId"
end

defmodule Devbox.V1.ListCommandsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListCommandsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :commands, 1, repeated: true, type: Devbox.V1.AvailableCommand
end

defmodule Devbox.V1.GetTimelineRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetTimelineRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :cursor, 0

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :session_id, 2, type: :string, json_name: "sessionId"
  field :after_position, 3, type: :uint64, json_name: "afterPosition", oneof: 0
  field :before_position, 6, type: :uint64, json_name: "beforePosition", oneof: 0
  field :limit, 4, type: :int32
  field :resume_if_suspended, 5, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.GetTimelineResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetTimelineResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :entities, 1, repeated: true, type: Devbox.V1.AcpEntity
  field :next_position, 2, type: :uint64, json_name: "nextPosition"
  field :has_more, 3, type: :bool, json_name: "hasMore"
  field :delta_offset, 4, type: :uint64, json_name: "deltaOffset"
  field :seq, 6, type: :uint64
  field :stream, 7, type: :string
end

defmodule Devbox.V1.GetSessionsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetSessionsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
end

defmodule Devbox.V1.GetSessionsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetSessionsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :sessions, 1, repeated: true, type: Devbox.V1.Session
  field :connections, 2, repeated: true, type: Devbox.V1.AgentConnection
end

defmodule Devbox.V1.SetInstanceLeasesRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SetInstanceLeasesRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :leases, 2, repeated: true, type: Devbox.V1.Lease
  field :generation, 3, type: :uint64
end

defmodule Devbox.V1.SetInstanceLeasesResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SetInstanceLeasesResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :leases, 1, repeated: true, type: Devbox.V1.Lease
  field :idle, 2, type: Devbox.V1.IdleState
end

defmodule Devbox.V1.OpenStreamRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.OpenStreamRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :kind, 2, type: Devbox.V1.StreamKind, enum: true
  field :terminal_id, 3, type: :string, json_name: "terminalId"
  field :create_terminal, 4, type: Devbox.V1.CreateTerminalRequest, json_name: "createTerminal"
  field :port, 5, type: :int32
  field :start_browser, 6, type: Devbox.V1.StartBrowserRequest, json_name: "startBrowser"
  field :requested_by, 7, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :resume_if_suspended, 8, type: :bool, json_name: "resumeIfSuspended"
end

defmodule Devbox.V1.OpenStreamResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.OpenStreamResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :stream_id, 1, type: :string, json_name: "streamId"
  field :kind, 2, type: Devbox.V1.StreamKind, enum: true
  field :daemon_path, 3, type: :string, json_name: "daemonPath"
  field :expires_at, 4, type: Google.Protobuf.Timestamp, json_name: "expiresAt"
  field :subprotocols, 5, repeated: true, type: :string
  field :terminal, 6, type: Devbox.V1.TerminalInfo
  field :browser, 7, type: Devbox.V1.BrowserInfo
end

defmodule Devbox.V1.InvalidateAllowlistRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InvalidateAllowlistRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :devbox_id, 1, type: :string, json_name: "devboxId"
  field :instance_id, 2, type: :string, json_name: "instanceId"
  field :allowed_repositories, 3, repeated: true, type: :string, json_name: "allowedRepositories"
  field :generation, 4, type: :uint64
end

defmodule Devbox.V1.InvalidateAllowlistResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InvalidateAllowlistResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instances_updated, 1, type: :int32, json_name: "instancesUpdated"
end

defmodule Devbox.V1.Control.Service do
  @moduledoc false

  use GRPC.Service, name: "devbox.v1.Control", protoc_gen_elixir_version: "0.16.0"

  rpc :CreateInstance, Devbox.V1.CreateInstanceRequest, Devbox.V1.CreateInstanceResponse

  rpc :StartFromSnapshot, Devbox.V1.StartFromSnapshotRequest, Devbox.V1.CreateInstanceResponse

  rpc :CancelInstance, Devbox.V1.InstanceActionRequest, Devbox.V1.InstanceActionResponse

  rpc :SuspendInstance, Devbox.V1.InstanceActionRequest, Devbox.V1.InstanceActionResponse

  rpc :ResumeInstance, Devbox.V1.InstanceActionRequest, Devbox.V1.InstanceActionResponse

  rpc :SnapshotInstance, Devbox.V1.SnapshotInstanceRequest, Devbox.V1.SnapshotInstanceResponse

  rpc :DeleteSnapshot, Devbox.V1.DeleteSnapshotRequest, Devbox.V1.DeleteSnapshotResponse

  rpc :SetAgentBilling, Devbox.V1.SetAgentBillingRequest, Devbox.V1.SetAgentBillingResponse

  rpc :CreateThread, Devbox.V1.CreateThreadRequest, Devbox.V1.ThreadResponse

  rpc :ListThreads, Devbox.V1.ListThreadsRequest, Devbox.V1.ListThreadsResponse

  rpc :ImportThread, Devbox.V1.ImportThreadRequest, Devbox.V1.ThreadResponse

  rpc :ResumeThread, Devbox.V1.ResumeThreadRequest, Devbox.V1.ThreadResponse

  rpc :CloseThread, Devbox.V1.ThreadActionRequest, Devbox.V1.ThreadResponse

  rpc :DeleteThread, Devbox.V1.ThreadActionRequest, Devbox.V1.DeleteThreadResponse

  rpc :ForkThread, Devbox.V1.ForkThreadRequest, Devbox.V1.ThreadResponse

  rpc :Prompt, Devbox.V1.PromptRequest, Devbox.V1.PromptResponse

  rpc :CancelPrompt, Devbox.V1.CancelPromptRequest, Devbox.V1.CancelPromptResponse

  rpc :UpdateQueuedPrompt,
      Devbox.V1.UpdateQueuedPromptRequest,
      Devbox.V1.UpdateQueuedPromptResponse

  rpc :SetThreadConfigOption,
      Devbox.V1.SetThreadConfigOptionRequest,
      Devbox.V1.SetThreadConfigOptionResponse

  rpc :RespondInteraction,
      Devbox.V1.RespondInteractionRequest,
      Devbox.V1.RespondInteractionResponse

  rpc :ListCommands, Devbox.V1.ListCommandsRequest, Devbox.V1.ListCommandsResponse

  rpc :GetTimeline, Devbox.V1.GetTimelineRequest, Devbox.V1.GetTimelineResponse

  rpc :GetSessions, Devbox.V1.GetSessionsRequest, Devbox.V1.GetSessionsResponse

  rpc :SetInstanceLeases, Devbox.V1.SetInstanceLeasesRequest, Devbox.V1.SetInstanceLeasesResponse

  rpc :AddRepository, Devbox.V1.AddRepositoryRequest, Devbox.V1.AddRepositoryResponse

  rpc :ListRepositories, Devbox.V1.ListRepositoriesRequest, Devbox.V1.ListRepositoriesResponse

  rpc :ListFiles, Devbox.V1.ListFilesRequest, Devbox.V1.ListFilesResponse

  rpc :ReadFile, Devbox.V1.ReadFileRequest, Devbox.V1.ReadFileResponse

  rpc :WriteFile, Devbox.V1.WriteFileRequest, Devbox.V1.WriteFileResponse

  rpc :GetChanges, Devbox.V1.GetChangesRequest, Devbox.V1.GetChangesResponse

  rpc :PreparePullRequest,
      Devbox.V1.PreparePullRequestRequest,
      Devbox.V1.PreparePullRequestResponse

  rpc :OpenStream, Devbox.V1.OpenStreamRequest, Devbox.V1.OpenStreamResponse

  rpc :InvalidateAllowlist,
      Devbox.V1.InvalidateAllowlistRequest,
      Devbox.V1.InvalidateAllowlistResponse
end

defmodule Devbox.V1.Control.Stub do
  @moduledoc false

  use GRPC.Stub, service: Devbox.V1.Control.Service
end
