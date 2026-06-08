defmodule Console.GRPC.Server do
  use GRPC.Server, service: Plrl.PluralServer.Service
  alias Console.AI.Provider
  alias Console.Deployments.{Settings, Agents}
  alias Console.Schema.{DeploymentSettings, User, Cluster}

  def meter_metrics(%Plrl.MeterMetricsRequest{bytes: bytes}, _) do
    Console.Prom.Meter.incr(max(bytes, 0))
    %Plrl.MeterMetricsResponse{success: true}
  end

  def get_ai_config(_req, _) do
    Settings.fetch()
    |> to_pb()
  end

  def get_observability_config(_req, _) do
    inst = Console.cloud_instance()
    %Plrl.ObservabilityConfig{}
    |> add_prometheus_configs(inst)
    |> add_elastic_configs(inst)
  end

  def proxy_authentication(%Plrl.ProxyAuthenticationRequest{token: token}, _) do
    case Console.authed_user(token) do
      %User{} ->
        %Plrl.ProxyAuthenticationResponse{authenticated: true}

      %Cluster{} = cluster ->
        %Plrl.ProxyAuthenticationResponse{authenticated: Agents.has_runtime?(cluster)}

      _ ->
        %Plrl.ProxyAuthenticationResponse{authenticated: false}
    end
  end

  defp add_prometheus_configs(%Plrl.ObservabilityConfig{} = pb, inst) when is_binary(inst) do
    with {:ok, _, pass} <- Console.es_creds(),
         {:ok, url, vtenant} <- Console.vmetrics_creds() do
      %Plrl.ObservabilityConfig{pb | prometheusUsername: "plrl-#{inst}", prometheusPassword: pass, prometheusHost: "#{url}/select/#{vtenant}/prometheus"}
    else
      _ -> pb
    end
  end
  defp add_prometheus_configs(%Plrl.ObservabilityConfig{} = pb, _), do: pb

  defp add_elastic_configs(%Plrl.ObservabilityConfig{} = pb, inst) when is_binary(inst) do
    case Console.es_creds() do
      {:ok, url, pass} ->
        %Plrl.ObservabilityConfig{pb | elasticUsername: "plrl-#{inst}", elasticPassword: pass, elasticIndex: "plrl-#{inst}-logs-*", elasticHost: url}
      _ ->
        pb
    end
  end
  defp add_elastic_configs(%Plrl.ObservabilityConfig{} = pb, _), do: pb

  defp to_pb(%DeploymentSettings{ai: %{enabled: true} = ai}) do
    %Plrl.AiConfig{
      enabled: true,
      openai: to_openai_pb(Map.get(ai, :openai)),
      openaiCompatible: to_openai_pb(Map.get(ai, :openai_compatible)),
      anthropic: to_anthropic_pb(Map.get(ai, :anthropic)),
      vertexAi: to_vertex_pb(Map.get(ai, :vertex)),
      bedrock: to_bedrock_pb(Map.get(ai, :bedrock)),
      azure: to_azure_pb(Map.get(ai, :azure))
    }
  end
  defp to_pb(_), do: %Plrl.AiConfig{enabled: false}

  defp to_openai_pb(%{} = openai) do
    defaults = Provider.defaults(:openai)

    %Plrl.OpenAiConfig{
      apiKey: Map.get(openai, :access_token),
      model: Map.get(openai, :model) || defaults[:model],
      embeddingModel: Map.get(openai, :embedding_model) || defaults[:embedding_model],
      toolModel: Map.get(openai, :tool_model) || defaults[:tool_model],
      baseUrl: Map.get(openai, :base_url),
      proxyModels: proxy_models(openai),
      tokenExchange: to_openai_token_exchange_pb(Map.get(openai, :token_exchange)),
      method: openai_method_to_pb(Map.get(openai, :method))
    }
  end
  defp to_openai_pb(_), do: nil

  defp to_openai_token_exchange_pb(%{} = token_exchange) do
    case {Map.get(token_exchange, :enabled), Map.get(token_exchange, :token_url),
          Map.get(token_exchange, :client_id), Map.get(token_exchange, :client_secret)} do
      {true, url, cid, secret} when is_binary(url) and is_binary(cid) and is_binary(secret) ->
        %Plrl.OpenAiTokenExchange{
          enabled: true,
          tokenUrl: url,
          clientId: cid,
          clientSecret: secret
        }

      _ ->
        nil
    end
  end
  defp to_openai_token_exchange_pb(_), do: nil

  defp to_anthropic_pb(%{} = anthropic) do
    defaults = Provider.defaults(:anthropic)

    %Plrl.AnthropicConfig{
      apiKey: Map.get(anthropic, :access_token),
      model: Map.get(anthropic, :model) || defaults[:model],
      toolModel: Map.get(anthropic, :tool_model) || defaults[:tool_model],
      baseUrl: Map.get(anthropic, :base_url),
      proxyModels: proxy_models(anthropic)
    }
  end
  defp to_anthropic_pb(_), do: nil

  defp to_vertex_pb(%{} = vertex_ai) do
    defaults = Provider.defaults(:vertex)

    %Plrl.VertexAiConfig{
      serviceAccountJson: Map.get(vertex_ai, :service_account_json),
      model: Map.get(vertex_ai, :model) || defaults[:model],
      toolModel: Map.get(vertex_ai, :tool_model) || defaults[:tool_model],
      endpoint: Map.get(vertex_ai, :endpoint),
      embeddingModel: Map.get(vertex_ai, :embedding_model) || defaults[:embedding_model],
      project: Map.get(vertex_ai, :project),
      location: Map.get(vertex_ai, :location),
      proxyModels: proxy_models(vertex_ai)
    }
  end
  defp to_vertex_pb(_), do: nil

  defp to_bedrock_pb(%{} = bedrock) do
    defaults = Provider.defaults(:bedrock)

    %Plrl.BedrockConfig{
      modelId: Map.get(bedrock, :model_id) || defaults[:model],
      toolModelId: Map.get(bedrock, :tool_model_id) || defaults[:tool_model],
      embeddingModelId: Map.get(bedrock, :embedding_model) || defaults[:embedding_model],
      region: Map.get(bedrock, :region),
      awsAccessKeyId: Map.get(bedrock, :aws_access_key_id),
      awsSecretAccessKey: Map.get(bedrock, :aws_secret_access_key),
      proxyModels: proxy_models(bedrock),
      deployments: to_string_map(Map.get(bedrock, :deployments))
    }
  end
  defp to_bedrock_pb(_), do: nil

  defp to_azure_pb(%{} = azure) do
    defaults = Provider.defaults(:azure)

    %Plrl.AzureOpenAiConfig{
      model: Map.get(azure, :model) || defaults[:model],
      endpoint: Map.get(azure, :endpoint),
      embeddingModel: Map.get(azure, :embedding_model) || defaults[:embedding_model],
      toolModel: Map.get(azure, :tool_model) || defaults[:tool_model],
      accessToken: Map.get(azure, :access_token),
      deployments: to_string_map(Map.get(azure, :deployments)),
      proxyModels: proxy_models(azure)
    }
  end
  defp to_azure_pb(_), do: nil

  defp openai_method_to_pb(:chat), do: :CHAT
  defp openai_method_to_pb(:responses), do: :RESPONSES
  defp openai_method_to_pb(:auto), do: :AUTO
  defp openai_method_to_pb(nil), do: :AUTO
  defp openai_method_to_pb(_), do: :AUTO

  defp proxy_models(%{proxy_models: [_ | _] = models}), do: models
  defp proxy_models(_), do: []

  defp to_string_map(%{} = map) do
    Enum.filter(map, fn {k, v} -> is_binary(k) and is_binary(v) end)
    |> Map.new()
  end
  defp to_string_map(_), do: %{}
end
