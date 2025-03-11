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
        datatype: %{type: "keyword"}
      }
    }
  }

  defstruct [:conn]

  def new(%Elastic{} = conn), do: %__MODULE__{conn: conn}

  @headers [{"Content-Type", "application/json"}]

  def init(%__MODULE__{conn: %Elastic{index: index} = es}) do
    url(es, index)
    |> HTTPoison.put(Jason.encode!(@index_mappings), headers(es))
    |> handle_response("could not initialize elasticsearch:")
    |> case do
      :ok -> initialized()
      err -> err
    end
  end

  def insert(%__MODULE__{conn: %Elastic{} = es}, data, opts \\ []) do
    filters = Keyword.get(opts, :filters, [])
    with {datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text) do
      url(es, "#{es.index}/_doc")
      |> HTTPoison.post(Jason.encode!(doc_filters(%{
        passages: Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end),
        datatype: datatype,
        "@timestamp": DateTime.utc_now(),
        "#{datatype}": Console.mapify(data)
      }, filters)), headers(es))
      |> handle_response("could not insert vector into elasticsearch:")
    end
  end

  defp doc_filters(doc, [_ | _] = filters) do
    Map.put(doc, :filters, Map.new(filters))
  end
  defp doc_filters(doc, _), do: doc

  def fetch(%__MODULE__{conn: %Elastic{} = es}, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         query = vector_query(embedding, count, filters),
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

  defp vector_query(embedding, count, filters) do
    query_filters(%{
      size: count,
      knn: %{field: "passages.vector", query_vector: embedding, k: count}
    }, filters)
  end

  defp query_filters(query, [_ | _] = filters) do
    put_in(query, [:knn, :filter], %{term: Map.new(filters, fn {k, v} -> {"#{k}.keyword", v} end)})
  end
  defp query_filters(query, _), do: query

  defp handle_response({:ok, %HTTPoison.Response{status_code: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{body}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: elasticsearch error"}

  defp url(%Elastic{host: host}, path), do: Path.join(host, path)

  defp headers(%Elastic{user: u, password: p}) when is_binary(u) and is_binary(p),
    do: [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  defp headers(_), do: @headers
end
