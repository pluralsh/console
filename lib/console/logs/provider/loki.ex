defmodule Console.Logs.Provider.Loki do
  @moduledoc """
  Log driver implementation for grafana loki, queried via LogQL
  """
  @behaviour Console.Logs.Provider
  import Console.Logs.Provider.Utils
  alias Console.Logs.{Query, Time, Line, AggregationBucket}
  alias Console.Schema.{Cluster, Service}
  alias Console.Schema.DeploymentSettings.Loki, as: Connection

  @options [receive_timeout: :timer.seconds(30), decode_body: false, retry: false]
  @nano 1_000_000_000
  @label_regex ~r/^[a-zA-Z_][a-zA-Z0-9_]*$/

  @type t :: %__MODULE__{}

  defstruct [:connection]

  def new(conn), do: %__MODULE__{connection: conn}

  @spec query(t(), Query.t) :: {:ok, [Line.t]} | Console.error
  def query(%__MODULE__{connection: %Connection{host: host} = conn}, %Query{} = q) when is_binary(host) do
    {start, stop} = range(q)

    get(conn, "/loki/api/v1/query_range", %{
      "query" => build_query(conn, q),
      "start" => start,
      "end" => stop,
      "limit" => Query.limit(q),
      "direction" => direction(q)
    })
    |> case do
      {:ok, %{"data" => %{"resultType" => "streams", "result" => streams}}} ->
        {:ok, format_streams(streams, q)}
      {:ok, _} -> {:ok, []}
      {:error, err} -> {:error, "failed to query loki: #{err}"}
    end
  end
  def query(_, _), do: {:error, "no loki host specified"}

  @spec aggregate(t(), Query.t) :: {:ok, [AggregationBucket.t]} | Console.error
  def aggregate(%__MODULE__{connection: %Connection{host: host} = conn}, %Query{} = q) when is_binary(host) do
    step = Time.to_seconds(q.bucket_size, 60)
    {start, stop} = range(q, step)

    get(conn, "/loki/api/v1/query_range", %{
      "query" => "sum(count_over_time(#{build_query(conn, q)} [#{step}s]))",
      "start" => start,
      "end" => stop,
      "step" => step
    })
    |> case do
      {:ok, %{"data" => %{"resultType" => "matrix", "result" => results}}} ->
        {:ok, format_buckets(results)}
      {:ok, _} -> {:ok, []}
      {:error, err} -> {:error, "failed to query loki aggregations: #{err}"}
    end
  end
  def aggregate(_, _), do: {:error, "no loki host specified"}

  @spec labels(t(), Query.t) :: {:ok, [%{label: binary, count: integer}]} | Console.error
  def labels(%__MODULE__{connection: %Connection{host: host} = conn}, %Query{field: field} = q)
      when is_binary(host) and is_binary(field) do
    {start, stop} = range(q)
    label = label_name(field)
    window = max(div(stop - start, @nano), 1)

    get(conn, "/loki/api/v1/query", %{
      "query" => "topk(100, sum by (#{label}) (count_over_time(#{build_query(conn, q)} [#{window}s])))",
      "time" => stop
    })
    |> case do
      {:ok, %{"data" => %{"result" => results}}} when is_list(results) ->
        {:ok, format_labels(results, label)}
      {:ok, _} -> {:ok, []}
      {:error, err} -> {:error, "failed to query loki labels: #{err}"}
    end
  end
  def labels(%__MODULE__{connection: %Connection{host: host}}, _) when is_binary(host), do: {:ok, []}
  def labels(_, _), do: {:error, "no loki host specified"}

  @doc """
  Builds the LogQL log query (stream selector + line filters) for the given log query
  """
  @spec build_query(%Connection{}, Query.t) :: binary
  def build_query(conn, %Query{} = q) do
    labels = {Connection.cluster_label(conn), Connection.namespace_label(conn)}

    matchers =
      []
      |> add_resource(q, labels)
      |> add_namespaces(q, labels)
      |> add_pod(q)
      |> add_facets(q)
      |> Enum.reverse()
      |> ensure_matcher(labels)

    "{#{Enum.join(matchers, ", ")}}#{line_filter(q)}"
  end

  defp add_resource(ms, %Query{resource: %Cluster{handle: h}}, {cl, _}), do: [matcher(cl, h) | ms]
  defp add_resource(ms, %Query{resource: %Service{} = svc}, {cl, nl}) do
    %Service{namespace: ns, cluster: %Cluster{handle: h}} = Console.Repo.preload(svc, [:cluster])
    [matcher(nl, ns), matcher(cl, h) | ms]
  end
  defp add_resource(ms, _, _), do: ms

  defp add_namespaces(ms, %Query{namespaces: [_ | _] = ns}, {_, nl}) do
    regex = Enum.map(ns, &Regex.escape/1) |> Enum.join("|")
    [~s(#{nl}=~#{quote_str(regex)}) | ms]
  end
  defp add_namespaces(ms, _, _), do: ms

  defp add_pod(ms, %Query{pod: pod}) when is_binary(pod) and byte_size(pod) > 0, do: [matcher("pod", pod) | ms]
  defp add_pod(ms, _), do: ms

  defp add_facets(ms, %Query{facets: [_ | _] = facets}) do
    Enum.reduce(facets, ms, fn %{key: k, value: v}, acc -> [matcher(label_name(k), v) | acc] end)
  end
  defp add_facets(ms, _), do: ms

  # loki requires at least one matcher that can't match the empty string
  defp ensure_matcher([], {cl, _}), do: [~s(#{cl}=~".+")]
  defp ensure_matcher(ms, _), do: ms

  # `or` splits whitespace separated terms into loki's native `|~ "a" or "b"` filter,
  # otherwise the query is matched as a single regex
  defp line_filter(%Query{query: q, operator: op}) when is_binary(q) do
    case {String.trim(q), op} do
      {"", _} -> ""
      {q, :and} -> " |~ #{regex_term(q)}"
      {q, _} -> " |~ " <> Enum.map_join(String.split(q), " or ", &regex_term/1)
    end
  end
  defp line_filter(_), do: ""

  defp regex_term("(?i)" <> _ = term), do: quote_str(term)
  defp regex_term(term), do: quote_str("(?i)" <> term)

  defp matcher(label, value), do: "#{label}=#{quote_str(value)}"

  defp quote_str(val) do
    escaped =
      "#{val}"
      |> String.replace("\\", "\\\\")
      |> String.replace("\"", "\\\"")
    ~s("#{escaped}")
  end

  defp label_name(key) do
    name = String.replace("#{key}", ~r/[^a-zA-Z0-9_]/, "_")
    if Regex.match?(@label_regex, name), do: name, else: "_#{name}"
  end

  defp direction(%Query{time: %Time{reverse: true}}), do: "forward"
  defp direction(_), do: "backward"

  defp range(%Query{time: time}) do
    {start, stop} = Time.range(time)
    {Time.to_unix_nano(start), Time.to_unix_nano(stop)}
  end

  defp range(%Query{time: time}, step) do
    {start, stop} = Time.range(time)
    {start, stop} = Console.TimeRange.align_range(start, stop, step)
    {Time.to_unix_nano(start), Time.to_unix_nano(stop)}
  end

  defp format_streams(streams, q) do
    Enum.flat_map(streams, fn %{"stream" => labels, "values" => values} ->
      facets = facets(labels)
      Enum.map(values, fn [ts, log | _] ->
        {String.to_integer(ts), %Line{log: log, timestamp: Time.from_unix_nano(ts), facets: facets}}
      end)
    end)
    |> Enum.sort_by(&elem(&1, 0), if(direction(q) == "forward", do: :asc, else: :desc))
    |> Enum.take(Query.limit(q))
    |> Enum.map(&elem(&1, 1))
  end

  defp format_buckets([%{"values" => values} | _]) do
    Enum.map(values, fn [ts, count] ->
      %AggregationBucket{timestamp: DateTime.from_unix!(trunc(ts)), count: to_int(count)}
    end)
  end
  defp format_buckets(_), do: []

  defp format_labels(results, label) do
    Enum.map(results, fn %{"metric" => metric, "value" => [_, count]} ->
      %{label: metric[label], count: to_int(count)}
    end)
    |> Enum.filter(& &1.label)
    |> Enum.sort_by(& &1.count, :desc)
  end

  defp to_int(v) when is_binary(v) do
    case Float.parse(v) do
      {f, _} -> trunc(f)
      :error -> 0
    end
  end
  defp to_int(v) when is_number(v), do: trunc(v)

  defp get(conn, path, params) do
    Connection.url(conn, "#{path}?#{URI.encode_query(params)}")
    |> Req.get([headers: Connection.headers(conn, Loki.Client.headers())] ++ @options)
    |> case do
      {:ok, %Req.Response{status: 200, body: body}} ->
        with {:error, err} <- Jason.decode(body),
          do: {:error, "invalid loki response: #{Exception.message(err)}"}
      {:ok, %Req.Response{status: status, body: body}} -> {:error, "loki returned #{status}: #{body}"}
      {:error, err} -> {:error, "network failure: #{inspect(err)}"}
    end
  end
end
