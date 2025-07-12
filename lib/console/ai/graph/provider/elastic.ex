defmodule Console.AI.Graph.Provider.Elastic do
  @behaviour Console.AI.Graph.Provider
  import Console.Services.Base, only: [ok: 1]
  alias Console.AI.Provider
  alias Console.AI.Graph.IndexableItem
  alias Console.Schema.{User, CloudConnection}
  alias Console.Schema.DeploymentSettings.Elastic
  alias Console.Logs.Provider.Elastic, as: ElasticClient

  @index_mappings %{
    mappings: %{
      properties: %{
        provider: %{type: "keyword"},
        type: %{type: "keyword"},
        id: %{type: "keyword"},
        links: %{type: "keyword"},
        connection: %{type: "keyword"},
        updated_at: %{type: "date"},
        passages: %{
          type: "nested",
          properties: %{
            vector: %{
              type: "dense_vector",
              dims: Console.AI.Utils.embedding_dims(),
              index: true,
              similarity: "cosine"
            },
          }
        },
        "@timestamp": %{type: "date"},
        user_ids: %{type: "keyword"},
        group_ids: %{type: "keyword"},
      }
    }
  }

  @headers [{"Content-Type", "application/json"}]

  defstruct [:conn]

  def new(%Elastic{} = conn), do: %__MODULE__{conn: conn}

  def init(%__MODULE__{conn: %Elastic{index: index} = es}) do
    Elastic.url(es, curr_index(index))
    |> HTTPoison.put(Jason.encode!(@index_mappings), Elastic.headers(es, @headers))
    |> handle_response("could not initialize elasticsearch:")
  end

  def bulk_index(%__MODULE__{conn: %Elastic{} = es}, %CloudConnection{} = cloud, items) do
    cloud = Console.Repo.preload(cloud, [:read_bindings])

    bulk =
      curr_index(es.index)
      |> process_bulk(items, cloud)
      |> Enum.map(&Jason.encode!/1)
      |> Enum.join("\n")

    Elastic.url(es, "/_bulk")
    |> HTTPoison.post("#{bulk}\n", Elastic.headers(es, [{"Content-Type", "application/x-ndjson"}]))
    |> handle_response("could not bulk index into elasticsearch:")
  end

  def fetch(%__MODULE__{conn: %Elastic{} = es}, text, %User{} = user, opts) do
    count = Keyword.get(opts, :count, 5)
    n_candidates = Keyword.get(opts, :n_candidates, 100)
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
         query = vector_query(embedding, count, user, n_candidates, opts),
         {:ok, %Snap.SearchResponse{hits: hits}} <- ElasticClient.search(%{es | index: curr_index(es.index)}, query) do
      Enum.map(hits, fn %Snap.Hit{source: source} -> IndexableItem.from_search(source) end)
      |> Enum.filter(& &1)
      |> ok()
    end
  end

  defp process_bulk(index, items, %CloudConnection{} = cloud) do
    Enum.flat_map(items, fn %IndexableItem{id: id, type: t, links: links, document: doc, attributes: attrs} ->
      [
        %{index: %{_index: index, _id: id}},
        with_access(%{
          type: t,
          provider: cloud.provider,
          connection: cloud.id,
          links: links,
          document: doc,
          attributes: attrs,
          updated_at: DateTime.utc_now()
        }, cloud)
      ]
    end)
    |> Enum.map(fn
      %{document: doc} = item when is_binary(doc) ->
        Map.drop(item, [:document])
        |> Map.put(:passages, passages(doc))
      pass -> pass
    end)
  end

  defp passages(doc) do
    case Provider.embeddings(doc) do
      {:ok, embeddings} ->
        Enum.map(embeddings, fn {passage, vector} -> %{vector: vector, text: passage} end)
      _ -> []
    end
  end

  defp vector_query(embedding, count, user, n_candidates, opts) do
    access_filters(%{
      size: count,
      knn: %{field: "passages.vector", query_vector: embedding, k: count, num_candidates: n_candidates}
    }, user, opts)
  end

  defp access_filters(query, %User{} = user, opts) do
    put_in(query, [:knn, :filter], %{
      bool: %{
        must: [%{range: %{updated_at: %{gte: DateTime.utc_now() |> DateTime.add(-2, :hour)}}}],
        should: [%{terms: %{user_ids: [user.id]}} | groups(user)] ++ opt_filters(Map.new(opts))
      }
    })
  end

  defp with_access(doc, %CloudConnection{read_bindings: bindings}) do
    users  = Enum.map(bindings, & &1.user_id) |> Enum.filter(& &1)
    groups = Enum.map(bindings, & &1.group_id) |> Enum.filter(& &1)

    Map.put(doc, :user_ids, users)
    |> Map.put(:group_ids, groups)
  end

  defp opt_filters(%{connections: ids}), do: [%{terms: %{connection: ids}}]
  defp opt_filters(_), do: []

  defp groups(%User{group_members: [_ | _] = members}), do: [%{terms: %{group_ids: Enum.map(members, & &1.group_id)}}]
  defp groups(_), do: []

  defp handle_response({:ok, %HTTPoison.Response{status_code: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %HTTPoison.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{body}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: elasticsearch error"}

  def curr_index(index) when is_binary(index) do
    ts = DateTime.utc_now() |> Calendar.strftime("%m-%d-%Y")
    "#{index}-#{ts}"
  end
end
