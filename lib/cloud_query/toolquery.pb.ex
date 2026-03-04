defmodule Toolquery.ElasticConnection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :url, 1, type: :string
  field :username, 2, type: :string
  field :password, 3, type: :string
  field :index, 4, type: :string
end

defmodule Toolquery.DatadogConnection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :site, 1, proto3_optional: true, type: :string
  field :apiKey, 2, type: :string
  field :appKey, 3, proto3_optional: true, type: :string
end

defmodule Toolquery.PrometheusConnection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :url, 1, type: :string
  field :token, 2, proto3_optional: true, type: :string
  field :username, 3, proto3_optional: true, type: :string
  field :password, 4, proto3_optional: true, type: :string
  field :tenant_id, 5, proto3_optional: true, type: :string, json_name: "tenantId"
end

defmodule Toolquery.LokiConnection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :url, 1, type: :string
  field :token, 2, proto3_optional: true, type: :string
  field :tenant_id, 3, proto3_optional: true, type: :string, json_name: "tenantId"
  field :username, 4, proto3_optional: true, type: :string
  field :password, 5, proto3_optional: true, type: :string
end

defmodule Toolquery.TempoConnection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :url, 1, type: :string
  field :token, 2, proto3_optional: true, type: :string
  field :tenant_id, 3, proto3_optional: true, type: :string, json_name: "tenantId"
  field :username, 4, proto3_optional: true, type: :string
  field :password, 5, proto3_optional: true, type: :string
end

defmodule Toolquery.ToolConnection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  oneof :connection, 0

  field :elastic, 1, type: Toolquery.ElasticConnection, oneof: 0
  field :datadog, 2, type: Toolquery.DatadogConnection, oneof: 0
  field :prometheus, 3, type: Toolquery.PrometheusConnection, oneof: 0
  field :loki, 4, type: Toolquery.LokiConnection, oneof: 0
  field :tempo, 5, type: Toolquery.TempoConnection, oneof: 0
end

defmodule Toolquery.TimeRange do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :start, 1, type: Google.Protobuf.Timestamp
  field :end, 2, type: Google.Protobuf.Timestamp
end

defmodule Toolquery.MetricsQueryInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :connection, 1, type: Toolquery.ToolConnection
  field :query, 2, type: :string
  field :range, 3, type: Toolquery.TimeRange
  field :step, 4, proto3_optional: true, type: :string
end

defmodule Toolquery.LogsQueryInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :connection, 1, type: Toolquery.ToolConnection
  field :query, 2, type: :string
  field :range, 3, type: Toolquery.TimeRange
  field :limit, 4, proto3_optional: true, type: :int32
end

defmodule Toolquery.TracesQueryInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :connection, 1, type: Toolquery.ToolConnection
  field :query, 2, type: :string
  field :range, 3, type: Toolquery.TimeRange
  field :limit, 4, proto3_optional: true, type: :int32
end

defmodule Toolquery.MetricPoint.LabelsEntry do
  @moduledoc false

  use Protobuf, map: true, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Toolquery.MetricPoint do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :timestamp, 1, type: Google.Protobuf.Timestamp
  field :name, 2, type: :string
  field :value, 3, type: :double
  field :labels, 4, repeated: true, type: Toolquery.MetricPoint.LabelsEntry, map: true
end

defmodule Toolquery.MetricsQueryOutput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :metrics, 1, repeated: true, type: Toolquery.MetricPoint
end

defmodule Toolquery.MetricsSearchInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :connection, 1, type: Toolquery.ToolConnection
  field :query, 2, type: :string
  field :limit, 3, proto3_optional: true, type: :int32
end

defmodule Toolquery.MetricsSearchResult do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :name, 1, type: :string
end

defmodule Toolquery.MetricsSearchOutput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :metrics, 1, repeated: true, type: Toolquery.MetricsSearchResult
end

defmodule Toolquery.LogEntry.LabelsEntry do
  @moduledoc false

  use Protobuf, map: true, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Toolquery.LogEntry do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :timestamp, 1, type: Google.Protobuf.Timestamp
  field :message, 2, type: :string
  field :labels, 3, repeated: true, type: Toolquery.LogEntry.LabelsEntry, map: true
end

defmodule Toolquery.LogsQueryOutput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :logs, 1, repeated: true, type: Toolquery.LogEntry
end

defmodule Toolquery.TraceSpan.TagsEntry do
  @moduledoc false

  use Protobuf, map: true, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Toolquery.TraceSpan do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :trace_id, 1, type: :string, json_name: "traceId"
  field :span_id, 2, type: :string, json_name: "spanId"
  field :parent_id, 3, type: :string, json_name: "parentId"
  field :name, 4, type: :string
  field :service, 5, type: :string
  field :start, 6, type: Google.Protobuf.Timestamp
  field :end, 7, type: Google.Protobuf.Timestamp
  field :tags, 8, repeated: true, type: Toolquery.TraceSpan.TagsEntry, map: true
end

defmodule Toolquery.TracesQueryOutput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :spans, 1, repeated: true, type: Toolquery.TraceSpan
end

defmodule Toolquery.ToolQuery.Service do
  @moduledoc false

  use GRPC.Service, name: "toolquery.ToolQuery", protoc_gen_elixir_version: "0.15.0"

  rpc :Metrics, Toolquery.MetricsQueryInput, Toolquery.MetricsQueryOutput

  rpc :MetricsSearch, Toolquery.MetricsSearchInput, Toolquery.MetricsSearchOutput

  rpc :Logs, Toolquery.LogsQueryInput, Toolquery.LogsQueryOutput

  rpc :Traces, Toolquery.TracesQueryInput, Toolquery.TracesQueryOutput
end

defmodule Toolquery.ToolQuery.Stub do
  @moduledoc false

  use GRPC.Stub, service: Toolquery.ToolQuery.Service
end
