defmodule Console.AI.OpenAI do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base

  alias Console.AI.Utils
  alias Console.AI.Stream

  require Logger

  @model "gpt-4.1-mini"
  @embedding_model "text-embedding-3-large"

  def default_model(), do: @model
  def default_embedding_model(), do: @embedding_model

  defstruct [:access_key, :model, :tool_model, :embedding_model, :base_url, :params, :stream]

  @type t :: %__MODULE__{}

  @options [recv_timeout: :infinity, timeout: :infinity]

  defmodule ToolCall do
    @type t :: %__MODULE__{}

    defstruct [:id, :type, :function, :call_id]
  end

  defmodule Message do
    alias Console.AI.OpenAI
    @type t :: %__MODULE__{tool_calls: [OpenAI.ToolCall.t]}

    defstruct [:role, :content, :name, :tool_calls]

    def spec(), do: %__MODULE__{tool_calls: [%OpenAI.ToolCall{}]}
  end

  defmodule Choice do
    alias Console.AI.OpenAI

    @type t :: %__MODULE__{message: OpenAI.Message.t}

    defstruct [:text, :index, :logprobs, :message]

    def spec(), do: %__MODULE__{message: OpenAI.Message.spec()}
  end

  defmodule CompletionResponse do
    alias Console.AI.OpenAI

    @type t :: %__MODULE__{choices: [OpenAI.Choice.t]}

    defstruct [:id, :object, :model, :choices]

    def spec(), do: %__MODULE__{choices: [OpenAI.Choice.spec()]}
  end

  defmodule Embedding do
    @type t :: %__MODULE__{embedding: [float], index: integer}

    defstruct [:embedding, :index]

    def spec(), do: %__MODULE__{}
  end

  defmodule EmbeddingResponse do
    alias Console.AI.OpenAI

    @type t :: %__MODULE__{data: [OpenAI.Embedding.t], model: binary}

    defstruct [:data, :model]

    def spec(), do: %__MODULE__{data: [OpenAI.Embedding.spec()]}
  end

  def new(opts) do
    %__MODULE__{
      access_key: opts.access_token,
      model: opts.model,
      tool_model: opts.tool_model,
      base_url: opts.base_url,
      embedding_model: opts.embedding_model,
      stream: Stream.stream()
    }
  end

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = openai, messages, opts) do
    case chat(openai, msg_history(model(openai), messages), opts) do
      {:ok, %CompletionResponse{choices: [%Choice{message: %Message{content: content, tool_calls: [_ | _] = calls}} | _]}} ->
        {:ok, content, gen_tools(calls)}
      {:ok, %CompletionResponse{choices: [%Choice{message: %Message{content: content}} | _]}} ->
        {:ok, content}
      {:ok, content} when is_binary(content) -> {:ok, content}
      {:ok, content, tools} when is_binary(content) -> {:ok, content, tools}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom]) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = openai, messages, tools) do
    model = tool_model(openai)
    case chat(%{openai | stream: nil, model: model}, msg_history(model, messages), plural: tools, require_tools: true) do
      {:ok, %CompletionResponse{choices: [%Choice{message: %Message{tool_calls: [_ | _] = calls}} | _]}} ->
        {:ok, gen_tools(calls)}
      {:ok, %CompletionResponse{choices: [%Choice{message: %Message{content: content}} | _]}} ->
        {:ok, content}
      {:ok, content} when is_binary(content) -> {:ok, content}
      {:ok, _} -> {:error, "could not generate an ai completion for this context"}
      error -> error
    end
  end

  def embeddings(%__MODULE__{} = openai, text) do
    Utils.chunk(text, 8000)
    |> Enum.reduce_while([], fn chunk, acc ->
      case embed(openai, chunk) do
        {:ok, %EmbeddingResponse{data: [%Embedding{embedding: embedding} | _]}} ->
          {:cont, [{chunk, embedding} | acc]}
        error -> {:halt, error}
      end
    end)
    |> Utils.maybe_ok()
  end

  def context_window(%__MODULE__{model: model}), do: window(model)

  def tools?(), do: true

  defp msg_history(model, messages) do
    Enum.map(messages, fn
      {:tool, msg, id} -> %{role: :tool, content: msg, tool_call_id: id}
      {role, msg} -> %{role: tool_role(role, model), content: msg}
    end)
  end

  defp chat(%__MODULE__{access_key: token, stream: %Stream{} = stream} = openai, history, opts) do
    Stream.Exec.openai(fn ->
      all = tools(opts)
      body = Map.merge(%{
        model: model(openai),
        messages: history,
        stream: true,
        tools: (if !Enum.empty?(all), do: Enum.map(all, &tool_args/1), else: nil)
      }, (if opts[:require_tools], do: %{tool_choice: "required"}, else: %{}))
      |> Console.drop_nils()
      |> Jason.encode!()

      url(openai, "/chat/completions")
      |> HTTPoison.post(body, json_headers(token), [stream_to: self(), async: :once] ++ @options)
    end, stream)
  end

  defp chat(%__MODULE__{access_key: token} = openai, history, opts) do
    all = tools(opts)
    body = Console.drop_nils(%{
      model: model(openai),
      messages: history,
      tools: (if !Enum.empty?(all), do: Enum.map(all, &tool_args/1), else: nil)
    })
    |> Map.merge((if opts[:require_tools], do: %{tool_choice: "required"}, else: %{}))
    |> Jason.encode!()

    url(openai, "/chat/completions")
    |> HTTPoison.post(body, json_headers(token), @options)
    |> handle_response(CompletionResponse.spec())
  end

  defp embed(%__MODULE__{access_key: token, embedding_model: model} = openai, text) do
    body = Console.drop_nils(%{
      model: model || @embedding_model,
      input: String.slice(text, 0, 8100),
      encoding_format: "float",
      dimensions: Utils.embedding_dims()
    })
    |> Jason.encode!()

    url(openai, "/embeddings")
    |> HTTPoison.post(body, json_headers(token), @options)
    |> handle_response(EmbeddingResponse.spec())
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

  defp headers(headers, token) when is_binary(token), do: [{"Authorization", "Bearer #{token}"} | headers]
  defp headers(headers, _), do: headers

  defp gen_tools(calls) do
    Enum.map(calls, fn
      %ToolCall{call_id: id, function: %{"name" => n, "arguments" => args}} ->
        %Console.AI.Tool{id: id, name: n, arguments: Jason.decode!(args)}
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  defp model(%__MODULE__{model: m}) when is_binary(m), do: m
  defp model(_), do: @model

  defp window("gpt-4.1" <> _), do: 1_000_000 * 4
  defp window("o" <> _), do: 1_000_000 * 4
  defp window(_), do: 128_000 * 4

  defp tool_role(:system, "gpt-4.1" <> _), do: :developer
  defp tool_role(:system, "o" <> _), do: :developer
  defp tool_role(r, _), do: r

  defp tool_model(%__MODULE__{model: m, tool_model: tm}), do: tm || m || @model

  defp tool_args(%Console.AI.MCP.Tool{name: name, description: description, input_schema: schema}) do
    %{
      type: :function,
      function: %{
        name: name,
        description: description,
        parameters: schema
      }
    }
  end

  defp tool_args(tool) do
    %{
      type: :function,
      function: %{
        name: tool.name(),
        description: tool.description(),
        parameters: tool.json_schema()
      }
    }
  end
end
