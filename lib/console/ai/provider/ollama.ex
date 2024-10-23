defmodule Console.AI.Ollama do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider

  require Logger

  defstruct [:url, :model]

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

    @type t :: %__MODULE__{message: [Ollama.Message.t]}

    defstruct [:model, :message]

    def spec(), do: %__MODULE__{message: [Ollama.Message.spec()]}
  end

  def new(opts), do: %__MODULE__{url: opts.url, model: opts.model}

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.history) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = ollama, messages) do
    history = Enum.map(messages, fn {role, msg} -> %{role: role, content: msg} end)
    case chat(ollama, history) do
      {:ok, %ChatResponse{message: %Message{content: content}}} ->
        {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  defp chat(%__MODULE__{url: url, model: model}, history) do
    body = Jason.encode!(%{
      model: model,
      messages: history,
    })

    "#{url}/api/chat"
    |> HTTPoison.post(body, @base_headers, @options)
    |> handle_response(ChatResponse.spec())
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}}, type) when code in 200..299,
    do: {:ok, Poison.decode!(body, as: type)}
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, _) do
    Logger.error "ollama error: #{body}"
    {:error, "ollama error: #{body}"}
  end
  defp handle_response({:error, err}, _), do: {:error, "ollama network error: #{Jason.encode!(Map.from_struct(err))}"}
end
