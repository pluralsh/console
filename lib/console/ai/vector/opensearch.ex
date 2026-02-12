defmodule Console.AI.Vector.Opensearch do
  @behaviour Console.AI.VectorStore
  import Console.Services.Base, only: [ok: 1]
  import Console.AI.Vector.Utils
  alias Console.AI.Vector.Elastic

  alias Console.AI.Utils
  alias Console.AI.Provider
  alias Console.AI.Vector.Content
  alias Console.Schema.{DeploymentSettings.Opensearch}

  @index_mappings %{
    settings: %{
      index: %{
        knn: true
      }
    },
    mappings: %{
      dynamic: false,
      properties: %{
        passages: %{
          type: "nested",
          properties: %{
            vector: %{
              type: "knn_vector",
              dimension: Utils.embedding_dims(),
              method: %{
                name: "hnsw",
                space_type: "cosinesimil",
              }
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
        filters: %{
          type: "object",
          dynamic: true,
        }
      }
    }
  }

  @headers [{"Content-Type", "application/json"}]

  defstruct [:conn, :version, :settings]

  def new(%Opensearch{} = conn, opts \\ []) do
    %__MODULE__{
      conn: conn,
      version: Keyword.get(opts, :version, 1),
      settings: opts[:settings]
    }
  end

  def init(%__MODULE__{conn: %Opensearch{index: index} = os}) do
    Req.new([
      url: Opensearch.url(os, index),
      method: :put,
      headers: Opensearch.headers(os, @headers),
      body: Jason.encode!(@index_mappings),
      aws_sigv4: Opensearch.aws_sigv4_headers(os)
    ])
    |> Req.put()
    |> handle_response("could not initialize elasticsearch:")
    |> case do
      :ok -> initialized()
      err -> err
    end
  end

  def recreate(%__MODULE__{conn: %Opensearch{index: index} = os} = store) do
    Opensearch.url(os, index)
    |> Req.delete()
    |> handle_response("could not delete elasticsearch:")
    |> case do
      :ok -> init(store)
      err -> err
    end
  end

  def insert(%__MODULE__{conn: %Opensearch{} = os} = conn, data, opts \\ []) do
    filters = Keyword.get(opts, :filters, [])
    with {id, datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text) do
      Req.new([
        url: Opensearch.url(os, Elastic.doc_url(os.index, id)),
        method: :post,
        headers: Opensearch.headers(os, @headers),
        body: Jason.encode!(doc_filters(%{
          passages: Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end),
          datatype: datatype,
          "@timestamp": DateTime.utc_now(),
          "#{datatype}": Console.mapify(data)
        }, filters, conn)),
        aws_sigv4: Opensearch.aws_sigv4_headers(os)
      ])
      |> Req.post()
      |> handle_response("could not insert vector into elasticsearch:")
    end
  end

  def fetch(%__MODULE__{conn: %Opensearch{} = os} = conn, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         query = vector_query(embedding, count, filters, vector_authz(opts[:user], conn.version)),
         {:ok, %Snap.SearchResponse{hits: hits}} <- Console.Logs.Provider.Opensearch.search(os, query) do
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

  def delete(_, _), do: :ok

  def expire(_, _), do: :ok

  defp handle_response({:ok, %Req.Response{status: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %Req.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{body}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: opensearch error"}

  defp vector_query(embedding, count, filters, auth) do
    query_filters(%{
      size: count,
      query: %{
        nested: %{
          path: "passages",
          query: %{
            knn: %{
              "passages.vector": %{
                vector: embedding,
                k: count
              }
            }
          }
        }
      }
    }, filters, auth)
  end

  defp query_filters(query, [_ | _] = filters, auth) do
    update_in(query, [:query, :nested, :query], fn nested_query ->
      %{
        bool: %{
          must: add_auth_query([
            nested_query,
            %{bool: %{filter: Enum.map(filters, fn
              {k, {:raw, vs}} when is_list(vs) -> %{terms: %{k => vs}}
              {k, {:raw, v}} -> %{term: %{k => v}}
              {k, v} -> %{term: %{"filters.#{k}.keyword" => v}}
            end)}}
          ], auth),
        }
      }
    end)
  end
  defp query_filters(query, _, _), do: query

  defp add_auth_query(query, [_ | _] = auth) when is_list(query),
    do: [%{bool: %{should: auth_filters(auth)}} | query]
  defp add_auth_query(query, _), do: query

  defp auth_filters(auth) do
    Enum.map(auth, fn
      {field, [_ | _] = vals} -> %{terms: %{field => vals}}
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  defp doc_filters(doc, [_ | _] = filters, conn) do
    {auth, rest} = Keyword.split(filters, [:user_ids, :group_ids])
    Map.put(doc, :filters, Map.new(rest))
    |> add_auth_filters(Map.new(auth), conn)
  end
  defp doc_filters(doc, _, _), do: doc

  defp add_auth_filters(docs, auth, %__MODULE__{version: v}) when v >= 2,
    do: Map.merge(docs, Map.new(auth))
  defp add_auth_filters(docs, _, _), do: docs
end
