defmodule Console.AI.XAI do
  @moduledoc """
  Implements our basic llm behaviour against the xAI API.
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Provider.TokenExchange, Stream}
  alias Console.Schema.DeploymentSettings.OauthToken

  defstruct [
    :access_key,
    :model,
    :tool_model,
    :base_url,
    :stream,
    :method,
    :token_exchange,
    :headers
  ]

  @type t :: %__MODULE__{}

  def defaults(), do: Console.AI.Provider.model_defaults(:xai)

  def new(opts) do
    model_defaults = defaults()

    %__MODULE__{
      access_key: Map.get(opts, :access_token),
      model: Map.get(opts, :model) || model_defaults[:model],
      tool_model: Map.get(opts, :tool_model) || model_defaults[:tool_model],
      base_url: Map.get(opts, :base_url),
      method: Map.get(opts, :method) || :auto,
      token_exchange: Map.get(opts, :token_exchange),
      headers: Map.get(opts, :headers),
      stream: Stream.stream()
    }
  end

  def proxy(%__MODULE__{} = xai) do
    {:ok, %Console.AI.Proxy{
      backend: :openai,
      url: xai.base_url || "https://api.x.ai/v1",
      token: xai.access_key,
      params: %{}
    }}
  end

  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = xai, messages, opts) do
    with {:ok, provider_opts} <- provider_options(xai) do
      messages
      |> reqllm_messages()
      |> generate_text(
        xai_model(xai, opts[:model], model_type(opts[:client])),
        xai.stream,
        base_opts(provider_opts ++ [tools: tools(opts)], opts)
      )
      |> reqllm_result()
    end
  end

  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) ::
          {:ok, binary} | {:ok, [Console.AI.Tool.t()]} | Console.error()
  def tool_call(%__MODULE__{} = xai, messages, tools, opts) do
    with {:ok, provider_opts} <- provider_options(xai) do
      messages
      |> reqllm_messages()
      |> generate_text(
        xai_model(xai, opts[:model], model_type(opts[:client] || :tool)),
        xai.stream,
        base_opts(provider_opts ++ [tools: reqllm_tools(tools), tool_choice: :required], opts)
      )
      |> reqllm_result()
      |> tool_calls()
    end
  end

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def context_window(%__MODULE__{model: model}) do
    case LLMDB.model("xai:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} when is_integer(context) -> context
      _ -> 256_000
    end
  end

  def tools?(), do: true

  defp model_type(:tool), do: :tool_model
  defp model_type(_), do: :model

  defp provider_options(%__MODULE__{} = xai) do
    with {:ok, key} <- api_key(xai) do
      {:ok,
       [base_url: xai.base_url, api_key: key]
       |> Keyword.merge(xai_api_opts(xai.method))
       |> Keyword.merge(http_options(xai))
       |> Enum.filter(fn {_, v} -> not is_nil(v) end)}
    end
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

  defp xai_model(_, model, _) when is_binary(model), do: "xai:#{model}"
  defp xai_model(%__MODULE__{} = xai, _, model_type), do: "xai:#{Map.get(xai, model_type)}"

  defp xai_api_opts(:chat), do: [provider_options: [xai_api: :chat]]
  defp xai_api_opts(:responses), do: [provider_options: [xai_api: :responses]]
  defp xai_api_opts(_), do: []
end
