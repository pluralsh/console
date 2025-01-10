defmodule Console.Logs.Provider.Elastic do
  @moduledoc """
  Log driver implementation for victoria metrics
  """
  @behaviour Console.Logs.Provider
  alias Console.Schema.{Cluster, Service}
  alias Console.Logs.{Query, Line, Time}
  alias Console.Logs.Provider.Elastic.Client

  @type t :: %__MODULE__{}

  defstruct [:connection, :client]

  def new(conn) do
    Client.init(conn)
    %__MODULE__{connection: conn, client: Client}
  end

  @spec query(t(), Query.t) :: {:ok, [Line.t]} | Console.error
  def query(%__MODULE__{connection: %{index: index}, client: client}, %Query{} = q) do
    case search(client, index, build_query(q)) do
      {:ok, hits} -> {:ok, format_hits(hits)}
      {:error, err} -> {:error, "failed to query elasticsearch: #{inspect(err)}"}
    end
  end

  defp search(client, index, query) do
    case client.post("/#{index}/_search", query) do
      {:ok, response} -> {:ok, Snap.SearchResponse.new(response)}
      err -> err
    end
  end

  defp format_hits(%Snap.SearchResponse{hits: %Snap.Hits{hits: hits}}) do
    Enum.map(hits, fn %Snap.Hit{fields: fields} ->
      %Line{
        log: fields["message"],
        timestamp: Timex.parse(fields["@timestamp"], "{ISO:Extended:Z}"),
        facets: facets(fields)
      }
    end)
  end
  defp format_hits(_), do: []

  defp build_query(%Query{query: str} = q) do
    %{
      query: maybe_query(str) |> add_terms(q) |> add_range(q) |> add_facets(q),
      sort: [%{"@timestamp": %{order: "desc"}}],
      size: Query.limit(q),
    }
  end

  defp add_terms(query, %Query{resource: %Cluster{} = cluster}),
    do: Map.put(query, :term, term(cluster))
  defp add_terms(query, %Query{resource: %Service{cluster: %Cluster{} = cluster}} = svc),
    do: Map.put(query, :term, term(cluster) |> term(svc))
  defp add_terms(query, _), do: query

  defp add_range(q, %Query{time: %Time{after: aft, before: bef}}) when not is_nil(aft) and not is_nil(bef),
    do: Map.put(q, :range, %{"@timestamp": %{gte: aft, lte: bef}})
  defp add_range(q, %Query{time: %Time{after: aft, before: nil, duration: dur}}) when not is_nil(aft),
    do: Map.put(q, :range, %{"@timestamp": maybe_dur(:gte, aft, dur)})
  defp add_range(q, %Query{time: %Time{after: nil, before: bef, duration: dur}}) when not is_nil(bef),
    do: Map.put(q, :range, %{"@timestamp": maybe_dur(:lte, bef, dur)})
  defp add_range(q,  _), do: q

  defp add_facets(q, %Query{facets: [_ | _] = facets}) do
    term   = Map.get(q, :term, %{})
    facets = Enum.reduce(facets, term, fn %{key: k, value: v}, acc ->
      Map.put(acc, k, %{value: v})
    end)

    Map.put(q, :term, facets)
  end
  defp add_facets(q, _), do: q

  defp term(q \\ %{}, resource)
  defp term(q, %Cluster{handle: handle}), do: Map.put(q, :"cluster.name", %{value: handle})
  defp term(q, %Service{namespace: namespace}), do: Map.put(q, :"kubernetes.namespace", %{value: namespace})

  defp facets(resp) do
    Map.take(resp, ~w(kubernetes cloud container cluster))
    |> Line.flat_map()
    |> Line.facets()
  end

  defp maybe_query(q) when is_binary(q) and byte_size(q) > 0,
    do: %{query_string: %{query: q, default_field: "message"}}
  defp maybe_query(_), do: %{}

  defp maybe_dur(dir, ts, duration) when is_binary(duration) do
    opp = opposite(dir)
    dur = Timex.Duration.parse!(String.upcase(duration))
    %{dir => ts, opp => add_duration(dir, ts, dur)}
  end
  defp maybe_dur(dir, ts, _), do: %{dir => ts}

  defp opposite(:gte), do: :lte
  defp opposite(:lte), do: :gte

  defp add_duration(:lte, ts, dur), do: Timex.subtract(ts, dur)
  defp add_duration(:gte, ts, dur), do: Timex.add(ts, dur)
end
