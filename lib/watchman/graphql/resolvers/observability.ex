defmodule Watchman.GraphQl.Resolvers.Observability do
  alias Watchman.Services.Observability
  @default_offset 30 * 60

  def resolve_dashboards(%{repo: name}, _), do: Observability.get_dashboards(name)

  def resolve_dashboard(%{repo: name, name: id} = args, _) do
    now = Timex.now()
    start = Timex.shift(now, seconds: -Map.get(args, :offset, @default_offset))
    with {:ok, dash} <- Observability.get_dashboard(name, id) do
      {:ok, Observability.hydrate(dash, Map.get(args, :labels, []), start, now)}
    end
  end

  def resolve_logs(%{query: query, limit: limit} = args, _) do
    now    = Timex.now()
    start  = args[:start] || nano_ts(now)
    end_ts = args[:end] || (start - (@default_offset * 1000 * 1000))
    Observability.get_logs(query, start, end_ts, limit)
  end

  defp nano_ts(ts), do: Timex.to_unix(ts) * 1000 * 1000
end