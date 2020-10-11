defmodule Watchman.GraphQl.Resolvers.Observability do
  alias Watchman.Services.Observability
  @default_offset 30 * 60
  @nano 1_000_000

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
    start  = (args[:start] || ts(now)) / @nano
    end_ts = (args[:end] || ((start - @default_offset) * @nano)) / @nano
    Observability.get_logs(query, end_ts, start, limit)
  end

  defp ts(ts), do: Timex.to_unix(ts) * @nano
end