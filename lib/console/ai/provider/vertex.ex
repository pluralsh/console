defmodule Console.AI.Vertex do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias Console.AI.GothManager
  alias Console.AI.OpenAI

  @default_model "gemini-1.5-flash-002"

  require Logger

  defstruct [:service_account_json, :model, :tool_model, :embedding_model, :project, :location, :endpoint]

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      service_account_json: opts.service_account_json,
      model: opts.model,
      tool_model: opts.tool_model,
      project: opts.project,
      location: opts.location,
      endpoint: opts.endpoint
    }
  end

  def proxy(%__MODULE__{} = vertex) do
    with {:ok, %{token: token}} <- client(vertex) do
      {:ok, %Console.AI.Proxy{
        url: openai_url(vertex),
        backend: :openai,
        token: token,
      }}
    end
  end

  @doc """
  Generate a openai completion from
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = vertex, messages, opts) do
    with {:ok, %{token: token}} <- client(vertex) do
      OpenAI.new(%{
        base_url: openai_url(vertex),
        access_token: token,
        model: openai_model(vertex),
        tool_model: openai_model(vertex)
      })
      |> OpenAI.completion(messages, opts)
    end
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom]) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = vertex, messages, tools) do
    with {:ok, %{token: token}} <- client(vertex) do
      OpenAI.new(%{
        base_url: openai_url(vertex),
        access_token: token,
        model: openai_model(vertex),
        tool_model: openai_model(vertex)
      })
      |> OpenAI.tool_call(messages, tools)
    end
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec embeddings(t(), binary) :: {:ok, [{binary, [float]}]} | {:ok, [Console.AI.Tool.t]} | Console.error
  def embeddings(%__MODULE__{} = vertex, text) do
    with {:ok, %{token: token}} <- client(vertex) do
      OpenAI.new(%{
        base_url: openai_url(vertex),
        access_token: token,
        model: openai_model(vertex),
        embedding_model: openai_model(vertex.embedding_model)
      })
      |> OpenAI.embeddings(text)
    end
  end

  def context_window(_), do: 128_000 * 4

  def tools?(), do: true

  defp openai_url(%__MODULE__{project: p, location: l} = c),
    do: "https://#{l}-aiplatform.googleapis.com/v1beta1/projects/#{p}/locations/#{l}/endpoints/#{ep(c)}"

  defp openai_model(%__MODULE__{model: m}) when is_binary(m), do: openai_model(m)
  defp openai_model(m) when is_binary(m) do
    case String.contains?(m, "/") do
      true -> m
      false -> "google/#{m}"
    end
  end
  defp openai_model(_), do: "google/#{@default_model}"

  defp client(%__MODULE__{service_account_json: json}) when is_binary(json) do
    with {:ok, json} <- Jason.decode(json),
      do: GothManager.fetch(source: {:service_account, json})
  end
  defp client(_), do: GothManager.fetch([])

  defp ep(%__MODULE__{endpoint: endpoint}) when is_binary(endpoint), do: endpoint
  defp ep(_), do: "openapi"
end
