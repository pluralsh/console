defmodule Console.AI.Azure do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias Console.AI.OpenAI

  require Logger

  defstruct [:access_key, :api_version, :base_url, :model, :tool_model]

  @api_vsn "2024-10-01-preview"

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      access_key: opts.access_key,
      api_version: opts.api_version,
      model: opts.model,
      tool_model: opts.tool_model,
      base_url: "#{opts.endpoint}/openai"
    }
  end

  @doc """
  Generate a openai completion from the azure openai credentials chain
  """
  @spec completion(t(), Console.AI.Provider.history) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{api_version: vsn, model: model} = azure, messages) do
    OpenAI.new(azure)
    |> Map.put(:params, %{"api-version" => vsn || @api_vsn})
    |> Map.put(:model, model || OpenAI.default_model())
    |> OpenAI.completion(messages)
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

  def tools?(), do: true
end
