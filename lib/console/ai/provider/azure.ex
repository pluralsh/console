defmodule Console.AI.Azure do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias Console.AI.OpenAI

  require Logger

  defstruct [:access_token, :api_version, :base_url, :model, :tool_model, :embedding_model]

  @api_vsn "2024-10-01-preview"

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      access_token: opts.access_key,
      api_version: opts.api_version,
      model: opts.model,
      tool_model: opts.tool_model,
      embedding_model: opts.embedding_model,
      base_url: "#{opts.endpoint}/openai"
    }
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{api_version: vsn, model: model} = azure, messages, opts) do
    OpenAI.new(azure)
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:model, model || OpenAI.default_model())
    |> OpenAI.completion(messages, opts)
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom]) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{api_version: vsn, model: model} = azure, messages, tools) do
    OpenAI.new(azure)
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:model, model || OpenAI.default_model())
    |> OpenAI.tool_call(messages, tools)
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec embeddings(t(), binary) :: {:ok, [{binary, [float]}]} | {:error, binary}
  def embeddings(%__MODULE__{api_version: vsn, embedding_model: model} = azure, text) do
    OpenAI.new(azure)
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:embedding_model, model || OpenAI.default_embedding_model())
    |> OpenAI.embeddings(text)
  end

  def context_window(azure), do: OpenAI.context_window(OpenAI.new(azure))

  def tools?(), do: true
end
