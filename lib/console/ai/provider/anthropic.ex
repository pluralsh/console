defmodule Console.AI.Anthropic do
  @moduledoc """
  Implements our basic llm behaviour against the Anthropic api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base

  alias Console.AI.Stream

  require Logger

  @default_model "claude-3-5-sonnet-latest"

  defstruct [
    :access_key,
    :model,
    :tool_model,
    :stream,
    :full_url,
    base_url: "https://api.anthropic.com/v1",
    anthropic_version: "2023-06-01",
    body: %{}
  ]

  @type t :: %__MODULE__{}

  @max_tokens 8_000
  @base_headers [{"content-type", "application/json"}]

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
      full_url: Map.get(opts, :full_url),
      body: Map.get(opts, :body, %{}),
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
      {:ok, %MessageResponse{content: content}} -> generate_tools_and_content(content)
      {:ok, content} when is_binary(content) -> {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  def tool_call(anthropic, messages, tools) do
    case completion(%{anthropic | stream: nil}, messages, plural: tools, require_tools: true) do
      {:ok, _, [_ | _] = tools} -> {:ok, tools}
      {:ok, content, _} -> {:error, "Tool call failed: #{content}"}
      {:ok, content}    -> {:error, "Tool call failed: #{content}"}
      error -> error
    end
  end

  def context_window(_), do: 256_000 * 4

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def tools?(), do: true

  defp chat(%__MODULE__{model: model, stream: %Stream{} = stream} = client, history, opts) do
    tools = tools(opts)
    Stream.Exec.anthropic(fn ->
      url(client, "/messages")
      |> HTTPoison.post(
        build_body(client, model, history, tools, true),
        json_headers(client),
        [stream_to: self(), async: :once] ++ @options
      )
    end, stream)
  end

  defp chat(%__MODULE__{model: model} = client, history, opts) do
    tools = tools(opts)
    url(client, "/messages")
    |> HTTPoison.post(
      build_body(client, model, history, tools),
      json_headers(client),
      @options
    )
    |> handle_response(MessageResponse.spec())
  end

  defp build_body(client, model, history, tools, stream \\ false) do
    {system, history} = split(history)

    Console.drop_nils(%{
      model: model || @default_model,
      system: system,
      messages: history,
      max_tokens: @max_tokens,
      stream: stream,
      tool_choice: %{type: :auto},
      tools: (if !Enum.empty?(tools), do: Enum.map(tools, &tool_args/1), else: nil)
    })
    |> Map.merge(client.body)
    |> Jason.encode!()
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

  defp generate_tools_and_content(content) do
    Enum.reduce(content, {"", []}, fn
      %Content{type: "text", text: t}, {acc, tools} -> {acc <> t, tools}
      %Content{type: "tool_use"} = tool, {acc, tools} ->
        {acc, [tool | tools]}
      _, {acc, tools} -> {acc, tools}
    end)
    |> case do
      {content, [_ | _] = tools} -> {:ok, content, gen_tools(tools)}
      {content, _} -> {:ok, content}
    end
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

  defp url(%__MODULE__{full_url: url}, _) when is_binary(url), do: url
  defp url(%__MODULE__{base_url: url}, path), do: Path.join(url, path)

  defp json_headers(%__MODULE__{access_key: token, anthropic_version: version}) do
    [{"x-api-key", token}, {"anthropic-version", version} | @base_headers]
  end

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

  defp tool_args(tool) when is_atom(tool) do
    %{
      name: tool.name(),
      description: tool.description(),
      input_schema: tool.json_schema()
    }
  end
end
