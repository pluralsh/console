defmodule Console.Logs.Stream.Exec do
  alias Console.Logs.Line

  @timeout :timer.seconds(30)

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
        {:error, error} -> {[{:error, error}], :error}

        {:ok, %Req.Response{status: code}} = resp when code >= 200 and code < 400 ->
          {[], {resp, ""}}

        {:ok, %Req.Response{status: code}} ->
          {[{:error, "error code: #{code}"}], :error}

        {{:ok, %Req.Response{body: %Req.Response.Async{ref: ref}} = res}, acc} ->
          receive do
            {^ref, _} = message ->
              case Req.parse_message(res, message) do
                {:ok, [data: chunk]} ->
                  {items, remaining} = parser.parse(acc <> chunk)
                  {items, {{:ok, res}, remaining}}

                {:ok, [trailers: _]} ->
                  {[], {{:ok, res}, acc}}

                {:ok, [:done]} ->
                  {:halt, res}

                {:error, err} ->
                  {[{:error, err}], :error}

                :unknown ->
                  {[], {{:ok, res}, acc}}
              end
          after
            @timeout -> {:halt, res}
          end

        :error -> {:halt, :error}
      end,
      fn
        %Req.Response{body: %Req.Response.Async{}} = res -> Req.cancel_async_response(res)
        _ -> :ok
      end
    )
  end
end
