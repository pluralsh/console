defmodule Console.Schema.VectorEmbedding do
  use Console.Schema.Base
  import Ecto.Query
  import Pgvector.Ecto.Query

  schema "embeddings" do
    field :doc_id,    :string
    field :embedding, Pgvector.Ecto.Vector
    field :data,      :map
    field :datatype,  :string
    field :filters,   :map
    field :user_ids,  {:array, :string}
    field :group_ids, {:array, :string}

    timestamps()
  end

  @doc false
  def for_doc_id(query \\ __MODULE__, doc_id) when is_binary(doc_id) do
    from(e in query, where: e.doc_id == ^doc_id)
  end

  @doc false
  def apply_filters(query, filters) when is_list(filters) do
    Enum.reduce(filters, query, &filter_clause/2)
  end
  def apply_filters(query, _), do: query

  @doc false
  def apply_not_filters(query, filters) when is_list(filters) do
    Enum.reduce(filters, query, fn spec, q ->
      from(e in q, where: not (^filter_dynamic(spec)))
    end)
  end
  def apply_not_filters(query, _), do: query

  @doc false
  def apply_auth(query, [_ | _] = auth) do
    user_ids = Keyword.get(auth, :user_ids, [])
    group_ids = Keyword.get(auth, :group_ids, [])

    case {user_ids, group_ids} do
      {[], []} -> query
      _ ->
        from(e in query, where: fragment("? && ?", e.user_ids, ^user_ids) or fragment("? && ?", e.group_ids, ^group_ids))
    end
  end
  def apply_auth(query, _), do: query

  @doc false
  def expired_before(query \\ __MODULE__, before) do
    from(e in query, where: e.inserted_at <= ^before)
  end

  @doc false
  def nearest(query \\ __MODULE__, embedding, opts) do
    count = Keyword.get(opts, :count, 5)
    vec = Pgvector.new(embedding)

    query
    |> apply_filters(Keyword.get(opts, :filters, []))
    |> apply_auth(Keyword.get(opts, :auth, []))
    |> order_by([e], asc: cosine_distance(e.embedding, ^vec))
    |> limit(^count)
  end

  defp filter_clause({k, {:raw, vs}}, query) when is_list(vs),
    do: from(e in query, where: field(e, ^k) in ^Enum.map(vs, &normalize/1))
  defp filter_clause({k, {:raw, v}}, query),
    do: from(e in query, where: field(e, ^k) == ^normalize(v))
  defp filter_clause({k, v}, query) do
    key = to_string(k)
    val = normalize(v)

    from(e in query, where: fragment("? ->> ? = ?", e.filters, ^key, ^val))
  end

  defp filter_dynamic({k, {:raw, vs}}) when is_list(vs),
    do: dynamic([e], field(e, ^k) in ^Enum.map(vs, &normalize/1))
  defp filter_dynamic({k, {:raw, v}}),
    do: dynamic([e], field(e, ^k) == ^normalize(v))
  defp filter_dynamic({k, v}) do
    key = to_string(k)
    val = normalize(v)
    dynamic([e], fragment("? ->> ? = ?", e.filters, ^key, ^val))
  end

  defp normalize(v) when is_atom(v), do: to_string(v)
  defp normalize(v), do: to_string(v)
end
