defmodule Console.AI.Vertex do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias Console.AI.GothManager
  alias Console.AI.OpenAI
  alias Console.AI.Utils

  @default_model "gemini-2.5-flash"
  @embedding_model "gemini-embedding-001"
  @options [recv_timeout: :infinity, timeout: :infinity]

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
      {publisher, model} = model_info(vertex.embedding_model || @embedding_model)
      url = vertex_url(vertex, publisher, model)

      Utils.chunk(text, 8000)
      |> Enum.reduce_while([], fn chunk, acc ->
        case embed(url, token, chunk) do
          {:ok, %{"predictions" => [%{"embeddings" => %{"values" => embedding}} | _]}} ->
            {:cont, [{chunk, embedding} | acc]}
          {:ok, body} ->
            {:halt, {:error, "embedding error, found no valid embedding in response: #{inspect(body)}"}}
          error -> {:halt, error}
        end
      end)
      |> Utils.maybe_ok()
    end
  end

  defp embed(url, token, text) do
    HTTPoison.post(url, Jason.encode!(%{
      instances: [%{content: String.slice(text, 0, 8100)}],
      parameters: %{
        outputDimensionality: Utils.embedding_dims()
      }
    }), headers(token), @options)
    |> handle_response()
  end

  def context_window(_), do: 1_000_000 * 4

  def tools?(), do: true

  defp openai_url(%__MODULE__{project: p, location: l} = c),
    do: "https://#{l}-aiplatform.googleapis.com/v1beta1/projects/#{p}/locations/#{l}/endpoints/#{ep(c)}"

  defp vertex_url(%__MODULE__{project: p, location: l}, publisher, model),
    do: "https://#{l}-aiplatform.googleapis.com/v1beta1/projects/#{p}/locations/#{l}/publishers/#{publisher}/models/#{model}"

  defp model_info(model) when is_binary(model) do
    case String.split(model, "/") do
      [publisher, model] -> {publisher, model}
      _ -> {"google", model}
    end
  end

  defp headers(token), do: [{"Authorization", "Bearer #{token}"}, {"Content-Type", "application/json"}]

  defp openai_model(%__MODULE__{model: m}) when is_binary(m), do: openai_model(m)
  defp openai_model(m) when is_binary(m) do
    case String.contains?(m, "/") do
      true -> m
      false -> "google/#{m}"
    end
  end
  defp openai_model(_), do: "google/#{@default_model}"

  defp handle_response({:ok, %HTTPoison.Response{status_code: 200, body: body}}), do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}}),
    do: {:error, "vertex error #{code}: #{body}"}
  defp handle_response(error), do: error

  defp client(%__MODULE__{service_account_json: json}) when is_binary(json) do
    with {:ok, json} <- Jason.decode(json),
      do: GothManager.fetch(source: {:service_account, json})
  end
  defp client(_), do: GothManager.fetch([])

  defp ep(%__MODULE__{endpoint: endpoint}) when is_binary(endpoint), do: endpoint
  defp ep(_), do: "openapi"
end
