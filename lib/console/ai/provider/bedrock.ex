defmodule Console.AI.Bedrock do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream}

  require Logger

  defstruct [:access_token, :model_id, :tool_model_id, :region, :embedding_model, :aws_access_key_id, :aws_secret_access_key, :stream]

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      model_id: opts.model_id,
      tool_model_id: opts.tool_model_id,
      embedding_model: opts.embedding_model,
      aws_access_key_id: opts.aws_access_key_id,
      aws_secret_access_key: opts.aws_secret_access_key,
      access_token: opts.access_token,
      region: opts.region,
      stream: Stream.stream(),
    }
  end

  def proxy(%__MODULE__{}), do: {:error, "proxy not implemented for this provider"}

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = bedrock, messages, opts) do
    messages
    |> reqllm_messages()
    |> generate_text("bedrock:#{bedrock.model_id}", bedrock.stream, provider_options(bedrock) ++ [tools: tools(opts)])
    |> reqllm_result()
  end

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = bedrock, messages, tools, _opts) do
    messages
    |> reqllm_messages()
    |> generate_text("bedrock:#{bedrock.tool_model_id}", bedrock.stream, provider_options(bedrock) ++ [tools: reqllm_tools(tools)])
    |> reqllm_result()
    |> tool_calls()
  end

  def embeddings(%__MODULE__{} = bedrock, text) do
    chunked = Utils.chunk(text, 8000)
    opts = [dimensions: Utils.embedding_dims(), provider_options: provider_options(bedrock)]
    case ReqLLM.embed("bedrock:#{bedrock.embedding_model}", chunked, opts) do
      {:ok, embeddings} -> {:ok, Enum.zip(chunked, embeddings)}
      error -> error
    end
  end

  def context_window(%__MODULE__{model_id: model}) do
    case LLMDB.model("bedrock:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} -> context
      _ -> 500_000
    end
  end

  def tools?(), do: true

  def provider_options(%__MODULE__{region: region, access_token: token} = bedrock) do
    [region: region, access_token: token]
    |> Enum.concat(aws_auth(bedrock))
    |> Enum.filter(fn {_, v} -> not is_nil(v) end)
  end

  def aws_auth(%__MODULE__{aws_access_key_id: aid, aws_secret_access_key: sak})
    when is_binary(aid) and is_binary(sak), do: [access_key_id: aid, secret_access_key: sak]
  def aws_auth(%__MODULE__{}) do
    ExAws.Config.new("bedrock-runtime")
    |> Map.to_list()
  end
end
