defmodule Console.AI.OpenAI do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream}

  require Logger

  @model "gpt-5.4-mini"
  @tool_model "gpt-5.4"
  @embedding_model "text-embedding-3-large"

  def default_model(), do: @model
  def default_embedding_model(), do: @embedding_model

  defstruct [:access_key, :azure_token, :model, :tool_model, :embedding_model, :base_url, :params, :stream, :method]

  @type t :: %__MODULE__{}

  def defaults(), do: %{model: @model, tool_model: @model, embedding_model: @embedding_model}

  def new(opts) do
    %__MODULE__{
      access_key: Map.get(opts, :access_token),
      model: Map.get(opts, :model) || @model,
      tool_model: Map.get(opts, :tool_model) || @tool_model,
      base_url: Map.get(opts, :base_url),
      embedding_model: Map.get(opts, :embedding_model) || @embedding_model,
      azure_token: Map.get(opts, :azure_token),
      method: Map.get(opts, :method) || :auto,
      stream: Stream.stream()
    }
  end

  def proxy(%__MODULE__{} = openai) do
    {:ok, %Console.AI.Proxy{
      backend: :openai,
      url: openai.base_url || "https://api.openai.com/v1",
      token: openai.access_key,
      params: %{}
    }}
  end

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = openai, messages, opts) do
    messages
    |> reqllm_messages()
    |> generate_text(openai_model(openai, model_type(opts[:client])), openai.stream, provider_options(openai) ++ [tools: tools(opts)])
    |> reqllm_result()
  end

  defp model_type(:tool), do: :tool_model
  defp model_type(_), do: :model

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = openai, messages, tools, _opts) do
    messages
    |> reqllm_messages()
    |> generate_text(openai_model(openai, :tool_model), openai.stream, provider_options(openai) ++ [tools: reqllm_tools(tools), tool_choice: :required])
    |> reqllm_result()
    |> tool_calls()
  end

  def embeddings(%__MODULE__{} = openai, text) do
    chunked = Utils.chunk(text, 8000)
    provider_options(openai)
    |> Keyword.put(:dimensions, Utils.embedding_dims())
    |> then(&ReqLLM.embed(openai_model(openai, :embedding_model), chunked, &1))
    |> case do
      {:ok, embeddings} -> {:ok, Enum.zip(chunked, embeddings)}
      error -> error
    end
  end

  def context_window(%__MODULE__{model: model}) do
    case LLMDB.model("openai:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} when is_integer(context) -> context
      _ -> 500_000
    end
  end

  def tools?(), do: true

  defp provider_options(%__MODULE__{base_url: base_url, access_key: key}) do
    Enum.filter([base_url: base_url, api_key: key || "ignore"], fn {_, v} -> not is_nil(v) end)
  end

  defp openai_model(%__MODULE__{base_url: base_url, method: method} = openai, model) when is_binary(base_url) do
    model_name = Map.get(openai, model)
    ReqLLM.model!(%{
      provider: :openai,
      extra: %{wire: %{protocol: guess_protocol(model_name, method)}},
      model: model_name,
    })
  end
  defp openai_model(%__MODULE__{} = openai, model), do: ReqLLM.model!({:openai, id: Map.get(openai, model)})

  defp guess_protocol(_, :chat), do: "openai_chat"
  defp guess_protocol(_, :responses), do: "openai_responses"
  defp guess_protocol("gpt-5" <> _, _), do: "openai_responses"
  defp guess_protocol(_, _), do: "openai_chat"
end
