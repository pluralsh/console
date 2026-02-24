defmodule Console.AI.Nexus do
  @moduledoc """
  Provider implementation that routes AI requests through the Nexus/Bifrost proxy.

  This allows using a unified OpenAI-compatible API regardless of the underlying
  provider (OpenAI, Anthropic, Bedrock, Vertex, Azure, etc.), as Bifrost handles
  the translation between provider formats.

  Similar to the Azure provider, this wraps the OpenAI provider with the Nexus URL
  and authentication token configured.

  Configuration is read from DeploymentSettings.ai.nexus:
  - `url`: The URL of the Nexus proxy
  - `access_token`: The Bearer token for authentication
  - `model`: The model to use for completions
  - `tool_model`: The model to use for tool calls
  - `embedding_model`: The embedding model to use (default: "text-embedding-3-large")
  """
  @behaviour Console.AI.Provider

  alias Console.AI.OpenAI

  @default_embedding_model "text-embedding-3-large"

  defstruct [:url, :token, :model, :tool_model, :embedding_model]

  @type t :: %__MODULE__{
          url: String.t() | nil,
          token: String.t() | nil,
          model: String.t() | nil,
          tool_model: String.t() | nil,
          embedding_model: String.t() | nil
        }

  @doc """
  Creates a new Nexus client from DeploymentSettings nexus config.

  Accepts either a nexus settings map from DeploymentSettings or a custom options map.
  """
  def new(opts \\ %{}) do
    %__MODULE__{
      url: Map.get(opts, :url),
      token: Map.get(opts, :access_token) || Map.get(opts, :token),
      model: Map.get(opts, :model),
      tool_model: Map.get(opts, :tool_model),
      embedding_model: Map.get(opts, :embedding_model) || @default_embedding_model
    }
  end

  @doc """
  Generates embeddings for the given text using the Nexus proxy.

  Delegates to the OpenAI provider with the Nexus URL and token configured,
  following the same pattern as the Azure OpenAI integration.

  Returns an error if the Nexus URL is not configured.
  """
  @spec embeddings(t(), binary) :: {:ok, [{binary, [float]}]} | Console.error
  def embeddings(%__MODULE__{url: url, token: token, embedding_model: model}, text) when is_binary(url) do
    OpenAI.new(%{
      base_url: Path.join(url, "/v1"),
      access_token: token,
      embedding_model: model || @default_embedding_model
    })
    |> OpenAI.embeddings(text)
  end

  def embeddings(%__MODULE__{url: nil}, _text) do
    {:error, "nexus url is not configured"}
  end

  @doc """
  Generate a completion from the Nexus proxy.

  Delegates to the OpenAI provider with the Nexus URL and token configured.
  """
  @spec completion(t(), Console.AI.Provider.history(), keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{url: url, model: model} = nexus, messages, opts) when is_binary(url) do
    openai_client(nexus, model)
    |> OpenAI.completion(messages, opts)
  end

  def completion(%__MODULE__{url: nil}, _messages, _opts) do
    {:error, "nexus url is not configured"}
  end

  @doc """
  Generate a tool call from the Nexus proxy.

  Delegates to the OpenAI provider with the Nexus URL and token configured.
  """
  @spec tool_call(t(), Console.AI.Provider.history(), [atom], keyword) :: {:ok, binary | [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{url: url, model: model, tool_model: tool_model} = nexus, messages, tools, opts) when is_binary(url) do
    openai_client(nexus, tool_model || model)
    |> OpenAI.tool_call(messages, tools, opts)
  end

  def tool_call(%__MODULE__{url: nil}, _messages, _tools, _opts) do
    {:error, "nexus url is not configured"}
  end

  @doc """
  Returns the context window size based on the configured model.
  """
  def context_window(%__MODULE__{} = nexus), do: OpenAI.context_window(openai_client(nexus, nexus.model))

  @doc """
  Nexus supports tools through the OpenAI interface.
  """
  def tools?(), do: true

  @doc """
  Returns proxy configuration for the Nexus endpoint.
  """
  def proxy(%__MODULE__{url: url, token: token}) when is_binary(url) do
    {:ok, %Console.AI.Proxy{
      backend: :openai,
      url: Path.join(url, "/v1"),
      token: token,
      params: %{}
    }}
  end

  def proxy(%__MODULE__{url: nil}), do: {:error, "nexus url is not configured"}

  defp openai_client(%__MODULE__{url: url, token: token}, model) do
    OpenAI.new(%{
      base_url: Path.join(url, "/v1"),
      access_token: token,
      model: model || OpenAI.default_model()
    })
  end
end
