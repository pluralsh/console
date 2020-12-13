defmodule Loki.Stream do
  alias Loki.{Response, Data, Value, Client}
  @limit 200

  def stream(query, start_ts, end_ts) do
    Stream.unfold(start_ts, fn start ->
      with [_ | _] = res <- flatten_result(query, start, end_ts),
        do: {res, List.last(res).timestamp + 1}
    end)
    |> Stream.flat_map(& &1)
  end

  defp flatten_result(query, start_ts, end_ts) do
    with {:ok, %Response{data: %Data{result: [_ | _] = results}}} <- Client.query(query, start_ts, end_ts, @limit) |> IO.inspect(),
         [_ | _] = v <- flatten(results) do
      v
    else
      _ -> nil
    end
  end

  defp flatten(results) do
    Enum.flat_map(results, & &1.values)
    |> Enum.sort_by(fn %Value{timestamp: ts} -> -ts end)
  end
end