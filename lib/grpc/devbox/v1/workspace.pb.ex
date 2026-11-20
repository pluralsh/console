defmodule Devbox.V1.FileType do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.FileType",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :FILE_TYPE_UNSPECIFIED, 0
  field :FILE_TYPE_FILE, 1
  field :FILE_TYPE_DIRECTORY, 2
  field :FILE_TYPE_SYMLINK, 3
  field :FILE_TYPE_OTHER, 4
end

defmodule Devbox.V1.FileEventType do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.FileEventType",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :FILE_EVENT_TYPE_UNSPECIFIED, 0
  field :FILE_EVENT_TYPE_CREATED, 1
  field :FILE_EVENT_TYPE_MODIFIED, 2
  field :FILE_EVENT_TYPE_DELETED, 3
  field :FILE_EVENT_TYPE_RENAMED, 4
end

defmodule Devbox.V1.ChangesBase do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.ChangesBase",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :CHANGES_BASE_UNSPECIFIED, 0
  field :CHANGES_BASE_HEAD, 1
  field :CHANGES_BASE_DEFAULT_BRANCH, 2
  field :CHANGES_BASE_LAST_COMMIT, 3
end

defmodule Devbox.V1.ChangeStatus do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "devbox.v1.ChangeStatus",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :CHANGE_STATUS_UNSPECIFIED, 0
  field :CHANGE_STATUS_ADDED, 1
  field :CHANGE_STATUS_MODIFIED, 2
  field :CHANGE_STATUS_DELETED, 3
  field :CHANGE_STATUS_RENAMED, 4
  field :CHANGE_STATUS_COPIED, 5
  field :CHANGE_STATUS_UNTRACKED, 6
  field :CHANGE_STATUS_CONFLICTED, 7
  field :CHANGE_STATUS_TYPE_CHANGED, 8
end

defmodule Devbox.V1.ListRepositoriesRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListRepositoriesRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :include_worktrees, 2, type: :bool, json_name: "includeWorktrees"
end

defmodule Devbox.V1.ListRepositoriesResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListRepositoriesResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :checkouts, 1, repeated: true, type: Devbox.V1.Checkout
  field :project_md_path, 2, type: :string, json_name: "projectMdPath"
end

defmodule Devbox.V1.AddRepositoryRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AddRepositoryRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :repository, 2, type: Devbox.V1.RepositorySpec
  field :requested_by, 3, type: Devbox.V1.Principal, json_name: "requestedBy"
  field :idempotency_key, 4, type: :string, json_name: "idempotencyKey"
end

defmodule Devbox.V1.AddRepositoryResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.AddRepositoryResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :checkout, 1, type: Devbox.V1.Checkout
end

defmodule Devbox.V1.FileEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.FileEntry",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :name, 2, type: :string
  field :type, 3, type: Devbox.V1.FileType, enum: true
  field :size, 4, type: :int64
  field :mode, 5, type: :uint32
  field :modified_at, 6, type: Google.Protobuf.Timestamp, json_name: "modifiedAt"
  field :symlink_target, 7, type: :string, json_name: "symlinkTarget"
  field :repository, 8, type: :string
  field :git_status, 9, type: :string, json_name: "gitStatus"
end

defmodule Devbox.V1.ListFilesRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListFilesRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :path, 2, type: :string
  field :depth, 3, type: :int32
  field :include_hidden, 4, type: :bool, json_name: "includeHidden"
  field :respect_gitignore, 5, type: :bool, json_name: "respectGitignore"
  field :limit, 6, type: :int32
end

defmodule Devbox.V1.ListFilesResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListFilesResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :entries, 1, repeated: true, type: Devbox.V1.FileEntry
  field :truncated, 2, type: :bool
end

defmodule Devbox.V1.StatFileRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.StatFileRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :path, 2, type: :string
end

defmodule Devbox.V1.StatFileResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.StatFileResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :entry, 1, type: Devbox.V1.FileEntry
end

defmodule Devbox.V1.ReadFileRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReadFileRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :path, 2, type: :string
  field :offset, 3, type: :int64
  field :limit, 4, type: :int64
end

defmodule Devbox.V1.ReadFileResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ReadFileResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :entry, 1, type: Devbox.V1.FileEntry
  field :content, 2, type: :bytes
  field :sha256, 3, type: :string
  field :truncated, 4, type: :bool
  field :mime_type, 5, type: :string, json_name: "mimeType"
  field :binary, 6, type: :bool
end

defmodule Devbox.V1.WriteFileRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.WriteFileRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :path, 2, type: :string
  field :content, 3, type: :bytes
  field :expected_sha256, 4, proto3_optional: true, type: :string, json_name: "expectedSha256"
  field :create_parents, 5, type: :bool, json_name: "createParents"
  field :mode, 6, type: :uint32
  field :written_by, 7, type: Devbox.V1.Principal, json_name: "writtenBy"
end

defmodule Devbox.V1.WriteFileResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.WriteFileResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :entry, 1, type: Devbox.V1.FileEntry
  field :sha256, 2, type: :string
end

defmodule Devbox.V1.WatchFilesRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.WatchFilesRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :path, 2, type: :string
  field :recursive, 3, type: :bool
end

defmodule Devbox.V1.FileEvent do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.FileEvent",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :type, 1, type: Devbox.V1.FileEventType, enum: true
  field :path, 2, type: :string
  field :old_path, 3, type: :string, json_name: "oldPath"
  field :entry, 4, type: Devbox.V1.FileEntry
end

defmodule Devbox.V1.GetChangesRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetChangesRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :thread_id, 2, type: :string, json_name: "threadId"
  field :repositories, 3, repeated: true, type: :string
  field :base, 4, type: Devbox.V1.ChangesBase, enum: true
  field :include_diff, 5, type: :bool, json_name: "includeDiff"
  field :max_diff_bytes, 6, type: :int32, json_name: "maxDiffBytes"
  field :path, 7, type: :string
end

defmodule Devbox.V1.BranchDiffStatRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.BranchDiffStatRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :repository, 2, type: :string
  field :base, 3, type: :string
  field :head, 4, type: :string
end

defmodule Devbox.V1.BranchDiffStatResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.BranchDiffStatResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :additions, 1, type: :int32
  field :deletions, 2, type: :int32
  field :files, 3, type: :int32
  field :base_sha, 4, type: :string, json_name: "baseSha"
  field :head_sha, 5, type: :string, json_name: "headSha"
end

defmodule Devbox.V1.GetChangesResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetChangesResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :repositories, 1, repeated: true, type: Devbox.V1.RepositoryChanges
end

defmodule Devbox.V1.RepositoryChanges do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.RepositoryChanges",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :checkout, 1, type: Devbox.V1.Checkout
  field :base_ref, 2, type: :string, json_name: "baseRef"
  field :base_sha, 3, type: :string, json_name: "baseSha"
  field :files, 4, repeated: true, type: Devbox.V1.FileChange
  field :additions, 5, type: :int32
  field :deletions, 6, type: :int32
end

defmodule Devbox.V1.FileChange do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.FileChange",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :old_path, 2, type: :string, json_name: "oldPath"
  field :status, 3, type: Devbox.V1.ChangeStatus, enum: true
  field :staged, 4, type: :bool
  field :additions, 5, type: :int32
  field :deletions, 6, type: :int32
  field :binary, 7, type: :bool
  field :diff, 8, type: :string
  field :diff_truncated, 9, type: :bool, json_name: "diffTruncated"
end

defmodule Devbox.V1.TerminalInfo do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalInfo",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :terminal_id, 1, type: :string, json_name: "terminalId"
  field :cwd, 2, type: :string
  field :command, 3, type: :string
  field :cols, 4, type: :int32
  field :rows, 5, type: :int32
  field :created_at, 6, type: Google.Protobuf.Timestamp, json_name: "createdAt"
  field :foreground_command, 7, type: :string, json_name: "foregroundCommand"
  field :exited, 8, type: :bool
  field :exit_code, 9, proto3_optional: true, type: :int32, json_name: "exitCode"
  field :output_offset, 10, type: :uint64, json_name: "outputOffset"
  field :created_by, 11, type: Devbox.V1.Principal, json_name: "createdBy"
end

defmodule Devbox.V1.CreateTerminalRequest.EnvEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CreateTerminalRequest.EnvEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Devbox.V1.CreateTerminalRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CreateTerminalRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :terminal_id, 2, type: :string, json_name: "terminalId"
  field :cwd, 3, type: :string
  field :command, 4, type: :string
  field :args, 5, repeated: true, type: :string
  field :env, 6, repeated: true, type: Devbox.V1.CreateTerminalRequest.EnvEntry, map: true
  field :cols, 7, type: :int32
  field :rows, 8, type: :int32
  field :created_by, 9, type: Devbox.V1.Principal, json_name: "createdBy"
end

defmodule Devbox.V1.ListTerminalsRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListTerminalsRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
end

defmodule Devbox.V1.ListTerminalsResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ListTerminalsResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :terminals, 1, repeated: true, type: Devbox.V1.TerminalInfo
end

defmodule Devbox.V1.ResizeTerminalRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.ResizeTerminalRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :terminal_id, 2, type: :string, json_name: "terminalId"
  field :cols, 3, type: :int32
  field :rows, 4, type: :int32
end

defmodule Devbox.V1.CloseTerminalRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.CloseTerminalRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :terminal_id, 2, type: :string, json_name: "terminalId"
  field :signal, 3, type: :string
end

defmodule Devbox.V1.TerminalInput do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalInput",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :input, 0

  field :attach, 1, type: Devbox.V1.TerminalAttach, oneof: 0
  field :data, 2, type: :bytes, oneof: 0
  field :resize, 3, type: Devbox.V1.TerminalSize, oneof: 0
end

defmodule Devbox.V1.TerminalAttach do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalAttach",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :terminal_id, 1, type: :string, json_name: "terminalId"
  field :from_offset, 2, type: :uint64, json_name: "fromOffset"
end

defmodule Devbox.V1.TerminalSize do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalSize",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :cols, 1, type: :int32
  field :rows, 2, type: :int32
end

defmodule Devbox.V1.TerminalOutput do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalOutput",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :output, 0

  field :data, 1, type: Devbox.V1.TerminalData, oneof: 0
  field :info, 2, type: Devbox.V1.TerminalInfo, oneof: 0
  field :exit, 3, type: Devbox.V1.TerminalExit, oneof: 0
end

defmodule Devbox.V1.TerminalData do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalData",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
  field :offset, 2, type: :uint64
end

defmodule Devbox.V1.TerminalExit do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TerminalExit",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :exit_code, 1, proto3_optional: true, type: :int32, json_name: "exitCode"
  field :signal, 2, type: :string
end

defmodule Devbox.V1.StartBrowserRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.StartBrowserRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
  field :width, 2, type: :int32
  field :height, 3, type: :int32
  field :url, 4, type: :string
end

defmodule Devbox.V1.StopBrowserRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.StopBrowserRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
end

defmodule Devbox.V1.GetBrowserRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.GetBrowserRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :instance_id, 1, type: :string, json_name: "instanceId"
end

defmodule Devbox.V1.BrowserInfo do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.BrowserInfo",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :running, 1, type: :bool
  field :vnc_path, 2, type: :string, json_name: "vncPath"
  field :cdp_port, 3, type: :int32, json_name: "cdpPort"
  field :started_at, 4, type: Google.Protobuf.Timestamp, json_name: "startedAt"
  field :width, 5, type: :int32
  field :height, 6, type: :int32
end
