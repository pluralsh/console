defmodule Console.AI.Azure do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream}

  @model "gpt-4.1-mini"
  @embedding_model "text-embedding-3-large"

  defstruct [:azure_token, :access_token, :api_version, :base_url, :model, :tool_model, :embedding_model, :deployments, :stream]

  @type t :: %__MODULE__{}

  def defaults(), do: %{model: @model, tool_model: @model, embedding_model: @embedding_model}

  def new(opts) do
    %__MODULE__{
      azure_token: opts.access_token,
      access_token: opts.access_token,
      api_version: opts.api_version,
      model: opts.model || @model,
      tool_model: opts.tool_model || @model,
      embedding_model: opts.embedding_model || @embedding_model,
      base_url: opts.endpoint,
      deployments: opts.deployments,
      stream: Stream.stream(),
    }
  end

  def proxy(%__MODULE__{}), do: {:error, "proxy not implemented for this provider"}

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = az, messages, opts) do
    messages
    |> reqllm_messages()
    |> generate_text("azure:#{select_model(az, opts[:client])}", az.stream, provider_options(az, az.model) ++ [tools: tools(opts)])
    |> reqllm_result()
  end

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = az, messages, tools, _opts) do
    messages
    |> reqllm_messages()
    |> generate_text("azure:#{az.tool_model}", az.stream, provider_options(az, az.tool_model) ++ [tools: reqllm_tools(tools)])
    |> reqllm_result()
    |> tool_calls()
  end

  def embeddings(%__MODULE__{} = az, text) do
    chunked = Utils.chunk(text, 8000)
    provider_options(az, az.embedding_model)
    |> Keyword.put(:dimensions, Utils.embedding_dims())
    |> then(&ReqLLM.embed("azure:#{az.embedding_model}", chunked, &1))
    |> case do
      {:ok, embeddings} -> {:ok, Enum.zip(chunked, embeddings)}
      error -> error
    end
  end

  def context_window(%__MODULE__{model: model}) do
    case LLMDB.model("azure:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} when is_integer(context) -> context
      _ -> 256_000
    end
  end

  def tools?(), do: true

  defp provider_options(%__MODULE__{base_url: base_url, access_token: key} = az, model) do
    [base_url: normalize_url(base_url), api_key: key, deployment: deployment(az, model)]
    |> Enum.filter(fn {_, v} -> not is_nil(v) end)
  end

  defp deployment(%__MODULE__{deployments: deployments}, model) do
    case deployments do
      %{^model => deployment} -> deployment
      _ -> model
    end
  end

  defp normalize_url(url), do: String.trim_trailing(url, "/deployments")
end
