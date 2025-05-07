defmodule Console.AI.Vector.Opensearch do
  @behaviour Console.AI.VectorStore
  import Console.Services.Base, only: [ok: 1]
  import Console.AI.Vector.Utils

  alias Console.AI.Utils
  alias Console.AI.Provider
  alias Console.AI.Vector.Content
  alias Console.Schema.DeploymentSettings.Opensearch

  @index_mappings %{
    settings: %{
      index: %{
        knn: true
      }
    },
    mappings: %{
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
        datatype: %{type: "keyword"}
      }
    }
  }

  @headers [{"Content-Type", "application/json"}]

  defstruct [:conn]

  def new(%Opensearch{} = conn), do: %__MODULE__{conn: conn}

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

  def insert(%__MODULE__{conn: %Opensearch{} = os}, data, opts \\ []) do
    filters = Keyword.get(opts, :filters, [])
    with {datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text) do
      Req.new([
        url: Opensearch.url(os, "#{os.index}/_doc"),
        method: :post,
        headers: Opensearch.headers(os, @headers),
        body: Jason.encode!(doc_filters(%{
          passages: Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end),
          datatype: datatype,
          "@timestamp": DateTime.utc_now(),
          "#{datatype}": Console.mapify(data)
        }, filters)),
        aws_sigv4: Opensearch.aws_sigv4_headers(os)
      ])
      |> Req.post()
      |> handle_response("could not insert vector into elasticsearch:")
    end
  end

  def fetch(%__MODULE__{conn: %Opensearch{} = os}, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         query = vector_query(embedding, count, filters),
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

  defp handle_response({:ok, %Req.Response{status: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %Req.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{body}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: opensearch error"}

  defp vector_query(embedding, count, filters) do
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
    }, filters)
  end

  defp query_filters(query, [_ | _] = filters) do
    update_in(query, [:query, :nested, :query], fn nested_query ->
      %{
        bool: %{
          must: [
            nested_query,
            %{bool: %{filter: Enum.map(filters, fn
              {k, {:raw, v}} -> %{term: %{k => v}}
              {k, v} -> %{term: %{"filters.#{k}.keyword" => v}}
            end)}}
          ]
        }
      }
    end)
  end
  defp query_filters(query, _), do: query

  defp doc_filters(doc, [_ | _] = filters) do
    Map.put(doc, :filters, Map.new(filters))
  end
  defp doc_filters(doc, _), do: doc
end
