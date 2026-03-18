defmodule Console.GRPC.Server do
  use GRPC.Server, service: Plrl.PluralServer.Service
  alias Console.Deployments.{Settings, Agents}
  alias Console.Schema.{DeploymentSettings, User, Cluster}
  alias Console.Schema.DeploymentSettings.AI

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
      openai: to_pb(ai.openai),
      anthropic: to_pb(ai.anthropic),
      vertexAi: to_pb(ai.vertex),
      bedrock: to_pb(ai.bedrock),
      azure: to_pb(ai.azure)
    }
  end

  defp to_pb(nil), do: nil

  defp to_pb(%AI.OpenAi{} = openai) do
    %Plrl.OpenAiConfig{
      apiKey: openai.access_token,
      model: openai.model,
      embeddingModel: openai.embedding_model,
      toolModel: openai.tool_model,
      baseUrl: openai.base_url,
      proxyModels: proxy_models(openai)
    }
  end

  defp to_pb(%AI.Anthropic{} = anthropic) do
    %Plrl.AnthropicConfig{
      apiKey: anthropic.access_token,
      model: anthropic.model,
      toolModel: anthropic.tool_model,
      baseUrl: anthropic.base_url,
      proxyModels: proxy_models(anthropic)
    }
  end

  defp to_pb(%AI.Vertex{} = vertex_ai) do
    %Plrl.VertexAiConfig{
      serviceAccountJson: vertex_ai.service_account_json,
      model: vertex_ai.model,
      toolModel: vertex_ai.tool_model,
      endpoint: vertex_ai.endpoint,
      embeddingModel: vertex_ai.embedding_model,
      project: vertex_ai.project,
      location: vertex_ai.location,
      proxyModels: proxy_models(vertex_ai)
    }
  end

  defp to_pb(%AI.Bedrock{} = bedrock) do
    %Plrl.BedrockConfig{
      modelId: bedrock.model_id,
      toolModelId: bedrock.tool_model_id,
      embeddingModelId: bedrock.embedding_model,
      region: bedrock.region,
      awsAccessKeyId: bedrock.aws_access_key_id,
      awsSecretAccessKey: bedrock.aws_secret_access_key,
      proxyModels: proxy_models(bedrock),
      deployments: to_string_map(bedrock.deployments)
    }
  end

  defp to_pb(%AI.Azure{} = azure) do
    %Plrl.AzureOpenAiConfig{
      model: azure.model,
      endpoint: azure.endpoint,
      embeddingModel: azure.embedding_model,
      toolModel: azure.tool_model,
      accessToken: azure.access_token,
      deployments: to_string_map(azure.deployments),
      proxyModels: proxy_models(azure)
    }
  end

  defp to_pb(_), do: %Plrl.AiConfig{enabled: false}

  defp proxy_models(%{proxy_models: [_ | _] = models}), do: models
  defp proxy_models(_), do: []

  defp to_string_map(%{} = map) do
    Enum.filter(map, fn {k, v} -> is_binary(k) and is_binary(v) end)
    |> Map.new()
  end
  defp to_string_map(_), do: %{}
end
