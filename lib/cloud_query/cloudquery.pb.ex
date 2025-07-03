defmodule Cloudquery.AwsCredentials do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :access_key_id, 1, type: :string, json_name: "accessKeyId"
  field :secret_access_key, 2, type: :string, json_name: "secretAccessKey"
end

defmodule Cloudquery.AzureCredentials do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :subscription_id, 1, type: :string, json_name: "subscriptionId"
  field :tenant_id, 2, type: :string, json_name: "tenantId"
  field :client_id, 3, type: :string, json_name: "clientId"
  field :client_secret, 4, type: :string, json_name: "clientSecret"
end

defmodule Cloudquery.GcpCredentials do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :service_account_json_b64, 1, type: :string, json_name: "serviceAccountJsonB64"
end

defmodule Cloudquery.Connection do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  oneof :credentials, 0

  field :provider, 1, type: :string
  field :aws, 2, type: Cloudquery.AwsCredentials, oneof: 0
  field :azure, 3, type: Cloudquery.AzureCredentials, oneof: 0
  field :gcp, 4, type: Cloudquery.GcpCredentials, oneof: 0
end

defmodule Cloudquery.QueryInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :connection, 1, type: Cloudquery.Connection
  field :query, 2, type: :string
end

defmodule Cloudquery.SchemaInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :connection, 1, type: Cloudquery.Connection
  field :table, 2, proto3_optional: true, type: :string
end

defmodule Cloudquery.ExtractInput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :connection, 1, type: Cloudquery.Connection
end

defmodule Cloudquery.QueryResult do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :result, 2, type: :string
end

defmodule Cloudquery.SchemaColumn do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :column, 1, type: :string
  field :type, 2, type: :string
end

defmodule Cloudquery.SchemaOutput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :result, 1, repeated: true, type: Cloudquery.SchemaResult
end

defmodule Cloudquery.SchemaResult do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :table, 1, type: :string
  field :columns, 2, repeated: true, type: Cloudquery.SchemaColumn
end

defmodule Cloudquery.ExtractOutput do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.14.0", syntax: :proto3

  field :type, 1, type: :string
  field :result, 2, type: :string
  field :id, 3, type: :string
  field :links, 4, repeated: true, type: :string
end

defmodule Cloudquery.CloudQuery.Service do
  @moduledoc false

  use GRPC.Service, name: "cloudquery.CloudQuery", protoc_gen_elixir_version: "0.14.0"

  rpc :Query, Cloudquery.QueryInput, Cloudquery.QueryResult

  rpc :Schema, Cloudquery.SchemaInput, Cloudquery.SchemaOutput

  rpc :Extract, Cloudquery.ExtractInput, stream(Cloudquery.ExtractOutput)
end

defmodule Cloudquery.CloudQuery.Stub do
  @moduledoc false

  use GRPC.Stub, service: Cloudquery.CloudQuery.Service
end
