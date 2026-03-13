defmodule Console.AI.Azure do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias Console.AI.OpenAI

  require Logger

  defstruct [:azure_token, :access_token, :api_version, :base_url, :model, :tool_model, :embedding_model, :deployments]

  @api_vsn "2024-10-21"

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      azure_token: opts.access_token,
      access_token: opts.access_token,
      api_version: opts.api_version,
      model: opts.model,
      tool_model: opts.tool_model,
      embedding_model: opts.embedding_model,
      base_url: opts.endpoint,
      deployments: opts.deployments
    }
  end

  def proxy(%__MODULE__{} = azure) do
    {:ok, %Console.AI.Proxy{
      backend: :openai,
      url: deployment_url(azure, azure.model || OpenAI.default_model()),
      token: azure.azure_token,
      params: %{"api-version" => azure.api_version || @api_vsn}
    }}
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{api_version: vsn, model: model} = azure, messages, opts) do
    model = model || OpenAI.default_model()

    OpenAI.new(%{azure | base_url: deployment_url(azure, model)})
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:model, model)
    |> OpenAI.completion(messages, opts)
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{api_version: vsn, model: model, tool_model: tool_model} = azure, messages, tools, opts) do
    model = tool_model || model || OpenAI.default_model()

    OpenAI.new(%{azure | base_url: deployment_url(azure, model)})
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:model, model)
    |> OpenAI.tool_call(messages, tools, opts)
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec embeddings(t(), binary) :: {:ok, [{binary, [float]}]} | {:error, binary}
  def embeddings(%__MODULE__{api_version: vsn, embedding_model: model} = azure, text) do
    model = model || OpenAI.default_embedding_model()

    OpenAI.new(%{azure | base_url: deployment_url(azure, model)})
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:embedding_model, model)
    |> OpenAI.embeddings(text)
  end

  def context_window(azure), do: OpenAI.context_window(OpenAI.new(azure))

  defp deployment_url(%__MODULE__{base_url: base_url, deployments: deployments}, model)
    when is_binary(base_url) and is_binary(model) do
    deployment =
      case deployments do
        %{} ->
          case Map.get(deployments, model) do
            val when is_binary(val) and byte_size(val) > 0 -> val
            _ -> model
          end
        _ -> model
      end

    Path.join(base_url, deployment)
  end

  def tools?(), do: true
end
