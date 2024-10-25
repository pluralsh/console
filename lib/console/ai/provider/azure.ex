defmodule Console.AI.Azure do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias Console.AI.OpenAI.{CompletionResponse, Choice, Message}

  require Logger

  defstruct [:access_key, :api_version, :endpoint]

  @type t :: %__MODULE__{}

  @options [recv_timeout: :infinity, timeout: :infinity]

  def new(opts) do
    %__MODULE__{
      access_key: opts.access_key,
      api_version: opts.api_version,
      endpoint: opts.endpoint
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
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  defp chat(%__MODULE__{access_key: token} = az, history) do
    url(az, "/chat/completions")
    |> HTTPoison.post(Jason.encode!(%{messages: history}), json_headers(token), @options)
    |> handle_response(CompletionResponse.spec())
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}}, type) when code in 200..299,
    do: {:ok, Poison.decode!(body, as: type)}
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, _) do
    Logger.error "azure openai error: #{body}"
    {:error, "azure openai error: #{body}"}
  end
  defp handle_response({:error, err}, _), do: {:error, "azure openai network error: #{Jason.encode!(Map.from_struct(err))}"}

  defp url(%__MODULE__{endpoint: host, api_version: vsn}, path), do: "#{host}#{path}?api-version=#{vsn || "2024-10-01-preview"}"

  defp json_headers(token), do: headers([{"Content-Type", "application/json"}], token)

  defp headers(headers, token), do: [{"Authorization", "Bearer #{token}"} | headers]
end
