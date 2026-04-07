defmodule Console.AI.Provider.Base do
  alias ReqLLM.{Context, Response, ToolCall, StreamResponse}
  alias Console.AI.{Tool, Stream}

  def select_model(%{tool_model: tool_model}, :tool) when is_binary(tool_model), do: tool_model
  def select_model(%{tool_model_id: tool_model}, :tool) when is_binary(tool_model), do: tool_model
  def select_model(%{model: model}, _), do: model

  def tools(opts) do
    plural = Keyword.get(opts, :plural)
    tools  = Keyword.get(opts, :tools)

    Enum.concat(tools || [], plural || [])
    |> reqllm_tools()
  end

  def generate_text(messages, model, %Stream{}, opts) do
    with {:ok, model} <- model(model),
         {:ok, stream} <- stream_retrier(model, messages, opts),
         {:ok, result} <- StreamResponse.process_stream(stream, on_result: &Stream.publish/1) do
      Stream.offset(1)
      {:ok, result}
    end
  end

  def generate_text(messages, model, _, opts) do
    with {:ok, model} <- model(model),
      do: ReqLLM.generate_text(model, messages, opts)
  end

  def reqllm_messages(messages) do
    Enum.flat_map(messages, fn
      {:system, content} -> [Context.system(content)]
      {:user, content} -> [Context.user(content)]
      {:assistant, content} -> [Context.assistant(content)]
      {:tool, content, %{call_id: id, name: name, arguments: args}} when is_binary(content) ->
        id = tid(id)
        [Context.assistant("", tool_calls: [ToolCall.new(id, name, Jason.encode!(args))]), Context.tool_result(id, content)]
      {:tool, content, %{call_id: id, name: name, arguments: args}} ->
        id = tid(id)
        [Context.assistant("", tool_calls: [ToolCall.new(id, name, Jason.encode!(args))]), Context.tool_result(id, Poison.encode!(content))]
      {:tool, content} -> [Context.tool_result("unknown", content)]
    end)
    |> Context.new()
  end

  defp tid(id) when is_binary(id), do: id
  defp tid(_id), do: Ecto.UUID.generate()

  def reqllm_tools(tools) do
    Enum.map(tools, fn
      %Console.AI.MCP.Tool{name: name, description: description, input_schema: schema} ->
        ReqLLM.Tool.new!(
          name: name,
          description: description,
          parameter_schema: schema,
          callback: {__MODULE__, :noop}
        )
      tool when is_struct(tool) or is_atom(tool) ->
        ReqLLM.Tool.new!(
          name: Tool.name(tool),
          description: Tool.description(tool),
          parameter_schema: Tool.json_schema(tool),
          callback: {__MODULE__, :noop}
        )
    end)
  end

  def reqllm_result({:ok, %Response{} = resp}) do
    case {Response.text(resp), Response.tool_calls(resp)} do
      {text, [_ | _] = tools} -> {:ok, text, Enum.map(tools, &to_tool/1)}
      {text, _} when is_binary(text) -> {:ok, text}
      {_, _} -> {:error, "no text or tool results in response"}
    end
  end
  def reqllm_result({:error, error}) when is_binary(error), do: {:error, error}
  def reqllm_result({:error, %ReqLLM.Error.API.Stream{reason: reason}}) when is_binary(reason), do: {:error, reason}
  def reqllm_result({:error, %ReqLLM.Error.API.Stream{reason: reason}}) when is_map(reason), do: {:error, "internal http error: #{reason}"}
  def reqllm_result({:error, error}), do: {:error, "unknown ai request error: #{inspect(error)}"}
  def reqllm_result(pass), do: pass

  def noop(_), do: {:ok, "ignore"}

  def tool_calls({:ok, _, [_ | _] = calls}), do: {:ok, calls}
  def tool_calls({:ok, binary, _}), do: {:error, "no tool calls in response, got: #{binary}"}
  def tool_calls({:ok, binary}), do: {:error, "no tool calls in response, got: #{binary}"}
  def tool_calls(err), do: err

  defp model(name) when is_binary(name), do: LLMDB.model(name)
  defp model(%LLMDB.Model{} = model), do: {:ok, model}
  defp model(model), do: {:error, "invalid model: #{inspect(model)}"}

  defp to_tool(%ToolCall{id: id, function: %{name: name, arguments: args}}) do
    case JSON.decode(args) do
      {:ok, args} -> %Tool{id: id, name: name, arguments: args}
      _ -> %Tool{id: id, name: name, arguments: %{}}
    end
  end

  defp stream_retrier(model, messages, opts, retries \\ 0)
  defp stream_retrier(model, messages, opts, retries) when retries < 2 do
    case ReqLLM.stream_text(model, messages, opts) do
      {:ok, stream} -> {:ok, stream}
      {:error, %Mint.TransportError{reason: e}} when e in ~w(timeout closed econnrefused)a ->
        :timer.sleep(10 + :rand.uniform(10))
        stream_retrier(model, messages, opts, retries + 1)
      err -> err
    end
  end
end
