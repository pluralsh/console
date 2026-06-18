defmodule Console.AI.OpenAI do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream, Provider.TokenExchange}
  alias Console.Schema.DeploymentSettings.OauthToken

  require Logger

  defstruct [:access_key, :azure_token, :model, :tool_model, :embedding_model, :base_url, :params, :stream, :method, :token_exchange, :headers]

  @type t :: %__MODULE__{}

  def defaults(), do: Console.AI.Provider.model_defaults(:openai)

  def new(opts) do
    model_defaults = model_defaults(Map.get(opts, :base_url))

    %__MODULE__{
      access_key: Map.get(opts, :access_token),
      model: Map.get(opts, :model) || model_defaults[:model],
      tool_model: Map.get(opts, :tool_model) || model_defaults[:tool_model],
      base_url: Map.get(opts, :base_url),
      embedding_model: Map.get(opts, :embedding_model) || model_defaults[:embedding_model],
      azure_token: Map.get(opts, :azure_token),
      method: Map.get(opts, :method) || :auto,
      token_exchange: Map.get(opts, :token_exchange),
      headers: Map.get(opts, :headers),
      stream: Stream.stream()
    }
  end

  # defp model_defaults(base) when is_binary(base), do: %{model: @model, tool_model: @tool_model}
  defp model_defaults(_), do: defaults()

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
    with {:ok, provider_opts} <- provider_options(openai) do
      messages
      |> reqllm_messages()
      |> generate_text(openai_model(openai, opts[:model], model_type(opts[:client])), openai.stream, base_opts(provider_opts ++ [tools: tools(opts)], opts))
      |> reqllm_result()
    end
  end

  defp model_type(:tool), do: :tool_model
  defp model_type(_), do: :model

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = openai, messages, tools, opts) do
    with {:ok, provider_opts} <- provider_options(openai) do
      messages
      |> reqllm_messages()
      |> generate_text(openai_model(openai, opts[:model], model_type(opts[:client])), openai.stream, base_opts(provider_opts ++ [tools: reqllm_tools(tools), tool_choice: :required], opts))
      |> reqllm_result()
      |> tool_calls()
    end
  end

  def embeddings(%__MODULE__{} = openai, text) do
    chunked = Utils.chunk(text, 8000)
    with {:ok, provider_opts} <- provider_options(openai) do
      provider_opts
      |> Keyword.put(:dimensions, Utils.embedding_dims())
      |> then(&ReqLLM.embed(openai_model(openai, nil, :embedding_model), chunked, &1))
      |> case do
        {:ok, embeddings} -> {:ok, Enum.zip(chunked, embeddings)}
        error -> error
      end
    end
  end

  def context_window(%__MODULE__{model: model}) do
    case LLMDB.model("openai:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} when is_integer(context) -> context
      _ -> 500_000
    end
  end

  def tools?(), do: true

  defp provider_options(%__MODULE__{base_url: base_url} = openai) do
    with {:ok, key} <- api_key(openai),
      do: {:ok, Enum.filter([base_url: base_url, api_key: key] ++ http_options(openai), fn {_, v} -> not is_nil(v) end)}
  end

  defp api_key(%__MODULE__{token_exchange: %OauthToken{enabled: true} = token}) do
    case TokenExchange.exchange(token.token_url, token.client_id, token.client_secret) do
      {:ok, %OAuth2.AccessToken{access_token: token}} when is_binary(token) -> {:ok, token}
      {:ok, token} when is_binary(token) -> {:ok, token}
      err -> err
    end
  end
  defp api_key(%__MODULE__{access_key: key}) when is_binary(key), do: {:ok, key}
  defp api_key(_), do: {:ok, "ignore"}

  defp openai_model(%__MODULE__{base_url: base_url, method: method} = openai, model, model_type) when is_binary(base_url) do
    model_name = if is_binary(model), do: model, else: Map.get(openai, model_type)
    ReqLLM.model!(%{
      provider: :openai,
      extra: %{wire: %{protocol: guess_protocol(model_name, method)}},
      model: model_name,
    })
  end
  defp openai_model(_, model, _) when is_binary(model), do: ReqLLM.model!({:openai, id: model})
  defp openai_model(%__MODULE__{} = openai, _, model_type), do: ReqLLM.model!({:openai, id: Map.get(openai, model_type)})

  defp guess_protocol(_, :chat), do: "openai_chat"
  defp guess_protocol(_, :responses), do: "openai_responses"
  defp guess_protocol("gpt-5" <> _, _), do: "openai_responses"
  defp guess_protocol(_, _), do: "openai_chat"
end
