defmodule Console.Logs.Provider.Opensearch do
  @moduledoc """
  Opensearch log driver implementation
  """
  @behaviour Console.Logs.Provider
  alias Console.Schema.{Cluster, Service, DeploymentSettings.Opensearch}
  alias Console.Logs.{Query, Line, Time, AggregationBucket}

  @type t :: %__MODULE__{}
  @headers [{"Content-Type", "application/json"}]

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

  @spec aggregate(t(), Query.t) :: {:ok, [map()]} | Console.error
  def aggregate(%__MODULE__{connection: connection}, %Query{} = q) do
    case search(connection, build_aggregation_query(q)) do
      {:ok, response} -> {:ok, format_aggregation_response(response)}
      {:error, err} -> {:error, "failed to query elasticsearch aggregations: #{inspect(err)}"}
    end
  end

  def search(%Opensearch{index: index} = conn, query) do
    Req.new([
      url: Opensearch.url(conn, "#{index}/_search"),
      method: :post,
      headers: Opensearch.headers(conn, @headers),
      body: Jason.encode!(query),
      aws_sigv4: Opensearch.aws_sigv4_headers(conn)
    ])
    |> Req.post()
    |> search_response()
  end

  defp search_response({:ok, %Req.Response{status: 200, body: body}}) do
    {:ok, Snap.SearchResponse.new(body)}
  end
  defp search_response({:ok, %Req.Response{body: body}}), do: {:error, "opensearch failure: #{body}"}
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

  defp format_aggregation_response(%Snap.SearchResponse{aggregations: %{"logs_over_time" => %Snap.Aggregation{buckets: buckets}}}) do
    Enum.map(buckets, fn bucket ->
      %AggregationBucket{
        timestamp: parse_bucket_timestamp(bucket["key_as_string"] || bucket["key"]),
        count: bucket["doc_count"]
      }
    end)
  end
  defp format_aggregation_response(_), do: []

  defp parse_bucket_timestamp(timestamp) when is_integer(timestamp) do
    DateTime.from_unix!(timestamp, :millisecond)
  end
  defp parse_bucket_timestamp(timestamp) when is_binary(timestamp) do
    case DateTime.from_iso8601(timestamp) do
      {:ok, dt, _} -> dt
      _ -> DateTime.utc_now()
    end
  end

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

  defp add_terms(query, %Query{resource: %Cluster{} = cluster}) do
    put_in(query[:bool][:filter], [
      %{nested: %{
        path: "cluster",
        query: %{
          term: %{"cluster.handle.keyword" => cluster.handle}
        }
      }}
    ])
  end

  defp add_terms(query, %Query{resource: %Service{cluster: %Cluster{} = cluster} = svc}) do
    put_in(query[:bool][:filter], [
      %{nested: %{
        path: "kubernetes",
        query: %{
          term: %{"kubernetes.namespace.keyword" => svc.namespace}
        }
      }},
      %{nested: %{
        path: "cluster",
        query: %{
          term: %{"cluster.handle.keyword" => cluster.handle}
        }
      }}
    ])
  end
  defp add_terms(query, _), do: query

  defp add_namespaces(query, %Query{namespaces: [_ | _] = ns}) do
    add_filter(query, %{
      nested: %{
        path: "kubernetes",
        query: %{
          terms: %{"kubernetes.namespace.keyword" => ns}
        }
      }
    })
  end
  defp add_namespaces(query, _), do: query

  defp add_range(q, %Query{time: %Time{after: aft, before: bef}}) when not is_nil(aft) and not is_nil(bef) do
    add_filter(q, %{
      range: %{"@timestamp": %{gte: aft, lte: bef}}
    })
  end
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
      add_filter(acc, %{
        nested: %{
          path: k,
          query: %{
            term: %{"#{k}.keyword" => v}
          }
        }
      })
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

  defp maybe_query(q) when is_binary(q) and byte_size(q) > 0 do
    %{
      bool: %{
        must: [
          %{nested: %{
            path: "message",
            query: %{
              match: %{message: q}
            }
          }}
        ]
      }
    }
  end
  defp maybe_query(_), do: %{bool: %{}}

  defp maybe_dur(dir, ts, duration) when is_binary(duration) do
    opp = Query.opposite(dir)
    dur = Timex.Duration.parse!(String.upcase(duration))
    %{dir => ts, opp => Query.add_duration(opp, ts, dur)}
  end
  defp maybe_dur(dir, ts, _), do: %{dir => ts}

  defp sort(%Query{time: %Time{reverse: true}}), do: [%{"@timestamp": %{order: "asc"}}]
  defp sort(_), do: [%{"@timestamp": %{order: "desc"}}]


  defp build_aggregation_query(%Query{query: str} = q) do
    %{
      query: maybe_query(str)
             |> add_terms(q)
             |> add_range(q)
             |> add_namespaces(q)
             |> add_facets(q),
      aggs: build_aggregations(q),
      size: 0
    }
  end

  defp build_aggregations(%Query{bucket_size: bucket_size}) do
    %{
      logs_over_time: %{
        date_histogram: %{
          field: "@timestamp",
          fixed_interval: bucket_size || "1m"
        }
      }
    }
  end
end
