defmodule Console.AI.Vector.Elastic do
  @behaviour Console.AI.VectorStore
  import Console.Services.Base, only: [ok: 1]
  import Console.AI.Vector.Utils

  alias Console.AI.Utils
  alias Console.AI.Provider
  alias Console.AI.Vector.Content
  alias Console.Schema.DeploymentSettings.Elastic

  @index_mappings %{
    mappings: %{
      properties: %{
        passages: %{
          type: "nested",
          properties: %{
            vector: %{
              type: "dense_vector",
              dims: Utils.embedding_dims(),
              index: true,
              similarity: "cosine"
            },
            text: %{
              type: "text",
              index: false
            }
          }
        },
        "@timestamp": %{type: "date"},
        datatype: %{type: "keyword"},
        user_ids: %{type: "keyword"},
        group_ids: %{type: "keyword"},
      }
    }
  }

  @headers [{"Content-Type", "application/json"}]

  defstruct [:conn, :version, :settings]

  def new(%Elastic{} = conn, opts \\ []) do
    %__MODULE__{
      conn: conn,
      version: Keyword.get(opts, :version, 1),
      settings: opts[:settings]
    }
  end

  def init(%__MODULE__{conn: %Elastic{index: index} = es}) do
    Elastic.url(es, index)
    |> HTTPoison.put(Jason.encode!(@index_mappings), Elastic.headers(es, @headers))
    |> handle_response("could not initialize elasticsearch:")
    |> case do
      :ok -> initialized()
      err -> err
    end
  end

  def recreate(%__MODULE__{conn: %Elastic{index: index} = es} = store) do
    Elastic.url(es, index)
    |> HTTPoison.delete(Elastic.headers(es, @headers))
    |> handle_response("could not delete elasticsearch:")
    |> case do
      :ok -> init(store)
      err -> err
    end
  end

  def insert(%__MODULE__{conn: %Elastic{} = es} = conn, data, opts \\ []) do
    filters = Keyword.get(opts, :filters, [])
    with {id, datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text) do
      Elastic.url(es, doc_url(es.index, id))
      |> HTTPoison.post(Jason.encode!(doc_filters(%{
        passages: Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end),
        datatype: datatype,
        "@timestamp": DateTime.utc_now(),
        "#{datatype}": Console.mapify(data)
      }, filters, conn)), Elastic.headers(es, @headers))
      |> handle_response("could not insert vector into elasticsearch:")
    end
  end

  def doc_url(index, id) when is_binary(id), do: "#{index}/_doc/#{id}"
  def doc_url(index, _), do: "#{index}/_doc"

  defp doc_filters(doc, [_ | _] = filters, conn) do
    {auth, rest} = Keyword.split(filters, [:user_ids, :group_ids])
    Map.put(doc, :filters, Map.new(rest))
    |> add_auth_filters(Map.new(auth), conn)
  end
  defp doc_filters(doc, _, _), do: doc

  defp add_auth_filters(docs, auth, %__MODULE__{version: v}) when v >= 2,
    do: Map.merge(docs, Map.new(auth))
  defp add_auth_filters(docs, _, _), do: docs

  def fetch(%__MODULE__{conn: %Elastic{} = es} = conn, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    n_candidates = Keyword.get(opts, :n_candidates, 100)
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         query = vector_query(embedding, count, filters, n_candidates, vector_authz(opts[:user], conn.version)),
         {:ok, %Snap.SearchResponse{hits: hits}} <- Console.Logs.Provider.Elastic.search(es, query) do
      Enum.map(hits, fn %Snap.Hit{source: source} ->
        datatype = source["datatype"]
        case source[datatype] do
          %{} = data -> Content.decode(datatype, data)
          _ -> nil
        end
      end)
      |> Enum.filter(& &1)
      |> ok()
    end
  end

  def delete(%__MODULE__{conn: %Elastic{} = es}, opts) do
    filters = Keyword.get(opts, :filters, [])
    not_filters = Keyword.get(opts, :not, [])
    query = %{query: %{bool: add_not(%{must: filters(filters)}, not_filters)}}
    Elastic.url(es, "#{es.index}/_delete_by_query")
    |> HTTPoison.post(Jason.encode!(query), Elastic.headers(es, @headers))
    |> handle_response("could not delete vectors from elasticsearch:")
  end

  def expire(%__MODULE__{conn: %Elastic{} = es}, opts) do
    filters = Keyword.get(opts, :filters, [])
    not_filters = Keyword.get(opts, :not, [])
    expiry = Keyword.get(opts, :expiry) || Timex.now() |> Timex.shift(hours: -10)
    range_filter = %{range: %{"@timestamp": %{lte: expiry}}}
    query = %{
      query: %{
        bool: add_not(%{must: [range_filter | filters(filters)]}, not_filters)
      }
    }

    Elastic.url(es, "#{es.index}/_delete_by_query")
    |> HTTPoison.post(Jason.encode!(query), Elastic.headers(es, @headers))
    |> handle_response("could not delete vectors from elasticsearch:")
  end

  defp vector_query(embedding, count, filters, n_candidates, auth) do
    query_filters(%{
      size: count,
      knn: %{
        field: "passages.vector",
        query_vector: embedding,
        k: count,
        num_candidates: n_candidates
      }
    }, filters, auth)
  end

  defp query_filters(query, [_ | _] = fs, auth),
    do: put_in(query, [:knn, :filter], %{bool: %{must: add_auth_query(filters(fs), auth)}})
  defp query_filters(query, _, [_ | _] = auth),
    do: put_in(query, [:knn, :filter], %{bool: add_auth_query(%{}, auth)})
  defp query_filters(query, _, _), do: query

  defp filters([_ | _] = filters) do
    Enum.map(filters, fn
      {k, {:raw, vs}} when is_list(vs) -> %{terms: %{k => vs}}
      {k, {:raw, v}} -> %{term: %{k => v}}
      {k, v} -> %{term: %{"filters.#{k}.keyword" => v}}
    end)
  end
  defp filters(_), do: %{}

  defp add_auth_query(%{} = filters, [_ | _] = auth),
    do: Map.put(filters, :should, auth_filters(auth))
  defp add_auth_query(filters, [_ | _] = auth) when is_list(filters),
    do: [%{bool: %{should: auth_filters(auth)}} | filters]
  defp add_auth_query(filters, _), do: filters

  defp auth_filters(auth) do
    Enum.map(auth, fn
      {field, [_ | _] = vals} -> %{terms: %{field => vals}}
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  defp add_not(filters, [_ | _] = not_filters) do
    Map.put(filters, :must_not, filters(not_filters))
  end
  defp add_not(filters, _), do: filters

  defp handle_response({:ok, %HTTPoison.Response{status_code: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{body}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: elasticsearch error"}
end
