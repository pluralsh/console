defmodule Plrl.AiConfigRequest do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3
end

defmodule Plrl.AiConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :enabled, 1, type: :bool
  field :openai, 2, type: Plrl.OpenAiConfig
  field :anthropic, 3, type: Plrl.AnthropicConfig
  field :vertexAi, 4, type: Plrl.VertexAiConfig
  field :bedrock, 5, type: Plrl.BedrockConfig
  field :azure, 6, type: Plrl.AzureOpenAiConfig
end

defmodule Plrl.OpenAiConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :apiKey, 1, proto3_optional: true, type: :string
  field :model, 2, proto3_optional: true, type: :string
  field :embeddingModel, 3, proto3_optional: true, type: :string
  field :toolModel, 4, proto3_optional: true, type: :string
  field :baseUrl, 5, proto3_optional: true, type: :string
  field :proxyModels, 6, repeated: true, type: :string
end

defmodule Plrl.AnthropicConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :baseUrl, 1, proto3_optional: true, type: :string
  field :apiKey, 2, proto3_optional: true, type: :string
  field :model, 3, proto3_optional: true, type: :string
  field :embeddingModel, 4, proto3_optional: true, type: :string
  field :toolModel, 5, proto3_optional: true, type: :string
  field :proxyModels, 6, repeated: true, type: :string
end

defmodule Plrl.VertexAiConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :apiKey, 1, proto3_optional: true, type: :string
  field :model, 2, proto3_optional: true, type: :string
  field :endpoint, 3, proto3_optional: true, type: :string
  field :serviceAccountJson, 4, proto3_optional: true, type: :string
  field :embeddingModel, 5, proto3_optional: true, type: :string
  field :toolModel, 6, proto3_optional: true, type: :string
  field :project, 7, proto3_optional: true, type: :string
  field :location, 8, proto3_optional: true, type: :string
  field :proxyModels, 9, repeated: true, type: :string
end

defmodule Plrl.BedrockConfig.DeploymentsEntry do
  @moduledoc false

  use Protobuf, map: true, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Plrl.BedrockConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :modelId, 1, proto3_optional: true, type: :string
  field :toolModelId, 2, proto3_optional: true, type: :string
  field :accessToken, 3, proto3_optional: true, type: :string
  field :region, 4, proto3_optional: true, type: :string
  field :embeddingModelId, 5, proto3_optional: true, type: :string
  field :awsAccessKeyId, 6, proto3_optional: true, type: :string
  field :awsSecretAccessKey, 7, proto3_optional: true, type: :string
  field :proxyModels, 8, repeated: true, type: :string
  field :deployments, 9, repeated: true, type: Plrl.BedrockConfig.DeploymentsEntry, map: true
end

defmodule Plrl.AzureOpenAiConfig.DeploymentsEntry do
  @moduledoc false

  use Protobuf, map: true, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :key, 1, type: :string
  field :value, 2, type: :string
end

defmodule Plrl.AzureOpenAiConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :apiVersion, 1, proto3_optional: true, type: :string
  field :model, 2, proto3_optional: true, type: :string
  field :endpoint, 4, proto3_optional: true, type: :string
  field :embeddingModel, 5, proto3_optional: true, type: :string
  field :toolModel, 6, proto3_optional: true, type: :string
  field :accessToken, 7, proto3_optional: true, type: :string
  field :proxyModels, 8, repeated: true, type: :string
  field :deployments, 9, repeated: true, type: Plrl.AzureOpenAiConfig.DeploymentsEntry, map: true
end

defmodule Plrl.ProxyAuthenticationRequest do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :token, 1, type: :string
end

defmodule Plrl.ProxyAuthenticationResponse do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :authenticated, 1, type: :bool
end

defmodule Plrl.ObservabilityConfig do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3

  field :prometheusUsername, 1, proto3_optional: true, type: :string
  field :prometheusPassword, 2, proto3_optional: true, type: :string
  field :elasticUsername, 3, proto3_optional: true, type: :string
  field :elasticPassword, 4, proto3_optional: true, type: :string
  field :elasticIndex, 5, proto3_optional: true, type: :string
  field :elasticHost, 6, proto3_optional: true, type: :string
  field :prometheusHost, 7, proto3_optional: true, type: :string
end

defmodule Plrl.ObservabilityConfigRequest do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.15.0", syntax: :proto3
end

defmodule Plrl.PluralServer.Service do
  @moduledoc false

  use GRPC.Service, name: "plrl.PluralServer", protoc_gen_elixir_version: "0.15.0"

  rpc :GetAiConfig, Plrl.AiConfigRequest, Plrl.AiConfig

  rpc :GetObservabilityConfig, Plrl.ObservabilityConfigRequest, Plrl.ObservabilityConfig

  rpc :ProxyAuthentication, Plrl.ProxyAuthenticationRequest, Plrl.ProxyAuthenticationResponse
end

defmodule Plrl.PluralServer.Stub do
  @moduledoc false

  use GRPC.Stub, service: Plrl.PluralServer.Service
end
