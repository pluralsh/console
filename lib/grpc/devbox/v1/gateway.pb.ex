defmodule Devbox.V1.MetadataValues do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.MetadataValues",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :value, 1, repeated: true, type: :string
end

defmodule Devbox.V1.TunnelMethod do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelMethod",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :name, 1, type: :string
end

defmodule Devbox.V1.TunnelService do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelService",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :name, 1, type: :string
  field :methods, 2, repeated: true, type: Devbox.V1.TunnelMethod
end

defmodule Devbox.V1.TunnelAgentDescriptor do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelAgentDescriptor",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :services, 1, repeated: true, type: Devbox.V1.TunnelService
end

defmodule Devbox.V1.TunnelDescriptor do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelDescriptor",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :agent_descriptor, 1, type: Devbox.V1.TunnelAgentDescriptor, json_name: "agentDescriptor"
end

defmodule Devbox.V1.TunnelHeader.MetaEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelHeader.MetaEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: Devbox.V1.MetadataValues
end

defmodule Devbox.V1.TunnelHeader do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelHeader",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :meta, 1, repeated: true, type: Devbox.V1.TunnelHeader.MetaEntry, map: true
end

defmodule Devbox.V1.TunnelMessage do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelMessage",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
end

defmodule Devbox.V1.TunnelTrailer.MetaEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelTrailer.MetaEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: Devbox.V1.MetadataValues
end

defmodule Devbox.V1.TunnelTrailer do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelTrailer",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :meta, 1, repeated: true, type: Devbox.V1.TunnelTrailer.MetaEntry, map: true
end

defmodule Devbox.V1.TunnelStatus do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelStatus",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :code, 1, type: :int32
  field :message, 2, type: :string
  field :details, 3, repeated: true, type: Google.Protobuf.Any
end

defmodule Devbox.V1.TunnelError do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelError",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :status, 1, type: Devbox.V1.TunnelStatus
end

defmodule Devbox.V1.TunnelConnectRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelConnectRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :msg, 0

  field :descriptor, 1, type: Devbox.V1.TunnelDescriptor, oneof: 0
  field :header, 2, type: Devbox.V1.TunnelHeader, oneof: 0
  field :message, 3, type: Devbox.V1.TunnelMessage, oneof: 0
  field :trailer, 4, type: Devbox.V1.TunnelTrailer, oneof: 0
  field :error, 5, type: Devbox.V1.TunnelError, oneof: 0
end

defmodule Devbox.V1.TunnelRequestInfo.MetaEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelRequestInfo.MetaEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: Devbox.V1.MetadataValues
end

defmodule Devbox.V1.TunnelRequestInfo do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelRequestInfo",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :method_name, 1, type: :string, json_name: "methodName"
  field :meta, 2, repeated: true, type: Devbox.V1.TunnelRequestInfo.MetaEntry, map: true
end

defmodule Devbox.V1.TunnelCloseSend do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelCloseSend",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.TunnelConnectResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.TunnelConnectResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :msg, 0

  field :request_info, 1, type: Devbox.V1.TunnelRequestInfo, json_name: "requestInfo", oneof: 0
  field :message, 2, type: Devbox.V1.TunnelMessage, oneof: 0
  field :close_send, 3, type: Devbox.V1.TunnelCloseSend, json_name: "closeSend", oneof: 0
end

defmodule Devbox.V1.HttpRequestLine.HeaderEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequestLine.HeaderEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: Devbox.V1.MetadataValues
end

defmodule Devbox.V1.HttpRequestLine.QueryEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequestLine.QueryEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: Devbox.V1.MetadataValues
end

defmodule Devbox.V1.HttpRequestLine do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequestLine",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :method, 1, type: :string
  field :header, 2, repeated: true, type: Devbox.V1.HttpRequestLine.HeaderEntry, map: true
  field :url_path, 3, type: :string, json_name: "urlPath"
  field :query, 4, repeated: true, type: Devbox.V1.HttpRequestLine.QueryEntry, map: true
end

defmodule Devbox.V1.HttpResponseLine.HeaderEntry do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponseLine.HeaderEntry",
    map: true,
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: Devbox.V1.MetadataValues
end

defmodule Devbox.V1.HttpResponseLine do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponseLine",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :status_code, 1, type: :int32, json_name: "statusCode"
  field :status, 2, type: :string
  field :header, 3, repeated: true, type: Devbox.V1.HttpResponseLine.HeaderEntry, map: true
end

defmodule Devbox.V1.HttpRequest.Header do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequest.Header",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :request, 1, type: Devbox.V1.HttpRequestLine
  field :extra, 2, type: Google.Protobuf.Any
  field :content_length, 3, proto3_optional: true, type: :int64, json_name: "contentLength"
end

defmodule Devbox.V1.HttpRequest.Data do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequest.Data",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
end

defmodule Devbox.V1.HttpRequest.Trailer do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequest.Trailer",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.HttpRequest.UpgradeData do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequest.UpgradeData",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
end

defmodule Devbox.V1.HttpRequest do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpRequest",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :message, 0

  field :header, 1, type: Devbox.V1.HttpRequest.Header, oneof: 0
  field :data, 2, type: Devbox.V1.HttpRequest.Data, oneof: 0
  field :trailer, 3, type: Devbox.V1.HttpRequest.Trailer, oneof: 0

  field :upgrade_data, 4,
    type: Devbox.V1.HttpRequest.UpgradeData,
    json_name: "upgradeData",
    oneof: 0
end

defmodule Devbox.V1.HttpResponse.Header do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponse.Header",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :response, 1, type: Devbox.V1.HttpResponseLine
end

defmodule Devbox.V1.HttpResponse.Data do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponse.Data",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
end

defmodule Devbox.V1.HttpResponse.Trailer do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponse.Trailer",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3
end

defmodule Devbox.V1.HttpResponse.UpgradeData do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponse.UpgradeData",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :data, 1, type: :bytes
end

defmodule Devbox.V1.HttpResponse do
  @moduledoc false

  use Protobuf,
    full_name: "devbox.v1.HttpResponse",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  oneof :message, 0

  field :header, 1, type: Devbox.V1.HttpResponse.Header, oneof: 0
  field :data, 2, type: Devbox.V1.HttpResponse.Data, oneof: 0
  field :trailer, 3, type: Devbox.V1.HttpResponse.Trailer, oneof: 0

  field :upgrade_data, 4,
    type: Devbox.V1.HttpResponse.UpgradeData,
    json_name: "upgradeData",
    oneof: 0
end

defmodule Devbox.V1.Gateway.Service do
  @moduledoc false

  use GRPC.Service, name: "devbox.v1.Gateway", protoc_gen_elixir_version: "0.16.0"

  rpc :CreateInstance, Devbox.V1.CreateInstanceRequest, Devbox.V1.CreateInstanceResponse

  rpc :StartFromSnapshot, Devbox.V1.StartFromSnapshotRequest, Devbox.V1.CreateInstanceResponse

  rpc :CancelInstance, Devbox.V1.InstanceActionRequest, Devbox.V1.InstanceActionResponse

  rpc :SuspendInstance, Devbox.V1.InstanceActionRequest, Devbox.V1.InstanceActionResponse

  rpc :ResumeInstance, Devbox.V1.InstanceActionRequest, Devbox.V1.InstanceActionResponse

  rpc :SnapshotInstance, Devbox.V1.SnapshotInstanceRequest, Devbox.V1.SnapshotInstanceResponse

  rpc :DeleteSnapshot, Devbox.V1.DeleteSnapshotRequest, Devbox.V1.DeleteSnapshotResponse

  rpc :SetAgentBilling, Devbox.V1.SetAgentBillingRequest, Devbox.V1.SetAgentBillingResponse

  rpc :RebaseInstance, Devbox.V1.RebaseInstanceRequest, Devbox.V1.RebaseInstanceResponse

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

  rpc :ProxyStream, stream(Devbox.V1.HttpRequest), stream(Devbox.V1.HttpResponse)
end

defmodule Devbox.V1.Gateway.Stub do
  @moduledoc false

  use GRPC.Stub, service: Devbox.V1.Gateway.Service
end

defmodule Devbox.V1.Tunnel.Service do
  @moduledoc false

  use GRPC.Service, name: "devbox.v1.Tunnel", protoc_gen_elixir_version: "0.16.0"

  rpc :Connect, stream(Devbox.V1.TunnelConnectRequest), stream(Devbox.V1.TunnelConnectResponse)
end

defmodule Devbox.V1.Tunnel.Stub do
  @moduledoc false

  use GRPC.Stub, service: Devbox.V1.Tunnel.Service
end
