defmodule Console.AI.Stream.Exec do
  alias Console.AI.Stream, as: AIStream
  alias Console.AI.Stream.Result
  require Logger

  @type stream_message :: binary | {:tools, [map]} | :pass

  def openai(fun, %AIStream{} = stream), do: exec(fun, stream, &handle_openai/1)
  def anthropic(fun, %AIStream{} = stream), do: exec(fun, stream, &handle_anthropic/1)

  @spec handle_openai(map) :: stream_message
  defp handle_openai(%{"choices" => [%{"delta" => %{"content" => c}} | _]}) when is_binary(c), do: c
  defp handle_openai(%{"choices" => [%{"delta" => %{"tool_calls" => [_ | _] = calls}}]}) do
    {:tools, Enum.map(calls, fn %{"index" => ind, "function" => call} = func ->
      {ind, Map.put(call, "id", func["id"])}
    end)}
  end
  defp handle_openai(_), do: :pass

  @spec handle_anthropic(map) :: stream_message
  defp handle_anthropic(%{
    "type" => "content_block_start",
    "content_block" => %{"text" => t}
  }) when is_binary(t), do: t
  defp handle_anthropic(%{
    "type" => "content_block_start",
    "index" => ind,
    "content_block" => %{"type" => "tool_use"} = tool_use
  }), do: {:tools, [{ind, Map.put(tool_use, "arguments", "")}]}
  defp handle_anthropic(%{
    "type" => "content_block_delta",
    "index" => ind,
    "delta" => %{"type" => "input_json_delta", "partial_json" => json}
  }), do: {:tools, [{ind, %{"arguments" => json}}]}
  defp handle_anthropic(%{"type" => "content_block_delta", "delta" => %{"text" => t}}) when is_binary(t), do: t
  defp handle_anthropic(_), do: :pass

  defp exec(fun, %AIStream{} = stream, reducer) when is_function(reducer, 1) do
    build_stream(fun)
    |> Stream.with_index()
    |> Enum.reduce_while(Result.new(), fn
      {%AIStream.SSE.Event{data: data}, ind}, acc ->
        acc = %{acc | ind: ind}
        case reducer.(data) do
          c when is_binary(c) ->
            AIStream.publish(stream, c, ind)
            {:cont, Result.text(acc, c)}
          {:tools, calls} ->
            {:cont, Enum.reduce(calls, acc, fn {ind, call}, acc -> Result.tool(acc, ind, call) end)}
          _ -> {:cont, acc}
        end

      {{:error, error}, _}, _ when is_binary(error) -> {:halt, {:error, "ai service error: #{error}"}}
      {{:error, error}, _}, _ -> {:halt, {:error, "ai service error: #{inspect(error)}"}}

      _, acc -> {:cont, acc}
    end)
    |> case do
      %Result{} = res ->
        AIStream.offset(res.ind)
        Result.finalize(res)
      {:error, _} = err -> err
    end
  end

  defp build_stream(start_fun) do
    Stream.resource(
      start_fun,
      fn
        {:error, %HTTPoison.Error{} = error} -> {[{:error, error}], :error}
        {:error, _} -> {:halt, :error}
        :error -> {:halt, :error}
        {:halt, res} -> {:halt, res}
        {:ok, %HTTPoison.AsyncResponse{}} = resp  -> {[], {resp, ""}}

        {{:error, err}, _} -> {[{:error, err}], :error}
        {{:ok, %HTTPoison.AsyncResponse{id: id} = res}, acc}  ->
          receive do
            %HTTPoison.AsyncStatus{id: ^id, code: code} when code >= 200 and code < 400 ->
              {[], stream_next(res, acc)}

            %HTTPoison.AsyncStatus{id: ^id, code: code} ->
              {[], stream_next(res, {:error, "error code #{code}\n"})}

            %HTTPoison.AsyncHeaders{id: ^id, headers: _headers} -> {[], stream_next(res, acc)}
            %HTTPoison.AsyncChunk{chunk: chunk} -> handle_chunk(chunk, res, acc)
            %HTTPoison.AsyncEnd{id: ^id} -> finalize(res, acc)
          end
      end,
      fn
        {:halt, %HTTPoison.AsyncResponse{id: id}} -> :hackney.stop_async(id)
        %{id: id} -> :hackney.stop_async(id)
        :error -> :ok
      end
    )
  end

  defp finalize(res, acc) when is_binary(acc), do: {:halt, res}
  defp finalize(res, {:error, acc}), do: {[{:error, acc}], {:halt, res}}

  defp handle_chunk(chunk, %HTTPoison.AsyncResponse{} = res, acc) when is_binary(acc) do
    {items, remaining} = AIStream.SSE.parse(acc <> chunk)
    {items, stream_next(res, remaining)}
  end
  defp handle_chunk(chunk, %HTTPoison.AsyncResponse{} = res, {:error, acc}) when is_binary(acc),
    do: {[], stream_next(res, {:error, acc <> chunk})}

  defp stream_next(%HTTPoison.AsyncResponse{} = resp, acc), do: {HTTPoison.stream_next(resp), acc}
end
