defmodule Devbox.V1.EntityType do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.EntityType",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :ENTITY_TYPE_UNSPECIFIED, 0
  field :ENTITY_TYPE_USER_MESSAGE, 1
  field :ENTITY_TYPE_AGENT_MESSAGE, 2
  field :ENTITY_TYPE_AGENT_THOUGHT, 3
  field :ENTITY_TYPE_SESSION_MESSAGE, 4
  field :ENTITY_TYPE_TOOL_CALL, 5
  field :ENTITY_TYPE_PLAN, 6
  field :ENTITY_TYPE_TERMINAL, 7
  field :ENTITY_TYPE_COMPACTION, 8
  field :ENTITY_TYPE_UNKNOWN, 15
end

defmodule Devbox.V1.ForegroundStateKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.ForegroundStateKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :FOREGROUND_STATE_KIND_UNSPECIFIED, 0
  field :FOREGROUND_STATE_KIND_RUNNING, 1
  field :FOREGROUND_STATE_KIND_REQUIRES_ACTION, 2
  field :FOREGROUND_STATE_KIND_IDLE, 3
end

defmodule Devbox.V1.SessionKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.SessionKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :SESSION_KIND_UNSPECIFIED, 0
  field :SESSION_KIND_THREAD, 1
  field :SESSION_KIND_SUBAGENT, 2
end

defmodule Devbox.V1.ThreadStatus do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.ThreadStatus",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :THREAD_STATUS_UNSPECIFIED, 0
  field :THREAD_STATUS_ACTIVE, 1
  field :THREAD_STATUS_WAITING, 2
  field :THREAD_STATUS_CLOSED, 3
  field :THREAD_STATUS_DELETED, 4
end

defmodule Devbox.V1.InteractionKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.InteractionKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :INTERACTION_KIND_UNSPECIFIED, 0
  field :INTERACTION_KIND_PERMISSION, 1
  field :INTERACTION_KIND_ELICITATION_FORM, 2
  field :INTERACTION_KIND_ELICITATION_URL, 3
end

defmodule Devbox.V1.InteractionState do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.InteractionState",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :INTERACTION_STATE_UNSPECIFIED, 0
  field :INTERACTION_STATE_PENDING, 1
  field :INTERACTION_STATE_ANSWERED, 2
  field :INTERACTION_STATE_CANCELLED, 3
  field :INTERACTION_STATE_EXPIRED, 4
end

defmodule Devbox.V1.ProbeStatus do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.ProbeStatus",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :PROBE_STATUS_UNSPECIFIED, 0
  field :PROBE_STATUS_OK, 1
  field :PROBE_STATUS_FAILED, 2
  field :PROBE_STATUS_MISSING, 3
end

defmodule Devbox.V1.Annotations do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.Annotations",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :audience, 1, repeated: true, type: :string
  field :priority, 2, proto3_optional: true, type: :double
  field :last_modified, 3, type: :string, json_name: "lastModified"
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ContentBlock do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ContentBlock",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :block, 0

  field :text, 1, type: Devbox.V1.TextContent, oneof: 0
  field :image, 2, type: Devbox.V1.ImageContent, oneof: 0
  field :audio, 3, type: Devbox.V1.AudioContent, oneof: 0
  field :resource, 4, type: Devbox.V1.EmbeddedResource, oneof: 0
  field :resource_link, 5, type: Devbox.V1.ResourceLink, json_name: "resourceLink", oneof: 0
  field :unknown, 15, type: Devbox.V1.UnknownVariant, oneof: 0
end

defmodule Devbox.V1.TextContent do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TextContent",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :text, 1, type: :string
  field :annotations, 2, type: Devbox.V1.Annotations
  field :meta, 3, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ImageContent do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ImageContent",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :string
  field :mime_type, 2, type: :string, json_name: "mimeType"
  field :uri, 3, type: :string
  field :annotations, 4, type: Devbox.V1.Annotations
  field :meta, 5, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.AudioContent do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AudioContent",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :string
  field :mime_type, 2, type: :string, json_name: "mimeType"
  field :annotations, 3, type: Devbox.V1.Annotations
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ResourceLink do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ResourceLink",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :uri, 1, type: :string
  field :name, 2, type: :string
  field :title, 3, type: :string
  field :description, 4, type: :string
  field :mime_type, 5, type: :string, json_name: "mimeType"
  field :size, 6, proto3_optional: true, type: :int64
  field :annotations, 7, type: Devbox.V1.Annotations
  field :meta, 8, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.EmbeddedResource do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.EmbeddedResource",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :resource, 0

  field :text, 1, type: Devbox.V1.TextResourceContents, oneof: 0
  field :blob, 2, type: Devbox.V1.BlobResourceContents, oneof: 0
  field :unknown, 15, type: Devbox.V1.UnknownVariant, oneof: 0
  field :annotations, 3, type: Devbox.V1.Annotations
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.TextResourceContents do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TextResourceContents",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :uri, 1, type: :string
  field :mime_type, 2, type: :string, json_name: "mimeType"
  field :text, 3, type: :string
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.BlobResourceContents do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.BlobResourceContents",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :uri, 1, type: :string
  field :mime_type, 2, type: :string, json_name: "mimeType"
  field :blob, 3, type: :string
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.UnknownVariant do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.UnknownVariant",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :type, 1, type: :string
  field :raw_json, 2, type: :bytes, json_name: "rawJson"
end

defmodule Devbox.V1.ToolCall do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ToolCall",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :tool_call_id, 1, type: :string, json_name: "toolCallId"
  field :title, 2, type: :string
  field :kind, 3, type: :string
  field :status, 4, type: :string
  field :content, 5, repeated: true, type: Devbox.V1.ToolCallContent
  field :locations, 6, repeated: true, type: Devbox.V1.ToolCallLocation
  field :raw_input, 7, type: Google.Protobuf.Value, json_name: "rawInput"
  field :raw_output, 8, type: Google.Protobuf.Value, json_name: "rawOutput"
  field :meta, 9, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ToolCallContent do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ToolCallContent",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :content, 0

  field :block, 1, type: Devbox.V1.ContentBlock, oneof: 0
  field :diff, 2, type: Devbox.V1.Diff, oneof: 0
  field :terminal, 3, type: Devbox.V1.TerminalRef, oneof: 0
  field :unknown, 15, type: Devbox.V1.UnknownVariant, oneof: 0
end

defmodule Devbox.V1.Diff do
  @moduledoc false

  use Protobuf, full_name: "devbox.v1.Diff", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :path, 1, type: :string
  field :old_text, 2, proto3_optional: true, type: :string, json_name: "oldText"
  field :new_text, 3, type: :string, json_name: "newText"
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.TerminalRef do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalRef",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :terminal_id, 1, type: :string, json_name: "terminalId"
  field :meta, 2, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ToolCallLocation do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ToolCallLocation",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :line, 2, proto3_optional: true, type: :int64
  field :meta, 3, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.EntityKey do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.EntityKey",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :session_id, 1, type: :string, json_name: "sessionId"
  field :type, 2, type: Devbox.V1.EntityType, enum: true
  field :id, 3, type: :string
end

defmodule Devbox.V1.AcpEntity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AcpEntity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :body, 0

  field :key, 1, type: Devbox.V1.EntityKey
  field :position, 2, type: :uint64
  field :revision, 3, type: :uint64
  field :created_at, 4, type: Google.Protobuf.Timestamp, json_name: "createdAt"
  field :updated_at, 5, type: Google.Protobuf.Timestamp, json_name: "updatedAt"
  field :settled, 6, type: :bool
  field :acp_json, 7, type: :bytes, json_name: "acpJson"
  field :message, 10, type: Devbox.V1.MessageEntity, oneof: 0

  field :session_message, 11,
    type: Devbox.V1.SessionMessageEntity,
    json_name: "sessionMessage",
    oneof: 0

  field :tool_call, 12, type: Devbox.V1.ToolCall, json_name: "toolCall", oneof: 0
  field :plan, 13, type: Devbox.V1.PlanEntity, oneof: 0
  field :terminal, 14, type: Devbox.V1.TerminalEntity, oneof: 0
  field :compaction, 15, type: Devbox.V1.CompactionEntity, oneof: 0
  field :unknown, 20, type: Devbox.V1.UnknownVariant, oneof: 0
end

defmodule Devbox.V1.MessageEntity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.MessageEntity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :message_id, 1, type: :string, json_name: "messageId"
  field :content, 2, repeated: true, type: Devbox.V1.ContentBlock
  field :prompt_id, 3, type: :string, json_name: "promptId"
  field :sent_by, 4, type: Devbox.V1.Principal, json_name: "sentBy"
  field :meta, 5, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.SessionMessageEntity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.SessionMessageEntity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :message_id, 1, type: :string, json_name: "messageId"
  field :from_session_id, 2, type: :string, json_name: "fromSessionId"
  field :to_session_id, 3, type: :string, json_name: "toSessionId"
  field :content, 4, repeated: true, type: Devbox.V1.ContentBlock
  field :meta, 5, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.PlanEntity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PlanEntity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :plan_id, 1, type: :string, json_name: "planId"
  field :entries, 2, repeated: true, type: Devbox.V1.PlanEntry
  field :meta, 3, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.PlanEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PlanEntry",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :content, 1, type: :string
  field :priority, 2, type: :string
  field :status, 3, type: :string
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.TerminalEntity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalEntity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :terminal_id, 1, type: :string, json_name: "terminalId"
  field :command, 2, type: :string
  field :args, 3, repeated: true, type: :string
  field :cwd, 4, type: :string
  field :output, 5, type: :string
  field :truncated, 6, type: :bool
  field :exit_status, 7, type: Devbox.V1.TerminalExitStatus, json_name: "exitStatus"
  field :meta, 8, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.TerminalExitStatus do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalExitStatus",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :exit_code, 1, proto3_optional: true, type: :int32, json_name: "exitCode"
  field :signal, 2, type: :string
end

defmodule Devbox.V1.CompactionEntity do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CompactionEntity",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :compaction_id, 1, type: :string, json_name: "compactionId"
  field :status, 2, type: :string
  field :summary, 3, repeated: true, type: Devbox.V1.ContentBlock
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ForegroundState do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ForegroundState",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :state, 1, type: Devbox.V1.ForegroundStateKind, enum: true
  field :stop_reason, 2, type: :string, json_name: "stopReason"
  field :error, 3, type: Devbox.V1.AgentError
  field :background_work, 4, type: Google.Protobuf.Value, json_name: "backgroundWork"
  field :updated_at, 5, type: Google.Protobuf.Timestamp, json_name: "updatedAt"
  field :meta, 6, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.AgentError do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AgentError",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :detail, 1, type: Devbox.V1.ErrorDetail
  field :code, 2, type: :int32
  field :message, 3, type: :string
  field :data, 4, type: Google.Protobuf.Value
end

defmodule Devbox.V1.ConfigOption do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ConfigOption",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :id, 1, type: :string
  field :name, 2, type: :string
  field :description, 3, type: :string
  field :category, 4, type: :string
  field :type, 5, type: :string
  field :current_value, 6, type: :string, json_name: "currentValue"
  field :options, 7, repeated: true, type: Devbox.V1.ConfigOptionValue
  field :meta, 8, type: Google.Protobuf.Struct
  field :raw_json, 9, type: :bytes, json_name: "rawJson"
end

defmodule Devbox.V1.ConfigOptionValue do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ConfigOptionValue",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :value, 1, type: :string
  field :name, 2, type: :string
  field :description, 3, type: :string
  field :group, 4, type: :string
  field :meta, 5, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.AvailableCommand do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AvailableCommand",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :name, 1, type: :string
  field :description, 2, type: :string
  field :input, 3, type: Devbox.V1.CommandInput
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.CommandInput do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CommandInput",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :type, 1, type: :string
  field :hint, 2, type: :string
end

defmodule Devbox.V1.Usage do
  @moduledoc false

  use Protobuf, full_name: "devbox.v1.Usage", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :used, 1, type: :int64
  field :size, 2, type: :int64
  field :cost, 3, type: Devbox.V1.Cost
  field :billing, 4, type: Devbox.V1.BillingMode, enum: true
  field :meta, 5, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.Cost do
  @moduledoc false

  use Protobuf, full_name: "devbox.v1.Cost", protoc_gen_elixir_version: "0.16.0", syntax: :proto3

  field :amount, 1, type: :double
  field :currency, 2, type: :string
end

defmodule Devbox.V1.Session do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.Session",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :thread_id, 1, type: :string, json_name: "threadId"
  field :session_id, 2, type: :string, json_name: "sessionId"
  field :kind, 3, type: Devbox.V1.SessionKind, enum: true
  field :parent_session_id, 4, type: :string, json_name: "parentSessionId"
  field :agent, 5, type: Devbox.V1.AgentType, enum: true
  field :title, 6, type: :string
  field :cwd, 7, type: :string
  field :worktree_repos, 8, repeated: true, type: :string, json_name: "worktreeRepos"
  field :status, 9, type: Devbox.V1.ThreadStatus, enum: true
  field :created_by, 10, type: Devbox.V1.Principal, json_name: "createdBy"
  field :created_at, 11, type: Google.Protobuf.Timestamp, json_name: "createdAt"
  field :last_activity_at, 12, type: Google.Protobuf.Timestamp, json_name: "lastActivityAt"
  field :entity_count, 13, type: :uint64, json_name: "entityCount"
  field :foreground, 14, type: Devbox.V1.ForegroundState

  field :config_options, 15,
    repeated: true,
    type: Devbox.V1.ConfigOption,
    json_name: "configOptions"

  field :available_commands, 16,
    repeated: true,
    type: Devbox.V1.AvailableCommand,
    json_name: "availableCommands"

  field :usage, 17, type: Devbox.V1.Usage
  field :imported, 18, type: :bool
  field :revision, 19, type: :uint64
  field :meta, 20, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ImportableSession do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ImportableSession",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :agent, 1, type: Devbox.V1.AgentType, enum: true
  field :session_id, 2, type: :string, json_name: "sessionId"
  field :title, 3, type: :string
  field :cwd, 4, type: :string
  field :updated_at, 5, type: Google.Protobuf.Timestamp, json_name: "updatedAt"
  field :meta, 6, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.Interaction do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.Interaction",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :request, 0

  field :interaction_id, 1, type: :string, json_name: "interactionId"
  field :session_id, 2, type: :string, json_name: "sessionId"
  field :thread_id, 3, type: :string, json_name: "threadId"
  field :jsonrpc_id, 4, type: :string, json_name: "jsonrpcId"
  field :tool_call_id, 5, type: :string, json_name: "toolCallId"
  field :kind, 6, type: Devbox.V1.InteractionKind, enum: true
  field :state, 7, type: Devbox.V1.InteractionState, enum: true
  field :title, 8, type: :string
  field :permission, 10, type: Devbox.V1.PermissionRequest, oneof: 0
  field :elicitation, 11, type: Devbox.V1.ElicitationRequest, oneof: 0
  field :response, 12, type: Devbox.V1.InteractionResponse
  field :answered_by, 13, type: Devbox.V1.Principal, json_name: "answeredBy"
  field :answered_at, 14, type: Google.Protobuf.Timestamp, json_name: "answeredAt"
  field :created_at, 15, type: Google.Protobuf.Timestamp, json_name: "createdAt"
  field :revision, 16, type: :uint64
  field :raw_json, 17, type: :bytes, json_name: "rawJson"
  field :review, 18, type: Devbox.V1.Review
end

defmodule Devbox.V1.Review do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.Review",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :verdict, 1, type: :string
  field :confidence, 2, type: :double
  field :risk, 3, type: :string
  field :model, 4, type: :string
  field :escalation, 5, type: :string
end

defmodule Devbox.V1.PermissionRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PermissionRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :options, 1, repeated: true, type: Devbox.V1.PermissionOption
  field :tool_call, 2, type: Devbox.V1.ToolCall, json_name: "toolCall"
  field :meta, 3, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.PermissionOption do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PermissionOption",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :option_id, 1, type: :string, json_name: "optionId"
  field :name, 2, type: :string
  field :kind, 3, type: :string
  field :meta, 4, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.ElicitationRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ElicitationRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :message, 1, type: :string
  field :requested_schema, 2, type: Google.Protobuf.Struct, json_name: "requestedSchema"
  field :url, 3, type: :string
  field :elicitation_id, 4, type: :string, json_name: "elicitationId"
  field :meta, 5, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.InteractionResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.InteractionResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :response, 0

  field :permission, 1, type: Devbox.V1.PermissionOutcome, oneof: 0
  field :elicitation, 2, type: Devbox.V1.ElicitationResponse, oneof: 0
end

defmodule Devbox.V1.PermissionOutcome do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.PermissionOutcome",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :outcome, 0

  field :selected_option_id, 1, type: :string, json_name: "selectedOptionId", oneof: 0
  field :cancelled, 2, type: :bool, oneof: 0
end

defmodule Devbox.V1.ElicitationResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ElicitationResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :action, 1, type: :string
  field :content, 2, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.LifecycleSupport do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.LifecycleSupport",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :list, 1, type: :bool
  field :resume, 2, type: :bool
  field :load, 3, type: :bool
  field :close, 4, type: :bool
  field :delete, 5, type: :bool
  field :fork, 6, type: :bool
  field :replay, 7, type: :bool
end

defmodule Devbox.V1.AgentCapabilities do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AgentCapabilities",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :lifecycle, 1, type: Devbox.V1.LifecycleSupport
  field :prompt_image, 2, type: :bool, json_name: "promptImage"
  field :prompt_audio, 3, type: :bool, json_name: "promptAudio"
  field :prompt_embedded_context, 4, type: :bool, json_name: "promptEmbeddedContext"
  field :mcp_http, 5, type: :bool, json_name: "mcpHttp"
  field :subagents, 6, type: :bool
  field :elicitation, 7, type: :bool
  field :raw, 15, type: Google.Protobuf.Struct
end

defmodule Devbox.V1.AgentCatalogEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AgentCatalogEntry",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :type, 1, type: Devbox.V1.AgentType, enum: true
  field :is_default, 2, type: :bool, json_name: "isDefault"
  field :adapter_name, 3, type: :string, json_name: "adapterName"
  field :adapter_version, 4, type: :string, json_name: "adapterVersion"
  field :protocol_version, 5, type: :int32, json_name: "protocolVersion"
  field :capabilities, 6, type: Devbox.V1.AgentCapabilities
  field :models, 7, repeated: true, type: Devbox.V1.ConfigOptionValue
  field :current_model, 8, type: :string, json_name: "currentModel"
  field :default_model, 9, type: :string, json_name: "defaultModel"
  field :model_switchable, 10, type: :bool, json_name: "modelSwitchable"
  field :model_config_option_id, 11, type: :string, json_name: "modelConfigOptionId"

  field :config_options, 12,
    repeated: true,
    type: Devbox.V1.ConfigOption,
    json_name: "configOptions"

  field :initial_commands, 13,
    repeated: true,
    type: Devbox.V1.AvailableCommand,
    json_name: "initialCommands"

  field :probe_status, 14, type: Devbox.V1.ProbeStatus, json_name: "probeStatus", enum: true
  field :probe_error, 15, type: :string, json_name: "probeError"
  field :probed_at, 16, type: Google.Protobuf.Timestamp, json_name: "probedAt"
end

defmodule Devbox.V1.AgentConnection do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AgentConnection",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :agent, 1, type: Devbox.V1.AgentType, enum: true
  field :protocol_version, 2, type: :int32, json_name: "protocolVersion"
  field :adapter_name, 3, type: :string, json_name: "adapterName"
  field :adapter_version, 4, type: :string, json_name: "adapterVersion"
  field :capabilities, 5, type: Devbox.V1.AgentCapabilities
  field :billing, 6, type: Devbox.V1.BillingMode, enum: true
  field :state, 7, type: :string
  field :error, 8, type: Devbox.V1.AgentError
end
