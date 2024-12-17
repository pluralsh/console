defmodule Console.Logs.Stream.Exec do
  alias Console.Logs.Line

  def exec(start, opts \\ []) do
    parser = Keyword.get(opts, :parser, Console.Logs.Stream.JsonLine)
    mapper = Keyword.get(opts, :mapper, &Line.new/1)

    build_stream(start, parser)
    |> Enum.reduce_while([], fn
      {:error, error}, _ -> {:halt, {:error, "service error: #{inspect(error)}"}}
      {:ok, res}, acc -> {:cont, [mapper.(res) | acc]}
    end)
    |> case do
      l when is_list(l) -> {:ok, Enum.reverse(l)}
      {:error, _} = err -> err
    end
  end

  defp build_stream(start, parser) do
    Stream.resource(
      start,
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
              {items, remaining} = parser.parse(acc <> chunk)
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
