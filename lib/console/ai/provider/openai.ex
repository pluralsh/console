defmodule Console.AI.OpenAI do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider

  alias Console.AI.Stream

  require Logger

  @model "gpt-4o-mini"

  def default_model(), do: @model

  defstruct [:access_key, :model, :base_url, :params, :stream]

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

  def new(opts) do
    %__MODULE__{
      access_key: opts.access_token,
      model: opts.model,
      base_url: opts.base_url,
      stream: Stream.stream()
    }
  end

  @doc """
  Generate a openai completion from
  """
  @spec completion(t(), Console.AI.Provider.history) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = openai, messages) do
    history = Enum.map(messages, fn {role, msg} -> %{role: role, content: msg} end)
    case chat(openai, history) do
      {:ok, %CompletionResponse{choices: [%Choice{message: %Message{content: content}} | _]}} ->
        {:ok, content}
      {:ok, content} when is_binary(content) -> {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  defp chat(%__MODULE__{access_key: token, model: model, stream: %Stream{} = stream} = openai, history) do
    Stream.Exec.openai(fn ->
      body = Jason.encode!(%{
        model: model || "gpt-4o-mini",
        messages: history,
        stream: true
      })

      url(openai, "/chat/completions")
      |> HTTPoison.post(body, json_headers(token), [stream_to: self(), async: :once] ++ @options)
    end, stream)
  end

  defp chat(%__MODULE__{access_key: token, model: model} = openai, history) do
    body = Jason.encode!(%{
      model: model || "gpt-4o-mini",
      messages: history,
    })

    url(openai, "/chat/completions")
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

  defp url(%__MODULE__{base_url: url} = c, path) when is_binary(url), do: with_params(c, Path.join(url, path))
  defp url(c, path), do: with_params(c, "https://api.openai.com/v1#{path}")

  defp with_params(%__MODULE__{params: params}, p) when is_map(params), do: "#{p}&#{URI.encode_query(params)}"
  defp with_params(_, p), do: p

  defp json_headers(token), do: headers([{"Content-Type", "application/json"}], token)

  defp headers(headers, token), do: [{"Authorization", "Bearer #{token}"} | headers]
end
