defmodule Console.AI.Bedrock do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider
  alias Console.AI.OpenAI

  require Logger

  defstruct [:access_token, :model_id, :tool_model_id, :region, :embedding_model]

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      model_id: opts.model_id,
      tool_model_id: opts.tool_model_id,
      embedding_model: opts.embedding_model,
      access_token: opts.access_token,
      region: opts.region,
    }
  end

  def proxy(%__MODULE__{access_token: token} = bedrock) do
    {:ok, %Console.AI.Proxy{
      url: openai_url(bedrock),
      backend: :openai,
      token: token,
    }}
  end

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{model_id: model, access_token: token} = bedrock, messages, opts) do
    OpenAI.new(%{
      base_url: openai_url(bedrock),
      access_token: token,
      model: model,
      tool_model: bedrock.tool_model_id
    })
    |> OpenAI.completion(messages, opts)
  end

  def context_window(_), do: 250_000 * 4

  def tool_call(%__MODULE__{model_id: model, access_token: token} = bedrock, messages, tools) do
    OpenAI.new(%{
      base_url: openai_url(bedrock),
      access_token: token,
      model: model,
      tool_model: bedrock.tool_model_id
    })
    |> OpenAI.tool_call(messages, tools)
  end

  def embeddings(%__MODULE__{model_id: model, access_token: token} = bedrock, text) do
    OpenAI.new(%{
      base_url: openai_url(bedrock),
      access_token: token,
      model: model,
      embedding_model: bedrock.embedding_model
    })
    |> OpenAI.embeddings(text)
  end

  def tools?(), do: true

  defp openai_url(%__MODULE__{region: region}),
    do: "https://bedrock-runtime.#{region}.amazonaws.com/openai/v1"
end
