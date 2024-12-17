defmodule Console.Logs.Provider.Victoria do
  @moduledoc """
  Log driver implementation for victoria metrics
  """
  @behaviour Console.Logs.Provider
  import Console.Logs.Provider.Utils
  alias Console.Logs.{Query, Time, Line, Stream.Exec}
  alias Console.Schema.{Cluster, Service, DeploymentSettings.Connection}

  @headers [{"content-type", "application/x-www-form-urlencoded"}]

  defstruct [:connection]

  def new(conn), do: %__MODULE__{connection: conn}

  def query(%__MODULE__{connection: %Connection{host: host} = conn}, %Query{} = query) when is_binary(host) do
    Path.join(host, "/select/logsql/query")
    |> HTTPoison.post({:form, [
      {"query", build_query(query)},
      {"limit", "#{Query.limit(query)}"}
    ]}, headers(conn), [stream_to: self(), async: :once])
    |> Exec.exec(mapper: &line/1)
  end
  def query(_, _), do: {:error, "no victoria metrics host specified"}

  defp build_query(%Query{query: query} = q) do
    add_resource([query], q)
    |> add_time(q)
    |> maybe_reverse(q)
    |> Enum.join(" ")
  end

  defp line(%{"_msg" => log, "_time" => time} = line) do
    facets =
      Map.drop(line, ~w(_msg _time _stream))
      |> Map.merge(line["_stream"] || %{})
      |> facets()

    %Line{
      log: log,
      timestamp: Timex.parse!(time, "{ISO:Extended}"),
      facets: facets
    }
  end

  defp headers(%Connection{user: u, password: p}) when is_binary(u) and is_binary(p),
    do: [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  defp headers(_), do: @headers

  defp add_resource(io, %Query{resource: %Cluster{} = cluster}),
    do: [cluster_label(cluster) | io]
  defp add_resource(io, %Query{resource: %Service{namespace: ns} = svc}) do
    %{cluster: %Cluster{} = cluster} = Console.Repo.preload(svc, [:cluster])
    [cluster_label(cluster), ~s("namespace":#{ns}) | io]
  end

  defp cluster_label(%Cluster{handle: h}), do: ~s("cluster":"#{h}")

  defp add_time(io, %Query{time: %Time{after: a, before: b}}) when is_binary(a) and is_binary(b),
    do: [~s(_time:[#{a}, #{b}]) | io]
  defp add_time(io, %Query{time: %Time{duration: d}}) when is_binary(d),
    do: [~s(_time:#{d}) | io]

  defp maybe_reverse(io, %Query{time: %Time{reverse: true}}), do: io ++ ["| sort by (_time desc)"]
  defp maybe_reverse(io, _), do: io
end
