defmodule Console.GraphQl.Resolvers.Observability do
  alias Console.Services.Observability
  alias Console.Logs.{Provider, Query}

  @default_offset 30 * 60
  @nano 1_000_000_000

  def resolve_dashboards(%{repo: name}, _), do: Observability.get_dashboards(name)

  def resolve_scaling_recommendation(%{namespace: ns, name: name, kind: kind}, _),
    do: Observability.get_scaling_recommendation(kind, ns, name)

  def resolve_dashboard(%{repo: name, name: id} = args, _) do
    now = Timex.now()
    start = Timex.shift(now, seconds: -Map.get(args, :offset, @default_offset))
    with {:ok, dash} <- Observability.get_dashboard(name, id) do
      {:ok, Observability.hydrate(dash, Map.get(args, :labels, []), start, now)}
    end
  end

  def list_logs(args, %{context: %{current_user: user}}) do
    query = Query.new(args)
    with {:ok, query} <- Provider.accessible(query, user),
      do: Provider.query(query)
  end

  def resolve_logs(%{query: query, limit: limit} = args, _) do
    now    = Timex.now()
    start  = (args[:start] || ts(now)) / @nano
    end_ts = (args[:end] || ((start - @default_offset) * @nano)) / @nano
    Observability.get_logs(query, end_ts, start, limit)
  end

  def list_log_aggregations(args, %{context: %{current_user: user}}) do
    args = Map.merge(args, args[:aggregation] || %{})
    query = Query.new(args)
    with {:ok, query} <- Provider.accessible(query, user),
      do: Provider.aggregate(query)
  end

  def resolve_metric(%{query: query} = args, _) do
    now   = Timex.now()
    start = Timex.shift(now, seconds: -Map.get(args, :offset, @default_offset))
    step  = args[:step] || "5m"
    Observability.get_metric(query, start, now, step)
  end

  def ts(ts), do: Timex.to_unix(ts) * @nano

  def prom_args(args) do
    {get_start(args), args[:stop] || Timex.now(), args[:step] || "5m"}
  end

  defp get_start(%{start: start}) when not is_nil(start), do: start
  defp get_start(args), do: Timex.shift(Timex.now(), seconds: -Map.get(args, :offset, @default_offset))
end
