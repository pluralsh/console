defmodule Console.Logs.Provider.Elastic do
  @moduledoc """
  Log driver implementation for victoria metrics
  """
  @behaviour Console.Logs.Provider
  alias Console.Schema.{Cluster, Service}
  alias Console.Logs.{Query, Line}
  alias Console.Logs.Provider.Elastic.Client

  @type t :: %__MODULE__{}

  defstruct [:connection, :client]

  def new(conn) do
    Client.init(conn)
    %__MODULE__{connection: conn, client: Client}
  end

  @spec query(t(), Query.t) :: {:ok, [Line.t]} | Console.error
  def query(%__MODULE__{connection: %{index: index}, client: client}, %Query{} = q) do
    with {:ok, result} <- Snap.Search.search(client, index, build_query(q)),
      do: {:ok, format_hits(result)}
  end

  defp format_hits(%Snap.SearchResponse{hits: %Snap.Hits{hits: hits}}) do
    Enum.map(hits, fn %Snap.Hit{fields: fields} ->
      %Line{log: fields["content"], timestamp: Timex.now(), facets: Map.drop(fields, ~w(content))}
    end)
  end
  defp format_hits(_), do: []

  defp build_query(%Query{query: str} = q) do
    %{
      query: add_terms(%{
        query_string: %{
          query: str,
          default_field: "content"
        }
      }, q),
      size: Query.limit(q),
    }
  end

  defp add_terms(query, %Query{resource: %Cluster{} = cluster}),
    do: Map.put(query, :term, term(cluster))
  defp add_terms(query, %Query{resource: %Service{cluster: %Cluster{} = cluster}} = svc),
    do: Map.put(query, :term, term(cluster) |> term(svc))

  defp term(q \\ %{}, resource)
  defp term(q, %Cluster{handle: handle}), do: Map.put(q, :"labels.cluster", %{value: handle})
  defp term(q, %Service{namespace: namespace}), do: Map.put(q, :"labels.namespace", %{value: namespace})
end
