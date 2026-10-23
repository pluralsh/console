defmodule Pseudofs.V1.Durability do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "pseudofs.v1.Durability",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :ACK_UNSPECIFIED, 0
  field :APPLIED, 1
  field :WRITTEN, 2
  field :DURABLE, 3
end

defmodule Pseudofs.V1.FileKind do
  @moduledoc false

  use Protobuf,
    enum: true,
    full_name: "pseudofs.v1.FileKind",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :TYPE_UNSPECIFIED, 0
  field :FILE, 1
  field :DIRECTORY, 2
end

defmodule Pseudofs.V1.Empty do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.Empty",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Pseudofs.V1.PathRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.PathRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :tenant, 2, type: :string
end

defmodule Pseudofs.V1.PathResponse do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.PathResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
end

defmodule Pseudofs.V1.BoolResponse do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.BoolResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :value, 1, type: :bool
end

defmodule Pseudofs.V1.TextResponse do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.TextResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :value, 1, type: :string
end

defmodule Pseudofs.V1.BytesResponse do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.BytesResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :value, 1, type: :bytes
end

defmodule Pseudofs.V1.FileChunk do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.FileChunk",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
end

defmodule Pseudofs.V1.WriteTextRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.WriteTextRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :value, 2, type: :string
  field :durability, 3, type: Pseudofs.V1.Durability, enum: true
  field :tenant, 4, type: :string
end

defmodule Pseudofs.V1.WriteBytesRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.WriteBytesRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :value, 2, type: :bytes
  field :durability, 3, type: Pseudofs.V1.Durability, enum: true
  field :tenant, 4, type: :string
end

defmodule Pseudofs.V1.MutationPathRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.MutationPathRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :durability, 2, type: Pseudofs.V1.Durability, enum: true
  field :tenant, 3, type: :string
end

defmodule Pseudofs.V1.WriteResponse do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.WriteResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :size, 1, type: :uint64
end

defmodule Pseudofs.V1.OpenRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.OpenRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :mode, 2, type: :string
  field :durability, 3, type: Pseudofs.V1.Durability, enum: true
  field :tenant, 4, type: :string
end

defmodule Pseudofs.V1.FileHandle do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.FileHandle",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :mode, 2, type: :string
  field :position, 3, type: :uint64
  field :tenant, 4, type: :string
end

defmodule Pseudofs.V1.MkdirRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.MkdirRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :parents, 2, type: :bool
  field :exist_ok, 3, type: :bool, json_name: "existOk"
  field :tenant, 4, type: :string
end

defmodule Pseudofs.V1.RenameRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.RenameRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :source, 1, type: :string
  field :target, 2, type: :string
  field :durability, 3, type: Pseudofs.V1.Durability, enum: true
  field :tenant, 4, type: :string
end

defmodule Pseudofs.V1.DirectoryEntry do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.DirectoryEntry",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :name, 2, type: :string
  field :kind, 3, type: Pseudofs.V1.FileKind, enum: true
end

defmodule Pseudofs.V1.StatResponse do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.StatResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :kind, 1, type: Pseudofs.V1.FileKind, enum: true
  field :mode, 2, type: :uint32
  field :size, 3, type: :uint64
  field :atime, 4, type: :double
  field :mtime, 5, type: :double
  field :ctime, 6, type: :double
end

defmodule Pseudofs.V1.WriteFileStart do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.WriteFileStart",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :durability, 2, type: Pseudofs.V1.Durability, enum: true
  field :tenant, 3, type: :string
end

defmodule Pseudofs.V1.WriteFileRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.WriteFileRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :payload, 0

  field :start, 1, type: Pseudofs.V1.WriteFileStart, oneof: 0
  field :chunk, 2, type: :bytes, oneof: 0
end

defmodule Pseudofs.V1.StreamFileRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.StreamFileRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :tenant, 2, type: :string
  field :offset, 3, type: :uint64
  field :length, 4, proto3_optional: true, type: :uint64
end

defmodule Pseudofs.V1.GlobRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.GlobRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :tenant, 1, type: :string
  field :pattern, 2, type: :string
  field :max_results, 3, type: :uint32, json_name: "maxResults"
end

defmodule Pseudofs.V1.GrepRequest do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.GrepRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :tenant, 1, type: :string
  field :path, 2, type: :string
  field :pattern, 3, type: :string
  field :fixed_string, 4, type: :bool, json_name: "fixedString"
  field :case_insensitive, 5, type: :bool, json_name: "caseInsensitive"
  field :before_context, 6, type: :uint32, json_name: "beforeContext"
  field :after_context, 7, type: :uint32, json_name: "afterContext"
  field :max_matches, 8, type: :uint32, json_name: "maxMatches"
  field :max_file_size_bytes, 9, type: :uint64, json_name: "maxFileSizeBytes"
end

defmodule Pseudofs.V1.GrepLine do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.GrepLine",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :line_number, 1, type: :uint64, json_name: "lineNumber"
  field :text, 2, type: :string
end

defmodule Pseudofs.V1.GrepMatch do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.GrepMatch",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :path, 1, type: :string
  field :line_number, 2, type: :uint64, json_name: "lineNumber"
  field :line, 3, type: :string
  field :before, 4, repeated: true, type: Pseudofs.V1.GrepLine
  field :after, 5, repeated: true, type: Pseudofs.V1.GrepLine
end

defmodule Pseudofs.V1.ErrorDetail do
  @moduledoc false

  use Protobuf,
    full_name: "pseudofs.v1.ErrorDetail",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :kind, 1, type: :string
  field :path, 2, type: :string
end

defmodule Pseudofs.V1.PseudoFS.Service do
  @moduledoc false

  use GRPC.Service, name: "pseudofs.v1.PseudoFS", protoc_gen_elixir_version: "0.16.0"

  rpc :Exists, Pseudofs.V1.PathRequest, Pseudofs.V1.BoolResponse

  rpc :IsFile, Pseudofs.V1.PathRequest, Pseudofs.V1.BoolResponse

  rpc :IsDir, Pseudofs.V1.PathRequest, Pseudofs.V1.BoolResponse

  rpc :IsSymlink, Pseudofs.V1.PathRequest, Pseudofs.V1.BoolResponse

  rpc :ReadText, Pseudofs.V1.PathRequest, Pseudofs.V1.TextResponse

  rpc :ReadBytes, Pseudofs.V1.PathRequest, Pseudofs.V1.BytesResponse

  rpc :WriteText, Pseudofs.V1.WriteTextRequest, Pseudofs.V1.WriteResponse

  rpc :WriteBytes, Pseudofs.V1.WriteBytesRequest, Pseudofs.V1.WriteResponse

  rpc :AppendText, Pseudofs.V1.WriteTextRequest, Pseudofs.V1.WriteResponse

  rpc :AppendBytes, Pseudofs.V1.WriteBytesRequest, Pseudofs.V1.WriteResponse

  rpc :Open, Pseudofs.V1.OpenRequest, Pseudofs.V1.FileHandle

  rpc :Mkdir, Pseudofs.V1.MkdirRequest, Pseudofs.V1.Empty

  rpc :Unlink, Pseudofs.V1.MutationPathRequest, Pseudofs.V1.Empty

  rpc :Rmdir, Pseudofs.V1.MutationPathRequest, Pseudofs.V1.Empty

  rpc :Iterdir, Pseudofs.V1.PathRequest, stream(Pseudofs.V1.DirectoryEntry)

  rpc :Stat, Pseudofs.V1.PathRequest, Pseudofs.V1.StatResponse

  rpc :Rename, Pseudofs.V1.RenameRequest, Pseudofs.V1.PathResponse

  rpc :Resolve, Pseudofs.V1.PathRequest, Pseudofs.V1.PathResponse

  rpc :Absolute, Pseudofs.V1.PathRequest, Pseudofs.V1.PathResponse

  rpc :StreamFile, Pseudofs.V1.StreamFileRequest, stream(Pseudofs.V1.FileChunk)

  rpc :WriteFile, stream(Pseudofs.V1.WriteFileRequest), Pseudofs.V1.WriteResponse

  rpc :Glob, Pseudofs.V1.GlobRequest, stream(Pseudofs.V1.DirectoryEntry)

  rpc :Grep, Pseudofs.V1.GrepRequest, stream(Pseudofs.V1.GrepMatch)
end

defmodule Pseudofs.V1.PseudoFS.Stub do
  @moduledoc false

  use GRPC.Stub, service: Pseudofs.V1.PseudoFS.Service
end
