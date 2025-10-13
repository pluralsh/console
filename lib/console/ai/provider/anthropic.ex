defmodule Console.AI.Anthropic do
  @moduledoc """
  Implements our basic llm behaviour against the Anthropic api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base

  alias Console.AI.Stream

  require Logger

  @default_model "claude-3-5-sonnet-latest"

  defstruct [:access_key, :model, :tool_model, :stream]

  @type t :: %__MODULE__{}

  @max_tokens 8_000
  @base_headers [{"content-type", "application/json"}, {"anthropic-version", "2023-06-01"}]

  @options [recv_timeout: :infinity, timeout: :infinity]

  defmodule Content do
    @type t :: %__MODULE__{}

    defstruct [:text, :type, :name, :input, :id]

    def spec(), do: %__MODULE__{}
  end

  defmodule MessageResponse do
    alias Console.AI.Anthropic

    @type t :: %__MODULE__{content: [Anthropic.Content.t]}

    defstruct [:id, :role, :model, :content]

    def spec(), do: %__MODULE__{content: [Anthropic.Content.spec()]}
  end

  def new(opts) do
    %__MODULE__{
      access_key: opts.access_token,
      model: opts.model,
      tool_model: opts.tool_model,
      stream: Stream.stream()
    }
  end

  def proxy(_), do: {:error, "anthropic proxy not implemented"}

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = anthropic, messages, opts) do
    case chat(anthropic, messages, opts) do
      {:ok, %MessageResponse{content: content}} ->
        {:ok, format_content(content)}
      {:ok, content} when is_binary(content) -> {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  def tool_call(anthropic, messages, tools) do
    case chat(%{anthropic | stream: nil}, messages, plural: tools, require_tools: true) do
      {:ok, %MessageResponse{content: [%Content{type: "tool_use"}] = tools}} ->
        {:ok, gen_tools(tools)}
      {:ok, %MessageResponse{content: content}} ->
        {:ok, format_content(content)}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  def context_window(_), do: 128_000 * 4

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def tools?(), do: true

  defp chat(%__MODULE__{access_key: token, model: model, stream: %Stream{} = stream}, history, opts) do
    tools = tools(opts)
    Stream.Exec.anthropic(fn ->
      {system, history} = split(history)
      url("/messages")
      |> HTTPoison.post(Jason.encode!(%{
        model: model || @default_model,
        system: system,
        messages: history,
        max_tokens: @max_tokens,
        stream: true,
        tool_choice: %{type: :auto},
        tools: (if !Enum.empty?(tools), do: Enum.map(tools, &tool_args/1), else: nil)
      }), json_headers(token), [stream_to: self(), async: :once] ++ @options)
    end, stream)
  end

  defp chat(%__MODULE__{access_key: token, model: model}, history, opts) do
    {system, history} = split(history)
    tools = tools(opts)
    url("/messages")
    |> HTTPoison.post(Jason.encode!(Console.drop_nils(%{
      model: model || @default_model,
      system: system,
      messages: history,
      max_tokens: @max_tokens,
      tool_choice: %{type: :auto},
      tools: (if !Enum.empty?(tools), do: Enum.map(tools, &tool_args/1), else: nil)
    })), json_headers(token), @options)
    |> handle_response(MessageResponse.spec())
  end

  defp split([{:system, msg} | rest]), do: {msg, fmt_msgs(rest)}
  defp split(hist), do: {nil, fmt_msgs(hist)}

  defp fmt_msgs(msgs) do
    Enum.flat_map(msgs, fn
      {:tool, msg, %{call_id: id, name: n, arguments: args}} when is_binary(id) -> [
        %{role: :assistant, content: [%{type: :tool_use, id: id, name: n, input: args}]},
        %{role: :user, content: [%{type: :tool_result, tool_use_id: id, content: msg}]}
      ]
      {role, msg} -> [%{role: anth_role(role), content: msg}]
    end)
  end

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

  defp gen_tools(calls) do
    Enum.map(calls, fn
      %Content{type: "tool_use", id: id, name: n, input: args} ->
        %Console.AI.Tool{id: id, name: n, arguments: args}
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  defp tool_args(%Console.AI.MCP.Tool{name: name, description: description, input_schema: schema}) do
    %{
      name: name,
      description: description,
      input_schema: schema
    }
  end

  defp tool_args(tool) do
    %{
      name: tool.name(),
      description: tool.description(),
      input_schema: tool.json_schema()
    }
  end
end
