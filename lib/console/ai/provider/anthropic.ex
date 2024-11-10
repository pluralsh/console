defmodule Console.AI.Anthropic do
  @moduledoc """
  Implements our basic llm behaviour against the Anthropic api
  """
  @behaviour Console.AI.Provider

  require Logger

  defstruct [:access_key, :model]

  @type t :: %__MODULE__{}

  @max_tokens 8_000
  @base_headers [{"content-type", "application/json"}, {"anthropic-version", "2023-06-01"}]

  @options [recv_timeout: :infinity, timeout: :infinity]

  defmodule Content do
    @type t :: %__MODULE__{}

    defstruct [:text, :type]

    def spec(), do: %__MODULE__{}
  end

  defmodule MessageResponse do
    alias Console.AI.Anthropic

    @type t :: %__MODULE__{content: [Anthropic.Content.t]}

    defstruct [:id, :role, :model, :content]

    def spec(), do: %__MODULE__{content: [Anthropic.Content.spec()]}
  end

  def new(opts), do: %__MODULE__{access_key: opts.access_token, model: opts.model}

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.history) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = anthropic, messages) do
    case chat(anthropic, messages) do
      {:ok, %MessageResponse{content: content}} ->
        {:ok, format_content(content)}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  defp chat(%__MODULE__{access_key: token, model: model}, history) do
    {system, history} = split(history)
    url("/messages")
    |> HTTPoison.post(Jason.encode!(%{
      model: model || "claude-3-5-haiku-latest",
      system: system,
      messages: history,
      max_tokens: @max_tokens
    }), json_headers(token), @options)
    |> handle_response(MessageResponse.spec())
  end

  defp split([{:system, msg} | rest]), do: {msg, fmt_msgs(rest)}
  defp split(hist), do: {nil, fmt_msgs(hist)}

  defp fmt_msgs(msgs), do: Enum.map(msgs, fn {role, msg} -> %{role: anth_role(role), content: msg} end)

  defp format_content(content) do
    Enum.map(content, fn
      %Content{type: "text", text: t} -> t
      _ -> ""
    end)
    |> Enum.join("\n")
  end

  defp anth_role(:assistant), do: :assistant
  defp anth_role(_), do: :user

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}}, type) when code in 200..299,
    do: {:ok, Poison.decode!(body, as: type)}
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, _) do
    Logger.error "anthropic error: #{body}"
    {:error, "anthropic error: #{body}"}
  end
  defp handle_response({:error, err}, _), do: {:error, "anthropic network error: #{Jason.encode!(Map.from_struct(err))}"}

  defp url(path), do: "https://api.anthropic.com/v1#{path}"

  defp json_headers(token), do: headers(@base_headers, token)

  defp headers(headers, token), do: [{"x-api-key", token} | headers]
end
