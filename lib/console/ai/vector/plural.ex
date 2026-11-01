defmodule Console.AI.Vector.Plural do
  @moduledoc """
  Vector store backed by a Plural vector cluster (`plural-vector cluster`).  Every indexed object is
  stored as one document in the configured namespace, with a row per passage.  The namespace and its
  schema are managed out of band; with `defer_embeddings` the namespace is expected to embed the `text`
  attribute with the server's own model, otherwise vectors are computed with the console's embedding provider.
  """
  @behaviour Console.AI.VectorStore
  @behaviour Console.AI.Vector.Bulk
  import Console.Services.Base, only: [ok: 1]
  import Console.AI.Vector.Utils
  require Logger

  alias Console.AI.Utils
  alias Console.AI.Provider
  alias Console.AI.Vector.Content
  alias Console.AI.Vector.Plural.{Delete, Document, Passage, Write}
  alias Console.Schema.DeploymentSettings.Plural, as: Conn

  # the cluster api caps request bodies at axum's default 2 MiB
  @max_bytes 1_536 * 1024
  @max_count 500
  @chunk_size 8000
  @auth ~w(user_ids group_ids)a
  @all %{op: "Exists", attribute: "datatype"}

  defstruct [:conn, :version, :settings]

  def new(%Conn{} = conn, opts \\ []) do
    %__MODULE__{
      conn: conn,
      version: Keyword.get(opts, :version, 1),
      settings: opts[:settings]
    }
  end

  def init(_), do: initialized()

  def recreate(%__MODULE__{conn: conn}) do
    with :ok <- delete_by_filter(conn, [@all]),
      do: initialized()
  end

  def insert(%__MODULE__{} = store, data, opts \\ []) do
    with {:ok, doc} <- prepare(store, data, opts),
      do: direct(bulk_write(store, [doc]))
  end

  def prepare(%__MODULE__{conn: conn}, data, opts) do
    case Content.content(data) do
      {id, datatype, text} when is_binary(text) ->
        case passages(conn, text) do
          {:ok, [_ | _] = passages} ->
            fit(%Document{
              id: id || Ecto.UUID.generate(),
              attributes: attributes(data, datatype, Keyword.get(opts, :filters, [])),
              passages: passages
            })
          {:ok, []} -> :ignore
          err -> err
        end
      _ -> :ignore
    end
  end

  def prepare_delete(%__MODULE__{}, opts) do
    filters = Keyword.get(opts, :filters, [])
    not_filters = Keyword.get(opts, :not, [])
    {:ok, %Delete{filter: combine(Enum.map(filters, &filter/1) ++ negate(not_filters))}}
  end

  # the db applies a write's deletes before its upserts, so a delete can't join a batch holding a document it matches
  def conflicts?(_, entries, %Delete{filter: filter}),
    do: Enum.any?(entries, &(is_struct(&1, Document) && matches?(filter, &1.attributes)))
  def conflicts?(_, _, _), do: false

  def size(entry), do: IO.iodata_length(Jason.encode_to_iodata!(entry))

  def limits(_), do: %{max_bytes: @max_bytes, max_count: @max_count}

  def bulk_write(_, []), do: :ok
  def bulk_write(%__MODULE__{conn: conn}, entries) do
    {deletes, docs} = Enum.split_with(entries, &is_struct(&1, Delete))

    write = %Write{
      delete_by_filter: any_of(Enum.map(deletes, & &1.filter)),
      upsert_documents: Enum.reverse(docs) |> Enum.uniq_by(& &1.id) |> nil_if_empty()
    }

    case {write(conn, write), docs} do
      {{:ok, _}, _} -> :ok
      {{:error, {404, _}}, []} -> :ok
      {{:error, {code, _}} = err, _} when code == :network or code in [408, 429] or (is_integer(code) and code >= 500) ->
        {:error, msg} = format_error(err, "could not write vectors to plural vector")
        {:retry, msg}
      {err, _} -> format_error(err, "could not write vectors to plural vector")
    end
  end

  # a document is one upsert, so it can't be split across requests: keep the leading passages that fit the request limit
  defp fit(%Document{id: id, passages: passages} = doc) do
    base = size(%{doc | passages: []})

    {kept, _} = Enum.reduce_while(passages, {[], base}, fn passage, {acc, total} ->
      total = total + size(passage) + 1
      if total <= @max_bytes, do: {:cont, {[passage | acc], total}}, else: {:halt, {acc, total}}
    end)

    case Enum.reverse(kept) do
      [] -> {:error, "document #{id} is too large to index in plural vector (#{base} bytes without passages)"}
      ^passages -> {:ok, doc}
      kept ->
        Logger.warning("indexing #{length(kept)} of #{length(passages)} passages of document #{id} to fit plural vector's request limit")
        {:ok, %{doc | passages: kept}}
    end
  end

  defp direct({:retry, msg}), do: {:error, msg}
  defp direct(result), do: result

  def fetch(%__MODULE__{conn: conn, version: version}, text, opts) do
    count = Keyword.get(opts, :count, 5)
    filters = Keyword.get(opts, :filters, [])
    auth = vector_authz(opts[:user], version)

    with {:ok, rank} <- rank_by(conn, text),
         query = query(rank, count, filters, auth),
         {:ok, body} <- request(conn, :post, namespace_path(conn, "query"), query) do
      Map.get(body, "rows", [])
      |> Enum.map(&decode_row/1)
      |> Enum.filter(& &1)
      |> ok()
    else
      {:error, {404, _}} -> {:ok, []}
      err -> format_error(err, "could not query plural vector")
    end
  end

  def delete(%__MODULE__{} = store, opts) do
    with {:ok, delete} <- prepare_delete(store, opts),
      do: direct(bulk_write(store, [delete]))
  end

  def expire(%__MODULE__{conn: conn}, opts) do
    filters = Keyword.get(opts, :filters, [])
    not_filters = Keyword.get(opts, :not, [])
    expiry = Keyword.get(opts, :expiry) || Timex.now() |> Timex.shift(hours: -10)
    range = %{op: "Lte", attribute: "timestamp", value: DateTime.to_unix(expiry, :millisecond)}
    delete_by_filter(conn, [range | Enum.map(filters, &filter/1)] ++ negate(not_filters))
  end

  defp delete_by_filter(conn, clauses) do
    case write(conn, %Write{delete_by_filter: combine(clauses)}) do
      {:error, {404, _}} -> :ok
      res -> ok_or_error(res, "could not delete vectors from plural vector")
    end
  end

  defp write(conn, %Write{} = write), do: request(conn, :post, namespace_path(conn, "write"), write)

  defp passages(%Conn{defer_embeddings: true}, text),
    do: {:ok, Enum.map(Utils.chunk(text, @chunk_size), &%Passage{text: &1})}
  defp passages(_, text) do
    with {:ok, embeddings} <- Provider.embeddings(text),
      do: {:ok, Enum.map(embeddings, fn {_, vector} -> %Passage{vector: vector} end)}
  end

  defp rank_by(%Conn{defer_embeddings: true}, text), do: {:ok, %{op: "ANN", text: String.slice(text, 0, @chunk_size)}}
  defp rank_by(_, text) do
    with {:ok, [{_, embedding} | _]} <- Provider.embeddings(text),
      do: {:ok, %{op: "ANN", vector: embedding}}
  end

  defp attributes(data, datatype, filters) do
    {auth, rest} = Keyword.split(filters, @auth)

    Map.new(rest, fn {k, v} -> {to_string(k), attribute_value(v)} end)
    |> Map.merge(%{
      "datatype" => to_string(datatype),
      "data" => Console.JSON.encode!(Console.mapify(data)),
      "timestamp" => System.os_time(:millisecond),
      "user_ids" => Enum.map(auth[:user_ids] || [], &to_string/1),
      "group_ids" => Enum.map(auth[:group_ids] || [], &to_string/1)
    })
  end

  defp attribute_value({:raw, v}), do: attribute_value(v)
  defp attribute_value(nil), do: nil
  defp attribute_value(vs) when is_list(vs), do: Enum.map(vs, &to_string/1)
  defp attribute_value(v), do: to_string(v)

  defp query(rank, count, filters, auth) do
    query = %{
      rank_by: rank,
      limit: %{total: count, per: %{attributes: ["$doc_id"], limit: 1}},
      include_attributes: ["datatype", "data"]
    }

    case Enum.map(filters, &filter/1) ++ auth_filter(auth) do
      [] -> query
      clauses -> Map.put(query, :filters, combine(clauses))
    end
  end

  defp filter({k, {:raw, v}}), do: filter({k, v})
  defp filter({k, nil}), do: %{op: "NotExists", attribute: to_string(k)}
  defp filter({k, vs}) when is_list(vs), do: %{op: "In", attribute: to_string(k), values: Enum.map(vs, &to_string/1)}
  defp filter({k, v}), do: %{op: "Eq", attribute: to_string(k), value: to_string(v)}

  defp negate([_ | _] = filters), do: [%{op: "Not", filter: combine(Enum.map(filters, &filter/1))}]
  defp negate(_), do: []

  defp auth_filter(auth) do
    Enum.flat_map(auth, fn
      {field, [_ | _] = vals} -> [%{op: "ContainsAny", attribute: to_string(field), values: Enum.map(vals, &to_string/1)}]
      _ -> []
    end)
    |> case do
      [] -> []
      clauses -> [%{op: "Or", filters: clauses}]
    end
  end

  defp combine([]), do: @all
  defp combine([clause]), do: clause
  defp combine(clauses), do: %{op: "And", filters: clauses}

  defp any_of([]), do: nil
  defp any_of([filter]), do: filter
  defp any_of(filters), do: %{op: "Or", filters: filters}

  defp nil_if_empty([]), do: nil
  defp nil_if_empty(l), do: l

  defp matches?(%{op: "And", filters: fs}, attrs), do: Enum.all?(fs, &matches?(&1, attrs))
  defp matches?(%{op: "Or", filters: fs}, attrs), do: Enum.any?(fs, &matches?(&1, attrs))
  defp matches?(%{op: "Not", filter: f}, attrs), do: !matches?(f, attrs)
  defp matches?(%{op: "Exists", attribute: a}, attrs), do: !is_nil(attrs[a])
  defp matches?(%{op: "NotExists", attribute: a}, attrs), do: is_nil(attrs[a])
  defp matches?(%{op: "Eq", attribute: a, value: v}, attrs), do: v in List.wrap(attrs[a])
  defp matches?(%{op: "In", attribute: a, values: vs}, attrs), do: Enum.any?(List.wrap(attrs[a]), &(&1 in vs))
  # an op we can't evaluate locally is assumed to match, forcing a flush
  defp matches?(_, _), do: true

  defp decode_row(%{"datatype" => datatype, "data" => data}) when is_binary(data) do
    case Jason.decode(data) do
      {:ok, %{} = decoded} -> Content.decode(datatype, decoded)
      _ -> nil
    end
  end
  defp decode_row(_), do: nil

  defp namespace_path(%Conn{namespace: ns}, action), do: "/api/v1/namespaces/#{ns}/#{action}"

  defp request(%Conn{} = conn, method, path, body) do
    Req.request(
      method: method,
      url: Conn.url(conn, path),
      headers: Conn.headers(conn, []),
      json: body,
      retry: :transient,
      max_retries: 3
    )
    |> case do
      {:ok, %Req.Response{status: code, body: body}} when code >= 200 and code < 300 -> {:ok, body}
      {:ok, %Req.Response{status: code, body: body}} -> {:error, {code, error_message(body)}}
      {:error, err} -> {:error, {:network, Exception.message(err)}}
    end
  end

  defp error_message(%{"message" => msg}) when is_binary(msg), do: msg
  defp error_message(body) when is_binary(body), do: body
  defp error_message(body), do: inspect(body)

  defp ok_or_error({:ok, _}, _), do: :ok
  defp ok_or_error(err, modifier), do: format_error(err, modifier)

  defp format_error({:error, {code, msg}}, modifier), do: {:error, "#{modifier}: [#{code}] #{msg}"}
  defp format_error({:error, msg}, modifier) when is_binary(msg), do: {:error, "#{modifier}: #{msg}"}
  defp format_error(err, _), do: err
end
