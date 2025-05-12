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
  @aws_service_name "es"

  defstruct [:conn]

  def new(%Opensearch{} = conn), do: %__MODULE__{conn: conn}

  def init(%__MODULE__{conn: %Opensearch{index: index} = os}) do
    IO.inspect(os, label: "os")
    Req.new([
      url: url(os, index),
      method: :put,
      headers: headers(os),
      body: Jason.encode!(@index_mappings),
      aws_sigv4: aws_sigv4_headers(os)
    ])
    |> Req.put()
    |> handle_response("could not initialize elasticsearch:")
    |> case do
      :ok -> initialized()
      err -> err
    end
  end

  def insert(%__MODULE__{conn: %Opensearch{} = os}, data, opts) do
    IO.inspect(data, label: "data")
    filters = Keyword.get(opts, :filters, [])
    with {datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text) do
      Req.new([
        url: url(os, "#{os.index}/_doc"),
        method: :post,
        headers: headers(os),
        body: Jason.encode!(doc_filters(%{
          passages: Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end),
          datatype: datatype,
          "@timestamp": DateTime.utc_now(),
          "#{datatype}": Console.mapify(data)
        }, filters)),
        aws_sigv4: aws_sigv4_headers(os)
      ])
      |> Req.post()
      |> handle_response("could not insert vector into elasticsearch:")
    end
  end

  def fetch(%__MODULE__{conn: %Opensearch{} = os}, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    n_candidates = Keyword.get(opts, :n_candidates, 100)
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         query = vector_query(embedding, count, filters, n_candidates),
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

  defp vector_query(embedding, count, filters, n_candidates) do
    query_filters(%{
      size: count,
      knn: %{field: "passages.vector", query_vector: embedding, k: count, num_candidates: n_candidates}
    }, filters)
  end

  defp query_filters(query, [_ | _] = filters) do
    put_in(query, [:knn, :filter], Enum.map(filters, fn
      {k, {:raw, v}} -> %{term: %{k => v}}
      {k, v} -> %{term: %{"filters.#{k}.keyword" => v}}
    end))
  end
  defp query_filters(query, _), do: query

  defp doc_filters(doc, [_ | _] = filters) do
    Map.put(doc, :filters, Map.new(filters))
  end
  defp doc_filters(doc, _), do: doc

  defp url(%Opensearch{host: host}, path), do: Path.join(host, path)

  defp headers(%Opensearch{} = os) do
    [{"X-Amz-Security-Token", Map.get(os, :aws_session_token) || System.get_env("AWS_SESSION_TOKEN")} | @headers]
  end

  defp aws_sigv4_headers(os) do
    [
      service: @aws_service_name,
      region: Map.get(os, :aws_region) || System.get_env("AWS_REGION"),
      access_key_id: Map.get(os, :aws_access_key_id) || System.get_env("AWS_ACCESS_KEY_ID"),
      secret_access_key: Map.get(os, :aws_secret_access_key) || System.get_env("AWS_SECRET_ACCESS_KEY")
    ]
  end
end
