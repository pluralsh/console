defmodule Console.AI.Anthropic do
  @moduledoc """
  Implements our basic llm behaviour against the Anthropic api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Stream}

  require Logger

  @default_model "claude-4-5-sonnet-latest"

  defstruct [
    :access_key,
    :model,
    :tool_model,
    :stream,
    :full_url,
    :base_url,
    body: %{}
  ]

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      access_key: opts.access_token,
      model: opts.model || @default_model,
      tool_model: opts.tool_model || @default_model,
      full_url: Map.get(opts, :full_url),
      body: Map.get(opts, :body, %{}),
      stream: Stream.stream()
    }
  end

  def proxy(_), do: {:error, "anthropic proxy not implemented"}

  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = openai, messages, opts) do
    messages
    |> reqllm_messages()
    |> generate_text("anthropic:#{openai.model}", openai.stream, provider_options(openai) ++ [tools: tools(opts)])
    |> reqllm_result()
  end

  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = openai, messages, tools, _opts) do
    messages
    |> reqllm_messages()
    |> generate_text("anthropic:#{openai.tool_model}", openai.stream, provider_options(openai) ++ [tools: reqllm_tools(tools)])
    |> reqllm_result()
    |> tool_calls()
  end

  def context_window(%__MODULE__{model: model}) do
    case LLMDB.model("anthropic:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} when is_integer(context) -> context
      _ -> 256_000
    end
  end

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def tools?(), do: true

  def provider_options(%__MODULE__{base_url: base_url, access_key: key}) do
    Enum.filter([base_url: base_url, api_key: key], fn {_, v} -> not is_nil(v) end)
  end
end
