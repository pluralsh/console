defmodule Console.AI.Vertex do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream}
  alias Console.AI.GothManager

  @small_model "claude-haiku-4-5@20251001"
  @default_model "claude-sonnet-4-5@20250929"
  @embedding_model "gemini-embedding-001"

  defstruct [:service_account_json, :model, :tool_model, :embedding_model, :project, :location, :endpoint, :stream]

  @type t :: %__MODULE__{}

  def defaults(), do: %{model: @small_model, tool_model: @default_model, embedding_model: @embedding_model}

  def new(opts) do
    %__MODULE__{
      service_account_json: opts.service_account_json,
      model: opts.model || @small_model,
      tool_model: opts.tool_model || @default_model,
      embedding_model: opts.embedding_model || @embedding_model,
      project: opts.project,
      location: opts.location,
      endpoint: opts.endpoint,
      stream: Stream.stream(),
    }
  end

  def proxy(%__MODULE__{}), do: {:error, "proxy not implemented for this provider"}

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = vtx, messages, opts) do
    with {:ok, provider_options} <- provider_options(vtx) do
      messages
      |> reqllm_messages()
      |> generate_text("google-vertex:#{normalize(select_model(vtx, opts[:client]))}", vtx.stream, Keyword.put(provider_options, :tools, tools(opts)))
      |> reqllm_result()
    end
  end

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = vtx, messages, tools, _opts) do
    with {:ok, provider_options} <- provider_options(vtx) do
      messages
      |> reqllm_messages()
      |> generate_text("google-vertex:#{normalize(vtx.tool_model)}", vtx.stream, Keyword.put(provider_options, :tools, reqllm_tools(tools)))
      |> reqllm_result()
      |> tool_calls()
    end
  end

  def embeddings(%__MODULE__{} = vtx, text) do
    chunked = Utils.chunk(text, 8000)
    with {:ok, provider_options} <- provider_options(vtx),
         opts = Keyword.put(provider_options, :dimensions, Utils.embedding_dims()),
         {:ok, embeddings} <- ReqLLM.embed("google-vertex:#{normalize(vtx.embedding_model)}", chunked, opts) do
      {:ok, Enum.zip(chunked, embeddings)}
    end
  end

  def context_window(%__MODULE__{model: model}) do
    case LLMDB.model("google-vertex:#{normalize(model)}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} when is_integer(context) -> context
      _ -> 500_000
    end
  end

  def tools?(), do: true

  defp client(%__MODULE__{service_account_json: json}) when is_binary(json) do
    with {:ok, json} <- Jason.decode(json),
      do: GothManager.fetch(source: {:service_account, json})
  end
  defp client(_), do: GothManager.fetch([])

  defp provider_options(%__MODULE__{project: p, location: l} = vertex) do
    with {:ok, %{token: token}} <- client(vertex) do
      {:ok, [project_id: p, region: l, access_token: token]}
    end
  end

  defp normalize("anthropic/" <> model), do: model
  defp normalize(model), do: model
end
