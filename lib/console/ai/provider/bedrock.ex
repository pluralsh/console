defmodule Console.AI.Bedrock do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream, Provider.TokenExchange}
  alias Console.Schema.DeploymentSettings.OauthToken

  require Logger

  defstruct [:access_token, :model_id, :tool_model_id, :base_url, :region, :embedding_model, :aws_access_key_id, :aws_secret_access_key, :stream, :token_exchange]

  @type t :: %__MODULE__{}

  def defaults(), do: Console.AI.Provider.model_defaults(:bedrock)

  def new(opts) do
    model_defaults = defaults()
    %__MODULE__{
      model_id: opts.model_id || model_defaults[:model],
      tool_model_id: opts.tool_model_id || model_defaults[:tool_model],
      embedding_model: opts.embedding_model || model_defaults[:embedding_model],
      aws_access_key_id: opts.aws_access_key_id,
      aws_secret_access_key: opts.aws_secret_access_key,
      access_token: opts.access_token,
      base_url: opts.base_url,
      region: opts.region,
      token_exchange: opts.token_exchange,
      stream: add_stream(opts),
    }
  end

  def proxy(%__MODULE__{}), do: {:error, "proxy not implemented for this provider"}

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = bedrock, messages, opts) do
    with {:ok, provider_opts} <- provider_options(bedrock) do
      provider_opts = Keyword.put(provider_opts, :tools, tools(opts))

      messages
      |> reqllm_messages()
      |> generate_text("amazon-bedrock:#{select_model(bedrock, opts[:client])}", bedrock.stream, provider_opts)
      |> reqllm_result()
    end
  end

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = bedrock, messages, tools, opts) do
    with {:ok, provider_opts} <- provider_options(bedrock) do
      provider_opts = Keyword.put(provider_opts, :tools, reqllm_tools(tools))

      messages
      |> reqllm_messages()
      |> generate_text("amazon-bedrock:#{select_model(bedrock, opts[:client] || :tool)}", bedrock.stream, provider_opts)
      |> reqllm_result()
      |> tool_calls()
    end
  end

  def embeddings(%__MODULE__{} = bedrock, text) do
    bedrock = choose_region(bedrock)
    chunked = Utils.chunk(text, 8000)

    with {:ok, provider} <- provider_options(bedrock) do
      provider
      |> Keyword.put(:dimensions, Utils.embedding_dims())
      |> then(&ReqLLM.embed("amazon-bedrock:#{bedrock.embedding_model}", chunked, &1))
      |> case do
        {:ok, embeddings} -> {:ok, Enum.zip(chunked, embeddings)}
        error -> error
      end
    end
  end

  def context_window(%__MODULE__{model_id: model}) do
    case LLMDB.model("amazon-bedrock:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} -> context
      _ -> 500_000
    end
  end

  def tools?(), do: true

  def provider_options(%__MODULE__{region: region, base_url: base_url} = bedrock) do
    with {:ok, token} <- api_key(bedrock) do
      {:ok,
       [region: region, api_key: token, base_url: base_url]
       |> Enum.concat(if is_nil(token), do: aws_auth(bedrock), else: [])
       |> Enum.filter(fn {_, v} -> not is_nil(v) end)}
    end
  end

  defp api_key(%__MODULE__{token_exchange: %OauthToken{enabled: true} = token}) do
    with {:ok, %OAuth2.AccessToken{access_token: token}} <- TokenExchange.exchange(token.token_url, token.client_id, token.client_secret),
      do: {:ok, token}
  end
  defp api_key(%__MODULE__{access_token: token}) when is_binary(token), do: {:ok, token}
  defp api_key(_), do: {:ok, nil}

  defp add_stream(%{enable_stream: false}), do: nil
  defp add_stream(_), do: Stream.stream()

  defp choose_region(%__MODULE__{embedding_model: "cohere.embed-english-v3"} = rock),
    do: %{rock | region: "us-east-1"}
  defp choose_region(rock), do: rock

  defp aws_auth(%__MODULE__{aws_access_key_id: aid, aws_secret_access_key: sak})
    when is_binary(aid) and is_binary(sak), do: [access_key_id: aid, secret_access_key: sak]
  defp aws_auth(_) do
    ExAws.Config.new("bedrock-runtime")
    |> Map.take([:access_key_id, :secret_access_key, :security_token])
    |> Console.move([:security_token], [:session_token])
    |> Map.to_list()
  end
end
