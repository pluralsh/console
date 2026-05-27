defmodule Console.AI.Vector.Postgres do
  @behaviour Console.AI.VectorStore
  import Console.Services.Base, only: [ok: 1]
  import Console.AI.Vector.Utils

  alias Console.AI.Provider
  alias Console.AI.Vector.Content
  alias Console.Repo
  alias Console.Schema.VectorEmbedding
  alias Console.Schema.VectorEmbedding.Migrator

  defstruct [:version, :settings]

  def new(opts \\ []) do
    %__MODULE__{
      version: Keyword.get(opts, :version, 1),
      settings: opts[:settings]
    }
  end

  def init(_store) do
    with :ok <- Migrator.ensure(),
         :ok <- initialized(),
      do: :ok
  end

  def recreate(_store) do
    with :ok <- Migrator.recreate(),
         :ok <- initialized(),
      do: :ok
  end

  def insert(%__MODULE__{}, data, opts \\ []) do
    filters = Keyword.get(opts, :filters, [])

    with {id, datatype, text} <- Content.content(data),
         {:ok, embeddings} <- Provider.embeddings(text),
         doc_id <- id || Ecto.UUID.generate(),
         :ok <- maybe_delete_doc(id),
         now = DateTime.utc_now() |> DateTime.truncate(:microsecond),
         entries = build_entries(embeddings, doc_id, datatype, data, filters, now) do
      {_, nil} = Repo.insert_all(VectorEmbedding, entries)
      :ok
    end
  end

  def fetch(%__MODULE__{} = conn, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    auth = vector_authz(opts[:user], conn.version)

    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text) do
      VectorEmbedding
      |> VectorEmbedding.nearest(embedding, count: count * 3, filters: filters, auth: auth)
      |> Repo.all()
      |> dedupe_by_doc_id(count)
      |> Enum.map(&decode_row/1)
      |> Enum.filter(& &1)
      |> ok()
    end
  end

  def delete(_conn, opts) do
    filters = Keyword.get(opts, :filters, [])
    not_filters = Keyword.get(opts, :not, [])

    VectorEmbedding
    |> VectorEmbedding.apply_filters(filters)
    |> VectorEmbedding.apply_not_filters(not_filters)
    |> Repo.delete_all()

    :ok
  end

  def expire(_conn, opts) do
    filters = Keyword.get(opts, :filters, [])
    not_filters = Keyword.get(opts, :not, [])
    expiry = Keyword.get(opts, :expiry) || Timex.now() |> Timex.shift(hours: -10)

    VectorEmbedding
    |> VectorEmbedding.expired_before(expiry)
    |> VectorEmbedding.apply_filters(filters)
    |> VectorEmbedding.apply_not_filters(not_filters)
    |> Repo.delete_all()

    :ok
  end

  defp maybe_delete_doc(id) when is_binary(id) do
    VectorEmbedding
    |> VectorEmbedding.for_doc_id(id)
    |> Repo.delete_all()

    :ok
  end

  defp maybe_delete_doc(_), do: :ok

  defp build_entries(embeddings, doc_id, datatype, data, filters, now) do
    {auth, rest} = Keyword.split(filters, [:user_ids, :group_ids])
    filters_map = rest |> Map.new() |> stringify_keys()
    payload = Console.mapify(data)
    user_ids = stringify_list(Keyword.get(auth, :user_ids, []))
    group_ids = stringify_list(Keyword.get(auth, :group_ids, []))

    Enum.map(embeddings, fn {_passage, vector} ->
      %{
        id: Ecto.UUID.generate(),
        doc_id: doc_id,
        embedding: Pgvector.new(vector),
        datatype: to_string(datatype),
        data: payload,
        filters: filters_map,
        user_ids: user_ids,
        group_ids: group_ids,
        inserted_at: now,
        updated_at: now
      }
    end)
  end

  defp decode_row(%VectorEmbedding{datatype: datatype, data: data}) do
    Content.decode(datatype, data)
  end

  defp dedupe_by_doc_id(rows, count) do
    rows
    |> Enum.uniq_by(& &1.doc_id)
    |> Enum.take(count)
  end

  defp stringify_keys(map) do
    Map.new(map, fn {k, v} -> {to_string(k), normalize_filter_value(v)} end)
  end

  defp stringify_list(list) do
    Enum.map(list, &normalize_filter_value/1)
  end

  defp normalize_filter_value(v) when is_atom(v), do: to_string(v)
  defp normalize_filter_value(v), do: to_string(v)
end
