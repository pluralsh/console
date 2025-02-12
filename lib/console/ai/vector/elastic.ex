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

  def insert(%__MODULE__{conn: %Elastic{} = es}, data) do
    with {datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text) do
      url(es, "#{es.index}/_doc")
      |> HTTPoison.post(Jason.encode!(%{
        passages: Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end),
        datatype: datatype,
        "#{datatype}": Map.from_struct(data)
      }), headers(es))
      |> handle_response("could not insert vector into elasticsearch:")
    end
  end

  def fetch(%__MODULE__{conn: %Elastic{} = es}, text) do
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         {:ok, %Snap.SearchResponse{hits: hits}} <- Console.Logs.Provider.Elastic.search(es, vector_query(embedding)) do
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

  defp vector_query(embedding) do
    %{
      size: 5,
      query: %{
        knn: %{field: "passages.vector", query_vector: embedding, k: 5}
      }
    }
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{body}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: elasticsearch error"}

  defp url(%Elastic{host: host}, path), do: Path.join(host, path)

  defp headers(%Elastic{user: u, password: p}) when is_binary(u) and is_binary(p),
    do: [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  defp headers(_), do: @headers
end
