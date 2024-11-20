defmodule Console.AI.Stream.Exec do
  alias Console.AI.Stream, as: AIStream
  require Logger

  def openai(fun, %AIStream{} = stream), do: exec(fun, stream, &handle_openai/1)

  defp handle_openai(%{"choices" => [%{"delta" => %{"content" => c}} | _]}) when is_binary(c), do: c
  defp handle_openai(_), do: :pass

  defp exec(fun, %AIStream{} = stream, reducer) when is_function(reducer, 1) do
    Enum.reduce_while(build_stream(fun), [], fn
      %AIStream.SSE.Event{data: data}, acc ->
        case reducer.(data) do
          c when is_binary(c) ->
            AIStream.publish(stream, c)
            {:cont, [c | acc]}
          _ -> {:cont, acc}
        end

      {:error, error}, _ -> {:halt, {:error, "ai service error: #{inspect(error)}"}}

      _, acc -> {:cont, acc}
    end)
    |> case do
      l when is_list(l) -> {:ok, Enum.reverse(l) |> IO.iodata_to_binary()}
      {:error, _} = err -> err
    end
  end

  defp build_stream(start_fun) do
    Stream.resource(
      start_fun,
      fn
        {:error, %HTTPoison.Error{} = error} -> {[{:error, error}], :error}
        {{:error, err}, _} -> {[{:error, err}], :error}

        {:ok, %HTTPoison.AsyncResponse{}} = resp  -> {[], {resp, ""}}

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
