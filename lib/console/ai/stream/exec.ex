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
    {:tools, Enum.map(calls, fn %{"index" => ind, "function" => call} -> {ind, call} end)}
  end
  defp handle_openai(_), do: :pass

  @spec handle_openai(map) :: stream_message
  defp handle_anthropic(%{"type" => "content_block_start", "content_block" => %{"text" => t}}) when is_binary(t), do: t
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
        {{:error, err}, _} -> {[{:error, err}], :error}

        {:ok, %HTTPoison.AsyncResponse{}} = resp  ->
          {[], {resp, ""}}

        {{:ok, %HTTPoison.AsyncResponse{id: id} = res}, acc}  ->
          receive do
            %HTTPoison.AsyncStatus{id: ^id, code: code} when code >= 200 and code < 400 ->
              {[], stream_next(res, acc)}

            %HTTPoison.AsyncStatus{id: ^id, code: code} ->
              {[{:error, "error code: #{code}"}], :error}

            %HTTPoison.AsyncHeaders{id: ^id, headers: _headers} ->
              {[], stream_next(res, acc)}

            %HTTPoison.AsyncChunk{chunk: chunk} ->
              {items, remaining} = AIStream.SSE.parse(acc <> chunk)
              {items, stream_next(res, remaining)}

            %HTTPoison.AsyncEnd{id: ^id} ->
              {:halt, res}
          end
        {:error, _} -> {:halt, :error}
        :error -> {:halt, :error}
      end,
      fn
        %{id: id} -> :hackney.stop_async(id)
        :error -> :ok
      end
    )
  end

  defp stream_next(resp, acc), do: {HTTPoison.stream_next(resp), acc}
end
