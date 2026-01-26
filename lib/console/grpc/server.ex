defmodule Console.GRPC.Server do
  use GRPC.Server, service: Plrl.PluralServer.Service
  alias Console.Deployments.{Settings, Agents}
  alias Console.Schema.{DeploymentSettings, User, Cluster}
  alias Console.Schema.DeploymentSettings.AI

  def get_ai_config(_req, _) do
    Settings.fetch()
    |> to_pb()
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
      model: openai.model
    }
  end

  defp to_pb(%AI.Anthropic{} = anthropic) do
    %Plrl.AnthropicConfig{
      apiKey: anthropic.access_token,
      model: anthropic.model,
      toolModel: anthropic.tool_model,
      baseUrl: anthropic.base_url
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
      location: vertex_ai.location
    }
  end

  defp to_pb(%AI.Bedrock{} = bedrock) do
    %Plrl.BedrockConfig{
      modelId: bedrock.model_id,
      toolModelId: bedrock.tool_model_id,
      embeddingModelId: bedrock.embedding_model,
      region: bedrock.region,
      awsAccessKeyId: bedrock.aws_access_key_id,
      awsSecretAccessKey: bedrock.aws_secret_access_key
    }
  end

  defp to_pb(%AI.Azure{} = azure) do
    %Plrl.AzureOpenAiConfig{
      model: azure.model,
      endpoint: azure.endpoint,
      embeddingModel: azure.embedding_model,
      toolModel: azure.tool_model,
      accessToken: azure.access_token
    }
  end

  defp to_pb(_), do: %Plrl.AiConfig{enabled: false}
end
