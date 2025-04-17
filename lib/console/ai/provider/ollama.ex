defmodule Console.AI.Ollama do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider

  require Logger

  defstruct [:url, :model, :tool_model, :authorization]

  @type t :: %__MODULE__{}

  @base_headers [{"content-type", "application/json"}]

  @options [recv_timeout: :infinity, timeout: :infinity]

  defmodule Message do
    @type t :: %__MODULE__{}

    defstruct [:role, :content]

    def spec(), do: %__MODULE__{}
  end

  defmodule ChatResponse do
    alias Console.AI.Ollama

    @type t :: %__MODULE__{message: Ollama.Message.t}

    defstruct [:model, :message]

    def spec(), do: %__MODULE__{message: Ollama.Message.spec()}
  end

  def new(opts) do
    %__MODULE__{
      url: opts.url,
      model: opts.model,
      tool_model: opts.tool_model,
      authorization: opts.authorization
    }
  end

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = ollama, messages, _) do
    history = Enum.map(messages, fn {role, msg} -> %{role: role, content: msg} end)
    case chat(ollama, history) do
      {:ok, %ChatResponse{message: %Message{content: content}}} ->
        {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  def tool_call(_, _, _), do: {:error, "tool calling not implemented for this provider"}

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def tools?(), do: false

  defp chat(%__MODULE__{url: url, model: model} = ollama, history) do
    body = Jason.encode!(%{
      model: model,
      messages: history,
    })

    "#{url}/api/chat"
    |> HTTPoison.post(body, auth(ollama, @base_headers), @options)
    |> handle_response(ChatResponse.spec())
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}}, type) when code in 200..299,
    do: Poison.decode(body, as: type)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, _) do
    Logger.error "ollama error: #{body}"
    {:error, "ollama error: #{body}"}
  end
  defp handle_response({:error, err}, _), do: {:error, "ollama network error: #{Jason.encode!(Map.from_struct(err))}"}

  defp auth(%__MODULE__{authorization: auth}, headers) when is_binary(auth),
    do: [{"authorization", auth} | headers]
  defp auth(_, headers), do: headers
end
