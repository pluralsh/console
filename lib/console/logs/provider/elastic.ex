defmodule Console.Logs.Provider.Elastic do
  @moduledoc """
  Log driver implementation for victoria metrics
  """
  @behaviour Console.Logs.Provider
  alias Console.Schema.{Cluster, Service, DeploymentSettings.Elastic}
  alias Console.Logs.{Query, Line, Time}

  @headers [{"Content-Type", "application/json"}]
  @aws_service_name "es"

  @type t :: %__MODULE__{}

  defstruct [:connection, :client]

  def new(conn) do
    %__MODULE__{connection: conn}
  end

  @spec query(t(), Query.t) :: {:ok, [Line.t]} | Console.error
  def query(%__MODULE__{connection: connection}, %Query{} = q) do
    case search(connection, build_query(q)) do
      {:ok, hits} -> {:ok, format_hits(hits)}
      {:error, err} -> {:error, "failed to query elasticsearch: #{inspect(err)}"}
    end
  end

  def search(%Elastic{aws_enabled: true, host: host, index: index} = conn, query) do
    Req.new([
      url: "#{host}/#{index}/_search",
      headers: headers(conn),
      body: Jason.encode!(query),
      aws_sigv4: aws_sigv4_headers(conn)
    ])
    |> Req.post()
    |> search_response()
  end

  def search(%Elastic{index: index, host: host} = conn, query) do
    HTTPoison.post("#{host}/#{index}/_search", Jason.encode!(query), headers(conn))
    |> search_response()
  end

  defp search_response({:ok, %HTTPoison.Response{status_code: 200, body: body}}) do
    with {:ok, resp} <- Jason.decode(body),
      do: {:ok, Snap.SearchResponse.new(resp)}
  end
  defp search_response({:ok, %Req.Response{status: 200, body: body}}) do
    # Req.Response is already decoded so we can just return the body
    {:ok, Snap.SearchResponse.new(body)}
  end
  defp search_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "es failure: #{body}"}
  defp search_response({:ok, %Req.Response{body: body}}), do: {:error, "es failure: #{body}"}
  defp search_response(_), do: {:error, "network failure"}

  defp format_hits(%Snap.SearchResponse{hits: %Snap.Hits{hits: hits}}) do
    Enum.map(hits, fn %Snap.Hit{source: source} ->
      %Line{
        log: source["message"],
        timestamp: Timex.parse!(source["@timestamp"], "{ISO:Extended:Z}"),
        facets: facets(source)
      }
    end)
    |> Enum.filter(& &1.log)
  end
  defp format_hits(_), do: []

  defp build_query(%Query{query: str} = q) do
    %{
      query: maybe_query(str)
             |> add_terms(q)
             |> add_range(q)
             |> add_namespaces(q)
             |> add_facets(q),
      sort: sort(q),
      size: Query.limit(q),
    }
  end

  defp add_terms(query, %Query{resource: %Cluster{} = cluster}),
    do: put_in(query[:bool][:filter], [%{term: %{"cluster.handle.keyword" => cluster.handle}}])
  defp add_terms(query, %Query{resource: %Service{cluster: %Cluster{} = cluster} = svc}) do
    put_in(query[:bool][:filter], [
      %{term: %{"kubernetes.namespace.keyword" => svc.namespace}},
      %{term: %{"cluster.handle.keyword" => cluster.handle}}
    ])
  end
  defp add_terms(query, _), do: query

  defp add_namespaces(query, %Query{namespaces: [_ | _] = ns}), do: add_filter(query, %{terms: %{"kubernetes.namespace.keyword" => ns}})
  defp add_namespaces(query, _), do: query

  defp add_range(q, %Query{time: %Time{after: aft, before: bef}}) when not is_nil(aft) and not is_nil(bef),
    do: add_filter(q, %{range: %{"@timestamp": %{gte: aft, lte: bef}}})
  defp add_range(q, %Query{time: %Time{after: aft, before: nil, duration: dur}}) when not is_nil(aft),
    do: add_filter(q, %{range: %{"@timestamp": maybe_dur(:gte, aft, dur)}})
  defp add_range(q, %Query{time: %Time{after: nil, before: bef, duration: dur}}) when not is_nil(bef),
    do: add_filter(q, %{range: %{"@timestamp": maybe_dur(:lte, bef, dur)}})
  defp add_range(q, %Query{time: %Time{after: nil, before: nil, duration: dur}}),
    do: add_filter(q, %{range: %{"@timestamp": maybe_dur(:lte, Timex.now(), dur)}})
  defp add_range(q, %Query{time: %Time{before: bef}}) when not is_nil(bef),
    do: add_filter(q, %{range: %{"@timestamp": %{lte: bef}}})
  defp add_range(q, %Query{time: %Time{after: aft}}) when not is_nil(aft),
    do: add_filter(q, %{range: %{"@timestamp": %{gte: aft}}})
  defp add_range(q,  _), do: q

  defp add_facets(q, %Query{facets: [_ | _] = facets}) do
    Enum.reduce(facets, q, fn %{key: k, value: v}, acc ->
      add_filter(acc, %{term: %{"#{k}.keyword" => v}})
    end)
  end
  defp add_facets(q, _), do: q

  defp facets(resp) do
    # this populates kubernetes.node field with an empty map if doesn't already exist
    resp = case resp do
      %{"kubernetes" => %{"node" => %{}}} -> resp
      _ -> put_in(resp, ~w(kubernetes node), %{})
    end

    put_in(resp, ~w(kubernetes node labels), nil)
    |> put_in(~w(kubernetes labels), nil)
    |>  Map.take(~w(kubernetes cloud container cluster))
    |> Line.flat_map()
    |> Line.facets()
  end

  defp add_filter(%{bool: %{filter: fs}} = q, f) when is_list(fs), do: put_in(q[:bool][:filter], [f | fs])
  defp add_filter(q, f), do: put_in(q[:bool][:filter], [f])

  defp maybe_query(q) when is_binary(q) and byte_size(q) > 0,
    do: %{bool: %{must: %{match: %{message: q}}}}
  defp maybe_query(_), do: %{bool: %{}}

  defp maybe_dur(dir, ts, duration) when is_binary(duration) do
    opp = Query.opposite(dir)
    dur = Timex.Duration.parse!(String.upcase(duration))
    %{dir => ts, opp => Query.add_duration(opp, ts, dur)}
  end
  defp maybe_dur(dir, ts, _), do: %{dir => ts}

  defp sort(%Query{time: %Time{reverse: true}}), do: [%{"@timestamp": %{order: "asc"}}]
  defp sort(_), do: [%{"@timestamp": %{order: "desc"}}]

  defp headers(%Elastic{user: u, password: p}) when is_binary(u) and is_binary(p),
    do: [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  defp headers(_), do: @headers

  defp aws_sigv4_headers(es) do
    [
      service: @aws_service_name,
      region: es.aws_region || System.get_env("AWS_REGION"),
      access_key_id: es.aws_access_key_id || System.get_env("AWS_ACCESS_KEY_ID"),
      secret_access_key: es.aws_secret_access_key || System.get_env("AWS_SECRET_ACCESS_KEY")
    ]
  end
end
