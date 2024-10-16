defmodule Console.AI.OpenAI do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider

  require Logger

  defstruct [:access_key, :model]

  @type t :: %__MODULE__{}

  @options [recv_timeout: :infinity, timeout: :infinity]

  defmodule Message do
    @type t :: %__MODULE__{}

    defstruct [:role, :content, :name]
  end

  defmodule Choice do
    alias Console.AI.OpenAI

    @type t :: %__MODULE__{message: OpenAI.Message.t}

    defstruct [:text, :index, :logprobs, :message]

    def spec(), do: %__MODULE__{message: %OpenAI.Message{}}
  end

  defmodule CompletionResponse do
    alias Console.AI.OpenAI

    @type t :: %__MODULE__{choices: [OpenAI.Choice.t]}

    defstruct [:id, :object, :model, :choices]

    def spec(), do: %__MODULE__{choices: [OpenAI.Choice.spec()]}
  end

  def new(opts), do: %__MODULE__{access_key: opts.access_key, model: opts.model}

  @doc """
  Generate a openai completion from
  """
  @spec completion(t(), Console.AI.Provider.history) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = openai, messages) do
    history = Enum.map(messages, fn {role, msg} -> %{role: role, content: msg} end)
    case chat(openai, history) do
      {:ok, %CompletionResponse{choices: [%Choice{message: %Message{content: content}} | _]}} ->
        {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  defp chat(%__MODULE__{access_key: token, model: model}, history) do
    body = Jason.encode!(%{
      model: model || "chatgpt-4o-latest",
      messages: history,
    })

    url("/chat/completions")
    |> HTTPoison.post(body, json_headers(token), @options)
    |> handle_response(CompletionResponse.spec())
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}}, type) when code in 200..299,
    do: {:ok, Poison.decode!(body, as: type)}
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, _) do
    Logger.error "openai error: #{body}"
    {:error, "openai error: #{body}"}
  end
  defp handle_response({:error, err}, _), do: {:error, "openai network error: #{Jason.encode!(Map.from_struct(err))}"}

  defp url(path), do: "https://api.openai.com/v1#{path}"

  defp json_headers(token), do: headers([{"Content-Type", "application/json"}], token)

  defp headers(headers, token), do: [{"Authorization", "Bearer #{token}"} | headers]
end
